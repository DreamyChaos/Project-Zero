import { describe, it, expect } from 'vitest';
import {
  PCP_DEFINITION,
  PCP_DISTINCTIONS,
  PCP_PRESETS,
  validatePCPInstance,
  comparePCPSequence,
  solvePCPBounded,
} from '../pcp';

describe('Module 5 — Topic 7: Post Correspondence Problem (PCP)', () => {
  // ============================================================
  // Category A: Formal Problem Definition & Classical Invariants
  // ============================================================
  describe('Category A: Formal Problem Definition & Invariants', () => {
    it('formally defines PCP as matching index sequences over dominoes', () => {
      expect(PCP_DEFINITION.problemName).toBe('Post Correspondence Problem (PCP)');
      expect(PCP_DEFINITION.formalNotation).toContain('u_{i_1}...u_{i_k} = v_{i_1}...v_{i_k}');
      expect(PCP_DEFINITION.decidabilityClassification).toContain('UNDECIDABLE');
      expect(PCP_DEFINITION.recognizabilityClassification).toContain('RECURSIVELY ENUMERABLE');
    });

    it('distinguishes between standard PCP and Modified PCP (MPCP)', () => {
      expect(PCP_DEFINITION.mpcpDistinction).toContain('the first domino must be (u_1, v_1)');
    });

    it('validates valid and invalid PCP instances', () => {
      expect(validatePCPInstance({ dominoes: [] }).isValid).toBe(false);
      expect(
        validatePCPInstance({
          dominoes: [{ id: 1, top: '', bottom: '' }],
        }).isValid
      ).toBe(false);
      expect(
        validatePCPInstance({
          dominoes: [{ id: 1, top: 'a', bottom: 'ab' }],
        }).isValid
      ).toBe(true);
    });
  });

  // ============================================================
  // Category B: Sequence Comparison & Residual / Prefix Pruning
  // ============================================================
  describe('Category B: Sequence Comparison & Residual Pruning', () => {
    const classicPreset = PCP_PRESETS.find((p) => p.id === 'pcp-classic-yes')!;

    it('detects proper prefix states: TOP is prefix of BOTTOM', () => {
      // Domino 1 is (a, ab). Top is "a", bottom is "ab". Top is proper prefix of bottom.
      const comp = comparePCPSequence(classicPreset.dominoes, [1]);
      expect(comp.status).toBe('TOP_IS_PREFIX');
      expect(comp.topString).toBe('a');
      expect(comp.bottomString).toBe('ab');
      expect(comp.residualSuffix).toBe('b');
      expect(comp.canBeExtended).toBe(true);
    });

    it('detects complete match when TOP === BOTTOM on solution sequence', () => {
      // Sequence [1, 2]: (a, ab) followed by (ba, a) -> top "aba", bottom "aba".
      const comp = comparePCPSequence(classicPreset.dominoes, [1, 2]);
      expect(comp.status).toBe('MATCH');
      expect(comp.topString).toBe('aba');
      expect(comp.bottomString).toBe('aba');
      expect(comp.residualSuffix).toBe('');
      expect(comp.canBeExtended).toBe(true);
    });

    it('detects irrevocable mismatch when neither is prefix of the other', () => {
      // Sequence [2]: (ba, a). Followed by [1]: (a, ab). Top: "baa", Bottom: "aab". Mismatch at index 0 ('b' != 'a')!
      const comp = comparePCPSequence(classicPreset.dominoes, [2, 1]);
      expect(comp.status).toBe('MISMATCH');
      expect(comp.topString).toBe('baa');
      expect(comp.bottomString).toBe('aab');
      expect(comp.canBeExtended).toBe(false);
      expect(comp.residualSuffix).toContain("Divergence at pos 0: 'b' != 'a'");
    });
  });

  // ============================================================
  // Category C: Bounded Solver Verification on Curated Presets
  // ============================================================
  describe('Category C: Bounded Solver Verification', () => {
    it('finds verified minimal solution for Classic YES instance: [1, 2]', () => {
      const classicPreset = PCP_PRESETS.find((p) => p.id === 'pcp-classic-yes')!;
      const result = solvePCPBounded(classicPreset.dominoes, { maxDepth: 4 });

      expect(result.status).toBe('SOLUTION_FOUND');
      expect(result.witness).toBeDefined();
      expect(result.witness!.sequence).toEqual([1, 2]);
      expect(result.witness!.topConcatenation).toBe('aba');
      expect(result.witness!.bottomConcatenation).toBe('aba');
      expect(result.witness!.isExactMatch).toBe(true);
      expect(result.witness!.length).toBe(2);
    });

    it('finds verified solution requiring domino reuse: [2, 1, 3, 2, 4]', () => {
      const reusePreset = PCP_PRESETS.find((p) => p.id === 'pcp-reuse-yes')!;
      const result = solvePCPBounded(reusePreset.dominoes, { maxDepth: 6 });

      expect(result.status).toBe('SOLUTION_FOUND');
      expect(result.witness).toBeDefined();
      expect(result.witness!.sequence).toEqual([2, 1, 3, 2, 4]);
      expect(result.witness!.topConcatenation).toBe(result.witness!.bottomConcatenation);
      expect(result.witness!.isExactMatch).toBe(true);
      // Domino 2 is used twice in the solution
      const countDomino2 = result.witness!.sequence.filter((idx) => idx === 2).length;
      expect(countDomino2).toBe(2);
    });

    it('terminates with BOUND_EXHAUSTED_NO_SOLUTION for Disjoint First Symbols', () => {
      const disjointPreset = PCP_PRESETS.find((p) => p.id === 'pcp-disjoint-no')!;
      const result = solvePCPBounded(disjointPreset.dominoes, { maxDepth: 4 });

      expect(result.status).toBe('BOUND_EXHAUSTED_NO_SOLUTION');
      expect(result.witness).toBeUndefined();
    });

    it('terminates with BOUND_EXHAUSTED_NO_SOLUTION for Length Disparity instance', () => {
      const lengthPreset = PCP_PRESETS.find((p) => p.id === 'pcp-length-disparity-no')!;
      const result = solvePCPBounded(lengthPreset.dominoes, { maxDepth: 5 });

      expect(result.status).toBe('BOUND_EXHAUSTED_NO_SOLUTION');
      expect(result.witness).toBeUndefined();
    });
  });

  // ============================================================
  // Category D: Epistemological Guardrails & Safety Language
  // ============================================================
  describe('Category D: Epistemological Guardrails', () => {
    it('never labels bounded exhaustion as global mathematical impossibility', () => {
      const disjointPreset = PCP_PRESETS.find((p) => p.id === 'pcp-disjoint-no')!;
      const result = solvePCPBounded(disjointPreset.dominoes, { maxDepth: 3 });

      expect(result.epistemologicalNote).toContain('does NOT prove the instance is unsolvable in general');
      expect(result.explanation).toContain('No matching sequence found within search bound');
    });

    it('includes all 5 core pedagogical distinction items', () => {
      expect(PCP_DISTINCTIONS.length).toBe(5);
      const topics = PCP_DISTINCTIONS.map((d) => d.topic);
      expect(topics).toContain('Individual Dominoes vs Concatenation');
      expect(topics).toContain('Same-Sequence Invariant');
      expect(topics).toContain('Domino Reuse');
      expect(topics).toContain('Prefix Mismatches Can Never Be Repaired');
      expect(topics).toContain('Bounded Search vs Undecidability');
    });
  });
});
