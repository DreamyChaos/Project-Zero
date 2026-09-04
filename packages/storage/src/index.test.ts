import { describe, it, expect } from 'vitest';
import { STORAGE_VERSION } from './index';

describe('Storage Package', () => {
  it('exports correct version', () => {
    expect(STORAGE_VERSION).toBe('1.0.0');
  });
});
