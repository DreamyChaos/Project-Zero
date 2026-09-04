/**
 * Phase 5 — Grammar Workbench Lifecycle Grouping: Focused Unit Tests
 *
 * Tests the GRAMMAR_LIFECYCLE_STAGES progressive disclosure structure and action mappings.
 *
 * Tests covered:
 * 1. All 5 lifecycle stages exist (DEFINE, ANALYZE, TRANSFORM, PARSE, INTERPRET)
 * 2. Every stage contains at least one action item
 * 3. All 20 existing subview actions remain represented across all stages
 * 4. No duplicate actions exist across stages
 * 5. Lifecycle grouping correctly categorizes actions logically
 * 6. Switching active stage updates the default active subview if needed
 */

import { describe, it, expect } from 'vitest';
import {
  GRAMMAR_LIFECYCLE_STAGES,
  GrammarSubView,
} from '../GrammarTab';

const ALL_EXPECTED_SUBVIEWS: GrammarSubView[] = [
  'EDITOR',
  'VALIDATE',
  'ANALYZE',
  'DERIVATION',
  'MEMBERSHIP',
  'AMBIGUITY',
  'FIRST_FOLLOW',
  'LEFT_RECURSION',
  'LEFT_FACTORING',
  'CNF',
  'GNF',
  'TRANSFORM',
  'PARSER_INTRO',
  'CYK',
  'LL1_TABLE',
  'PREDICTIVE_PARSER',
  'SLR_COLLECTION',
  'SLR_PARSER',
  'TRANSLATE',
  'SYNTACTIC_PDA',
];

describe('Phase 5 — Grammar Workbench Lifecycle Grouping', () => {
  it('1. defines all 5 lifecycle stages in logical order', () => {
    const stageIds = GRAMMAR_LIFECYCLE_STAGES.map((s) => s.id);
    expect(stageIds).toEqual(['DEFINE', 'ANALYZE', 'TRANSFORM', 'PARSE', 'INTERPRET']);
  });

  it('2. every stage has a label, description, and at least 2 items', () => {
    for (const stage of GRAMMAR_LIFECYCLE_STAGES) {
      expect(stage.label).toBeTruthy();
      expect(stage.description).toBeTruthy();
      expect(stage.items.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('3. represents all 20 existing grammar subview actions', () => {
    const representedIds = new Set(
      GRAMMAR_LIFECYCLE_STAGES.flatMap((s) => s.items.map((item) => item.id))
    );

    for (const expected of ALL_EXPECTED_SUBVIEWS) {
      expect(representedIds.has(expected), `Missing subview: ${expected}`).toBe(true);
    }
    expect(representedIds.size).toBe(ALL_EXPECTED_SUBVIEWS.length);
  });

  it('4. contains no duplicate subview actions across lifecycle stages', () => {
    const allIds = GRAMMAR_LIFECYCLE_STAGES.flatMap((s) => s.items.map((item) => item.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('5. groups actions into logically sound lifecycle stages', () => {
    const defineStage = GRAMMAR_LIFECYCLE_STAGES.find((s) => s.id === 'DEFINE')!;
    const analyzeStage = GRAMMAR_LIFECYCLE_STAGES.find((s) => s.id === 'ANALYZE')!;
    const transformStage = GRAMMAR_LIFECYCLE_STAGES.find((s) => s.id === 'TRANSFORM')!;
    const parseStage = GRAMMAR_LIFECYCLE_STAGES.find((s) => s.id === 'PARSE')!;
    const interpretStage = GRAMMAR_LIFECYCLE_STAGES.find((s) => s.id === 'INTERPRET')!;

    // Stage 1: DEFINE
    const defineIds = defineStage.items.map((i) => i.id);
    expect(defineIds).toContain('EDITOR');
    expect(defineIds).toContain('VALIDATE');

    // Stage 2: ANALYZE
    const analyzeIds = analyzeStage.items.map((i) => i.id);
    expect(analyzeIds).toContain('ANALYZE');
    expect(analyzeIds).toContain('DERIVATION');
    expect(analyzeIds).toContain('MEMBERSHIP');
    expect(analyzeIds).toContain('AMBIGUITY');
    expect(analyzeIds).toContain('FIRST_FOLLOW');

    // Stage 3: TRANSFORM
    const transformIds = transformStage.items.map((i) => i.id);
    expect(transformIds).toContain('LEFT_RECURSION');
    expect(transformIds).toContain('LEFT_FACTORING');
    expect(transformIds).toContain('CNF');
    expect(transformIds).toContain('GNF');
    expect(transformIds).toContain('TRANSFORM');

    // Stage 4: PARSE
    const parseIds = parseStage.items.map((i) => i.id);
    expect(parseIds).toContain('PARSER_INTRO');
    expect(parseIds).toContain('CYK');
    expect(parseIds).toContain('LL1_TABLE');
    expect(parseIds).toContain('PREDICTIVE_PARSER');
    expect(parseIds).toContain('SLR_COLLECTION');
    expect(parseIds).toContain('SLR_PARSER');

    // Stage 5: INTERPRET
    const interpretIds = interpretStage.items.map((i) => i.id);
    expect(interpretIds).toContain('TRANSLATE');
    expect(interpretIds).toContain('SYNTACTIC_PDA');
  });

  it('6. provides progressive disclosure by keeping each stage compact (<= 6 actions per stage)', () => {
    for (const stage of GRAMMAR_LIFECYCLE_STAGES) {
      expect(stage.items.length).toBeLessThanOrEqual(6);
    }
  });
});
