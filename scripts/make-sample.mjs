import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'data');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, 'sample.mp4');
const args = [
  '-y',
  '-f', 'lavfi', '-i', 'color=c=0x0a1a3a:s=1080x1920:d=3',
  '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
  '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
  out,
];
const code = await new Promise((res) => {
  if (!ffmpeg) { console.error('ffmpeg-static missing'); process.exit(1); }
  spawn(ffmpeg, args, { stdio: 'inherit' }).on('close', res);
});
if (code !== 0 || !fs.existsSync(out)) { console.error('sample generation failed'); process.exit(1); }
console.log('Sample written to', out);
