import { type JsonObject, type Sql, type SqlQueries, type SqlTransaction } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import {
  hasExactStopProof,
  progressSchema,
  requestSchema,
  verifyRequestReceipt,
  type RecoveryProof,
  type SnapshotGeneration,
  type SnapshotRequest,
  type VerifiedRequestResult,
} from './resume-plan.ts';

type SnapshotPlan = { sha256: string; steps: readonly string[] };
export type SnapshotRequestKey = {
  provider: SnapshotRequest['provider'];
  operationKey: string;
  fingerprint: string;
};
type JournalOptions = {
  sql: Sql;
  snapshotId: string;
  plan: SnapshotPlan;
  replicaId: string;
  execution?: { id: string; ledgerId: string };
};
type ResumeOptions = JournalOptions & {
  previous: SnapshotGeneration;
  proof: RecoveryProof;
  receipts: readonly VerifiedRequestResult[];
};

function cannotContinue(code: string): never {
  throw new WorkerError(code, 'Smart Check progress cannot be continued safely');
}

function requireDedicatedConnection(sql: Sql) {
  if (sql.options.max !== 1) cannotContinue('snapshot_dedicated_connection_required');
}

export async function lockCheckpointOperations(sql: Sql) {
  requireDedicatedConnection(sql);
  const [lock] = await sql<{ acquired: boolean }[]>`
    select pg_try_advisory_lock(hashtext('propertyscore.snapshot') & 2147483647, 2) as acquired
  `;
  if (!lock?.acquired) cannotContinue('snapshot_already_building');
}

export async function readSnapshotProgress(sql: SqlQueries, snapshotId: string) {
  const [row] = await sql<{ progress: unknown }[]>`
    select snapshot_diagnostics.read_score_snapshot_progress(${snapshotId}) as progress
  `;
  return row?.progress == null ? null : progressSchema.parse(row.progress);
}

export async function readSnapshotRequests(
  sql: SqlQueries,
  snapshotId: string,
  after: string | null,
) {
  const [row] = await sql<{ requests: unknown }[]>`
    select snapshot_diagnostics.read_score_snapshot_requests(${snapshotId}, ${after}) as requests
  `;
  return requestSchema.array().parse(row?.requests);
}

async function lockAdmission(sql: SqlTransaction) {
  const [lock] = await sql<{ acquired: boolean }[]>`
    select pg_try_advisory_xact_lock(hashtext('propertyscore.snapshot') & 2147483647, 0) as acquired
  `;
  if (!lock?.acquired) cannotContinue('snapshot_already_building');
}

async function requireGuard(sql: SqlTransaction, snapshotId: string, ownership: 'held' | 'free') {
  const [row] = await sql<{ permitted: boolean }[]>`
    select (
      s.status = 'building' and s.uses_worker_lock and
      case when ${ownership} = 'held' then
        exists (select 1 from private.score_snapshot_lock_holders() h(pid) where h.pid = pg_backend_pid())
      else
        s.routing_pending and not exists (select 1 from private.score_snapshot_lock_holders())
        and not exists (select 1 from public.score_snapshots other where other.id <> s.id and other.routing_pending)
      end
    ) as permitted
    from public.score_snapshots s where s.id = ${snapshotId}
    for update
  `;
  if (!row?.permitted) cannotContinue('snapshot_guard_unconfirmed');
}

async function appendGeneration(sql: SqlTransaction, options: JournalOptions, generation: number) {
  const [row] = await sql<{ id: string }[]>`
    insert into private.score_snapshot_generations
      (id, snapshot_id, generation, replica_id, valhalla_ledger_id)
    values (coalesce(${options.execution?.id ?? null}::uuid, gen_random_uuid()),
      ${options.snapshotId}, ${generation}, ${options.replicaId},
      ${options.execution?.ledgerId ?? null})
    returning id
  `;
  return row?.id ?? cannotContinue('snapshot_generation_missing');
}

export async function startSnapshotProgress(
  options: Omit<JournalOptions, 'snapshotId'> & { period: string; versionId?: string },
) {
  const { sql, plan } = options;
  requireDedicatedConnection(sql);
  if (plan.steps.length === 0) cannotContinue('snapshot_plan_empty');
  return sql.begin(async (tx) => {
    const [version] = await tx<{ id: string }[]>`
      select id from public.scoring_versions
      where kind = 'online' and is_active for share
    `;
    if (options.versionId !== undefined && version?.id !== options.versionId) {
      cannotContinue('snapshot_plan_changed');
    }
    const [started] = await tx<{ id: string }[]>`
      select private.start_score_snapshot(${options.period}::date, true) as id
    `;
    const snapshotId = started?.id ?? cannotContinue('snapshot_not_started');
    await requireGuard(tx, snapshotId, 'held');
    await tx`
      insert into private.score_snapshot_progress (id, plan_sha256) values (${snapshotId}, ${plan.sha256})
    `;
    await tx`
      insert into private.score_snapshot_steps (snapshot_id, step_key, position)
      select ${snapshotId}, s.key, s.position::integer - 1
      from unnest(${tx.array([...plan.steps])}::text[]) with ordinality s(key, position)
    `;
    await tx`update public.score_snapshots set routing_pending = true where id = ${snapshotId}`;
    const executionId = await appendGeneration(tx, { ...options, snapshotId }, 1);
    return { snapshotId, executionId };
  });
}

async function getCurrentGeneration(sql: SqlTransaction, snapshotId: string) {
  const [row] = await sql<SnapshotGeneration[]>`
    select id, generation, replica_id, valhalla_ledger_id
    from private.score_snapshot_generations where snapshot_id = ${snapshotId}
    order by generation desc limit 1
  `;
  return row ?? cannotContinue('snapshot_generation_missing');
}

export async function claimSnapshotResume(options: ResumeOptions) {
  const { sql, snapshotId, plan, previous, proof } = options;
  requireDedicatedConnection(sql);
  return sql.begin(async (tx) => {
    await lockAdmission(tx);
    await requireGuard(tx, snapshotId, 'free');
    const current = await getCurrentGeneration(tx, snapshotId);
    if (current.id !== previous.id || !hasExactStopProof(current, proof)) {
      cannotContinue('snapshot_stop_unconfirmed');
    }
    const [stored] = await tx<{ plan_sha256: string; steps: string[] }[]>`
      select p.plan_sha256, array(
        select s.step_key from private.score_snapshot_steps s
        where s.snapshot_id = p.id order by s.position
      ) as steps
      from private.score_snapshot_progress p where p.id = ${snapshotId}
    `;
    if (
      stored?.plan_sha256 !== plan.sha256 ||
      JSON.stringify(stored.steps) !== JSON.stringify(plan.steps)
    ) {
      cannotContinue('snapshot_plan_changed');
    }
    for (const { request, receipt } of options.receipts) {
      if (!verifyRequestReceipt(request, [receipt])) cannotContinue('snapshot_request_unconfirmed');
      const outcome = await tx`
        update private.score_snapshot_requests
        set upstream_id = ${receipt.upstreamId}, state = ${receipt.state},
            artifact_sha256 = ${receipt.state === 'succeeded' ? receipt.artifactSha256 : null}
        where id = ${request.id} and snapshot_id = ${snapshotId}
          and execution_id = ${request.execution_id} and provider = ${request.provider}
          and fingerprint = ${request.fingerprint}
          and upstream_id is not distinct from ${request.upstream_id}
          and state in ('unconfirmed', 'accepted')
      `;
      if (outcome.count !== 1) cannotContinue('snapshot_request_unconfirmed');
    }
    await tx`
      update private.score_snapshot_requests
      set state = 'discarded'
      where snapshot_id = ${snapshotId} and execution_id = ${current.id}
        and provider in ('source', 'valhalla') and state in ('unconfirmed', 'accepted')
    `;
    const [pending] = await tx<{ present: boolean }[]>`
      select exists (
        select 1 from private.score_snapshot_requests
        where snapshot_id = ${snapshotId} and state in ('unconfirmed', 'accepted')
      ) as present
    `;
    if (pending?.present !== false) cannotContinue('snapshot_request_unconfirmed');
    const id = await appendGeneration(tx, options, current.generation + 1);
    await tx`select pg_advisory_lock_shared(hashtext('propertyscore.snapshot') & 2147483647, 1)`;
    return id;
  });
}

export function createSnapshotJournal(sql: Sql, snapshotId: string, executionId: string) {
  requireDedicatedConnection(sql);
  async function write<T>(
    operation: (tx: SqlTransaction) => Promise<T>,
    publication = false,
  ): Promise<T> {
    const result = await sql.begin(async (tx) => {
      if (publication)
        await tx`select pg_advisory_xact_lock(hashtext('propertyscore.snapshot') & 2147483647, 3)`;
      await requireGuard(tx, snapshotId, 'held');
      if ((await getCurrentGeneration(tx, snapshotId)).id !== executionId) {
        cannotContinue('snapshot_generation_changed');
      }
      return { value: await operation(tx) };
    });
    return result.value;
  }

  async function requireNextStep(tx: SqlTransaction, step: string) {
    const [row] = await tx<{ step_key: string }[]>`
      select step_key from private.score_snapshot_steps
      where snapshot_id = ${snapshotId} and completed_at is null order by position limit 1
    `;
    if (row?.step_key !== step) cannotContinue('snapshot_step_out_of_order');
  }

  return {
    async claimStep(step: string) {
      return write(async (tx) => {
        await requireNextStep(tx, step);
        if ((await getCurrentGeneration(tx, snapshotId)).valhalla_ledger_id === null) {
          cannotContinue('snapshot_valhalla_unconfirmed');
        }
        const changed = await tx`
          update private.score_snapshot_steps set started_at = now(), started_by = ${executionId}
          where snapshot_id = ${snapshotId} and step_key = ${step}
            and started_by is distinct from ${executionId}
        `;
        if (changed.count !== 1) cannotContinue('snapshot_step_already_started');
      });
    },

    async hasPendingSteps() {
      return write(async (tx) => {
        const [row] = await tx<{ pending: boolean }[]>`
          select exists (
            select 1 from private.score_snapshot_steps
            where snapshot_id = ${snapshotId} and completed_at is null
          ) as pending
        `;
        return row?.pending !== false;
      });
    },

    async publish(sourceDates: Record<string, string>) {
      return write(async (tx) => {
        const [pending] = await tx<{ present: boolean }[]>`
          select exists (
            select 1 from private.score_snapshot_steps
            where snapshot_id = ${snapshotId} and completed_at is null
          ) as present
        `;
        if (pending?.present !== false) cannotContinue('snapshot_steps_missing');
        await tx`select set_config('statement_timeout', '3h', true)`;
        await tx`select private.compute_overall_scores(${snapshotId})`;
        await tx`select private.compute_snapshot_stats(${snapshotId})`;
        await tx`select private.publish_score_snapshot(${snapshotId}, ${tx.json(sourceDates)}::jsonb)`;
        await tx`update public.score_snapshots set routing_pending = false where id = ${snapshotId}`;
      }, true);
    },

    async recordValhallaLedger(ledgerId: string) {
      return write(async (tx) => {
        const changed = await tx`
          update private.score_snapshot_generations set valhalla_ledger_id = ${ledgerId}
          where id = ${executionId} and (valhalla_ledger_id is null or valhalla_ledger_id = ${ledgerId})
        `;
        if (changed.count !== 1) cannotContinue('snapshot_valhalla_ledger_changed');
      });
    },

    async completedSteps() {
      return write(async (tx) => {
        const entries = await tx<{ key: string; result: JsonObject }[]>`
          select step_key as key, result from private.score_snapshot_steps
          where snapshot_id = ${snapshotId} and completed_at is not null order by position
        `;
        return new Map(entries.map(({ key, result }) => [key, result]));
      });
    },

    async beginRequest(
      step: string,
      key: SnapshotRequestKey,
      { retryUnavailableOnResume = false } = {},
    ) {
      return write(async (tx) => {
        await requireNextStep(tx, step);
        const [stage] = await tx<{ started_by: string | null }[]>`
          select started_by from private.score_snapshot_steps
          where snapshot_id = ${snapshotId} and step_key = ${step}
        `;
        if (stage?.started_by !== executionId) cannotContinue('snapshot_step_not_claimed');
        const [last] = await tx<
          {
            id: string;
            execution_id: string;
            state: SnapshotRequest['state'];
            fingerprint: string;
            attempt: number;
            artifact_sha256: string | null;
            upstream_id: string | null;
          }[]
        >`
          select id, execution_id, state, fingerprint, attempt, artifact_sha256, upstream_id
          from private.score_snapshot_requests
          where snapshot_id = ${snapshotId} and step_key = ${step}
            and provider = ${key.provider} and operation_key = ${key.operationKey}
          order by attempt desc limit 1
        `;
        if (last && last.fingerprint !== key.fingerprint)
          cannotContinue('snapshot_request_changed');
        if (
          last?.state === 'failed' &&
          key.provider === 'source' &&
          (!retryUnavailableOnResume || last.execution_id === executionId)
        ) {
          return { outcome: 'unavailable' } as const;
        }
        if (
          last?.state === 'succeeded' &&
          last.artifact_sha256 !== null &&
          last.upstream_id !== null
        ) {
          return {
            outcome: 'reuse',
            artifactSha256: last.artifact_sha256,
            upstreamId: last.upstream_id,
          } as const;
        }
        if (
          last &&
          last.state !== 'failed' &&
          last.state !== 'discarded' &&
          last.state !== 'rejected'
        ) {
          cannotContinue('snapshot_request_unconfirmed');
        }
        const [row] = await tx<{ id: string }[]>`
          insert into private.score_snapshot_requests
            (snapshot_id, execution_id, step_key, provider, operation_key, fingerprint, attempt)
          values (${snapshotId}, ${executionId}, ${step}, ${key.provider}, ${key.operationKey},
            ${key.fingerprint}, ${(last?.attempt ?? 0) + 1})
          returning id
        `;
        return {
          outcome: 'submit',
          requestId: row?.id ?? cannotContinue('snapshot_request_missing'),
        } as const;
      });
    },

    async acceptRequest(requestId: string, upstreamId: string) {
      return write(async (tx) => {
        const changed = await tx`
          update private.score_snapshot_requests
          set state = 'accepted', upstream_id = ${upstreamId}
          where id = ${requestId} and execution_id = ${executionId}
            and (state = 'unconfirmed' or (state = 'accepted' and upstream_id = ${upstreamId}))
        `;
        if (changed.count !== 1) cannotContinue('snapshot_request_unconfirmed');
      });
    },

    async rejectAdsSubmission(requestId: string, status: 401 | 403) {
      return write(async (tx) => {
        const changed = await tx`
          update private.score_snapshot_requests
          set state = 'rejected', rejection_status = ${status}
          where id = ${requestId} and execution_id = ${executionId} and provider = 'ads'
            and state = 'unconfirmed' and upstream_id is null
        `;
        if (changed.count !== 1) cannotContinue('snapshot_request_unconfirmed');
      });
    },

    async finishRequest(requestId: string, outcome: { artifactSha256: string } | 'failed') {
      return write(async (tx) => {
        const state = outcome === 'failed' ? 'failed' : 'succeeded';
        const artifact = outcome === 'failed' ? null : outcome.artifactSha256;
        const changed = await tx`
          update private.score_snapshot_requests set state = ${state}, artifact_sha256 = ${artifact}
          where id = ${requestId} and execution_id = ${executionId}
            and (state = 'accepted' or (state = ${state} and artifact_sha256 is not distinct from ${artifact}))
        `;
        if (changed.count !== 1) cannotContinue('snapshot_request_unconfirmed');
      });
    },

    async completeStep(step: string, result: JsonObject) {
      return write(async (tx) => {
        await requireNextStep(tx, step);
        const changed = await tx`
          update private.score_snapshot_steps s
          set result = ${tx.json(result)}, completed_at = now(), completed_by = ${executionId}
          where s.snapshot_id = ${snapshotId} and s.step_key = ${step} and s.started_by = ${executionId}
            and not exists (
              select 1 from private.score_snapshot_requests r
              where r.snapshot_id = s.snapshot_id and r.step_key = s.step_key
                and r.state <> 'succeeded'
                and not (r.provider = 'source' and r.state = 'failed')
                and not exists (
                  select 1 from private.score_snapshot_requests later
                  where later.snapshot_id = r.snapshot_id and later.step_key = r.step_key
                    and later.provider = r.provider and later.operation_key = r.operation_key
                    and later.attempt > r.attempt
                )
            )
        `;
        if (changed.count !== 1) cannotContinue('snapshot_request_unconfirmed');
      });
    },
  };
}
