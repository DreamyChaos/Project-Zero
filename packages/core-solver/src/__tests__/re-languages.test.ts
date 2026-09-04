import { describe, it, expect } from 'vitest';
import {
  RE_LANGUAGE_DEFINITIONS,
  RECURSIVE_VS_RE_COMPARISON,
  COMPLEMENT_THEOREMS,
  RE_LANGUAGE_PRESETS,
  demonstrateREExecution,
  simulateBoundedEnumerator,
} from '../re-languages';

describe('Module 5 — Topic 4: Recursive & Recursively Enumerable Languages', () => {
  // ============================================================
  // Category A: Definitions, Theorems, and Containment Invariants
  // ============================================================
  describe('Category A: Formal Definitions & Hierarchy', () => {
    it('defines Recursive (Decidable) languages as total halting Turing machines', () => {
      const def = RE_LANGUAGE_DEFINITIONS.recursive;
      expect(def.formalDefinition).toContain('D halts on w');
      expect(def.formalDefinition).toContain('D accepts w ⇔ w ∈ L');
      expect(def.haltingBehavior).toContain('Total');
      expect(def.complementProperty).toContain('Closed under complement');
    });

    it('defines RE (Turing-Recognizable) languages with non-member divergence permitted', () => {
      const def = RE_LANGUAGE_DEFINITIONS.recursivelyEnumerable;
      expect(def.formalDefinition).toContain('R halts and accepts');
      expect(def.formalDefinition).toContain('reject or loop forever');
      expect(def.haltingBehavior).toContain('Partial');
      expect(def.complementProperty).toContain('Not closed under complement');
    });

    it('documents closure under complement and two-way RE criterion accurately', () => {
      expect(COMPLEMENT_THEOREMS.length).toBe(2);

      const closureDecidable = COMPLEMENT_THEOREMS[0];
      expect(closureDecidable.formalStatement).toContain('complement L̄');
      expect(closureDecidable.constructionProcedure).toContain('swapping the accepting and non-accepting');

      const twoWayRE = COMPLEMENT_THEOREMS[1];
      expect(twoWayRE.formalStatement).toContain('both L is RE and L̄ is RE');
      expect(twoWayRE.constructionProcedure).toContain('parallel');
    });

    it('includes side-by-side contrast matrix with correct mathematical properties', () => {
      expect(RECURSIVE_VS_RE_COMPARISON.length).toBeGreaterThanOrEqual(5);

      const haltingRow = RECURSIVE_VS_RE_COMPARISON.find((r) => r.property.includes('Halting guarantee'));
      expect(haltingRow?.recursive).toContain('YES');
      expect(haltingRow?.recursivelyEnumerable).toContain('NO');

      const compRow = RECURSIVE_VS_RE_COMPARISON.find((r) => r.property.includes('complementation'));
      expect(compRow?.recursive).toContain('YES');
      expect(compRow?.recursivelyEnumerable).toContain('NO');
    });
  });

  // ============================================================
  // Category B: Presets and Machine Validation
  // ============================================================
  describe('Category B: Curated Language Presets', () => {
    it('provides valid Decider presets with executable graphs', () => {
      const evenOnes = RE_LANGUAGE_PRESETS.find((p) => p.id === 'decider-even-ones');
      expect(evenOnes).toBeDefined();
      expect(evenOnes?.haltingType).toBe('DECIDER');
      expect(evenOnes?.isExecutableInPlatform).toBe(true);
      expect(evenOnes?.graph.nodes.length).toBeGreaterThanOrEqual(2);

      const balanced0n1n = RE_LANGUAGE_PRESETS.find((p) => p.id === 'decider-0n1n');
      expect(balanced0n1n).toBeDefined();
      expect(balanced0n1n?.haltingType).toBe('DECIDER');
      expect(balanced0n1n?.isExecutableInPlatform).toBe(true);
    });

    it('provides an educational Recognizer preset that halts on members and loops on non-members', () => {
      const recognizer = RE_LANGUAGE_PRESETS.find((p) => p.id === 'recognizer-loop-demo');
      expect(recognizer).toBeDefined();
      expect(recognizer?.haltingType).toBe('RECOGNIZER');
      expect(recognizer?.classCategory).toBe('RECURSIVELY_ENUMERABLE');
    });
  });

  // ============================================================
  // Category C: Decider Execution Semantics
  // ============================================================
  describe('Category C: Decider Execution Semantics', () => {
    const evenOnes = RE_LANGUAGE_PRESETS.find((p) => p.id === 'decider-even-ones')!;

    it('accepts valid members with explicit halting', () => {
      const demoEmpty = demonstrateREExecution(evenOnes.graph, '', 'DECIDER');
      expect(demoEmpty.isAccepted).toBe(true);
      expect(demoEmpty.membershipStatus).toBe('MEMBER');
      expect(demoEmpty.statusDisplayLabel).toContain('ACCEPT');

      const demo11 = demonstrateREExecution(evenOnes.graph, '11', 'DECIDER');
      expect(demo11.isAccepted).toBe(true);
      expect(demo11.membershipStatus).toBe('MEMBER');

      const demo10100 = demonstrateREExecution(evenOnes.graph, '10100', 'DECIDER');
      expect(demo10100.isAccepted).toBe(true);
      expect(demo10100.membershipStatus).toBe('MEMBER');
    });

    it('rejects non-members with explicit halting', () => {
      const demo1 = demonstrateREExecution(evenOnes.graph, '1', 'DECIDER');
      expect(demo1.isAccepted).toBe(false);
      expect(demo1.isHalted).toBe(true);
      expect(demo1.membershipStatus).toBe('NON_MEMBER');
      expect(demo1.statusDisplayLabel).toContain('REJECT');

      const demo010 = demonstrateREExecution(evenOnes.graph, '010', 'DECIDER');
      expect(demo010.isAccepted).toBe(false);
      expect(demo010.membershipStatus).toBe('NON_MEMBER');
    });

    it('verifies 0^n 1^n decider accepts balanced strings and rejects unbalanced strings', () => {
      const n0n1 = RE_LANGUAGE_PRESETS.find((p) => p.id === 'decider-0n1n')!;

      expect(demonstrateREExecution(n0n1.graph, '', 'DECIDER').isAccepted).toBe(true);
      expect(demonstrateREExecution(n0n1.graph, '01', 'DECIDER').isAccepted).toBe(true);
      expect(demonstrateREExecution(n0n1.graph, '0011', 'DECIDER').isAccepted).toBe(true);
      expect(demonstrateREExecution(n0n1.graph, '000111', 'DECIDER').isAccepted).toBe(true);

      expect(demonstrateREExecution(n0n1.graph, '0', 'DECIDER').isAccepted).toBe(false);
      expect(demonstrateREExecution(n0n1.graph, '10', 'DECIDER').isAccepted).toBe(false);
      expect(demonstrateREExecution(n0n1.graph, '001', 'DECIDER').isAccepted).toBe(false);
    });
  });

  // ============================================================
  // Category D: Recognizer Execution & Bounded Safety Semantics
  // ============================================================
  describe('Category D: Recognizer Execution & Safety Invariants', () => {
    const recognizer = RE_LANGUAGE_PRESETS.find((p) => p.id === 'recognizer-loop-demo')!;

    it('recognizer halts and accepts member strings containing at least one 1', () => {
      const demo1 = demonstrateREExecution(recognizer.graph, '1', 'RECOGNIZER');
      expect(demo1.isAccepted).toBe(true);
      expect(demo1.membershipStatus).toBe('MEMBER');

      const demo010 = demonstrateREExecution(recognizer.graph, '010', 'RECOGNIZER');
      expect(demo010.isAccepted).toBe(true);
      expect(demo010.membershipStatus).toBe('MEMBER');
    });

    it('recognizer hits step bound on non-members with safe INCONCLUSIVE status', () => {
      // String '00' contains no 1s -> enters infinite loop
      const demo00 = demonstrateREExecution(recognizer.graph, '00', 'RECOGNIZER', { maxSteps: 20 });

      expect(demo00.isAccepted).toBe(false);
      expect(demo00.isBoundedLimitReached).toBe(true);
      expect(demo00.membershipStatus).toBe('INCONCLUSIVE_BOUND_REACHED');
      expect(demo00.statusDisplayLabel).toContain('INCONCLUSIVE');

      // CRITICAL MATHEMATICAL SAFETY: Does NOT claim non-membership has been proven
      expect(demo00.boundedSafetyNote).toContain('does NOT mathematically prove w ∉ L');
      expect(demo00.boundedSafetyNote).not.toContain('therefore w ∉ L');
    });
  });

  // ============================================================
  // Category E: Bounded Enumerator Simulation
  // ============================================================
  describe('Category E: Bounded Enumerator Simulation', () => {
    it('enumerates strings in length-lexicographical order and labels output as a finite prefix', () => {
      const evenOnes = RE_LANGUAGE_PRESETS.find((p) => p.id === 'decider-even-ones')!;
      const enumResult = simulateBoundedEnumerator(evenOnes.graph, ['0', '1'], 5, 50);

      expect(enumResult.isFinitePrefix).toBe(true);
      expect(enumResult.emittedWords.length).toBe(5);
      expect(enumResult.academicDisclaimer).toContain('FINITE PREFIX');

      // Check that all emitted words genuinely belong to the language (even number of 1s)
      for (const word of enumResult.emittedWords) {
        const testWord = word === 'ε' ? '' : word;
        const countOnes = (testWord.match(/1/g) || []).length;
        expect(countOnes % 2).toBe(0);
      }
    });

    it('enumerates valid balanced 0^n 1^n strings', () => {
      const n0n1 = RE_LANGUAGE_PRESETS.find((p) => p.id === 'decider-0n1n')!;
      const enumResult = simulateBoundedEnumerator(n0n1.graph, ['0', '1'], 3, 50);

      expect(enumResult.emittedWords).toContain('ε'); // 0^0 1^0
      expect(enumResult.emittedWords).toContain('01'); // 0^1 1^1
      expect(enumResult.emittedWords).toContain('0011'); // 0^2 1^2
    });
  });
});
