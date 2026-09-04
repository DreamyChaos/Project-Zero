/**
 * Phase 7 — Command Palette Enhancement: Focused Unit Tests
 *
 * Tests the COMMAND_REGISTRY structure, unique IDs, label validation, category mappings,
 * search/alias matching, and command dispatch behavior.
 */

import { describe, it, expect } from 'vitest';
import { COMMAND_REGISTRY } from '../commandRegistry';
import type { ICommand, CommandCategory } from '../types';

const VALID_CATEGORIES: CommandCategory[] = [
  'Canvas',
  'Machines',
  'Grammar',
  'Computability',
  'Languages',
  'Analysis',
  'Workspace',
  'Navigation',
  'Tools',
  'Theme',
];

describe('Phase 7 — Command Palette Enhancement', () => {
  describe('Command Registry Integrity', () => {
    it('1. all registered commands have unique stable IDs', () => {
      const ids = COMMAND_REGISTRY.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('2. every registered command has a valid title, category, and icon', () => {
      for (const cmd of COMMAND_REGISTRY) {
        expect(cmd.id).toBeTruthy();
        expect(cmd.title).toBeTruthy();
        expect(cmd.category).toBeTruthy();
        expect(VALID_CATEGORIES).toContain(cmd.category);
        expect(cmd.icon).toBeDefined();
      }
    });

    it('3. covers all major functional categories', () => {
      const categoriesPresent = new Set(COMMAND_REGISTRY.map((c) => c.category));
      expect(categoriesPresent.has('Canvas')).toBe(true);
      expect(categoriesPresent.has('Machines')).toBe(true);
      expect(categoriesPresent.has('Grammar')).toBe(true);
      expect(categoriesPresent.has('Computability')).toBe(true);
      expect(categoriesPresent.has('Languages')).toBe(true);
      expect(categoriesPresent.has('Navigation')).toBe(true);
      expect(categoriesPresent.has('Workspace')).toBe(true);
      expect(categoriesPresent.has('Theme')).toBe(true);
      expect(categoriesPresent.has('Tools')).toBe(true);
    });

    it('4. contains essential high-value commands', () => {
      const ids = new Set(COMMAND_REGISTRY.map((c) => c.id));

      // Canvas
      expect(ids.has('canvas-tool-select')).toBe(true);
      expect(ids.has('canvas-select-all')).toBe(true);
      expect(ids.has('canvas-clear-selection')).toBe(true);
      expect(ids.has('canvas-delete-selected')).toBe(true);
      expect(ids.has('canvas-focus-toggle')).toBe(true);

      // Machines
      expect(ids.has('machine-set-dfa')).toBe(true);
      expect(ids.has('machine-set-nfa')).toBe(true);
      expect(ids.has('machine-set-pda')).toBe(true);
      expect(ids.has('machine-set-tm')).toBe(true);
      expect(ids.has('machine-clear')).toBe(true);
      expect(ids.has('machine-save')).toBe(true);

      // Navigation & Workbench
      expect(ids.has('nav-trace')).toBe(true);
      expect(ids.has('nav-diagnostics')).toBe(true);
      expect(ids.has('nav-matrix')).toBe(true);
      expect(ids.has('nav-formal-math')).toBe(true);
      expect(ids.has('nav-challenges')).toBe(true);

      // Grammar
      expect(ids.has('grammar-open-workbench')).toBe(true);
      expect(ids.has('grammar-first-follow')).toBe(true);
      expect(ids.has('grammar-cnf')).toBe(true);
      expect(ids.has('grammar-cyk')).toBe(true);
      expect(ids.has('grammar-ll1-table')).toBe(true);
      expect(ids.has('grammar-slr-parser')).toBe(true);

      // Computability
      expect(ids.has('comp-church-turing')).toBe(true);
      expect(ids.has('comp-re-languages')).toBe(true);
      expect(ids.has('comp-reducibility')).toBe(true);
      expect(ids.has('comp-halting-problem')).toBe(true);
      expect(ids.has('comp-pcp')).toBe(true);

      // Tools
      expect(ids.has('tools-interop')).toBe(true);
    });
  });

  describe('Search & Discovery Matching', () => {
    function filterCommands(query: string, registry: ICommand[]): ICommand[] {
      if (!query.trim()) return registry;
      const lower = query.toLowerCase().trim();
      const normalizedLower = lower.replace(/[^a-z0-9]/g, '');

      return registry.filter((cmd) => {
        const titleLower = cmd.title.toLowerCase();
        const catLower = cmd.category.toLowerCase();
        const descLower = cmd.description ? cmd.description.toLowerCase() : '';
        const normalizedTitle = titleLower.replace(/[^a-z0-9]/g, '');

        return (
          titleLower.includes(lower) ||
          catLower.includes(lower) ||
          descLower.includes(lower) ||
          normalizedTitle.includes(normalizedLower) ||
          cmd.keywords?.some((k) => {
            const kLower = k.toLowerCase();
            const normalizedK = kLower.replace(/[^a-z0-9]/g, '');
            return kLower.includes(lower) || normalizedK.includes(normalizedLower);
          })
        );
      });
    }

    it('5. finds DFA commands with query "dfa"', () => {
      const results = filterCommands('dfa', COMMAND_REGISTRY);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === 'machine-set-dfa')).toBe(true);
    });

    it('6. finds Grammar commands with query "grammar" or "cfg"', () => {
      const grammarResults = filterCommands('grammar', COMMAND_REGISTRY);
      expect(grammarResults.length).toBeGreaterThanOrEqual(10);

      const cfgResults = filterCommands('cfg', COMMAND_REGISTRY);
      expect(cfgResults.some((r) => r.id === 'grammar-open-workbench')).toBe(true);
    });

    it('7. finds FIRST / FOLLOW command with query "first"', () => {
      const results = filterCommands('first', COMMAND_REGISTRY);
      expect(results.some((r) => r.id === 'grammar-first-follow')).toBe(true);
    });

    it('8. finds Focus Mode command with query "focus"', () => {
      const results = filterCommands('focus', COMMAND_REGISTRY);
      expect(results.some((r) => r.id === 'canvas-focus-toggle')).toBe(true);
    });

    it('9. finds Turing Machine commands with query "tm"', () => {
      const results = filterCommands('tm', COMMAND_REGISTRY);
      expect(results.some((r) => r.id === 'machine-set-tm')).toBe(true);
    });

    it('10. finds CYK parsing command with query "cyk"', () => {
      const results = filterCommands('cyk', COMMAND_REGISTRY);
      expect(results.some((r) => r.id === 'grammar-cyk')).toBe(true);
    });

    it('11. finds LL(1) table command with queries "ll1" and "ll(1)"', () => {
      const r1 = filterCommands('ll1', COMMAND_REGISTRY);
      expect(r1.some((r) => r.id === 'grammar-ll1-table')).toBe(true);

      const r2 = filterCommands('ll(1)', COMMAND_REGISTRY);
      expect(r2.some((r) => r.id === 'grammar-ll1-table')).toBe(true);
    });

    it('12. finds SLR parser command with query "slr"', () => {
      const results = filterCommands('slr', COMMAND_REGISTRY);
      expect(results.some((r) => r.id === 'grammar-slr-parser')).toBe(true);
    });

    it('13. returns empty list for non-matching queries without errors', () => {
      const results = filterCommands('xyznonexistentquery999', COMMAND_REGISTRY);
      expect(results).toHaveLength(0);
    });
  });
});
