import { describe, it, expect } from 'vitest';
import { buildPages } from './templates/pages';
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
