import { describe, it, expect } from 'vitest';
import { CORE_SOLVER_VERSION } from './index';

describe('Core Solver Package', () => {
  it('exports correct version', () => {
    expect(CORE_SOLVER_VERSION).toBe('1.0.0');
  });
});
