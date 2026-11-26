import { errorCode } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';

const POLL_INTERVAL_MS = 10_000;

export type ServeReportsOptions = {
  claim: () => Promise<string | null>;
  process: (reportId: string) => Promise<void>;
  processPdfVariant: () => Promise<boolean>;
  waitForWork: (timeoutMs: number, stop: AbortSignal) => Promise<void>;
  stop: AbortSignal;
  logger: Logger;
  pollIntervalMs?: number;
};

export type ServeReportsResult = { completed: number; failed: number };

export async function serveReports(options: ServeReportsOptions): Promise<ServeReportsResult> {
  const { logger, stop } = options;
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const result: ServeReportsResult = { completed: 0, failed: 0 };
  const isRunning = () => !stop.aborted;

  async function processNextReport(): Promise<boolean> {
    let reportId: string | null = null;
    try {
      reportId = await options.claim();
    } catch (error) {
      logger.error('report queue unreachable', { code: errorCode(error) });
    }
    if (reportId === null) return false;

    const startedAt = Date.now();
    logger.info('report claimed', { report_id: reportId });
    try {
      await options.process(reportId);
      result.completed += 1;
      logger.info('report delivered', { report_id: reportId, ms: Date.now() - startedAt });
    } catch (error) {
      result.failed += 1;
      logger.error('report not delivered', {
        report_id: reportId,
        code: errorCode(error),
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  async function processNextPdfVariant(): Promise<boolean> {
    try {
      return await options.processPdfVariant();
    } catch (error) {
      logger.error('localized report pdf queue unreachable', { code: errorCode(error) });
      return false;
    }
  }

  while (isRunning()) {
    const reportProcessed = await processNextReport();
    if (!isRunning()) break;
    const variantProcessed = await processNextPdfVariant();
    if (!reportProcessed && !variantProcessed && isRunning()) {
      await options.waitForWork(pollIntervalMs, stop);
    }
  }
  return result;
}
