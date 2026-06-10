import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';
import { renderJob } from '@/lib/render';
import type { CaptionedVideoProps, StyleProps, TemplateId } from '@/lib/types';
import type { Caption } from '@remotion/captions';

export const runtime = 'nodejs';
export const maxDuration = 3600;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    jobId: string; template: TemplateId; style: StyleProps;
    captions?: Caption[]; backgroundColor?: string;
  };
  const job = getJob(body.jobId);
  if (!job) return NextResponse.json({ error: 'No job' }, { status: 404 });
  if (job.status === 'rendering') return NextResponse.json({ ok: true });

  const origin = req.nextUrl.origin; // e.g. http://localhost:3000
  const props: CaptionedVideoProps = {
    src: `${origin}/api/source/${job.id}`,
    isAudioOnly: job.isAudioOnly,
    captions: body.captions ?? job.captions,
    template: body.template,
    style: body.style,
    backgroundColor: body.backgroundColor ?? '#000000',
    width: job.width, height: job.height, fps: job.fps,
    durationInFrames: Math.max(1, Math.round(job.durationInSeconds * job.fps)),
  };
  // renderJob owns its own error state (sets job.renderError, keeps job usable).
  renderJob(body.jobId, props).catch(() => {});
  return NextResponse.json({ ok: true });
}
