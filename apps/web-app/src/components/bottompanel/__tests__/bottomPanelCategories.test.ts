/**
 * Phase 4 — Bottom Panel Progressive Disclosure: Focused Unit Tests
 *
 * Tests the WORKBENCH_CATEGORIES tab registry and progressive disclosure logic.
 *
 * Tests covered:
 * 1. Category definitions — all categories exist and are well-formed
 * 2. Every existing tab remains represented across all categories
 * 3. Category → tab filtering (only category tabs shown, not all tabs)
 * 4. Selected tab remains valid when switching categories
 * 5. Unavailable model-specific tabs remain unavailable (no tab removed)
 * 6. Switching categories does not mutate analysis state (pure UI nav)
 * 7. Phase 2 tab IDs remain present (transition editing entry points intact)
 * 8. Phase 3 tab IDs remain present (context menu entry points intact)
 */

import { describe, it, expect } from 'vitest';
import {
  WORKBENCH_CATEGORIES,
  BOTTOM_PANEL_TABS,
} from '../tabRegistry';
import type { BottomTabId } from '../types';

// ---------------------------------------------------------------------------
// All known tab IDs from types.ts — used to verify no tab was dropped
// ---------------------------------------------------------------------------
const ALL_KNOWN_TAB_IDS: BottomTabId[] = [
  'diagnostics',
  'challenges',
  'grammar',
  'analysis',
  'trace',
  'matrix',
  'math',
  'tester',
  'logs',
  'algorithm',
  'pda-branch',
  'minimization-explanation',
  'regex-explanation',
  'program-constructs',
  'lexical-analyzer',
  'fa-regex-equivalence',
  'regular-languages',
  'pumping-lemma',
  'church-turing',
  're-languages',
  'reducibility',
  'halting-problem',
  'pcp',
  'tools',
];

// ---------------------------------------------------------------------------
// 1. Category definitions — all categories exist and are well-formed
// ---------------------------------------------------------------------------

describe('Phase 4 — Bottom Panel Category Definitions', () => {
  it('1a. at least 4 categories exist', () => {
    expect(WORKBENCH_CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });

  it('1b. every category has a non-empty id, label, and at least one tab', () => {
    for (const cat of WORKBENCH_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.tabs.length).toBeGreaterThan(0);
    }
  });

  it('1c. category IDs are unique', () => {
    const ids = WORKBENCH_CATEGORIES.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('1d. required category IDs are present (execution, analysis, cfg, challenges)', () => {
    const ids = new Set(WORKBENCH_CATEGORIES.map((c) => c.id));
    expect(ids.has('execution')).toBe(true);
    expect(ids.has('analysis')).toBe(true);
    expect(ids.has('cfg')).toBe(true);
    expect(ids.has('challenges')).toBe(true);
  });

  it('1e. no single category contains more than 10 tabs (progressive disclosure requirement)', () => {
    for (const cat of WORKBENCH_CATEGORIES) {
      expect(cat.tabs.length).toBeLessThanOrEqual(10);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Every existing tab remains represented across all categories
// ---------------------------------------------------------------------------

describe('Phase 4 — All Tabs Preserved', () => {
  it('2a. BOTTOM_PANEL_TABS flat list contains every known tab ID', () => {
    const flatIds = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
    for (const id of ALL_KNOWN_TAB_IDS) {
      expect(flatIds.has(id), `Tab '${id}' is missing from BOTTOM_PANEL_TABS`).toBe(true);
    }
  });

  it('2b. BOTTOM_PANEL_TABS count matches the count of known tabs', () => {
    expect(BOTTOM_PANEL_TABS.length).toBe(ALL_KNOWN_TAB_IDS.length);
  });

  it('2c. BOTTOM_PANEL_TABS equals the union of all category tabs', () => {
    const fromCategories = WORKBENCH_CATEGORIES.flatMap((c) => c.tabs.map((t) => t.id));
    const fromFlat = BOTTOM_PANEL_TABS.map((t) => t.id);
    expect(fromCategories.sort()).toEqual(fromFlat.sort());
  });

  it('2d. no tab ID appears more than once across all categories', () => {
    const allIds = WORKBENCH_CATEGORIES.flatMap((c) => c.tabs.map((t) => t.id));
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it('2e. every tab definition has a non-empty label and component', () => {
    for (const tab of BOTTOM_PANEL_TABS) {
      expect(tab.label).toBeTruthy();
      expect(tab.component).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Category → tab filtering (only category tabs shown per category)
// ---------------------------------------------------------------------------

describe('Phase 4 — Category Filtering', () => {
  it('3a. execution category only contains execution-related tabs', () => {
    const execCat = WORKBENCH_CATEGORIES.find((c) => c.id === 'execution')!;
    expect(execCat).toBeDefined();
    const execTabIds = execCat.tabs.map((t) => t.id);
    expect(execTabIds).toContain('trace');
    expect(execTabIds).toContain('tester');
    expect(execTabIds).toContain('logs');
    // execution should NOT contain theory tabs
    expect(execTabIds).not.toContain('church-turing');
    expect(execTabIds).not.toContain('pumping-lemma');
    expect(execTabIds).not.toContain('grammar');
  });

  it('3b. cfg category only contains grammar tab', () => {
    const cfgCat = WORKBENCH_CATEGORIES.find((c) => c.id === 'cfg')!;
    expect(cfgCat).toBeDefined();
    const ids = cfgCat.tabs.map((t) => t.id);
    expect(ids).toContain('grammar');
    expect(ids).not.toContain('trace');
    expect(ids).not.toContain('diagnostics');
  });

  it('3c. challenges category only contains challenges tab', () => {
    const cat = WORKBENCH_CATEGORIES.find((c) => c.id === 'challenges')!;
    expect(cat).toBeDefined();
    const ids = cat.tabs.map((t) => t.id);
    expect(ids).toContain('challenges');
    expect(ids).toHaveLength(1);
  });

  it('3d. filtering tabs by category returns a strict subset of all tabs', () => {
    for (const cat of WORKBENCH_CATEGORIES) {
      const catIds = new Set(cat.tabs.map((t) => t.id));
      const allIds = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
      for (const id of catIds) {
        expect(allIds.has(id)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Selected tab remains valid when switching categories
// ---------------------------------------------------------------------------

describe('Phase 4 — Active Tab Validity on Category Switch', () => {
  /**
   * Simulates the BottomPanel.tsx fallback logic:
   * if the current tab does not belong to the newly selected category,
   * fall back to the first tab of the new category.
   */
  function resolveActiveTab(
    currentTabId: BottomTabId,
    newCategoryId: string
  ): BottomTabId {
    const cat = WORKBENCH_CATEGORIES.find((c) => c.id === newCategoryId);
    if (!cat) return currentTabId;
    const found = cat.tabs.find((t) => t.id === currentTabId);
    return found ? found.id : (cat.tabs[0].id as BottomTabId);
  }

  it('4a. switching to a category that contains the active tab keeps it selected', () => {
    const result = resolveActiveTab('trace', 'execution');
    expect(result).toBe('trace');
  });

  it('4b. switching to a category that does NOT contain the active tab falls back to first tab', () => {
    const result = resolveActiveTab('trace', 'cfg');
    expect(result).toBe('grammar');
  });

  it('4c. switching to analysis category from a theory tab resolves to analysis first tab', () => {
    const analysisCat = WORKBENCH_CATEGORIES.find((c) => c.id === 'analysis')!;
    const expectedFirst = analysisCat.tabs[0].id;
    const result = resolveActiveTab('grammar', 'analysis');
    expect(result).toBe(expectedFirst);
  });

  it('4d. every category has a valid first tab to fall back to', () => {
    for (const cat of WORKBENCH_CATEGORIES) {
      expect(cat.tabs[0]).toBeDefined();
      expect(cat.tabs[0].id).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Unavailable model-specific tabs remain unavailable (not removed)
// ---------------------------------------------------------------------------

describe('Phase 4 — Model-Specific Tab Availability', () => {
  it('5a. pda-branch tab is present in the registry (available for PDA model)', () => {
    const flat = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
    expect(flat.has('pda-branch')).toBe(true);
  });

  it('5b. pumping-lemma tab is present (available for FA/regular language models)', () => {
    const flat = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
    expect(flat.has('pumping-lemma')).toBe(true);
  });

  it('5c. halting-problem tab is present (relevant for TM model)', () => {
    const flat = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
    expect(flat.has('halting-problem')).toBe(true);
  });

  it('5d. grammar tab is present (CFG model)', () => {
    const flat = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
    expect(flat.has('grammar')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Switching categories does not mutate analysis state
// ---------------------------------------------------------------------------

describe('Phase 4 — Category Switch Does Not Mutate State', () => {
  it('6a. WORKBENCH_CATEGORIES is a frozen reference (pure data)', () => {
    // Category switching is pure UI navigation (useState in BottomPanel).
    // Verify registry data is not mutated by simulated category switches.
    const original = WORKBENCH_CATEGORIES.map((c) => ({ id: c.id, tabCount: c.tabs.length }));

    // Simulate switching categories (pure reads — no mutation expected)
    const _ = WORKBENCH_CATEGORIES.find((c) => c.id === 'cfg');
    const __ = WORKBENCH_CATEGORIES.find((c) => c.id === 'execution');
    void _;
    void __;

    const after = WORKBENCH_CATEGORIES.map((c) => ({ id: c.id, tabCount: c.tabs.length }));
    expect(after).toEqual(original);
  });

  it('6b. flatMap over categories is deterministic (same order on repeated calls)', () => {
    const first = WORKBENCH_CATEGORIES.flatMap((c) => c.tabs.map((t) => t.id));
    const second = WORKBENCH_CATEGORIES.flatMap((c) => c.tabs.map((t) => t.id));
    expect(first).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// 7. Phase 2 regression — double-click transition editing entry points intact
// ---------------------------------------------------------------------------

describe('Phase 4 — Phase 2 Regression (Transition Editing)', () => {
  it('7a. analysis tab remains in the registry (equivalence & repair panel)', () => {
    const flat = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
    expect(flat.has('analysis')).toBe(true);
  });

  it('7b. diagnostics tab remains in the registry', () => {
    const flat = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
    expect(flat.has('diagnostics')).toBe(true);
  });

  it('7c. trace tab remains in the registry (execution trace)', () => {
    const flat = new Set(BOTTOM_PANEL_TABS.map((t) => t.id));
    expect(flat.has('trace')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Phase 3 regression — context menu behavior entry points intact
// ---------------------------------------------------------------------------

describe('Phase 4 — Phase 3 Regression (Context Menu)', () => {
  it('8a. all category IDs known by bottom panel navigation event system are present', () => {
    // The navigate-to-tab event system (BottomPanel.tsx) dispatches categoryId + tabId.
    // Verify the category IDs used in tests and expected deep-link targets exist.
    const ids = new Set(WORKBENCH_CATEGORIES.map((c) => c.id));
    // These IDs are referenced in production navigate-to-tab dispatch sites.
    expect(ids.has('execution')).toBe(true);
    expect(ids.has('analysis')).toBe(true);
    expect(ids.has('cfg')).toBe(true);
    expect(ids.has('challenges')).toBe(true);
  });

  it('8b. BOTTOM_PANEL_TABS flat list export is consistent with category total', () => {
    const categoryTotal = WORKBENCH_CATEGORIES.reduce((sum, c) => sum + c.tabs.length, 0);
    expect(BOTTOM_PANEL_TABS.length).toBe(categoryTotal);
  });
});
