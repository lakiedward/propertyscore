import { describe, expect, it, vi } from 'vitest';

import { WorkerError } from '../lib/errors.ts';
import { createLogger } from '../lib/logger.ts';
import { serveReports } from './serve-reports.ts';
import { createWorkSignal } from './work-signal.ts';

function recordingLogger() {
  const lines: Record<string, unknown>[] = [];
  const logger = createLogger('info', (line) =>
    lines.push(JSON.parse(line) as Record<string, unknown>),
  );
  return { logger, lines };
}

function queueOf(items: (string | null | Error)[], controller: AbortController) {
  return vi.fn(() => {
    const next = items.shift();
    if (next === undefined) {
      controller.abort();
      return Promise.resolve(null);
    }
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next);
  });
}

describe('serveReports', () => {
  it('delivers each claimed report and waits when the queue is empty', async () => {
    const controller = new AbortController();
    const claim = queueOf(['report-a', null, 'report-b'], controller);
    const process = vi.fn(() => Promise.resolve());
    const waitForWork = vi.fn(() => Promise.resolve());
    const { logger, lines } = recordingLogger();

    const result = await serveReports({
      claim,
      process,
      processPdfVariant: () => Promise.resolve(false),
      waitForWork,
      stop: controller.signal,
      logger,
    });

    expect(result).toEqual({ completed: 2, failed: 0 });
    expect(process.mock.calls).toEqual([['report-a'], ['report-b']]);
    expect(waitForWork).toHaveBeenCalledWith(10_000, controller.signal);
    expect(lines.filter((line) => line.message === 'report delivered')).toHaveLength(2);
  });

  it('keeps serving after a report fails and logs its code', async () => {
    const controller = new AbortController();
    const claim = queueOf(['broken', 'fine'], controller);
    const process = vi.fn((reportId: string) =>
      reportId === 'broken'
        ? Promise.reject(new WorkerError('pdf_render_failed', 'Chromium crashed'))
        : Promise.resolve(),
    );
    const { logger, lines } = recordingLogger();

    const result = await serveReports({
      claim,
      process,
      processPdfVariant: () => Promise.resolve(false),
      waitForWork: () => Promise.resolve(),
      stop: controller.signal,
      logger,
    });

    expect(result).toEqual({ completed: 1, failed: 1 });
    expect(lines).toContainEqual(
      expect.objectContaining({
        message: 'report not delivered',
        report_id: 'broken',
        code: 'pdf_render_failed',
      }),
    );
  });

  it('waits and claims again when the database cannot be reached', async () => {
    const controller = new AbortController();
    const claim = queueOf([new Error('connection refused'), 'after-outage'], controller);
    const process = vi.fn(() => Promise.resolve());
    const waitForWork = vi.fn(() => Promise.resolve());
    const { logger, lines } = recordingLogger();

    const result = await serveReports({
      claim,
      process,
      processPdfVariant: () => Promise.resolve(false),
      waitForWork,
      stop: controller.signal,
      logger,
      pollIntervalMs: 50,
    });

    expect(result).toEqual({ completed: 1, failed: 0 });
    expect(waitForWork).toHaveBeenCalledWith(50, controller.signal);
    expect(lines).toContainEqual(expect.objectContaining({ message: 'report queue unreachable' }));
  });

  it('delivers on-demand PDFs and new report variants without draining either queue', async () => {
    const controller = new AbortController();
    const { logger } = recordingLogger();
    const deliveries: string[] = [];
    const variants = ['saved-ro', 'saved-en', 'another-saved-en'];
    const waitForWork = vi.fn(() => Promise.resolve());
    let nextReport = 1;

    const result = await serveReports({
      claim: () => {
        if (nextReport <= 5) return Promise.resolve(`new-${nextReport++}`);
        controller.abort();
        return Promise.resolve(null);
      },
      process: (reportId) => {
        deliveries.push(`report:${reportId}`);
        variants.push(`${reportId}-en`);
        return Promise.resolve();
      },
      processPdfVariant: () => {
        deliveries.push(`pdf:${variants.shift() ?? 'empty'}`);
        if (deliveries.length === 10) controller.abort();
        return Promise.resolve(true);
      },
      waitForWork,
      stop: controller.signal,
      logger,
    });

    expect(result).toEqual({ completed: 5, failed: 0 });
    expect(deliveries).toEqual([
      'report:new-1',
      'pdf:saved-ro',
      'report:new-2',
      'pdf:saved-en',
      'report:new-3',
      'pdf:another-saved-en',
      'report:new-4',
      'pdf:new-1-en',
      'report:new-5',
      'pdf:new-2-en',
    ]);
    expect(variants).toEqual(['new-3-en', 'new-4-en', 'new-5-en']);
    expect(waitForWork).not.toHaveBeenCalled();
  });

  it('continues processing PDFs when report claiming fails', async () => {
    const controller = new AbortController();
    const { logger, lines } = recordingLogger();
    const waitForWork = vi.fn(() => Promise.resolve());
    const result = await serveReports({
      claim: () => Promise.reject(new Error('report claim failed')),
      process: () => Promise.resolve(),
      processPdfVariant: () => {
        controller.abort();
        return Promise.resolve(true);
      },
      waitForWork,
      stop: controller.signal,
      logger,
    });

    expect(result).toEqual({ completed: 0, failed: 0 });
    expect(waitForWork).not.toHaveBeenCalled();
    expect(lines).toContainEqual(expect.objectContaining({ message: 'report queue unreachable' }));
  });

  it('finishes the report in progress before it stops', async () => {
    const controller = new AbortController();
    const claim = vi.fn(() => Promise.resolve('last'));
    const process = vi.fn(() => {
      controller.abort();
      return Promise.resolve();
    });
    const { logger } = recordingLogger();

    const result = await serveReports({
      claim,
      process,
      processPdfVariant: () => Promise.resolve(false),
      waitForWork: () => Promise.resolve(),
      stop: controller.signal,
      logger,
    });

    expect(result).toEqual({ completed: 1, failed: 0 });
    expect(claim).toHaveBeenCalledTimes(1);
  });
});

describe('createWorkSignal', () => {
  it('wakes a waiting worker as soon as a report is queued', async () => {
    const work = createWorkSignal();
    const stop = new AbortController();
    const waiting = work.wait(60_000, stop.signal);
    work.notify();
    await expect(waiting).resolves.toBeUndefined();
  });

  it('remembers a notification that arrived while the worker was busy', async () => {
    const work = createWorkSignal();
    work.notify();
    await expect(work.wait(60_000, new AbortController().signal)).resolves.toBeUndefined();
  });

  it('polls again when nothing was announced', async () => {
    vi.useFakeTimers();
    try {
      const work = createWorkSignal();
      const waiting = work.wait(10_000, new AbortController().signal);
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(waiting).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops waiting when the service shuts down', async () => {
    const work = createWorkSignal();
    const stop = new AbortController();
    const waiting = work.wait(60_000, stop.signal);
    stop.abort();
    await expect(waiting).resolves.toBeUndefined();
  });
});
