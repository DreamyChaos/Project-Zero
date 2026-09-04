import { IDockState } from './types';
import { LayoutManager } from './LayoutManager';

export const DOCK_STORAGE_KEY = 'v1_dock_layout';

export class LayoutPersistence {
  /**
   * Load saved layout state from localStorage with fallback to defaults
   */
  public static load(): IDockState {
    try {
      const saved = localStorage.getItem(DOCK_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...LayoutManager.getDefaultLayout(),
          ...parsed,
        };
      }
    } catch {
      // Fallback on JSON parse error or storage error
    }
    return LayoutManager.getDefaultLayout();
  }

  /**
   * Persist current layout state to localStorage
   */
  public static save(state: IDockState): void {
    try {
      localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore write errors (e.g. quota exceeded or private mode)
    }
  }

  /**
   * Clear persisted layout storage
   */
  public static clear(): void {
    try {
      localStorage.removeItem(DOCK_STORAGE_KEY);
    } catch {
      // Ignore removal errors
    }
  }
}
