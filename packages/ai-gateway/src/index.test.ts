import { describe, it, expect } from 'vitest';
import { AI_GATEWAY_VERSION } from './index';

describe('AI Gateway Package', () => {
  it('exports correct version', () => {
    expect(AI_GATEWAY_VERSION).toBe('1.0.0');
  });
});
