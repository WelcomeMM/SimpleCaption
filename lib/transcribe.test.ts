import { describe, it, expect } from 'vitest';
import * as mod from './transcribe';

describe('transcribe module', () => {
  it('exports transcribeFile', () => {
    expect(typeof mod.transcribeFile).toBe('function');
  });
});
