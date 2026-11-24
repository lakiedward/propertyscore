import { errorCode } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';

export type LeaseRenewal = { stop: () => void };

export function startLeaseRenewal(
  reportId: string,
  extend: () => Promise<boolean>,
  intervalMs: number,
  logger: Logger,
): LeaseRenewal {
  let isStopped = false;
  const stop = () => {
    isStopped = true;
    clearInterval(timer);
  };
  const timer = setInterval(() => {
    extend().then(
      (isExtended) => {
        if (isExtended || isStopped) return;
        logger.warn('report lease not extended', { report_id: reportId });
        stop();
      },
      (error: unknown) => {
        logger.warn('report lease renewal failed', {
          report_id: reportId,
          code: errorCode(error),
        });
      },
    );
  }, intervalMs);
  return { stop };
}
