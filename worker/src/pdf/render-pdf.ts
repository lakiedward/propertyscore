import { chromium, type Page, type Route } from 'playwright-core';

import { WorkerError } from '../lib/errors.ts';

export type PdfAsset = { contentType: string; body: Buffer | string };

export type PdfDocument = {
  html: string;
  assets: ReadonlyMap<string, PdfAsset>;
  allowedHosts: readonly string[];
  layoutWidthPx?: number;
};

export type RenderPdfOptions = {
  executablePath?: string;
  timeoutMs?: number;
};

const DOCUMENT_ORIGIN = 'https://document.pdf.invalid';
const DOCUMENT_PATH = '/index.html';
const DEFAULT_TIMEOUT_MS = 90_000;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const CANVAS_SCALE = 2;
const READY_EXPRESSION = 'document.fonts.ready.then(() => globalThis.pdfReady)';
const CHROMIUM_ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'];

async function answer(route: Route, document: PdfDocument): Promise<void> {
  const url = new URL(route.request().url());
  if (url.origin !== DOCUMENT_ORIGIN) {
    if (document.allowedHosts.includes(url.hostname)) await route.continue();
    else await route.abort('blockedbyclient');
    return;
  }
  if (url.pathname === DOCUMENT_PATH) {
    await route.fulfill({ contentType: 'text/html; charset=utf-8', body: document.html });
    return;
  }
  const asset = document.assets.get(url.pathname);
  if (!asset) {
    await route.fulfill({ status: 404, body: '' });
    return;
  }
  await route.fulfill({ contentType: asset.contentType, body: asset.body });
}

async function waitUntilReady(page: Page, timeoutMs: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new WorkerError('pdf_document_not_ready', 'The document did not finish drawing'));
    }, timeoutMs);
  });
  try {
    await Promise.race([page.evaluate(READY_EXPRESSION), expired]);
  } finally {
    clearTimeout(timer);
  }
}

export async function renderPdf(
  document: PdfDocument,
  options: RenderPdfOptions = {},
): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const browser = await chromium
    .launch({ executablePath: options.executablePath, args: CHROMIUM_ARGS })
    .catch((error: unknown) => {
      throw new WorkerError('pdf_browser_not_started', 'Chromium could not be started', {
        cause: error,
      });
    });
  try {
    const scale = A4_WIDTH_PX / (document.layoutWidthPx ?? A4_WIDTH_PX);
    const page = await browser.newPage({
      viewport: {
        width: Math.round(A4_WIDTH_PX / scale),
        height: Math.round(A4_HEIGHT_PX / scale),
      },
      deviceScaleFactor: CANVAS_SCALE,
    });
    await page.emulateMedia({ media: 'print' });
    page.setDefaultTimeout(timeoutMs);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/*', (route) => answer(route, document));
    await page.goto(`${DOCUMENT_ORIGIN}${DOCUMENT_PATH}`, { waitUntil: 'load' });
    await waitUntilReady(page, timeoutMs);
    if (pageErrors.length > 0) {
      throw new WorkerError('pdf_page_failed', 'The document page raised a script error', {
        cause: new Error(pageErrors.join('\n')),
      });
    }
    return await page.pdf({ preferCSSPageSize: true, printBackground: true, scale });
  } catch (error) {
    if (error instanceof WorkerError) throw error;
    throw new WorkerError('pdf_render_failed', 'The PDF could not be rendered', { cause: error });
  } finally {
    await browser.close();
  }
}
