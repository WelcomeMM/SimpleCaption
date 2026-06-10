import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

const sample = path.join(process.cwd(), 'data', 'sample.mp4');
if (!fs.existsSync(sample)) {
  console.error('Run `node scripts/make-sample.mjs` first.');
  process.exit(1);
}

// Serve the sample over HTTP (OffthreadVideo cannot read file://)
const server = http.createServer((_req, res) => {
  const stat = fs.statSync(sample);
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': stat.size });
  fs.createReadStream(sample).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const src = `http://localhost:${server.address().port}/sample.mp4`;

const props = {
  src, isAudioOnly: false,
  captions: [
    { text: 'Buy', startMs: 0, endMs: 600, timestampMs: 300, confidence: 1 },
    { text: ' now', startMs: 600, endMs: 1200, timestampMs: 900, confidence: 1 },
    { text: ' free', startMs: 1200, endMs: 1800, timestampMs: 1500, confidence: 1 },
    { text: ' shipping', startMs: 1800, endMs: 3000, timestampMs: 2400, confidence: 1 },
  ],
  template: 'hormozi',
  style: { fontFamily: 'Inter, sans-serif', fontSize: 90, position: 'middle',
    textColor: '#FFFFFF', highlightColor: '#FFE600', strokeColor: '#000000',
    strokeWidth: 8, uppercase: true, maxWordsPerPage: 3 },
  backgroundColor: '#000000', width: 1080, height: 1920, fps: 30, durationInFrames: 90,
};

console.log('Bundling…');
const serveUrl = await bundle({ entryPoint: path.join(process.cwd(), 'remotion', 'index.ts') });
console.log('Selecting composition…');
const composition = await selectComposition({ serveUrl, id: 'CaptionedVideo', inputProps: props, port: await getFreePort() });
const out = path.join(process.cwd(), 'data', 'smoke-out.mp4');
console.log('Rendering…');
await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: out, inputProps: props, port: await getFreePort() });
const size = fs.statSync(out).size;
server.close();
console.log('Rendered', out, size, 'bytes');
if (size < 10000) { console.error('Output too small — render likely failed'); process.exit(1); }
console.log('SMOKE OK');
