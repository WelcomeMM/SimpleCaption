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
    return captions;
  } finally {
    fs.rmSync(wav, { force: true });
  }
}
