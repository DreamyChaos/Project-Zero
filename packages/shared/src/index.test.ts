import { describe, it, expect } from 'vitest';
import { SHARED_PACKAGE_VERSION } from './index';

describe('Shared Package Bootstrap', () => {
  it('exports correct package version', () => {
    expect(SHARED_PACKAGE_VERSION).toBe('1.0.0');
  });
});
