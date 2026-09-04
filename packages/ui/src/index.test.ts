import { describe, it, expect } from 'vitest';
import { UI_PACKAGE_VERSION } from './index';

describe('UI Package', () => {
  it('exports correct version', () => {
    expect(UI_PACKAGE_VERSION).toBe('1.0.0');
  });
});
