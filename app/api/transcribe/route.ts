import { NextRequest, NextResponse } from 'next/server';
import { getJob, setStatus } from '@/lib/jobs';
import { readMediaMeta } from '@/lib/media';
import { transcribeFile } from '@/lib/transcribe';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobId } = body;
  const rawLanguage: unknown = body.language;
  const language = typeof rawLanguage === 'string' && rawLanguage.length > 0 && rawLanguage.length <= 20
    ? rawLanguage as import('@remotion/install-whisper-cpp').Language
    : 'auto' as const;
  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: 'No job' }, { status: 404 });
  if (job.status === 'transcribing') return NextResponse.json({ ok: true });
  setStatus(jobId, 'transcribing');
  // run in background; client polls /api/jobs/[id]
  (async () => {
    try {
      const meta = await readMediaMeta(job.sourceFile, job.isAudioOnly);
      const captions = await transcribeFile(job.sourceFile, language);
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
