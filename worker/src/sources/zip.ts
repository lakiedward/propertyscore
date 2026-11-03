import { spawn } from 'node:child_process';

import { WorkerError } from '../lib/errors.ts';

export async function* readZipMember(zipPath: string, member: string): AsyncGenerator<string> {
  const child = spawn('unzip', ['-p', zipPath, member], { stdio: ['ignore', 'pipe', 'ignore'] });
  const exited = new Promise<number | null>((resolve) => {
    child.once('error', () => resolve(-1));
    child.once('close', resolve);
  });
  child.stdout.setEncoding('utf8');
  try {
    for await (const chunk of child.stdout) yield chunk as string;
  } finally {
    if (child.exitCode === null) child.kill();
  }
  const code = await exited;
  if (code !== 0) throw new WorkerError('unzip_failed', `unzip could not read ${member}`);
}
