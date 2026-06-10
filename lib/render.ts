import path from 'node:path';
import net from 'node:net';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { renderDir, ensureDir } from './storage';
import { getJob, updateJob } from './jobs';
import type { CaptionedVideoProps } from './types';

// Remotion's renderer serves the bundle over an internal HTTP server whose
// default port is 3000 — the SAME port this Next.js app runs on. If we let it
// default, headless Chrome navigates to the Next server instead of the bundle
// and rendering fails ("not a valid Remotion project"). We therefore hand
// Remotion a guaranteed-free ephemeral port for every server it starts.
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

let bundlePromise: Promise<string> | null = null;
function getBundle(): Promise<string> {
  if (!bundlePromise) {
    const entry = path.join(process.cwd(), 'remotion', 'index.ts');
    bundlePromise = bundle({ entryPoint: entry }).catch((e) => {
      bundlePromise = null; // allow retry on next render
      throw e;
    });
  }
  return bundlePromise;
}

export async function renderJob(jobId: string, props: CaptionedVideoProps): Promise<string> {
  const job = getJob(jobId);
  if (!job) throw new Error('Job not found');
  updateJob(jobId, { status: 'rendering', renderProgress: 0, renderError: undefined });

  const inputProps = props as unknown as Record<string, unknown>;

  try {
    const serveUrl = await getBundle();

    const composition = await selectComposition({
      serveUrl,
      id: 'CaptionedVideo',
      inputProps,
      port: await getFreePort(),
    });

    const out = path.join(ensureDir(renderDir(jobId)), 'output.mp4');
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: out,
      inputProps,
      port: await getFreePort(),
      onProgress: ({ progress }) => updateJob(jobId, { renderProgress: progress }),
    });

    updateJob(jobId, { status: 'done', renderProgress: 1, outputFile: out });
    return out;
  } catch (e) {
    // A render failure must NOT poison the job: keep it 'ready' so the editor
    // stays usable, and surface the problem via renderError only.
    updateJob(jobId, {
      status: 'ready',
      renderProgress: 0,
      renderError: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
