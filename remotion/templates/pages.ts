import type { Caption } from '@remotion/captions';

export interface CaptionPage {
  startMs: number;
  durationMs: number;
  text: string;
  tokens: { text: string; fromMs: number; toMs: number }[];
}

// How far past the last spoken word a page stays visible before switching.
// Prevents the last word from disappearing the instant it finishes.
const HOLDOVER_MS = 300;

export function buildPages(captions: Caption[], maxWordsPerPage: number): CaptionPage[] {
  const words = captions.filter((c) => c.text.trim() !== '');
  const chunked: CaptionPage[] = [];

  for (let i = 0; i < words.length; i += maxWordsPerPage) {
    const slice = words.slice(i, i + maxWordsPerPage);
    chunked.push({
      startMs: slice[0].startMs,
      durationMs: slice[slice.length - 1].endMs - slice[0].startMs,
      text: slice.map((c) => c.text).join(''),
      tokens: slice.map((c) => ({ text: c.text, fromMs: c.startMs, toMs: c.endMs })),
    });
  }

  // Extend each page into the silence/gap before the next page begins so the
  // last word doesn't vanish at its exact toMs boundary.
  for (let i = 0; i < chunked.length - 1; i++) {
    const gap = chunked[i + 1].startMs - (chunked[i].startMs + chunked[i].durationMs);
    const extend = Math.min(gap, HOLDOVER_MS);
    if (extend > 0) chunked[i].durationMs += extend;
  }

  return chunked;
}
