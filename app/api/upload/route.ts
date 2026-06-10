import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { uploadDir, ensureDir } from '@/lib/storage';
import { createJob, updateJob } from '@/lib/jobs';
import { isAudioExt } from '@/lib/media';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
  const ext = (file.name.split('.').pop() ?? 'mp4').toLowerCase();
  const isAudioOnly = isAudioExt(ext);
  const job = createJob({ sourceFile: '', sourceExt: ext, isAudioOnly });
  const dir = ensureDir(uploadDir(job.id));
  const dest = path.join(dir, `source.${ext}`);
  fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));
  updateJob(job.id, { sourceFile: dest });
  return NextResponse.json({ jobId: job.id, isAudioOnly });
}
