# SimpleCaption

Free, watermark-free animated captions for short-form videos — built for creators who are tired of CapCut's free-tier limits and watermark-riddled alternatives.

Everything runs **locally on your machine**: your video never leaves your computer, no API key is required, and the output MP4 has zero watermark.

---

## Why this exists

- **CapCut** limits free auto-captions and locks advanced styles behind a subscription.
- Most other tools either watermark your export or require uploading footage to a cloud service.
- SimpleCaption transcribes with [whisper.cpp](https://github.com/ggerganov/whisper.cpp) (runs fully offline), renders with [Remotion](https://remotion.dev) (no watermark for individuals), and hands you a clean MP4.

---

## Features

- **Upload video or audio** — MP4, MOV, WebM, MP3, WAV, M4A, and more.
- **Automatic word-level transcription** — powered by whisper.cpp running locally. No API key. Auto-detects language including English and French.
- **Live preview** — see captions animate in real time before you commit to a render.
- **5 animated caption templates**:
  - **Hormozi** — bold white text, yellow active-word highlight (viral-style).
  - **Beasty** — white text on a black pill background.
  - **Clean** — minimal white text, no background.
  - **Karaoke** — words fade in one at a time, full line stays visible.
  - **Neon** — glowing cyan on a dark background.
- **Editable transcript** — fix any word whisper got wrong; timing stays in sync.
- **Style controls** — font size, position (top / middle / bottom), text color, highlight color, stroke color, stroke width, words-per-line, uppercase toggle, and a solid background color for audio-only files.
- **Render & download** — one click produces a 1080×1920 MP4 with captions burned in. **No watermark.**

---

## Requirements

- **Node 18+** (tested on Node 24).
- No system `ffmpeg` install needed — bundled via [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static).
- **First render**: Remotion automatically downloads a ~115 MB Chrome Headless Shell on first use. Subsequent renders reuse it.
- **First transcription**: `npm run setup:whisper` downloads whisper.cpp and the selected model (~150 MB for `small`, ~75 MB for `base`).

---

## Quick start

```bash
npm install
npm run setup:whisper      # one-time: builds whisper.cpp + downloads the 'small' model (~500 MB total)
npm run dev                # open http://localhost:3000
```

**Model selection** — set the `WHISPER_MODEL` environment variable before running setup:

| Value    | Size   | Speed  | Accuracy |
|----------|--------|--------|----------|
| `base`   | ~75 MB | Fastest | Good    |
| `small`  | ~150 MB | Fast  | Better (default) |
| `medium` | ~300 MB | Slower | Best   |

```bash
WHISPER_MODEL=base npm run setup:whisper    # lighter, faster
WHISPER_MODEL=medium npm run setup:whisper  # higher accuracy
```

On Windows use `$env:WHISPER_MODEL="base"` in PowerShell before running the command.

---

## How it works

1. **Upload** — the browser sends the file to a Next.js API route, which stores it under `data/`.
2. **Transcription** — ffmpeg extracts a 16 kHz mono WAV; whisper.cpp produces word-level timestamps (JSON). Everything stays on disk, nothing is sent to a third party.
3. **Editor** — the transcript loads into a Remotion `<Player>` live preview. You pick a template, tweak styles, and edit any word.
4. **Render** — clicking "Render" calls another API route that invokes Remotion's headless renderer (`renderMedia`) via a bundled Webpack entry point. Chrome Headless Shell composites the video frames.
5. **Download** — the finished MP4 is streamed back to the browser.

---

## Verify the install

```bash
node scripts/make-sample.mjs   # generates data/sample.mp4 (3 s test clip)
npm run smoke                  # bundles + renders with burned captions; prints SMOKE OK
npm test                       # vitest unit tests
```

---

## Optional: OpenAI Whisper API fallback

If local whisper is unavailable (e.g. a server without native build tools), you can set `OPENAI_API_KEY` in `.env.local` to route transcription through the OpenAI Whisper API instead. This is not required and is not currently wired up by default — it is a future/optional path.

---

## Production / Docker

A `Dockerfile` is included. It installs the system libraries that Remotion's Chrome Headless Shell needs on Debian/Ubuntu, builds the Next.js app, and starts it on port 3000.

```bash
docker build -t simplecaption .
docker run -p 3000:3000 -v $(pwd)/data:/app/data simplecaption
```

**Note:** Mount `/app/data` as a volume for persistent uploads and renders. Run `npm run setup:whisper` inside the container (or mount a pre-built whisper model directory at `/app/data/whisper`) for transcription to work.

---

## Remotion licensing

Remotion is **free for individuals and companies of up to 3 people** and never adds a watermark to rendered output. A solo creator or small team is fully covered under the [Remotion Individual / Company license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Companies with 4 or more people must purchase a [Remotion company license](https://remotion.dev/license).

---

## Project structure

```
app/            Next.js App Router (pages, API routes)
components/     React UI components (upload, editor, controls)
lib/            Server-side logic (jobs, storage, transcription, render)
remotion/       Composition root + 5 caption template components
scripts/        setup-whisper.mjs, make-sample.mjs, smoke-render.mjs
data/           Runtime data (gitignored): uploads, renders, whisper model
```
