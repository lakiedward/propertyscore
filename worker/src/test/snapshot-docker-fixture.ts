import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdtemp, readFile, rm, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { z } from 'zod';

const exec = promisify(execFile);
const socket = '/var/run/docker.sock';
const runner = fileURLToPath(new URL('../../../scripts/snapshot-runner.py', import.meta.url));
const reader = fileURLToPath(new URL('../../../scripts/snapshot-observer.py', import.meta.url));
const identitySchema = z.object({ run_id: z.uuid(), replica_id: z.uuid() });
const portSchema = z.object({ port: z.number().int().positive() });

async function processIdentity(pid: string) {
  try {
    const stat = await readFile(`/proc/${pid}/stat`, 'utf8');
    const [state, ...fields] = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    return state === 'Z' || state === 'X' ? null : fields[18];
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function launchSnapshotDockerFixture(image: string, token: string) {
  const directory = await mkdtemp(join(tmpdir(), 'snapshot-observer-'));
  const link = join(directory, 'docker.sock');
  const state = join(directory, 'observer.sqlite');
  const proofSocket = join(directory, 'proof.sock');
  const options = [runner, '--state', state, '--socket', link];
  const docker = (...args: string[]) =>
    exec('docker', ['--host', `unix://${socket}`, ...args], { timeout: 20_000 });
  const observerCommand = (...args: string[]) =>
    exec('python3', [...options, ...args], { timeout: 20_000 });
  const restoreEngine = () => symlink(socket, link);
  const disconnectEngine = () => unlink(link);
  let observer: ChildProcessWithoutNullStreams | undefined;
  let verifier: ChildProcessWithoutNullStreams | undefined;
  let container: string | undefined;

  async function readReady(child: ChildProcessWithoutNullStreams) {
    const lines = createInterface({ input: child.stdout });
    try {
      const line: unknown = await Promise.race([
        once(lines, 'line', { signal: AbortSignal.timeout(5000) }).then((values) =>
          z.tuple([z.string()]).parse(values).at(0),
        ),
        once(lines, 'close').then(() => {
          throw new Error('Docker fixture observer exited during startup');
        }),
      ]);
      return JSON.parse(String(line)) as unknown;
    } finally {
      child.stdout.resume();
    }
  }

  async function startVerifier() {
    verifier = spawn('python3', [...options, 'verify', '--proof-socket', proofSocket]);
    z.object({ listening: z.literal(true) }).parse(await readReady(verifier));
  }

  async function startObserver() {
    observer = spawn('python3', [reader, '--proof-socket', proofSocket, '--port', '0'], {
      env: { ...process.env, SNAPSHOT_REPLICA_INSPECTOR_TOKEN: token },
    });
    const port = portSchema.parse(await readReady(observer)).port;
    return `http://127.0.0.1:${port}`;
  }

  async function stop(child: ChildProcessWithoutNullStreams | undefined) {
    if (child?.exitCode !== null || child.signalCode !== null) return;
    const exit = once(child, 'exit', { signal: AbortSignal.timeout(5000) });
    child.kill();
    await exit;
  }

  async function stopObserver() {
    await stop(observer);
    observer = undefined;
  }

  async function stopVerifier() {
    await stop(verifier);
    verifier = undefined;
  }

  async function cleanup() {
    try {
      await stopObserver();
      await stopVerifier();
      if (container) await docker('rm', '-fv', container).catch(() => undefined);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  try {
    await restoreEngine();
    const { stdout } = await observerCommand(
      'launch',
      image,
      'bash',
      '-c',
      `setsid bash -c 'sleep 600 & wait' & wait`,
    );
    const identity = identitySchema.parse(JSON.parse(stdout));
    container = `snapshot-${identity.replica_id}`;
    const containerName = container;
    await startVerifier();
    const url = await startObserver();
    return {
      identity,
      url,
      async descendants() {
        const { stdout } = await docker('top', containerName, '-eo', 'pid,ppid,comm');
        const members = stdout.split('\n').flatMap((line) => {
          const [, pid, parent, command] = /^(\d+)\s+(\d+)\s+(\S+)$/.exec(line.trim()) ?? [];
          return pid && parent && command ? [{ pid, parent, command }] : [];
        });
        const grandchild = members.find((member) => member.command === 'sleep');
        const child = members.find((member) => member.pid === grandchild?.parent);
        const parent = members.find((member) => member.pid === child?.parent);
        const root = members.find((member) => member.command === 'docker-init');
        if (
          child?.command !== 'bash' ||
          parent?.command !== 'bash' ||
          parent.parent !== root?.pid
        ) {
          return [];
        }
        return Promise.all(
          members.map(async ({ pid }) => ({ pid, identity: await processIdentity(pid) })),
        );
      },
      processIdentity,
      async killRunner() {
        await docker('kill', containerName);
        const { stdout } = await docker(
          'inspect',
          '--format',
          '{{.State.Status}} {{.State.Pid}}',
          containerName,
        );
        return stdout.trim();
      },
      async retire() {
        await observerCommand('retire', identity.run_id);
      },
      async retireInterruptedAfterRemoval() {
        await exec(
          'python3',
          [
            '-c',
            `import os, runpy, signal, subprocess, sys
original_run = subprocess.run
def interrupt_after_removal(command, *args, **kwargs):
    result = original_run(command, *args, **kwargs)
    if command[3:4] == ["rm"]:
        os.kill(os.getpid(), signal.SIGKILL)
    return result
subprocess.run = interrupt_after_removal
sys.argv.pop(0)
runpy.run_path(sys.argv[0], run_name="__main__")`,
            ...options,
            'retire',
            identity.run_id,
          ],
          { timeout: 20_000 },
        );
      },
      async saveRegistryBeforeRetirement() {
        const copy = join(directory, 'before.sqlite');
        await copyFile(state, copy);
        return () =>
          exec('python3', [runner, '--state', copy, '--socket', link, 'retire', identity.run_id], {
            timeout: 20_000,
          });
      },
      restartRunner: () => docker('start', containerName),
      disconnectEngine,
      restoreEngine,
      startObserver,
      stopObserver,
      startVerifier,
      stopVerifier,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
