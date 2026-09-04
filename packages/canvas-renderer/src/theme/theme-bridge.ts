/**
 * Typed Design System Theme Bridge for Project Zero Canvas Engine.
 * Formally specified in docs/07_Design_System.md (Sections 2, 5, 10 & 12).
 */

export type ThemeMode = 'dark' | 'light' | 'high-contrast';

export interface CanvasThemeTokens {
  readonly mode: ThemeMode;
  readonly bgBase: string;
  readonly bgSurface1: string;
  readonly bgSurface2: string;
  readonly bgSurface3: string;
  readonly borderSubtle: string;
  readonly borderStrong: string;
  readonly borderFocus: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly accentPrimary: string;
  readonly accentHover: string;
  readonly semanticAccept: string;
  readonly semanticReject: string;
  readonly semanticWarning: string;
  readonly semanticInfo: string;

  // Canvas Specific Render Tokens
  readonly gridMajor: string;
  readonly gridMinor: string;
  readonly gridSubMinor: string;
  readonly stateFill: string;
  readonly stateStroke: string;
  readonly edgeStroke: string;
  readonly edgePillBackground: string;
  readonly edgePillBorder: string;
  readonly marqueeFill: string;
  readonly marqueeStroke: string;
}

export const DARK_THEME_TOKENS: CanvasThemeTokens = {
  mode: 'dark',
  bgBase: '#0A0D14',
  bgSurface1: '#121620',
  bgSurface2: '#1A202C',
  bgSurface3: '#242C3D',
  borderSubtle: '#1E2638',
  borderStrong: '#334155',
  borderFocus: '#6366F1',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accentPrimary: '#6366F1',
  accentHover: '#818CF8',
  semanticAccept: '#10B981',
  semanticReject: '#EF4444',
  semanticWarning: '#F59E0B',
  semanticInfo: '#3B82F6',

  gridMajor: '#334155',
  gridMinor: '#1E2638',
  gridSubMinor: '#121620',
  stateFill: '#1E293B',
  stateStroke: '#94A3B8',
  edgeStroke: '#64748B',
  edgePillBackground: '#0F172A',
  edgePillBorder: '#334155',
  marqueeFill: '#6366F1',
  marqueeStroke: '#6366F1',
};

export const LIGHT_THEME_TOKENS: CanvasThemeTokens = {
  mode: 'light',
  bgBase: '#F8FAFC',
  bgSurface1: '#FFFFFF',
  bgSurface2: '#F1F5F9',
  bgSurface3: '#E2E8F0',
  borderSubtle: '#E2E8F0',
  borderStrong: '#CBD5E1',
  borderFocus: '#4F46E5',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accentPrimary: '#4F46E5',
  accentHover: '#4338CA',
  semanticAccept: '#059669',
  semanticReject: '#DC2626',
  semanticWarning: '#D97706',
  semanticInfo: '#2563EB',

  gridMajor: '#CBD5E1',
  gridMinor: '#E2E8F0',
  gridSubMinor: '#F1F5F9',
  stateFill: '#FFFFFF',
  stateStroke: '#475569',
  edgeStroke: '#64748B',
  edgePillBackground: '#FFFFFF',
  edgePillBorder: '#CBD5E1',
  marqueeFill: '#4F46E5',
  marqueeStroke: '#4F46E5',
};

export const HIGH_CONTRAST_THEME_TOKENS: CanvasThemeTokens = {
  mode: 'high-contrast',
  bgBase: '#000000',
  bgSurface1: '#050505',
  bgSurface2: '#111111',
  bgSurface3: '#222222',
  borderSubtle: '#444444',
  borderStrong: '#FFFFFF',
  borderFocus: '#FFFF00', // Yellow Focus Ring (WCAG AAA)
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E8F0',
  textMuted: '#CBD5E1',
  accentPrimary: '#FFFF00',
  accentHover: '#FFFF88',
  semanticAccept: '#00FF00',
  semanticReject: '#FF0000',
  semanticWarning: '#FFA500',
  semanticInfo: '#00FFFF',

  gridMajor: '#555555',
  gridMinor: '#333333',
  gridSubMinor: '#222222',
  stateFill: '#000000',
  stateStroke: '#FFFFFF',
  edgeStroke: '#FFFFFF',
  edgePillBackground: '#000000',
  edgePillBorder: '#FFFFFF',
  marqueeFill: '#FFFF00',
  marqueeStroke: '#FFFF00',
};

export class ThemeBridge {
  private currentTokens: CanvasThemeTokens = DARK_THEME_TOKENS;
  private readonly listeners: Array<(tokens: CanvasThemeTokens) => void> = [];

  constructor(initialMode: ThemeMode = 'dark') {
    this.setTheme(initialMode);
  }

  public getTokens(): CanvasThemeTokens {
    return this.currentTokens;
  }

  public getMode(): ThemeMode {
    return this.currentTokens.mode;
  }

  public setTheme(theme: ThemeMode | CanvasThemeTokens): void {
    if (typeof theme === 'string') {
      switch (theme) {
        case 'light':
          this.currentTokens = LIGHT_THEME_TOKENS;
          break;
        case 'high-contrast':
          this.currentTokens = HIGH_CONTRAST_THEME_TOKENS;
          break;
        case 'dark':
        default:
          this.currentTokens = DARK_THEME_TOKENS;
          break;
      }
    } else {
      this.currentTokens = theme;
    }

    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](this.currentTokens);
    }
  }

  public subscribe(listener: (tokens: CanvasThemeTokens) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }
}
