/**
 * Transcription module — wraps whisper.cpp via @remotion/install-whisper-cpp.
 *
 * Model default: "small". Override with the WHISPER_MODEL env variable.
 * Supported values: tiny | tiny.en | base | base.en | small | small.en |
 *                   medium | medium.en | large-v1 | large-v2 | large-v3 | large-v3-turbo
 *
 * Future: optional OpenAI Whisper API fallback if local whisper is unavailable.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  installWhisperCpp,
  downloadWhisperModel,
  transcribe as whisperTranscribe,
  toCaptions,
} from '@remotion/install-whisper-cpp';
import type { Language } from '@remotion/install-whisper-cpp';
import type { Caption } from '@remotion/captions';
import { extractWav } from './media';
import { dataDir } from './storage';

// Keep whisper binaries/models inside the configured data dir (honors SIMPLECAPTION_DATA).
const WHISPER_DIR = path.join(dataDir(), 'whisper');
const WHISPER_VERSION = '1.5.5';
const MODEL = (process.env.WHISPER_MODEL ?? 'small') as
  | 'tiny'
  | 'tiny.en'
  | 'base'
  | 'base.en'
  | 'small'
  | 'small.en'
  | 'medium'
  | 'medium.en'
  | 'large-v1'
  | 'large-v2'
  | 'large-v3'
  | 'large-v3-turbo';

async function ensureWhisper(): Promise<void> {
  await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION });
  await downloadWhisperModel({ model: MODEL, folder: WHISPER_DIR });
}

/**
 * Merge consecutive BPE sub-word tokens into whole words.
 *
 * Whisper is invoked with --max-len 1, so each Caption is one BPE token.
 * Tokens that don't start with a space are sub-word continuations of the
 * preceding token (e.g. [" beau", "tiful"] → " beautiful"), as are
 * punctuation-only tokens (e.g. [" world", "."] → " world.").
 * Merging them produces true word-level captions that paginate cleanly.
 */
export function mergeSubwordTokens(captions: Caption[]): Caption[] {
  const merged: Caption[] = [];
  for (const cap of captions) {
    if (cap.text === '') continue;
    const isNewWord = merged.length === 0 || cap.text[0] === ' ';
    if (isNewWord) {
      merged.push({ ...cap });
    } else {
      const prev = merged[merged.length - 1];
      merged[merged.length - 1] = {
        ...prev,
        text: prev.text + cap.text,
        endMs: cap.endMs,
      };
    }
  }
  return merged;
}

/** Transcribe a media file to word-level captions. */
export async function transcribeFile(inputPath: string, language: Language = 'auto'): Promise<Caption[]> {
  const wav = path.join(os.tmpdir(), `sc-${Date.now()}.wav`);
  await extractWav(inputPath, wav);
  try {
    await ensureWhisper();
    const result = await whisperTranscribe({
      inputPath: wav,
      model: MODEL,
      whisperPath: WHISPER_DIR,
      whisperCppVersion: WHISPER_VERSION,
      modelFolder: WHISPER_DIR,
      tokenLevelTimestamps: true,
      language,
    });
    const { captions } = toCaptions({ whisperCppOutput: result });
    // DTW timestamps (timestampMs = t_dtw * 10ms) are aligned to actual audio via
    // forced alignment and are more accurate than segment offsets — especially for
    // the first word, which whisper anchors to 0ms even when speech starts later.
    const withDtw = captions.map((cap, i) => {
      if (cap.timestampMs == null || cap.timestampMs <= 0) return cap;
      const nextDtw = i < captions.length - 1 ? captions[i + 1].timestampMs : null;
      return {
        ...cap,
        startMs: cap.timestampMs,
        endMs: nextDtw != null && nextDtw > cap.timestampMs ? nextDtw : cap.endMs,
      };
    });
    // Merge BPE sub-word tokens so each Caption is exactly one spoken word.
    return mergeSubwordTokens(withDtw);
  } finally {
    fs.rmSync(wav, { force: true });
  }
}
