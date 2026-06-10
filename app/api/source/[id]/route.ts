import { NextRequest } from 'next/server';
import fs from 'node:fs';
import { getJob } from '@/lib/jobs';
import { Readable } from 'node:stream';

export const runtime = 'nodejs';

function contentType(ext: string, isAudio: boolean): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac',
    ogg: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac',
  };
  return map[ext] ?? (isAudio ? 'audio/mpeg' : 'video/mp4');
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job?.sourceFile || !fs.existsSync(job.sourceFile)) return new Response('Not found', { status: 404 });
  const size = fs.statSync(job.sourceFile).size;
  const type = contentType(job.sourceExt, job.isAudioOnly);
  const range = req.headers.get('range');
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    // Clamp end to the last byte (RFC 7233) so Content-Length never overstates the body.
    const end = Math.min(m && m[2] ? parseInt(m[2], 10) : size - 1, size - 1);
    const stream = fs.createReadStream(job.sourceFile, { start, end });
    return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
      },
    });
  }
  const stream = fs.createReadStream(job.sourceFile);
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    status: 200,
    headers: { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': String(size) },
  });
}
