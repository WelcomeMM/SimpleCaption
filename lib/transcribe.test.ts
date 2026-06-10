import { describe, it, expect } from 'vitest';
import * as mod from './transcribe';
import { mergeSubwordTokens } from './transcribe';
import type { Caption } from '@remotion/captions';

describe('transcribe module', () => {
  it('exports transcribeFile', () => {
    expect(typeof mod.transcribeFile).toBe('function');
  });
});

describe('mergeSubwordTokens', () => {
  const cap = (text: string, startMs: number, endMs: number): Caption => ({
    text, startMs, endMs, timestampMs: startMs, confidence: 1,
  });

  it('keeps words that start with a space as separate tokens', () => {
    const input = [cap(' hello', 0, 200), cap(' world', 200, 400)];
    const result = mergeSubwordTokens(input);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe(' hello');
    expect(result[1].text).toBe(' world');
  });

  it('merges BPE sub-word continuation (no leading space) into previous word', () => {
    const input = [cap(' beau', 0, 100), cap('ti', 100, 150), cap('ful', 150, 300)];
    const result = mergeSubwordTokens(input);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(' beautiful');
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(300);
  });

  it('merges trailing punctuation with the preceding word', () => {
    const input = [cap(' world', 0, 300), cap('.', 300, 350), cap(' Next', 350, 500)];
    const result = mergeSubwordTokens(input);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe(' world.');
    expect(result[0].endMs).toBe(350);
    expect(result[1].text).toBe(' Next');
  });

  it('handles first token with no leading space (trimStart applied by toCaptions)', () => {
    const input = [cap('Hello', 0, 200), cap(' world', 200, 400)];
    const result = mergeSubwordTokens(input);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Hello');
    expect(result[1].text).toBe(' world');
  });

  it('skips empty-text captions', () => {
    const input = [cap(' hi', 0, 200), cap('', 200, 210), cap(' there', 210, 400)];
    const result = mergeSubwordTokens(input);
    expect(result).toHaveLength(2);
  });
});
