import { NextRequest } from 'next/server';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { getJob } from '@/lib/jobs';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job?.outputFile || !fs.existsSync(job.outputFile)) return new Response('Not ready', { status: 404 });
  const size = fs.statSync(job.outputFile).size;
  const stream = fs.createReadStream(job.outputFile);
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(size),
      'Content-Disposition': `attachment; filename="captioned-${id}.mp4"`,
    },
  });
}
