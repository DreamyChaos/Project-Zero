import { describe, it, expect } from 'vitest';
import { TRANSITION_ENGINE_VERSION } from './index';

describe('Transition Engine Package', () => {
  it('exports correct version', () => {
    expect(TRANSITION_ENGINE_VERSION).toBe('1.0.0');
  });
});
