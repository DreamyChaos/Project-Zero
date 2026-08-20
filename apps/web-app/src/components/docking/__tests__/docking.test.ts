import { describe, it, expect, beforeEach } from 'vitest';
import { PanelRegistryManager, PANEL_CONSTRAINTS } from '../panelRegistry';
import { LayoutManager } from '../LayoutManager';
import { LayoutPersistence, DOCK_STORAGE_KEY } from '../LayoutPersistence';
import { IPanelDefinition } from '../types';

// Mock localStorage for Node test environment if not available natively
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0,
  };
}

describe('PanelRegistryManager', () => {
  let registry: PanelRegistryManager;

  beforeEach(() => {
    registry = new PanelRegistryManager();
  });

  it('registers default panels correctly', () => {
    const panels = registry.getAll();
    expect(panels.length).toBe(4);
    expect(registry.get('sidebar')).toBeDefined();
    expect(registry.get('inspector')).toBeDefined();
    expect(registry.get('bottomPanel')).toBeDefined();
    expect(registry.get('center')).toBeDefined();
  });

  it('supports registering new custom plugin panels', () => {
    const customPanel: IPanelDefinition = {
      id: 'terminal',
      title: 'Integrated Terminal',
      region: 'bottom',
      constraints: {
        minSize: 100,
        maxSize: 600,
        defaultSize: 200,
        snapThreshold: 30,
      },
      defaultVisibility: true,
      mode: 'docked',
      order: 1,
    };

    registry.register(customPanel);
    expect(registry.get('terminal')).toEqual(customPanel);
    expect(registry.getRegionPanels('bottom').length).toBe(2);
  });

  it('supports unregistering panels', () => {
    expect(registry.unregister('sidebar')).toBe(true);
    expect(registry.get('sidebar')).toBeUndefined();
  });
});

describe('LayoutManager', () => {
  it('clamps size within bounds', () => {
    expect(LayoutManager.clampSize(100, 150, 400)).toBe(150);
    expect(LayoutManager.clampSize(500, 150, 400)).toBe(400);
    expect(LayoutManager.clampSize(250, 150, 400)).toBe(250);
  });

  it('detects snap threshold to trigger collapse', () => {
    const constraint = { minSize: 200, maxSize: 500, defaultSize: 300, snapThreshold: 40 };

    const collapsed = LayoutManager.calculateResizedDimension(150, constraint);
    expect(collapsed.collapsed).toBe(true);
    expect(collapsed.size).toBe(200);

    const normal = LayoutManager.calculateResizedDimension(250, constraint);
    expect(normal.collapsed).toBe(false);
    expect(normal.size).toBe(250);
  });

  it('calculates keyboard resizing steps correctly', () => {
    const constraint = { minSize: 180, maxSize: 450, defaultSize: 260, snapThreshold: 50 };

    // Standard arrow keys (+10, -10)
    expect(LayoutManager.calculateKeyboardSize(200, 'ArrowRight', false, constraint)).toBe(210);
    expect(LayoutManager.calculateKeyboardSize(200, 'ArrowLeft', false, constraint)).toBe(190);

    // Shift arrow keys (+50, -50)
    expect(LayoutManager.calculateKeyboardSize(200, 'ArrowRight', true, constraint)).toBe(250);

    // Home / End
    expect(LayoutManager.calculateKeyboardSize(200, 'Home', false, constraint)).toBe(180);
    expect(LayoutManager.calculateKeyboardSize(200, 'End', false, constraint)).toBe(450);
  });
});

describe('LayoutPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads layout state from localStorage', () => {
    const state = LayoutManager.getDefaultLayout();
    state.sidebarWidth = 320;
    state.sidebarCollapsed = true;

    LayoutPersistence.save(state);
    const loaded = LayoutPersistence.load();

    expect(loaded.sidebarWidth).toBe(320);
    expect(loaded.sidebarCollapsed).toBe(true);
  });

  it('returns default layout on corrupted json storage', () => {
    localStorage.setItem(DOCK_STORAGE_KEY, 'invalid-json-{');
    const loaded = LayoutPersistence.load();
    expect(loaded.sidebarWidth).toBe(PANEL_CONSTRAINTS.sidebar.defaultSize);
  });

  it('clears persisted storage', () => {
    const state = LayoutManager.getDefaultLayout();
    LayoutPersistence.save(state);
    expect(localStorage.getItem(DOCK_STORAGE_KEY)).not.toBeNull();

    LayoutPersistence.clear();
    expect(localStorage.getItem(DOCK_STORAGE_KEY)).toBeNull();
  });
});
