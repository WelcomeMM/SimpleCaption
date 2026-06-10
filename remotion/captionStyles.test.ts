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
