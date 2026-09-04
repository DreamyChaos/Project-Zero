import { describe, it, expect } from 'vitest';
import {
  CHURCH_TURING_THESIS_STATEMENT,
  COMPUTATIONAL_FORMAL_MODELS,
  CHURCH_TURING_DISTINCTIONS,
  classifyEffectiveProcedure,
  demonstrateChurchTuringEquivalence,
} from '../church-turing';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import { SolverGraphInput } from '../types';

describe('Module 5 — Topic 3: Church–Turing Thesis', () => {
  // ============================================================
  // Category A: Theory Content & Epistemological Integrity
  // ============================================================
  describe('Category A: Theory Content Integrity', () => {
    it('formulates the thesis precisely without claiming it is a mathematical theorem', () => {
      expect(CHURCH_TURING_THESIS_STATEMENT).toContain(
        'The intuitive notion of an effectively computable procedure is captured by Turing-computable functions'
      );

      // Verify distinction entry: thesis vs theorem
      const thesisVsTheorem = CHURCH_TURING_DISTINCTIONS.find(
        (d) => d.topic.includes('Thesis vs Theorem')
      );
      expect(thesisVsTheorem).toBeDefined();
      expect(thesisVsTheorem?.thesisDoesNotSay).toContain('proven from axioms');
      expect(thesisVsTheorem?.thesisDoesSay).toContain('connects an informal intuitive concept');
    });

    it('does not claim that finite software experiments "prove" the thesis', () => {
      for (const model of COMPUTATIONAL_FORMAL_MODELS) {
        expect(model.platformExecutionNote).not.toMatch(/proves the thesis/i);
        expect(model.computabilityPower).not.toMatch(/proves the thesis/i);
      }

      for (const item of CHURCH_TURING_DISTINCTIONS) {
        expect(item.thesisDoesSay).not.toMatch(/proves the thesis/i);
        expect(item.misconceptionWarning).toBeDefined();
      }
    });

    it('clearly contrasts computability with computational complexity', () => {
      const compVsComplexity = CHURCH_TURING_DISTINCTIONS.find(
        (d) => d.topic.includes('Computability vs Computational Complexity')
      );
      expect(compVsComplexity).toBeDefined();
      expect(compVsComplexity?.thesisDoesSay).toContain('WHAT can be computed in principle');
      expect(compVsComplexity?.thesisDoesNotSay).toContain('same time/space complexity');
      expect(compVsComplexity?.misconceptionWarning).toContain('computational complexity classes');
    });
  });

  // ============================================================
  // Category B: Formal Computational Models Registry
  // ============================================================
  describe('Category B: Formal Models Equivalence', () => {
    it('registers Turing Machine as executable and others as conceptual equivalents', () => {
      const tmModel = COMPUTATIONAL_FORMAL_MODELS.find((m) => m.id === 'turing-machine');
      expect(tmModel).toBeDefined();
      expect(tmModel?.isExecutableInPlatform).toBe(true);

      const lambdaModel = COMPUTATIONAL_FORMAL_MODELS.find((m) => m.id === 'lambda-calculus');
      expect(lambdaModel).toBeDefined();
      expect(lambdaModel?.isExecutableInPlatform).toBe(false);
      expect(lambdaModel?.platformExecutionNote).toContain('Conceptual equivalent model');

      const recursiveModel = COMPUTATIONAL_FORMAL_MODELS.find((m) => m.id === 'recursive-functions');
      expect(recursiveModel).toBeDefined();
      expect(recursiveModel?.isExecutableInPlatform).toBe(false);
      expect(recursiveModel?.platformExecutionNote).toContain('Conceptual equivalent model');

      const postModel = COMPUTATIONAL_FORMAL_MODELS.find((m) => m.id === 'post-systems');
      expect(postModel).toBeDefined();
      expect(postModel?.isExecutableInPlatform).toBe(false);
    });

    it('contains accurate historical attribution and formal citations', () => {
      const tm = COMPUTATIONAL_FORMAL_MODELS.find((m) => m.id === 'turing-machine');
      expect(tm?.founder).toBe('Alan Turing');
      expect(tm?.yearIntroduced).toBe(1936);

      const lambda = COMPUTATIONAL_FORMAL_MODELS.find((m) => m.id === 'lambda-calculus');
      expect(lambda?.founder).toBe('Alonzo Church');
      expect(lambda?.yearIntroduced).toBe(1936);

      const rec = COMPUTATIONAL_FORMAL_MODELS.find((m) => m.id === 'recursive-functions');
      expect(rec?.founder).toContain('Kurt Gödel');
      expect(rec?.yearIntroduced).toBe(1936);
    });
  });

  // ============================================================
  // Category C: Effective Procedure Classification
  // ============================================================
  describe('Category C: Effective Procedure Thought Experiment', () => {
    it('classifies a finite deterministic bit increment procedure as FINITE_ALGORITHMIC', () => {
      const result = classifyEffectiveProcedure('binary-increment-algo', 'FINITE_ALGORITHMIC');
      expect(result.isCorrect).toBe(true);
      expect(result.example.requiresHumanIntuitionOrOracle).toBe(false);
      expect(result.example.isMechanicallyExecutable).toBe(true);
    });

    it('classifies Halting Problem decision procedure as NON_EFFECTIVE_ORACLE', () => {
      const result = classifyEffectiveProcedure('halting-oracle-check', 'NON_EFFECTIVE_ORACLE');
      expect(result.isCorrect).toBe(true);
      expect(result.example.requiresHumanIntuitionOrOracle).toBe(true);
      expect(result.example.isMechanicallyExecutable).toBe(false);
    });

    it('classifies subjective aesthetic beauty judgment as UNDERSPECIFIED', () => {
      const result = classifyEffectiveProcedure('find-most-beautiful-string', 'UNDERSPECIFIED');
      expect(result.isCorrect).toBe(true);
      expect(result.example.requiresHumanIntuitionOrOracle).toBe(true);
    });

    it('classifies infinite exhaustive search for Goldbach counterexample as NON_EFFECTIVE_ORACLE', () => {
      const result = classifyEffectiveProcedure('goldbach-infinite-scan', 'NON_EFFECTIVE_ORACLE');
      expect(result.isCorrect).toBe(true);
      expect(result.example.requiresHumanIntuitionOrOracle).toBe(true);
    });

    it('returns helpful error feedback when user classification is incorrect', () => {
      const wrong = classifyEffectiveProcedure('binary-increment-algo', 'NON_EFFECTIVE_ORACLE');
      expect(wrong.isCorrect).toBe(false);
      expect(wrong.feedback).toContain('Incorrect');
      expect(wrong.feedback).toContain('FINITE_ALGORITHMIC');
    });
  });

  // ============================================================
  // Category D: Concrete TM Execution Integration
  // ============================================================
  describe('Category D: Existing TM Engine Integration', () => {
    it('demonstrates Church-Turing equivalence using genuine TM execution', () => {
      // Machine that writes '1' and halts in q1
      const nodes: StateNode[] = [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ];
      const edges: TransitionEdge[] = [
        {
          id: 'e1',
          sourceNodeId: 'q0',
          targetNodeId: 'q1',
          label: '0 → 1, R',
          readSymbol: '0',
          writeSymbol: '1',
          moveDirection: 'R',
        },
      ];
      const graph: SolverGraphInput = { nodes, edges };

      const demo = demonstrateChurchTuringEquivalence(graph, '0');

      expect(demo.isAccepted).toBe(true);
      expect(demo.isHalted).toBe(true);
      expect(demo.stepCount).toBe(2);
      expect(demo.haltingStateLabel).toBe('q1');
      expect(demo.statusLabel).toContain('HALTED_ACCEPT');
      expect(demo.partialFunctionNotation).toContain('f("0") = Defined');

      // Check model summary
      const tmEntry = demo.equivalentModelsSummary.find((m) => m.modelName.includes('Turing Machine'));
      expect(tmEntry?.equivalenceStatus).toBe('EXECUTED_DIRECTLY');

      const lambdaEntry = demo.equivalentModelsSummary.find((m) => m.modelName.includes('Lambda Calculus'));
      expect(lambdaEntry?.equivalenceStatus).toBe('CONCEPTUAL_EQUIVALENT');

      expect(demo.educationalThesisInsight).toContain('Church-Turing Thesis');
    });

    it('handles non-accepting or missing transition correctly', () => {
      const nodes: StateNode[] = [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      ];
      const edges: TransitionEdge[] = [
        {
          id: 'e1',
          sourceNodeId: 'q0',
          targetNodeId: 'q1',
          label: '0 → 0, R',
          readSymbol: '0',
          writeSymbol: '0',
          moveDirection: 'R',
        },
      ];
      const graph: SolverGraphInput = { nodes, edges };

      const demo = demonstrateChurchTuringEquivalence(graph, '0');

      expect(demo.isAccepted).toBe(false);
      expect(demo.isHalted).toBe(true);
      expect(demo.statusLabel).toContain('HALTED_REJECT');
      expect(demo.partialFunctionNotation).toContain('Rejected / Halted outside F');
    });

    it('handles bounded step limit / divergence correctly', () => {
      // Infinite loop machine: q0 stays in q0 on both '0' and blank '□'
      const nodes: StateNode[] = [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      ];
      const edges: TransitionEdge[] = [
        {
          id: 'e1',
          sourceNodeId: 'q0',
          targetNodeId: 'q0',
          label: '0 → 0, R',
          readSymbol: '0',
          writeSymbol: '0',
          moveDirection: 'R',
        },
        {
          id: 'e2',
          sourceNodeId: 'q0',
          targetNodeId: 'q0',
          label: '□ → □, R',
          readSymbol: '□',
          writeSymbol: '□',
          moveDirection: 'R',
        },
      ];
      const graph: SolverGraphInput = { nodes, edges };

      const demo = demonstrateChurchTuringEquivalence(graph, '0', { maxSteps: 5 });

      expect(demo.isAccepted).toBe(false);
      expect(demo.statusLabel).toContain('INCONCLUSIVE_LIMIT');
      expect(demo.partialFunctionNotation).toContain('Undefined / Diverges (⊥)');
    });
  });
});
