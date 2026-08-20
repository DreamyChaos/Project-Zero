import { describe, it, expect } from 'vitest';
import { VALIDATION_ENGINE_VERSION } from './index';

describe('Validation Engine Package', () => {
  it('exports correct version', () => {
    expect(VALIDATION_ENGINE_VERSION).toBe('1.0.0');
  });
});
