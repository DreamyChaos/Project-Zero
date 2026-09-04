import { describe, it, expect } from 'vitest';
import {
  HALT_TM_DEFINITION,
  HALTING_DISTINCTIONS,
  DIAGONAL_PROOF_STEPS,
  evaluateHypotheticalDecider,
  HALTING_PROBLEM_PRESETS,
  observeBoundedHalting,
} from '../halting-problem';

describe('Module 5 — Topic 6: Undecidability — Halting Problem', () => {
  // ============================================================
  // Category A: Formal Language Definition & Mathematical Characterization
  // ============================================================
  describe('Category A: Formal Language Definition', () => {
    it('formally defines HALT_TM as { <M, w> | M halts on w }', () => {
      expect(HALT_TM_DEFINITION.formalNotation).toContain('HALT_TM = { <M, w>');
      expect(HALT_TM_DEFINITION.formalNotation).toContain('M halts on input w');
    });

    it('classifies HALT_TM as Turing-Recognizable (RE) but Undecidable (Non-Recursive)', () => {
      expect(HALT_TM_DEFINITION.decidabilityClassification).toBe('UNDECIDABLE (Non-Recursive)');
      expect(HALT_TM_DEFINITION.recognizabilityClassification).toBe('RECURSIVELY ENUMERABLE (Turing-Recognizable)');
      expect(HALT_TM_DEFINITION.complementClassification).toContain('NOT RECURSIVELY ENUMERABLE');
    });

    it('maintains the distinction between halting and accepting in official rules', () => {
      expect(HALT_TM_DEFINITION.haltingVersusAcceptanceRule).toContain('Halting means reaching any configuration where no further move exists');
      expect(HALT_TM_DEFINITION.haltingVersusAcceptanceRule).toContain('All halting runs are YES instances of HALT_TM');
    });
  });

  // ============================================================
  // Category B: Halting vs Accepting Distinction (Crucial Pedagogical Law)
  // ============================================================
  describe('Category B: Halting vs Accepting Distinction', () => {
    const acceptingPreset = HALTING_PROBLEM_PRESETS.find((p) => p.id === 'preset-accepting-halt')!;
    const rejectingPreset = HALTING_PROBLEM_PRESETS.find((p) => p.id === 'preset-rejecting-halt')!;

    it('verifies that an accepting halt is a YES instance of HALT_TM', () => {
      const result = observeBoundedHalting(acceptingPreset.graph, '1');
      expect(result.outcome).toBe('HALTED_ACCEPT');
      expect(result.isHalted).toBe(true);
      expect(result.isAccepted).toBe(true);
      expect(result.haltsMembershipClassification).toBe('YES_HALTS');
    });

    it('verifies that an explicit REJECTING halt is ALSO a YES instance of HALT_TM', () => {
      const result = observeBoundedHalting(rejectingPreset.graph, '0');
      // Crucial: It rejected, but IT HALTED!
      expect(result.outcome).toBe('HALTED_REJECT');
      expect(result.isHalted).toBe(true);
      expect(result.isAccepted).toBe(false);
      expect(result.haltsMembershipClassification).toBe('YES_HALTS');
      expect(result.academicExplanation).toContain('IS A YES INSTANCE OF HALT_TM');
    });
  });

  // ============================================================
  // Category C: Bounded Simulation Semantics & Epistemological Safety
  // ============================================================
  describe('Category C: Bounded Simulation & Epistemological Safety', () => {
    const loopPreset = HALTING_PROBLEM_PRESETS.find((p) => p.id === 'preset-infinite-loop')!;

    it('reports STEP_LIMIT_REACHED and INCONCLUSIVE_TIMEOUT for an infinite loop', () => {
      const result = observeBoundedHalting(loopPreset.graph, '', { maxSteps: 30 });
      expect(result.outcome).toBe('STEP_LIMIT_REACHED');
      expect(result.isHalted).toBe(false);
      expect(result.haltsMembershipClassification).toBe('INCONCLUSIVE_TIMEOUT');
    });

    it('never falsely asserts that hitting a step limit proves the machine never halts', () => {
      const result = observeBoundedHalting(loopPreset.graph, '', { maxSteps: 20 });
      expect(result.epistemologicalSafetyNote).toContain('does NOT prove the machine loops forever');
      expect(result.academicExplanation).toContain('cannot establish whether the machine loops forever or halts');
    });
  });

  // ============================================================
  // Category D: Diagonal Contradiction Proof Structure
  // ============================================================
  describe('Category D: Diagonal Contradiction Proof Structure', () => {
    it('contains all 6 standard diagonal proof steps', () => {
      expect(DIAGONAL_PROOF_STEPS.length).toBe(6);
      expect(DIAGONAL_PROOF_STEPS.map((s) => s.stepId)).toEqual([
        'ASSUME_DECIDER',
        'CONSTRUCT_DIAGONAL_D',
        'SELF_APPLICATION',
        'CASE_HALTS',
        'CASE_LOOPS',
        'CONTRADICTION_CONCLUSION',
      ]);
    });

    it('derives contradiction when H claims D(<D>) HALTS (D loops forever)', () => {
      const evalHalts = evaluateHypotheticalDecider('HALTS');
      expect(evalHalts.assumedDecision).toBe('HALTS');
      expect(evalHalts.diagonalBehavior).toBe('LOOPS_FOREVER');
      expect(evalHalts.isContradictionProved).toBe(true);
      expect(evalHalts.resultingContradiction).toContain('contradicting H\'s claim');
    });

    it('derives contradiction when H claims D(<D>) DOES NOT HALT (D halts immediately)', () => {
      const evalLoops = evaluateHypotheticalDecider('DOES_NOT_HALT');
      expect(evalLoops.assumedDecision).toBe('DOES_NOT_HALT');
      expect(evalLoops.diagonalBehavior).toBe('HALTS_AND_ACCEPTS');
      expect(evalLoops.isContradictionProved).toBe(true);
      expect(evalLoops.resultingContradiction).toContain('contradicting H\'s claim');
    });
  });

  // ============================================================
  // Category E: Misconception Distinctions & Safety Matrix
  // ============================================================
  describe('Category E: Misconception Distinctions', () => {
    it('includes all 5 core pedagogical distinction items', () => {
      expect(HALTING_DISTINCTIONS.length).toBe(5);
      const topics = HALTING_DISTINCTIONS.map((d) => d.topic);
      expect(topics).toContain('Halting vs Accepting');
      expect(topics).toContain('Bounded Timeout vs Infinite Non-Halting');
      expect(topics).toContain('Theorem Proof vs Software Simulation');
      expect(topics).toContain('Nature of the Decider H');
      expect(topics).toContain('Undecidable vs Unsolvable Concrete Instances');
    });
  });
});
