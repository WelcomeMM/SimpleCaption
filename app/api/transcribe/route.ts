import { NextRequest, NextResponse } from 'next/server';
import { getJob, setStatus } from '@/lib/jobs';
import { readMediaMeta } from '@/lib/media';
import { transcribeFile } from '@/lib/transcribe';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: 'No job' }, { status: 404 });
  if (job.status === 'transcribing') return NextResponse.json({ ok: true });
  setStatus(jobId, 'transcribing');
  // run in background; client polls /api/jobs/[id]
  (async () => {
    try {
      const meta = await readMediaMeta(job.sourceFile, job.isAudioOnly);
      const captions = await transcribeFile(job.sourceFile);
      setStatus(jobId, 'ready', {
        width: meta.width, height: meta.height, fps: meta.fps,
        durationInSeconds: meta.durationInSeconds, captions,
      });
    } catch (e) {
      setStatus(jobId, 'error', { error: (e as Error).message });
    }
  })();
  return NextResponse.json({ ok: true });
}
