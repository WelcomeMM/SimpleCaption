import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Render outcome is reported via renderError; a failed render leaves
  // job.status === 'ready' (not 'error') so the editor stays usable.
  return NextResponse.json({
    status: job.status,
    renderProgress: job.renderProgress,
    error: job.renderError,
  });
}
