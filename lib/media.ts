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
  const result = await parseMedia({
    src: inputPath,
    reader: nodeReader,
    acknowledgeRemotionLicense: true,
    fields: {
      durationInSeconds: true,
      dimensions: true,
      fps: true,
    },
  });

  const { durationInSeconds, dimensions, fps } = result;

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
