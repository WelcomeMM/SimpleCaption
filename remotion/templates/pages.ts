import { createTikTokStyleCaptions, type Caption } from '@remotion/captions';

export interface CaptionPage {
  startMs: number;
  durationMs: number;
  text: string;
  tokens: { text: string; fromMs: number; toMs: number }[];
}

export function buildPages(captions: Caption[], maxWordsPerPage: number): CaptionPage[] {
  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: 1200,
  });
  const chunked: CaptionPage[] = [];
  for (const page of pages) {
    const tokens = page.tokens;
    if (tokens.length === 0) continue;
    for (let i = 0; i < tokens.length; i += maxWordsPerPage) {
      const slice = tokens.slice(i, i + maxWordsPerPage);
      chunked.push({
        startMs: slice[0].fromMs,
        durationMs: slice[slice.length - 1].toMs - slice[0].fromMs,
        text: slice.map((t) => t.text).join(''),
        tokens: slice,
      });
    }
  }
  return chunked;
}
