import { describe, it, expect, vi } from 'vitest';
import {
  ThemeBridge,
  LIGHT_THEME_TOKENS,
  HIGH_CONTRAST_THEME_TOKENS,
} from './theme/theme-bridge';
import { CanvasEngine } from './canvas-engine';

describe('Design System Theme Bridge', () => {
  it('initializes with dark mode by default', () => {
    const bridge = new ThemeBridge();
    expect(bridge.getMode()).toBe('dark');
    expect(bridge.getTokens().bgBase).toBe('#0A0D14');
    expect(bridge.getTokens().borderFocus).toBe('#6366F1');
  });

  it('switches to light mode with appropriate semantic tokens', () => {
    const bridge = new ThemeBridge();
    bridge.setTheme('light');
    expect(bridge.getMode()).toBe('light');
    expect(bridge.getTokens().bgBase).toBe('#F8FAFC');
    expect(bridge.getTokens().textPrimary).toBe('#0F172A');
    expect(bridge.getTokens().stateFill).toBe('#FFFFFF');
  });

  it('switches to high-contrast WCAG AAA theme with yellow focus rings', () => {
    const bridge = new ThemeBridge();
    bridge.setTheme('high-contrast');
    expect(bridge.getMode()).toBe('high-contrast');
    expect(bridge.getTokens().bgBase).toBe('#000000');
    expect(bridge.getTokens().borderFocus).toBe('#FFFF00'); // Yellow focus
    expect(bridge.getTokens().textPrimary).toBe('#FFFFFF');
    expect(bridge.getTokens().semanticAccept).toBe('#00FF00');
    expect(bridge.getTokens().semanticReject).toBe('#FF0000');
  });

  it('notifies theme change subscribers upon switching', () => {
    const bridge = new ThemeBridge();
    const listener = vi.fn();
    const unsubscribe = bridge.subscribe(listener);

    bridge.setTheme('light');
    expect(listener).toHaveBeenCalledWith(LIGHT_THEME_TOKENS);

    bridge.setTheme('high-contrast');
    expect(listener).toHaveBeenCalledWith(HIGH_CONTRAST_THEME_TOKENS);

    unsubscribe();
    bridge.setTheme('dark');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('updates CanvasEngine theme dynamically without engine recreation', () => {
    const engine = new CanvasEngine({ theme: 'dark' });
    expect(engine.getThemeMode()).toBe('dark');
    expect(engine.getStateRenderer().getTheme().stateFill).toBe('#1E293B');

    engine.setTheme('light');
    expect(engine.getThemeMode()).toBe('light');
    expect(engine.getStateRenderer().getTheme().stateFill).toBe('#FFFFFF');

    engine.setTheme('high-contrast');
    expect(engine.getThemeMode()).toBe('high-contrast');
    expect(engine.getStateRenderer().getTheme().borderFocus).toBe('#FFFF00');
    expect(engine.getEdgeRenderer().getTheme().borderFocus).toBe('#FFFF00');

    engine.destroy();
  });
});
