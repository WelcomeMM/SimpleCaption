import { describe, it, expect } from 'vitest';
import { isAudioExt } from './media';

describe('media helpers', () => {
  it('detects audio extensions', () => {
    expect(isAudioExt('MP3')).toBe(true);
    expect(isAudioExt('mp4')).toBe(false);
  });
});
