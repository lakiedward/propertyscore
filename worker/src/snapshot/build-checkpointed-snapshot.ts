import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { JsonObject, Sql } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import { reconcileCamsRequest, type AdsClientOptions } from '../scoring/air/cams.source.ts';
import { downloadOsmExtract, osmExtractPath } from '../sources/osm.ts';
import {
  selectCities,
  selectModules,
  versionParamsSchema,
  type BuildSnapshotOptions,
  type BuildSnapshotResult,
} from './build-snapshot.ts';
import { markResidentialCells } from './residential.ts';
import { artifactUnconfirmed, snapshotDigest, snapshotFileDigest } from './resume-artifacts.ts';
import {
  claimSnapshotResume,
  createSnapshotJournal,
  lockCheckpointOperations,
  readSnapshotProgress,
  startSnapshotProgress,
} from './resume-journal.ts';
import {
  requestSchema,
  verifyRequestReceipt,
  type SnapshotGeneration,
  type VerifiedRequestResult,
} from './resume-plan.ts';
import { readWorkerStopProof } from './resume-proof.ts';
import { createResumeRouting, routingUnconfirmed } from './resume-routing.ts';
import type { ResumeSettings } from './resume-settings.ts';
import { withCheckpointedSources } from './resume-source.ts';
import { runMissingSnapshotSteps, type StepJournal } from './resume-steps.ts';
import { prepareCityCells } from './snapshot.db.ts';

type Options = Omit<BuildSnapshotOptions, 'router'> & {
  journalSql: Sql;
  resumeId: string | null;
  settings: ResumeSettings;
  sourceConfiguration: readonly (string | undefined)[];
  ads: Pick<AdsClientOptions, 'apiUrl'> & { apiKey: string | undefined };
  signal: AbortSignal;
};

async function readInputs(sql: Sql, snapshotId: string | null, period: string) {
  type Inputs = { id: string; period: string; params: JsonObject };
  const [inputs] =
    snapshotId === null
      ? await sql<Inputs[]>`
        select id, to_char(${period}::date, 'YYYY-MM-DD') as period, params
        from public.scoring_versions where kind = 'online' and is_active
      `
      : await sql<Inputs[]>`
        select v.id, to_char(s.period, 'YYYY-MM-DD') as period, v.params
        from public.score_snapshots s join public.scoring_versions v on v.id = s.scoring_version_id
        where s.id = ${snapshotId} and s.status = 'building'
      `;
  if (!inputs)
    throw new WorkerError('snapshot_not_building', 'No recoverable Smart Check snapshot');
  return inputs;
}

async function reconcileAds(
  { sql, signal, ads }: Options,
  snapshotId: string,
  sourcesDir: string,
): Promise<VerifiedRequestResult[]> {
  const rows = await sql`
    select id, execution_id, step_key, provider, operation_key, fingerprint, attempt,
      upstream_id, state, rejection_status, artifact_sha256, created_at::text
    from private.score_snapshot_requests
    where snapshot_id = ${snapshotId} and provider = 'ads' and state in ('accepted', 'unconfirmed')
    order by id
  `;
  const pending = requestSchema.array().parse(rows);
  if (pending.some((request) => request.upstream_id === null)) {
    throw new WorkerError(
      'snapshot_request_unconfirmed',
      'An ADS submission has no verified job ID',
    );
  }
  const receipts: VerifiedRequestResult[] = [];
  for (const request of pending) {
    const result =
      ads.apiKey &&
      (await reconcileCamsRequest(
        { apiUrl: ads.apiUrl, apiKey: ads.apiKey, sourcesDir, signal },
        request,
      ));
    const verified = result && verifyRequestReceipt(request, [result]);
    if (!verified) {
      throw new WorkerError(
        'snapshot_request_unconfirmed',
        'An ADS job has no verified terminal result',
      );
    }
    receipts.push(verified);
  }
  return receipts;
}

export async function buildCheckpointedSnapshot(options: Options): Promise<BuildSnapshotResult> {
  const { journalSql: sql, logger, settings, resumeId, signal } = options;
  if (options.allowPartialCities || options.citySlugs.length || options.scoreKeys.length) {
    throw new WorkerError(
      'invalid_snapshot_resume',
      'Checkpointed Smart Check requires every city and score',
    );
  }
  await lockCheckpointOperations(sql);
  signal.throwIfAborted();
  const routing = createResumeRouting(
    settings.SNAPSHOT_VALHALLA_URL,
    settings.SNAPSHOT_VALHALLA_CONTROL_TOKEN,
    settings.SNAPSHOT_VALHALLA_ROUTING_TOKEN,
  );
  const inputs = await readInputs(sql, resumeId, options.period);
  const params = versionParamsSchema.safeParse(inputs.params);
  if (!params.success) throw new WorkerError('invalid_version_params', 'Invalid scoring version');
  const modules = selectModules(options.modules, options.scoreKeys);
  const cities = await selectCities(sql, logger, options);
  const boundaries = await sql<{ id: string; digest: string }[]>`
    select id, md5(boundary::text) as digest
    from public.cities where id = any(${sql.array(cities.map(({ id }) => id))}::uuid[]) order by id
  `;
  const steps = [
    'source:osm',
    ...cities.map(({ id }) => `grid:${id}`),
    ...modules.map(({ key }) => `score:${key}`),
  ];
  const plan = {
    sha256: snapshotDigest(
      JSON.stringify([
        settings.SNAPSHOT_INPUT_REVISION,
        settings.SNAPSHOT_VALHALLA_URL,
        inputs,
        boundaries,
        steps,
        options.osmExtract.url,
        options.sourceMirror?.url,
        options.ads.apiUrl,
        options.sourceConfiguration,
      ]),
    ),
    steps,
  };

  const replicaId = settings.SNAPSHOT_REPLICA_ID;
  async function register() {
    signal.throwIfAborted();
    const id = settings.SNAPSHOT_EXECUTION_ID ?? randomUUID();
    const state = await routing.control(id, 'register', signal);
    if (
      state.state !== 'idle' ||
      state.admission !== 'open' ||
      state.queued !== 0 ||
      state.running !== 0
    )
      routingUnconfirmed();
    return { id, ledgerId: state.ledger_id };
  }

  let previous: SnapshotGeneration | undefined;
  let workerProof: Awaited<ReturnType<typeof readWorkerStopProof>> | undefined;
  if (resumeId !== null) {
    const progress = await readSnapshotProgress(sql, resumeId);
    previous = progress?.generations.at(-1);
    if (!progress || !previous || progress.plan_sha256 !== plan.sha256) {
      throw new WorkerError('snapshot_plan_changed', 'Smart Check plan is missing or differs');
    }
    const directory = join(options.sourcesDir, 'snapshots', resumeId);
    const [source] = await sql<{ digest: string }[]>`
      select result ->> 'sha256' as digest from private.score_snapshot_steps
      where snapshot_id = ${resumeId} and step_key = 'source:osm' and completed_at is not null
    `;
    if (
      source &&
      source.digest !== (await snapshotFileDigest(osmExtractPath(directory, inputs.period), signal))
    ) {
      artifactUnconfirmed();
    }
    workerProof = await readWorkerStopProof(
      settings.SNAPSHOT_REPLICA_INSPECTOR_URL,
      settings.SNAPSHOT_REPLICA_INSPECTOR_TOKEN,
      previous,
      signal,
    );
  }

  const admission = { sql, plan, replicaId };
  let snapshotId: string;
  let execution: Awaited<ReturnType<typeof register>>;
  if (resumeId !== null && previous && workerProof) {
    const state = await routing.control(previous.id, 'fence', signal);
    if (
      state.ledger_id !== previous.valhalla_ledger_id ||
      state.state !== 'drained' ||
      state.admission !== 'fenced' ||
      state.queued !== 0 ||
      state.running !== 0
    )
      routingUnconfirmed();
    const receipts = await reconcileAds(
      options,
      resumeId,
      join(options.sourcesDir, 'snapshots', resumeId),
    );
    execution = await register();
    if (state.ledger_id !== execution.ledgerId) routingUnconfirmed();
    signal.throwIfAborted();
    await claimSnapshotResume({
      ...admission,
      execution,
      snapshotId: resumeId,
      previous,
      receipts,
      proof: {
        worker: workerProof,
        valhalla: {
          runId: state.run_id,
          ledgerId: state.ledger_id,
          admission: state.admission,
          state: state.state,
          queued: state.queued,
          running: state.running,
        },
      },
    });
    snapshotId = resumeId;
  } else {
    execution = await register();
    signal.throwIfAborted();
    ({ snapshotId } = await startSnapshotProgress({
      ...admission,
      execution,
      period: inputs.period,
      versionId: inputs.id,
    }));
  }

  const journal = createSnapshotJournal(sql, snapshotId, execution.id);
  const sourcesDir = join(options.sourcesDir, 'snapshots', snapshotId);
  const workDir = join(sourcesDir, 'work', snapshotId);
  const extractPath = osmExtractPath(sourcesDir, inputs.period);
  const sourceArtifacts = join(sourcesDir, 'source-responses');
  logger.info('snapshot checkpoint execution', {
    snapshot_id: snapshotId,
    execution_id: execution.id,
  });
  try {
    const results = await runMissingSnapshotSteps(
      [
        {
          key: 'source:osm',
          async run(stepJournal, stepSignal) {
            await withCheckpointedSources(
              {
                journal: stepJournal,
                step: 'source:osm',
                signal: stepSignal,
                directory: sourceArtifacts,
                retryUnavailableOnResume: true,
              },
              () => downloadOsmExtract(options.osmExtract, sourcesDir, inputs.period),
            );
            return { sha256: await snapshotFileDigest(extractPath, signal) };
          },
        },
        ...cities.map((city) => ({
          key: `grid:${city.id}`,
          async run() {
            const cells = await prepareCityCells(sql, snapshotId, city.id, params.data.cell_size_m);
            await markResidentialCells({
              sql,
              snapshotId,
              city,
              extractPath,
              workDir,
              minShare: params.data.residential_min_share,
            });
            return { cells };
          },
        })),
        ...modules.map((module) => ({
          key: `score:${module.key}`,
          async run(stepJournal: StepJournal, stepSignal: AbortSignal) {
            const step = `score:${module.key}`;
            const result = await withCheckpointedSources(
              { journal: stepJournal, step, signal: stepSignal, directory: sourceArtifacts },
              () =>
                module.run({
                  sql: options.sql,
                  snapshotId,
                  period: inputs.period,
                  cellSizeM: params.data.cell_size_m,
                  cities,
                  params: inputs.params[module.key],
                  sourcesDir,
                  osmExtract: options.osmExtract,
                  sourceMirror: options.sourceMirror,
                  router: routing.router({
                    runId: execution.id,
                    ledgerId: execution.ledgerId,
                    step,
                    journal: stepJournal,
                    artifactsDir: join(sourcesDir, 'valhalla-results'),
                    signal: stepSignal,
                  }),
                  camsCheckpoint: { journal: stepJournal, step, signal: stepSignal },
                  logger,
                }),
            );
            return result.sourceDates;
          },
        })),
      ],
      journal,
      signal,
    );
    const sourceDates: Record<string, string> = {};
    for (const { key } of modules) {
      for (const [source, date] of Object.entries(results.get(`score:${key}`) ?? {})) {
        if (typeof date === 'string') sourceDates[source] = date;
      }
    }
    const cells = cities.reduce((total, { id }) => {
      const count = results.get(`grid:${id}`)?.cells;
      return total + (typeof count === 'number' ? count : 0);
    }, 0);
    const state = await routing.control(execution.id, 'fence', signal);
    if (
      state.ledger_id !== execution.ledgerId ||
      state.state !== 'drained' ||
      state.admission !== 'fenced' ||
      state.queued !== 0 ||
      state.running !== 0
    )
      routingUnconfirmed();
    signal.throwIfAborted();
    await journal.publish(sourceDates);
    return { snapshotId, cities: cities.length, cells, scores: modules.map(({ key }) => key) };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
