import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function runChildProcess(
  command: string,
  args: readonly string[],
  maxBuffer: number,
  signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string }> {
  signal?.throwIfAborted();
  const execution = run(command, [...args], { maxBuffer, signal, killSignal: 'SIGKILL' });
  const closed = new Promise<void>((resolve) => execution.child.once('close', () => resolve()));
  try {
    return await execution;
  } finally {
    await closed;
  }
}
