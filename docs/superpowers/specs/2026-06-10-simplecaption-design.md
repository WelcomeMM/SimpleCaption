# SimpleCaption — Design Document

**Date:** 2026-06-10
**Status:** Approved (autonomous — user delegated all decisions while away)
**Author:** Claude (orchestrator)

## 1. Problem

The user runs an e-commerce business and produces many creative videos for
Facebook ads. Existing caption tools are unsatisfactory:

- **CapCut** — free tier caps auto-captions at ~2–3 videos/month.
- **Veed / Vidyo.ai etc.** — good output but stamp a **watermark** on the
  exported video.

They want a **simple, free, watermark-free, unlimited** tool that turns a video
(or a voice/audio clip) into a video with **animated, attractive captions**
burned in — the CapCut / Submagic / Hormozi style that performs well in ads.

## 2. Goals & Non-Goals

### Goals
- Upload a video **or** an audio file.
- Automatically transcribe speech with **word-level timing** (FR + EN).
- Preview the result live with several **animated caption templates**.
- **Edit the transcript** (fix recognition errors) and basic styling (font,
  size, position, colours, highlight, words-per-line).
- **Render and download** a final MP4 with captions baked in — **no watermark,
  no limits, no per-video cost.**

### Non-Goals (YAGNI)
- No multi-user accounts, no database, no billing.
- No cloud storage of user videos (everything stays local to the running
  instance).
- No timeline/multi-track video editing — captions only.
- No translation/dubbing (could be a future add-on).

## 3. Key Decisions & Rationale

| Decision | Choice | Why |
|---|---|---|
| Caption render engine | **Remotion v4** (React → MP4) | Best-in-class *animated* captions; **no watermark**; **free** for individuals & companies ≤ 3 people (user qualifies); bundles its own ffmpeg so no separate install. |
| Transcription | **whisper.cpp** via `@remotion/install-whisper-cpp` | Free, local, no API key, **word-level timestamps** (needed for word-pop/karaoke). Auto language detection. All-Node. |
| Transcription fallback | OpenAI Whisper API (env-gated, optional) | Safety net if local whisper build is troublesome on a given OS. Same `Caption[]` output shape, so it is a drop-in. |
| App framework | **Next.js (App Router)** | One process serves UI + API + Remotion render; user's stack & Dokploy/Docker infra already use Next.js. |
| Storage | **Local filesystem** (`/data/uploads`, `/data/renders`) + in-memory job map | Single-user tool; a DB would be over-engineering. |
| Captions data model | Remotion `@remotion/captions` `Caption[]` | Standard, word/token-level, integrates with `@remotion/install-whisper-cpp` output directly. |

**Licensing note for the user:** Remotion is free for individuals and companies
with up to 3 employees, and never adds a watermark. As a solo operator you are
fully covered. Only if SimpleCaption were used inside a company of 4+ people
would a Remotion company licence be required.

## 4. Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Next.js app (single Node process)                           │
│                                                              │
│  UI (React)                       API routes (route.ts)      │
│  ├─ / (Upload)            ──────▶ POST /api/upload           │
│  ├─ /editor/[jobId]               POST /api/transcribe       │
│  │   ├─ Remotion <Player>         GET  /api/jobs/[id]        │
│  │   ├─ Template picker           POST /api/render           │
│  │   ├─ Style controls            GET  /api/render/[id]/...  │
│  │   └─ Transcript editor         GET  /api/download/[id]    │
│                                                              │
│  lib/                                                        │
│  ├─ transcribe.ts   (whisper.cpp wrapper → Caption[])        │
│  ├─ jobs.ts         (in-memory job store + status)           │
│  ├─ render.ts       (Remotion renderMedia → mp4)             │
│  └─ storage.ts      (paths under /data)                      │
│                                                              │
│  remotion/  (the video program)                              │
│  ├─ Root.tsx        (registerRoot, compositions)             │
│  ├─ CaptionedVideo.tsx (video + caption overlay driver)      │
│  └─ templates/      (Hormozi, Beasty, Clean, Karaoke, Neon)  │
└────────────────────────────────────────────────────────────┘
```

### Data flow (happy path)
1. **Upload** — user drops a video/audio file → `POST /api/upload` saves it to
   `/data/uploads/<jobId>/source.<ext>`, creates a job, returns `jobId`.
2. **Transcribe** — client calls `POST /api/transcribe` → server extracts 16 kHz
   wav (Remotion's bundled ffmpeg), runs whisper.cpp, converts output to
   `Caption[]`, stores it on the job. Status polled via `GET /api/jobs/[id]`.
3. **Edit & preview** — `/editor/[jobId]` loads the source video + captions into
   a Remotion `<Player>`. User picks a template, tweaks style, and edits caption
   text inline. All of this is **instant client-side preview** (no re-render).
4. **Render** — `POST /api/render` runs Remotion `renderMedia` server-side with
   the chosen props → `/data/renders/<jobId>/output.mp4`. Progress polled.
5. **Download** — `GET /api/download/[id]` streams the finished MP4.

### Job state machine
`uploaded → transcribing → ready → rendering → done` (plus `error`).
Jobs live in an in-memory `Map` (process-lifetime). Files persist on disk; a
small cleanup removes renders older than N hours on startup.

## 5. Caption Templates (the "attractive" part)

Each template is a small Remotion component driven by the same `Caption[]` +
style props, so they are interchangeable. Initial set tuned for FB ads:

1. **Hormozi** — big bold uppercase, one/few words at a time, active word in a
   filled highlight box (yellow/green), subtle pop-in scale.
2. **Beasty** — bold white with thick black stroke, current word scales up +
   colour accent (MrBeast style).
3. **Clean** — readable white text on a soft rounded translucent bar, gentle
   fade — for premium/brand spots.
4. **Karaoke** — line of words, the spoken word fills with the accent colour in
   sync (classic word-fill).
5. **Neon/Gradient** — outlined gradient text with glow, energetic spring pop.

Shared style props: font family, font size, position (top/middle/bottom),
text colour, highlight colour, stroke, max words per caption chunk, uppercase.

## 6. Components / Modules (isolation boundaries)

| Module | Does | Used via | Depends on |
|---|---|---|---|
| `lib/transcribe.ts` | audio → `Caption[]` | `transcribe(src, opts)` | whisper.cpp, ffmpeg (Remotion) |
| `lib/jobs.ts` | job lifecycle & status | `createJob`, `getJob`, `updateJob` | — |
| `lib/render.ts` | props → MP4 path + progress | `renderJob(jobId, props, onProgress)` | `@remotion/renderer` |
| `lib/storage.ts` | path helpers under `/data` | `uploadPath(...)` etc. | fs |
| `remotion/CaptionedVideo.tsx` | drives video + active template | Remotion composition | templates |
| `remotion/templates/*` | one visual style each | template registry | `@remotion/captions` |
| API routes | thin HTTP glue | fetch from UI | the libs above |
| `app/editor` UI | preview + controls + transcript edit | pages/components | `@remotion/player` |

Each module has one purpose and a narrow interface; templates and transcription
backends are swappable without touching consumers.

## 7. Error Handling
- Upload: validate type (video/* or audio/*) and size cap; reject early.
- Transcribe: if whisper fails, job → `error` with message; UI shows retry. If
  `OPENAI_API_KEY` is set and local whisper is unavailable, use API fallback.
- Render: surface Remotion progress and failures; keep partial logs per job.
- Files: all under `/data`; path-traversal-safe id-scoped paths.

## 8. Testing Strategy
- **Unit:** caption conversion (whisper tokens → `Caption[]` chunking), style
  prop resolution, job state transitions. (Vitest)
- **Render smoke test:** a tiny script renders a 2–3 s clip with a known
  caption set and asserts a non-empty MP4 is produced (proves whisper→Remotion→
  ffmpeg pipeline end-to-end). Uses a short generated/sample asset.
- **Manual/Playwright:** upload → transcribe → preview → render → download flow
  in the browser.

## 9. Deployment
- **Primary:** run locally — `npm install` then `npm run dev` (or `start`).
- **Bonus:** `Dockerfile` following Remotion's Chrome-headless deployment guide,
  compatible with the workspace's Dokploy/Traefik setup (unique external port).

## 10. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| whisper.cpp build/runtime friction on Windows | Pluggable transcription interface + OpenAI API fallback; pin a known-good model (`small`). |
| Render speed (CPU) on long videos | Default to ad-length clips; expose model size & concurrency; show progress. |
| Remotion licence misunderstanding | Documented above — free for the user's case, no watermark. |
| First-run downloads (whisper model, Chrome headless) | One-time `setup` script + clear logs; cache under `/data`. |

## 11. Build Order (for the implementation plan)
1. Scaffold Next.js + Remotion + TypeScript + Tailwind; `/data` storage; CI-less.
2. `lib/storage.ts`, `lib/jobs.ts` (+ unit tests).
3. `lib/transcribe.ts` (whisper.cpp install + wrap) (+ conversion unit test).
4. `remotion/` compositions + 5 templates + `<Player>` preview harness.
5. API routes: upload, transcribe, jobs status.
6. Editor UI: upload page, editor (player, template picker, style controls,
   transcript editor).
7. `lib/render.ts` + render/download routes + progress UI.
8. End-to-end smoke test with a sample clip; Dockerfile; README.
