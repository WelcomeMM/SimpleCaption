import { describe, it, expect } from 'vitest';
import { uploadDir, renderDir } from './storage';

describe('storage paths', () => {
  it('builds id-scoped upload paths', () => {
    expect(uploadDir('abc123').endsWith('abc123')).toBe(true);
  });
  it('rejects path traversal ids', () => {
    expect(() => uploadDir('../etc')).toThrow();
    expect(() => renderDir('a/b')).toThrow();
  });
});
