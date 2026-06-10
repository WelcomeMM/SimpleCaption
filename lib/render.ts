import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { renderDir, ensureDir } from './storage';
import { getJob, updateJob } from './jobs';
import type { CaptionedVideoProps } from './types';

let bundlePromise: Promise<string> | null = null;
function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({ entryPoint: path.join(process.cwd(), 'remotion', 'index.ts') });
  }
  return bundlePromise;
}

export async function renderJob(jobId: string, props: CaptionedVideoProps): Promise<string> {
  const job = getJob(jobId);
  if (!job) throw new Error('Job not found');
  updateJob(jobId, { status: 'rendering', renderProgress: 0 });
  const serveUrl = await getBundle();
  const inputProps = props as unknown as Record<string, unknown>;
  const composition = await selectComposition({ serveUrl, id: 'CaptionedVideo', inputProps });
  const out = path.join(ensureDir(renderDir(jobId)), 'output.mp4');
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: out, inputProps,
    onProgress: ({ progress }) => updateJob(jobId, { renderProgress: progress }),
  });
  updateJob(jobId, { status: 'done', renderProgress: 1, outputFile: out });
  return out;
}
