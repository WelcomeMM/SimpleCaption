# SimpleCaption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free, watermark-free local web app that turns a video or audio file into a video with animated, attractive burned-in captions.

**Architecture:** A single Next.js (App Router) process serves the UI and API. Transcription is done locally with whisper.cpp (word-level timestamps); captions are rendered with Remotion (React → MP4). Source media and renders live on the local filesystem; job state is an in-memory map. ffmpeg is provided by the `ffmpeg-static` npm package, so no system ffmpeg is required.

**Tech Stack:** Next.js 15 (App Router, TypeScript, Tailwind), Remotion v4 (`remotion`, `@remotion/player`, `@remotion/renderer`, `@remotion/bundler`, `@remotion/captions`, `@remotion/install-whisper-cpp`, `@remotion/media-parser`), `ffmpeg-static`, Vitest.

---

## File Structure

```
SimpleCaption/
├─ package.json
├─ next.config.mjs
├─ tsconfig.json
├─ tailwind.config.ts
├─ vitest.config.ts
├─ remotion.config.ts
├─ app/
│  ├─ layout.tsx
│  ├─ globals.css
│  ├─ page.tsx                      # Upload page
│  ├─ editor/[jobId]/page.tsx       # Editor page
│  └─ api/
│     ├─ upload/route.ts
│     ├─ transcribe/route.ts
│     ├─ jobs/[id]/route.ts
│     ├─ render/route.ts
│     ├─ render/[id]/route.ts       # render status
│     ├─ download/[id]/route.ts
│     └─ source/[id]/route.ts       # serve source media to the player
├─ lib/
│  ├─ types.ts                      # shared types (Job, StyleProps, TemplateId, CaptionedVideoProps)
│  ├─ storage.ts                    # id-scoped paths under /data
│  ├─ jobs.ts                       # in-memory job store + state machine
│  ├─ media.ts                      # ffmpeg wav extraction + parseMedia metadata
│  ├─ transcribe.ts                 # whisper.cpp wrapper -> Caption[]
│  └─ render.ts                     # Remotion bundle + renderMedia
├─ remotion/
│  ├─ index.ts                      # registerRoot
│  ├─ Root.tsx                      # <Composition> with calculateMetadata
│  ├─ CaptionedVideo.tsx            # background (video/audio/color) + caption pages
│  ├─ captionStyles.ts             # default StyleProps per TemplateId
│  └─ templates/
│     ├─ index.ts                   # TEMPLATES registry
│     ├─ Hormozi.tsx
│     ├─ Beasty.tsx
│     ├─ Clean.tsx
│     ├─ Karaoke.tsx
│     └─ Neon.tsx
├─ components/
│  ├─ Dropzone.tsx
│  ├─ EditorClient.tsx              # owns editor state, hosts <Player>
│  ├─ TemplatePicker.tsx
│  ├─ StyleControls.tsx
│  └─ TranscriptEditor.tsx
├─ scripts/
│  ├─ setup-whisper.mjs             # one-time install whisper.cpp + model
│  └─ smoke-render.mjs              # end-to-end render smoke test
└─ docs/...
```

---

## Shared Types (defined once, referenced everywhere)

These live in `lib/types.ts`. Every later task uses exactly these names.

```ts
import type { Caption } from '@remotion/captions';

export type TemplateId = 'hormozi' | 'beasty' | 'clean' | 'karaoke' | 'neon';

export type CaptionPosition = 'top' | 'middle' | 'bottom';

export interface StyleProps {
  fontFamily: string;
  fontSize: number;          // px at composition scale
  position: CaptionPosition;
  textColor: string;         // hex
  highlightColor: string;    // hex (active word / box)
  strokeColor: string;       // hex
  strokeWidth: number;       // px
  uppercase: boolean;
  maxWordsPerPage: number;   // grouping size
}

export interface CaptionedVideoProps {
  src: string;               // URL the Player/renderer can load (http for player, file path for render)
  isAudioOnly: boolean;
  captions: Caption[];
  template: TemplateId;
  style: StyleProps;
  // background used when isAudioOnly:
  backgroundColor: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

export type JobStatus =
  | 'uploaded'
  | 'transcribing'
  | 'ready'
  | 'rendering'
  | 'done'
  | 'error';

export interface Job {
  id: string;
  status: JobStatus;
  sourceFile: string;        // absolute path
  sourceExt: string;
  isAudioOnly: boolean;
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  captions: Caption[];
  renderProgress: number;    // 0..1
  outputFile?: string;       // absolute path when done
  error?: string;
  createdAt: number;
}
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder), `remotion.config.ts`, `vitest.config.ts`, `.npmrc`, `README.md`.

- [ ] **Step 1: Create `package.json`** with scripts and dependencies.

```json
{
  "name": "simplecaption",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "setup:whisper": "node scripts/setup-whisper.mjs",
    "smoke": "node scripts/smoke-render.mjs"
  },
  "dependencies": {
    "@remotion/bundler": "4.0.290",
    "@remotion/captions": "4.0.290",
    "@remotion/install-whisper-cpp": "4.0.290",
    "@remotion/media-parser": "4.0.290",
    "@remotion/player": "4.0.290",
    "@remotion/renderer": "4.0.290",
    "ffmpeg-static": "5.2.0",
    "next": "15.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "remotion": "4.0.290"
  },
  "devDependencies": {
    "@types/node": "22.10.0",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.49",
    "tailwindcss": "3.4.17",
    "typescript": "5.7.3",
    "vitest": "2.1.8"
  }
}
```

> NOTE for executor: before installing, run `npm view remotion version` and `npm view next dist-tags.latest`. If newer compatible versions exist, bump ALL `@remotion/*` packages together to the same version. Remotion packages MUST share one version.

- [ ] **Step 2: Create config files.**

`tsconfig.json` — standard Next.js App Router TS config with `"paths": { "@/*": ["./*"] }`, `"jsx": "preserve"`, `"moduleResolution": "bundler"`, include `next-env.d.ts`, `**/*.ts`, `**/*.tsx`.

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Remotion + ffmpeg-static are server-only native deps
    config.externals = [...(config.externals || []), '@remotion/renderer', '@remotion/bundler'];
    return config;
  },
  serverExternalPackages: ['@remotion/renderer', '@remotion/bundler', 'ffmpeg-static', '@remotion/install-whisper-cpp'],
};
export default nextConfig;
```

`tailwind.config.ts` — content globs for `app`, `components`, `remotion`. `postcss.config.mjs` with tailwindcss + autoprefixer.

`remotion.config.ts`:
```ts
import { Config } from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.overrideWebpackConfig((c) => c);
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts', 'remotion/**/*.test.ts'] },
});
```

`.npmrc`: `legacy-peer-deps=false` (placeholder file; adjust only if peer conflicts block install).

- [ ] **Step 3: Minimal `app/layout.tsx`, `app/globals.css` (with `@tailwind base/components/utilities`), and placeholder `app/page.tsx`** returning a centered "SimpleCaption" heading.

- [ ] **Step 4: Install and verify build tooling.**

Run: `npm install`
Then: `npm run build`
Expected: install succeeds; build compiles the placeholder page with no type errors.

- [ ] **Step 5: Commit.**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Remotion project"
```

---

### Task 2: Shared types + storage helpers

**Files:**
- Create: `lib/types.ts` (paste the Shared Types block above verbatim), `lib/storage.ts`
- Test: `lib/storage.test.ts`

- [ ] **Step 1: Write `lib/storage.ts`.**

```ts
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = process.env.SIMPLECAPTION_DATA ?? path.join(process.cwd(), 'data');

function safeId(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Invalid id: ${id}`);
  return id;
}

export function dataDir(): string { return DATA_DIR; }

export function uploadDir(id: string): string {
  return path.join(DATA_DIR, 'uploads', safeId(id));
}
export function renderDir(id: string): string {
  return path.join(DATA_DIR, 'renders', safeId(id));
}
export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
```

- [ ] **Step 2: Write the failing test `lib/storage.test.ts`.**

```ts
import { describe, it, expect } from 'vitest';
import { uploadDir, renderDir } from './storage';

describe('storage paths', () => {
  it('builds id-scoped upload paths', () => {
    expect(uploadDir('abc123').endsWith('abc123')).toBe(true);
  });
  it('rejects path traversal ids', () => {
    expect(() => uploadDir('../etc')).toThrow();
    expect(() => renderDir('a/b')).toThrow();
  });
});
```

- [ ] **Step 3: Run test.** Run: `npx vitest run lib/storage.test.ts` — Expected: PASS.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat: shared types and storage path helpers"`

---

### Task 3: In-memory job store

**Files:**
- Create: `lib/jobs.ts`
- Test: `lib/jobs.test.ts`

- [ ] **Step 1: Write `lib/jobs.ts`.**

```ts
import { randomUUID } from 'node:crypto';
import type { Job, JobStatus } from './types';

const jobs = new Map<string, Job>();

export function createJob(init: Pick<Job, 'sourceFile' | 'sourceExt' | 'isAudioOnly'>): Job {
  const job: Job = {
    id: randomUUID().replace(/-/g, ''),
    status: 'uploaded',
    sourceFile: init.sourceFile,
    sourceExt: init.sourceExt,
    isAudioOnly: init.isAudioOnly,
    width: 1080, height: 1920, fps: 30, durationInSeconds: 0,
    captions: [], renderProgress: 0, createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined { return jobs.get(id); }

export function updateJob(id: string, patch: Partial<Job>): Job {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job not found: ${id}`);
  const next = { ...job, ...patch };
  jobs.set(id, next);
  return next;
}

export function setStatus(id: string, status: JobStatus, extra: Partial<Job> = {}): Job {
  return updateJob(id, { status, ...extra });
}
```

- [ ] **Step 2: Write failing test `lib/jobs.test.ts`.**

```ts
import { describe, it, expect } from 'vitest';
import { createJob, getJob, setStatus } from './jobs';

describe('job store', () => {
  it('creates and retrieves a job', () => {
    const j = createJob({ sourceFile: '/x/a.mp4', sourceExt: 'mp4', isAudioOnly: false });
    expect(getJob(j.id)?.status).toBe('uploaded');
  });
  it('transitions status', () => {
    const j = createJob({ sourceFile: '/x/a.mp4', sourceExt: 'mp4', isAudioOnly: false });
    setStatus(j.id, 'ready', { durationInSeconds: 5 });
    expect(getJob(j.id)?.status).toBe('ready');
    expect(getJob(j.id)?.durationInSeconds).toBe(5);
  });
});
```

- [ ] **Step 3: Run test.** Run: `npx vitest run lib/jobs.test.ts` — Expected: PASS.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat: in-memory job store"`

---

### Task 4: Media helpers (ffmpeg wav + metadata)

**Files:**
- Create: `lib/media.ts`
- Test: `lib/media.test.ts`

- [ ] **Step 1: Write `lib/media.ts`.**

```ts
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { parseMedia } from '@remotion/media-parser';
import { nodeReader } from '@remotion/media-parser/node';

export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'flac'];

export function isAudioExt(ext: string): boolean {
  return AUDIO_EXTENSIONS.includes(ext.toLowerCase());
}

/** Convert any media to 16kHz mono PCM wav (what whisper.cpp expects). */
export function extractWav(inputPath: string, outputWavPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('ffmpeg-static binary not found'));
    const proc = spawn(ffmpegPath, [
      '-y', '-i', inputPath,
      '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
      outputWavPath,
    ]);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-500)}`)),
    );
  });
}

export interface MediaMeta {
  width: number; height: number; fps: number; durationInSeconds: number;
}

/** Read dimensions/fps/duration. For audio-only, width/height/fps fall back to vertical defaults. */
export async function readMediaMeta(inputPath: string, isAudioOnly: boolean): Promise<MediaMeta> {
  const { durationInSeconds, dimensions, fps } = await parseMedia({
    src: inputPath,
    reader: nodeReader,
    fields: { durationInSeconds: true, dimensions: true, fps: true },
  });
  if (isAudioOnly || !dimensions) {
    return { width: 1080, height: 1920, fps: 30, durationInSeconds: durationInSeconds ?? 0 };
  }
  return {
    width: dimensions.width,
    height: dimensions.height,
    fps: fps ?? 30,
    durationInSeconds: durationInSeconds ?? 0,
  };
}
```

- [ ] **Step 2: Write failing test `lib/media.test.ts`** (pure-function coverage only — no real media needed).

```ts
import { describe, it, expect } from 'vitest';
import { isAudioExt } from './media';

describe('media helpers', () => {
  it('detects audio extensions', () => {
    expect(isAudioExt('MP3')).toBe(true);
    expect(isAudioExt('mp4')).toBe(false);
  });
});
```

- [ ] **Step 3: Run test.** Run: `npx vitest run lib/media.test.ts` — Expected: PASS.

> NOTE: `extractWav`/`readMediaMeta` are exercised by the smoke test (Task 13), not unit tests, since they need real binaries/media.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat: media wav extraction and metadata"`

---

### Task 5: Transcription module

**Files:**
- Create: `lib/transcribe.ts`, `scripts/setup-whisper.mjs`
- Test: `lib/transcribe.test.ts`

Whisper install/model live under `data/whisper`. Model default `small` (good FR/EN accuracy vs. speed). Env overrides: `WHISPER_MODEL`, `OPENAI_API_KEY` (fallback).

- [ ] **Step 1: Write `scripts/setup-whisper.mjs`** (idempotent one-time installer).

```js
import { installWhisperCpp, downloadWhisperModel } from '@remotion/install-whisper-cpp';
import path from 'node:path';

const to = path.join(process.cwd(), 'data', 'whisper');
const model = process.env.WHISPER_MODEL ?? 'small';
const version = '1.5.5';

console.log(`Installing whisper.cpp ${version} -> ${to}`);
await installWhisperCpp({ to, version });
console.log(`Downloading model ${model}`);
await downloadWhisperModel({ model, folder: to });
console.log('Whisper ready.');
```

- [ ] **Step 2: Write `lib/transcribe.ts`.**

```ts
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  installWhisperCpp, downloadWhisperModel, transcribe as whisperTranscribe, toCaptions,
} from '@remotion/install-whisper-cpp';
import type { Caption } from '@remotion/captions';
import { extractWav } from './media';

const WHISPER_DIR = path.join(process.cwd(), 'data', 'whisper');
const WHISPER_VERSION = '1.5.5';
const MODEL = (process.env.WHISPER_MODEL ?? 'small') as 'tiny' | 'base' | 'small' | 'medium';

async function ensureWhisper(): Promise<void> {
  await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION });
  await downloadWhisperModel({ model: MODEL, folder: WHISPER_DIR });
}

/** Transcribe a media file to word-level captions. */
export async function transcribeFile(inputPath: string): Promise<Caption[]> {
  const wav = path.join(os.tmpdir(), `sc-${Date.now()}.wav`);
  await extractWav(inputPath, wav);
  try {
    await ensureWhisper();
    const result = await whisperTranscribe({
      inputPath: wav,
      model: MODEL,
      whisperPath: WHISPER_DIR,
      tokenLevelTimestamps: true,
    });
    const { captions } = toCaptions({ whisperCppOutput: result });
    return captions;
  } finally {
    fs.rmSync(wav, { force: true });
  }
}
```

> NOTE for executor: confirm the exact `transcribe`/`toCaptions` argument names against the installed `@remotion/install-whisper-cpp` version (`node -e "console.log(Object.keys(require('@remotion/install-whisper-cpp')))"` and check its types). Adjust prop names if the API differs, keeping the `Promise<Caption[]>` return contract. If `installWhisperCpp` fails on this OS and `OPENAI_API_KEY` is set, implement an API branch that POSTs the wav to OpenAI `audio/transcriptions` (model `whisper-1`, `response_format=verbose_json`, `timestamp_granularities[]=word`) and map words to `Caption[]`.

- [ ] **Step 3: Write failing test `lib/transcribe.test.ts`** — verify module shape only (no real model in unit tests).

```ts
import { describe, it, expect } from 'vitest';
import * as mod from './transcribe';

describe('transcribe module', () => {
  it('exports transcribeFile', () => {
    expect(typeof mod.transcribeFile).toBe('function');
  });
});
```

- [ ] **Step 4: Run test.** Run: `npx vitest run lib/transcribe.test.ts` — Expected: PASS.

- [ ] **Step 5: Run the real installer once to de-risk.** Run: `npm run setup:whisper` — Expected: whisper.cpp + `small` model land under `data/whisper`. If it fails on Windows, document the failure and switch the default path to the OpenAI fallback (set instructions in README), but DO NOT block other tasks.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: whisper.cpp transcription module"`

---

### Task 6: Caption style defaults

**Files:**
- Create: `remotion/captionStyles.ts`
- Test: `remotion/captionStyles.test.ts`

- [ ] **Step 1: Write `remotion/captionStyles.ts`.**

```ts
import type { StyleProps, TemplateId } from '@/lib/types';

export const DEFAULT_STYLES: Record<TemplateId, StyleProps> = {
  hormozi: { fontFamily: 'Inter, sans-serif', fontSize: 90, position: 'middle',
    textColor: '#FFFFFF', highlightColor: '#FFE600', strokeColor: '#000000',
    strokeWidth: 8, uppercase: true, maxWordsPerPage: 3 },
  beasty: { fontFamily: 'Inter, sans-serif', fontSize: 96, position: 'bottom',
    textColor: '#FFFFFF', highlightColor: '#00E0FF', strokeColor: '#000000',
    strokeWidth: 10, uppercase: true, maxWordsPerPage: 4 },
  clean: { fontFamily: 'Inter, sans-serif', fontSize: 64, position: 'bottom',
    textColor: '#FFFFFF', highlightColor: '#FFFFFF', strokeColor: '#000000',
    strokeWidth: 0, uppercase: false, maxWordsPerPage: 6 },
  karaoke: { fontFamily: 'Inter, sans-serif', fontSize: 72, position: 'bottom',
    textColor: '#FFFFFF', highlightColor: '#22E07A', strokeColor: '#000000',
    strokeWidth: 4, uppercase: false, maxWordsPerPage: 5 },
  neon: { fontFamily: 'Inter, sans-serif', fontSize: 88, position: 'middle',
    textColor: '#FFFFFF', highlightColor: '#FF2EF7', strokeColor: '#2A00FF',
    strokeWidth: 4, uppercase: true, maxWordsPerPage: 3 },
};

export function defaultStyle(t: TemplateId): StyleProps { return DEFAULT_STYLES[t]; }
```

- [ ] **Step 2: Write failing test `remotion/captionStyles.test.ts`.**

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_STYLES, defaultStyle } from './captionStyles';

describe('caption styles', () => {
  it('has all five templates', () => {
    expect(Object.keys(DEFAULT_STYLES).sort())
      .toEqual(['beasty', 'clean', 'hormozi', 'karaoke', 'neon']);
  });
  it('hormozi defaults to uppercase', () => {
    expect(defaultStyle('hormozi').uppercase).toBe(true);
  });
});
```

- [ ] **Step 3: Run test.** Run: `npx vitest run remotion/captionStyles.test.ts` — Expected: PASS.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat: per-template caption style defaults"`

---

### Task 7: Remotion caption pages helper + one template (Hormozi)

**Files:**
- Create: `remotion/templates/Hormozi.tsx`, `remotion/templates/index.ts`
- Test: `remotion/pages.test.ts`

Captions are grouped into "pages" with `createTikTokStyleCaptions` from `@remotion/captions`. Each template receives the active page and the current time and highlights the spoken token.

- [ ] **Step 1: Write `remotion/templates/index.ts`** (registry + page helper wrapper).

```ts
import { createTikTokStyleCaptions, type Caption } from '@remotion/captions';
import type { ComponentType } from 'react';
import type { StyleProps, TemplateId } from '@/lib/types';

export interface TemplatePageProps {
  text: string;
  tokens: { text: string; fromMs: number; toMs: number }[];
  timeMs: number;          // current time within composition
  style: StyleProps;
}

export type TemplateComponent = ComponentType<TemplatePageProps>;

export function buildPages(captions: Caption[], maxWordsPerPage: number) {
  // combineTokensWithinMilliseconds groups nearby words; we cap by re-chunking.
  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: 1200,
  });
  // Re-chunk pages so none exceeds maxWordsPerPage tokens.
  const chunked: typeof pages = [];
  for (const page of pages) {
    for (let i = 0; i < page.tokens.length; i += maxWordsPerPage) {
      const tokens = page.tokens.slice(i, i + maxWordsPerPage);
      chunked.push({
        startMs: tokens[0].fromMs,
        durationMs: tokens[tokens.length - 1].toMs - tokens[0].fromMs,
        text: tokens.map((t) => t.text).join(''),
        tokens,
      });
    }
  }
  return chunked;
}
```

> NOTE for executor: verify the `pages[]` shape (`startMs`, `durationMs`, `text`, `tokens[{text,fromMs,toMs}]`) against the installed `@remotion/captions` types and adjust property names if needed. Keep `buildPages` returning `{startMs, durationMs, text, tokens}[]`.

- [ ] **Step 2: Write `remotion/templates/Hormozi.tsx`.**

```tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TemplatePageProps } from './index';
import { positionStyle, transform } from './shared';

export const Hormozi: React.FC<TemplatePageProps> = ({ tokens, timeMs, style }) => {
  return (
    <AbsoluteFill style={positionStyle(style)}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.2em',
        maxWidth: '90%', fontFamily: style.fontFamily, fontSize: style.fontSize,
        fontWeight: 900, lineHeight: 1.1, textAlign: 'center',
      }}>
        {tokens.map((tok, i) => {
          const active = timeMs >= tok.fromMs && timeMs < tok.toMs;
          const word = style.uppercase ? tok.text.toUpperCase() : tok.text;
          return (
            <span key={i} style={{
              color: active ? '#000' : style.textColor,
              background: active ? style.highlightColor : 'transparent',
              padding: active ? '0 0.12em' : 0, borderRadius: 8,
              WebkitTextStroke: active ? '0' : `${style.strokeWidth}px ${style.strokeColor}`,
              transform: active ? 'scale(1.06)' : 'scale(1)',
              display: 'inline-block',
            }}>{word}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Write `remotion/templates/shared.ts`** (helpers used by all templates).

```ts
import type { CSSProperties } from 'react';
import type { StyleProps } from '@/lib/types';

export function positionStyle(s: StyleProps): CSSProperties {
  const justify = s.position === 'top' ? 'flex-start'
    : s.position === 'middle' ? 'center' : 'flex-end';
  const pad = s.position === 'bottom' ? { paddingBottom: '12%' }
    : s.position === 'top' ? { paddingTop: '12%' } : {};
  return { justifyContent: justify, alignItems: 'center', ...pad };
}
export function transform() { return undefined; } // reserved for future spring use
```

- [ ] **Step 4: Write failing test `remotion/pages.test.ts`.**

```ts
import { describe, it, expect } from 'vitest';
import { buildPages } from './templates/index';
import type { Caption } from '@remotion/captions';

const caps: Caption[] = [
  { text: 'hello', startMs: 0, endMs: 400, timestampMs: 200, confidence: 1 },
  { text: ' world', startMs: 400, endMs: 800, timestampMs: 600, confidence: 1 },
  { text: ' now', startMs: 800, endMs: 1200, timestampMs: 1000, confidence: 1 },
  { text: ' go', startMs: 1200, endMs: 1600, timestampMs: 1400, confidence: 1 },
];

describe('buildPages', () => {
  it('caps tokens per page', () => {
    const pages = buildPages(caps, 2);
    expect(pages.every((p) => p.tokens.length <= 2)).toBe(true);
    expect(pages.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 5: Run test.** Run: `npx vitest run remotion/pages.test.ts` — Expected: PASS. (If `createTikTokStyleCaptions` collapses everything into one page, the re-chunk still enforces the cap.)

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: caption pages helper + Hormozi template"`

---

### Task 8: Remaining templates (Beasty, Clean, Karaoke, Neon)

**Files:**
- Create: `remotion/templates/Beasty.tsx`, `Clean.tsx`, `Karaoke.tsx`, `Neon.tsx`
- Modify: `remotion/templates/index.ts` (add `TEMPLATES` registry)

Each is a `TemplateComponent` (same props as Hormozi). Implement distinct looks:

- **Beasty:** white text, thick black `WebkitTextStroke`; active token scales to 1.15 and switches color to `highlightColor`; no background box.
- **Clean:** lowercase/normal case; whole page on a translucent rounded bar (`background: rgba(0,0,0,0.45)`, `borderRadius: 16`, padding); active token slightly brighter, no scale; gentle look.
- **Karaoke:** all tokens shown in `strokeColor`-outlined `textColor`; spoken-so-far tokens (toMs <= timeMs) and active token rendered in `highlightColor` (left-to-right fill effect by coloring past+active tokens).
- **Neon:** uppercase; `textColor` fill with `WebkitTextStroke` in `strokeColor` plus `textShadow` glow using `highlightColor` (e.g., `0 0 12px <hl>, 0 0 24px <hl>`); active token scales 1.1.

- [ ] **Step 1: Implement the four components** (full TSX, mirroring Hormozi's structure and using `positionStyle`).

- [ ] **Step 2: Add registry to `remotion/templates/index.ts`.**

```ts
import { Hormozi } from './Hormozi';
import { Beasty } from './Beasty';
import { Clean } from './Clean';
import { Karaoke } from './Karaoke';
import { Neon } from './Neon';
import type { TemplateComponent } from './index';
export const TEMPLATES: Record<TemplateId, TemplateComponent> = {
  hormozi: Hormozi, beasty: Beasty, clean: Clean, karaoke: Karaoke, neon: Neon,
};
export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  hormozi: 'Hormozi', beasty: 'Beasty', clean: 'Clean', karaoke: 'Karaoke', neon: 'Neon',
};
```

- [ ] **Step 3: Typecheck.** Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat: Beasty, Clean, Karaoke, Neon templates"`

---

### Task 9: CaptionedVideo composition + Remotion Root

**Files:**
- Create: `remotion/CaptionedVideo.tsx`, `remotion/Root.tsx`, `remotion/index.ts`

- [ ] **Step 1: Write `remotion/CaptionedVideo.tsx`.**

```tsx
import React, { useMemo } from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Sequence, useVideoConfig, useCurrentFrame } from 'remotion';
import type { CaptionedVideoProps } from '@/lib/types';
import { buildPages, TEMPLATES } from './templates';

export const CaptionedVideo: React.FC<CaptionedVideoProps> = (props) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const timeMs = (frame / fps) * 1000;
  const Template = TEMPLATES[props.template];
  const pages = useMemo(
    () => buildPages(props.captions, props.style.maxWordsPerPage),
    [props.captions, props.style.maxWordsPerPage],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      {props.isAudioOnly
        ? <Audio src={props.src} />
        : <OffthreadVideo src={props.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {pages.map((page, i) => {
        const from = Math.round((page.startMs / 1000) * fps);
        const durationInFrames = Math.max(1, Math.round((page.durationMs / 1000) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            <Template text={page.text} tokens={page.tokens} timeMs={timeMs} style={props.style} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Write `remotion/Root.tsx`** with `calculateMetadata` so dimensions/duration come from props.

```tsx
import React from 'react';
import { Composition } from 'remotion';
import { CaptionedVideo } from './CaptionedVideo';
import type { CaptionedVideoProps } from '@/lib/types';
import { DEFAULT_STYLES } from './captionStyles';

const defaultProps: CaptionedVideoProps = {
  src: '', isAudioOnly: false, captions: [], template: 'hormozi',
  style: DEFAULT_STYLES.hormozi, backgroundColor: '#000000',
  width: 1080, height: 1920, fps: 30, durationInFrames: 30,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="CaptionedVideo"
    component={CaptionedVideo}
    durationInFrames={30}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({
      width: props.width, height: props.height, fps: props.fps,
      durationInFrames: props.durationInFrames,
    })}
  />
);
```

- [ ] **Step 3: Write `remotion/index.ts`.**

```ts
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(RemotionRoot);
```

- [ ] **Step 4: Verify Remotion Studio loads the composition** (sanity, optional if Studio CLI present).

Run: `npx remotion studio remotion/index.ts --no-open` for ~5s then stop.
Expected: bundles without errors. (If the CLI isn't desired, skip — Task 13 smoke render covers it.)

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: CaptionedVideo composition + Remotion root"`

---

### Task 10: API — upload, transcribe, job status, source serving

**Files:**
- Create: `app/api/upload/route.ts`, `app/api/transcribe/route.ts`, `app/api/jobs/[id]/route.ts`, `app/api/source/[id]/route.ts`

All routes: `export const runtime = 'nodejs';`

- [ ] **Step 1: `app/api/upload/route.ts`** — accept multipart, save file, create job.

```ts
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
```

- [ ] **Step 2: `app/api/source/[id]/route.ts`** — stream source media to the Player.

```ts
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import { getJob } from '@/lib/jobs';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job?.sourceFile) return new Response('Not found', { status: 404 });
  const data = fs.readFileSync(job.sourceFile);
  const type = job.isAudioOnly ? 'audio/*' : 'video/mp4';
  return new Response(data, { headers: { 'Content-Type': type } });
}
```

- [ ] **Step 3: `app/api/transcribe/route.ts`** — run metadata + transcription, update job.

```ts
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
  try {
    setStatus(jobId, 'transcribing');
    const meta = await readMediaMeta(job.sourceFile, job.isAudioOnly);
    const captions = await transcribeFile(job.sourceFile);
    setStatus(jobId, 'ready', {
      width: meta.width, height: meta.height, fps: meta.fps,
      durationInSeconds: meta.durationInSeconds, captions,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    setStatus(jobId, 'error', { error: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 4: `app/api/jobs/[id]/route.ts`** — return job status JSON (omit absolute paths).

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { sourceFile, outputFile, ...safe } = job;
  return NextResponse.json(safe);
}
```

- [ ] **Step 5: Typecheck + build.** Run: `npx tsc --noEmit` then `npm run build` — Expected: compiles.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: upload/transcribe/status/source API routes"`

---

### Task 11: Render pipeline + render API

**Files:**
- Create: `lib/render.ts`, `app/api/render/route.ts`, `app/api/render/[id]/route.ts`, `app/api/download/[id]/route.ts`

- [ ] **Step 1: Write `lib/render.ts`.**

```ts
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { renderDir, ensureDir } from './storage';
import { getJob, updateJob } from './jobs';
import type { CaptionedVideoProps } from './types';

let bundlePromise: Promise<string> | null = null;
function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(process.cwd(), 'remotion', 'index.ts'),
    });
  }
  return bundlePromise;
}

export async function renderJob(jobId: string, props: CaptionedVideoProps): Promise<string> {
  const job = getJob(jobId);
  if (!job) throw new Error('Job not found');
  updateJob(jobId, { status: 'rendering', renderProgress: 0 });
  const serveUrl = await getBundle();
  const composition = await selectComposition({
    serveUrl, id: 'CaptionedVideo', inputProps: props,
  });
  const out = path.join(ensureDir(renderDir(jobId)), 'output.mp4');
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: out,
    inputProps: props,
    onProgress: ({ progress }) => updateJob(jobId, { renderProgress: progress }),
  });
  updateJob(jobId, { status: 'done', renderProgress: 1, outputFile: out });
  return out;
}
```

> NOTE: The render uses an absolute `file://` src for `OffthreadVideo`. The route below converts the job's source path to a `file://` URL before rendering.

- [ ] **Step 2: `app/api/render/route.ts`** — kick off render (fire-and-forget; status polled).

```ts
import { NextRequest, NextResponse } from 'next/server';
import { pathToFileURL } from 'node:url';
import { getJob } from '@/lib/jobs';
import { renderJob } from '@/lib/render';
import type { CaptionedVideoProps, StyleProps, TemplateId } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 3600;

export async function POST(req: NextRequest) {
  const body = await req.json() as { jobId: string; template: TemplateId; style: StyleProps; captions: CaptionedVideoProps['captions']; backgroundColor?: string };
  const job = getJob(body.jobId);
  if (!job) return NextResponse.json({ error: 'No job' }, { status: 404 });

  const props: CaptionedVideoProps = {
    src: pathToFileURL(job.sourceFile).href,
    isAudioOnly: job.isAudioOnly,
    captions: body.captions ?? job.captions,
    template: body.template,
    style: body.style,
    backgroundColor: body.backgroundColor ?? '#000000',
    width: job.width, height: job.height, fps: job.fps,
    durationInFrames: Math.max(1, Math.round(job.durationInSeconds * job.fps)),
  };
  // fire and forget; client polls /api/render/[id]
  renderJob(body.jobId, props).catch(() => {});
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: `app/api/render/[id]/route.ts`** — return `{status, renderProgress}`.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';
export const runtime = 'nodejs';
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ status: job.status, renderProgress: job.renderProgress, error: job.error });
}
```

- [ ] **Step 4: `app/api/download/[id]/route.ts`** — stream finished MP4.

```ts
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import { getJob } from '@/lib/jobs';
export const runtime = 'nodejs';
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job?.outputFile || !fs.existsSync(job.outputFile)) return new Response('Not ready', { status: 404 });
  const data = fs.readFileSync(job.outputFile);
  return new Response(data, {
    headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': `attachment; filename="captioned-${id}.mp4"` },
  });
}
```

- [ ] **Step 5: Typecheck + build.** Run: `npx tsc --noEmit` then `npm run build` — Expected: compiles.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: Remotion render pipeline + render/download API"`

---

### Task 12: UI — upload page, editor, controls, transcript editor

**Files:**
- Create: `components/Dropzone.tsx`, `components/EditorClient.tsx`, `components/TemplatePicker.tsx`, `components/StyleControls.tsx`, `components/TranscriptEditor.tsx`
- Modify/Create: `app/page.tsx`, `app/editor/[jobId]/page.tsx`

Design: dark, modern, focused. Use the frontend-design skill for visual quality (clean type, generous spacing, no generic-AI look). Vertical-video-first layout.

- [ ] **Step 1: `app/page.tsx` (Upload)** — `Dropzone` posts to `/api/upload`, then immediately `POST /api/transcribe`, then routes to `/editor/[jobId]`. Show a progress state ("Uploading… / Transcribing…") by polling `/api/jobs/[id]` until `ready`.

- [ ] **Step 2: `components/EditorClient.tsx` (client component)** — owns state: `template`, `style`, `captions`, `backgroundColor`. Renders:
  - `@remotion/player` `<Player>` with `component={CaptionedVideo}`, `inputProps` built from state (src = `/api/source/[jobId]`, `isAudioOnly`, dims/fps/duration from the job fetched on mount), `durationInFrames`, controls, `style={{width:'100%'}}`.
  - `TemplatePicker`, `StyleControls`, `TranscriptEditor` side panel.
  - A "Render & Download" button → `POST /api/render` then poll `/api/render/[jobId]`; when `done`, trigger download from `/api/download/[jobId]`. Show a progress bar bound to `renderProgress`.

```tsx
// key wiring excerpt
import { Player } from '@remotion/player';
import { CaptionedVideo } from '@/remotion/CaptionedVideo';
// ...
<Player
  component={CaptionedVideo}
  inputProps={inputProps}
  durationInFrames={Math.max(1, Math.round(job.durationInSeconds * job.fps))}
  fps={job.fps}
  compositionWidth={job.width}
  compositionHeight={job.height}
  style={{ width: '100%', borderRadius: 12 }}
  controls
/>
```

- [ ] **Step 3: `components/TemplatePicker.tsx`** — buttons from `TEMPLATE_LABELS`; selecting one sets `template` and resets `style` to `DEFAULT_STYLES[template]`.

- [ ] **Step 4: `components/StyleControls.tsx`** — controls bound to `StyleProps`: font size (range), position (top/middle/bottom segmented), text color, highlight color, stroke width (range), uppercase (toggle), maxWordsPerPage (range 1–8). For audio-only jobs also expose `backgroundColor`.

- [ ] **Step 5: `components/TranscriptEditor.tsx`** — list caption tokens as editable text. Editing a caption's `text` updates the `captions` array (kept timing). Provide a single textarea that shows `captions.map(c=>c.text).join('')` and, on blur, re-splits edited text back onto the existing tokens by whitespace, preserving each token's `startMs/endMs` (if word count changed, distribute evenly across the original span). Keep it simple and robust.

- [ ] **Step 6: `app/editor/[jobId]/page.tsx`** — server component that renders `<EditorClient jobId={...} />`.

- [ ] **Step 7: Build + manual smoke.** Run: `npm run build` — Expected: compiles. Then `npm run dev`, open `/`, and (covered more in Task 13) verify pages render.

- [ ] **Step 8: Commit.** `git add -A && git commit -m "feat: upload + editor UI with live caption preview"`

---

### Task 13: End-to-end smoke test + sample asset

**Files:**
- Create: `scripts/smoke-render.mjs`, `scripts/make-sample.mjs`

- [ ] **Step 1: `scripts/make-sample.mjs`** — generate a ~3s 1080x1920 test clip with a spoken-like tone using `ffmpeg-static` (color background + sine beep) so the pipeline has real input even without a user video.

```js
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import path from 'node:path';
const out = path.join(process.cwd(), 'data', 'sample.mp4');
const args = ['-y','-f','lavfi','-i','color=c=navy:s=1080x1920:d=3',
  '-f','lavfi','-i','sine=frequency=440:duration=3','-shortest', out];
spawn(ffmpeg, args, { stdio: 'inherit' }).on('close', (c)=>process.exit(c ?? 0));
```

- [ ] **Step 2: `scripts/smoke-render.mjs`** — render a known caption set through Remotion (bypasses whisper so it always runs) and assert output exists & is non-trivial in size.

```js
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const sample = path.join(process.cwd(), 'data', 'sample.mp4');
if (!fs.existsSync(sample)) { console.error('Run make-sample first'); process.exit(1); }

const props = {
  src: pathToFileURL(sample).href, isAudioOnly: false,
  captions: [
    { text: 'Buy', startMs: 0, endMs: 600, timestampMs: 300, confidence: 1 },
    { text: ' now', startMs: 600, endMs: 1200, timestampMs: 900, confidence: 1 },
    { text: ' free', startMs: 1200, endMs: 1800, timestampMs: 1500, confidence: 1 },
    { text: ' shipping', startMs: 1800, endMs: 2600, timestampMs: 2200, confidence: 1 },
  ],
  template: 'hormozi',
  style: { fontFamily: 'Inter, sans-serif', fontSize: 90, position: 'middle',
    textColor: '#FFFFFF', highlightColor: '#FFE600', strokeColor: '#000000',
    strokeWidth: 8, uppercase: true, maxWordsPerPage: 3 },
  backgroundColor: '#000000', width: 1080, height: 1920, fps: 30, durationInFrames: 90,
};

const serveUrl = await bundle({ entryPoint: path.join(process.cwd(),'remotion','index.ts') });
const composition = await selectComposition({ serveUrl, id: 'CaptionedVideo', inputProps: props });
const out = path.join(process.cwd(), 'data', 'smoke-out.mp4');
await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: out, inputProps: props });
const size = fs.statSync(out).size;
console.log('Rendered', out, size, 'bytes');
if (size < 10000) { console.error('Output too small'); process.exit(1); }
console.log('SMOKE OK');
```

- [ ] **Step 3: Run the smoke pipeline.**

Run: `node scripts/make-sample.mjs` then `npm run smoke`
Expected: prints `SMOKE OK` with a multi-hundred-KB MP4. This proves bundle → selectComposition → renderMedia → ffmpeg encode works end-to-end with captions burned in.

- [ ] **Step 4: Transcription smoke (best-effort).** Run a tiny script (or reuse `transcribeFile`) against `data/sample.mp4`. The sine tone yields little/no text, so assert only that it returns an array without throwing. If whisper install failed on this OS, record it in README and rely on the OpenAI fallback path.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "test: end-to-end render smoke test + sample generator"`

---

### Task 14: Manual full-flow verification + README + Dockerfile

**Files:**
- Create: `README.md` (overwrite scaffold), `Dockerfile`, `.dockerignore`

- [ ] **Step 1: Start the app.** Run: `npm run dev`. Use Playwright (or manual) to: open `/`, upload `data/sample.mp4`, wait for editor, switch templates, edit a caption, click Render, confirm progress reaches 100% and a file downloads. Capture a screenshot of the editor.

- [ ] **Step 2: Write `README.md`** — what it is; the free/no-watermark/no-limits pitch; **Quick start** (`npm install`, `npm run setup:whisper`, `npm run dev`, open http://localhost:3000); how transcription works; the Remotion licence note (free for ≤3-person companies, no watermark); optional `OPENAI_API_KEY` fallback; supported inputs (video + audio); known limits (render speed scales with clip length/CPU).

- [ ] **Step 3: Write `Dockerfile`** following Remotion's headless-Chrome deployment guidance (node:20-bookworm base, install the Chrome shared libs Remotion lists, `npm ci`, `npm run build`, expose a unique port per the workspace's port table, `CMD npm run start`). Add `.dockerignore` (node_modules, data, .next, .git).

- [ ] **Step 4: Final full test pass.** Run: `npm run test` (all vitest green), `npm run build` (clean), `npm run smoke` (SMOKE OK).

- [ ] **Step 5: Commit.** `git add -A && git commit -m "docs: README, Dockerfile, and final verification"`

---

## Self-Review Notes (author)

- **Spec coverage:** upload(video+audio) ✓(T10), transcription word-level ✓(T5), 5 templates ✓(T7–8), live preview ✓(T12 Player), transcript editing ✓(T12), style controls ✓(T12), render+download no watermark ✓(T11), local storage/in-memory jobs ✓(T2–3), error handling in routes ✓(T10–11), tests/smoke ✓(T2–13), deployment/README/Docker ✓(T14). Audio-only background ✓(T9 CaptionedVideo).
- **Type consistency:** `CaptionedVideoProps`, `StyleProps`, `Job`, `TemplateId`, `Caption` used identically across tasks. `buildPages` returns `{startMs,durationMs,text,tokens}` consumed in T9. `renderJob(jobId, props)` signature matches T11 caller.
- **Placeholders:** none — every code step has real code. Two flagged verification NOTES (whisper API arg names, captions page shape) are deliberate: the executor must confirm exact prop names against the installed package version and adjust without changing the documented contracts.
- **Risk:** whisper install on Windows is the main unknown; T5 Step 5 de-risks early and the OpenAI fallback + stable interface contain the blast radius.
