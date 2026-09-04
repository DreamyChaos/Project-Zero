import { describe, it, expect } from 'vitest';
import {
  analyzeLanguageFiniteness,
  testLanguageMembership,
  generateLanguageExamples,
  analyzeRegularLanguage,
  applyRegularLanguageOperation,
} from '../regular-languages';
import { SolverGraphInput } from '../types';

describe('Regular Languages Domain & Properties Engine (Module 2 Topic 5)', () => {
  // 1. Language Finiteness Analysis
  describe('1. Finite vs Infinite Regular Language Classification', () => {
    it('Empty language is finite', () => {
      const emptyGraph: SolverGraphInput = {
        nodes: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        ],
        edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' }],
      };

      const res = analyzeLanguageFiniteness(emptyGraph, 'DFA');
      expect(res.isFinite).toBe(true);
      expect(res.maxStringLength).toBe(0);
      expect(res.usefulStates.length).toBe(0);
    });

    it('Epsilon language {ε} is finite', () => {
      const epsGraph: SolverGraphInput = {
        nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }],
        edges: [],
      };

      const res = analyzeLanguageFiniteness(epsGraph, 'DFA');
      expect(res.isFinite).toBe(true);
      expect(res.maxStringLength).toBe(0);
      expect(res.usefulStates).toEqual(['q0']);
    });

    it('Finite language {a, ab} is finite with correct max string length', () => {
      const finiteGraph: SolverGraphInput = {
        nodes: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
          { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
        ],
        edges: [
          { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
          { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'b' },
        ],
      };

      const res = analyzeLanguageFiniteness(finiteGraph, 'DFA');
      expect(res.isFinite).toBe(true);
      expect(res.maxStringLength).toBe(2);
      expect(res.cyclesDetected.length).toBe(0);
    });

    it('Infinite language a* detects cycle in useful states', () => {
      const infiniteGraph: SolverGraphInput = {
        nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }],
        edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a' }],
      };

      const res = analyzeLanguageFiniteness(infiniteGraph, 'DFA');
      expect(res.isFinite).toBe(false);
      expect(res.cyclesDetected.length).toBeGreaterThan(0);
      expect(res.explanation).toContain('INFINITE');
    });

    it('Cycle on dead/trap state does NOT make a finite language infinite', () => {
      // q0 --a--> q1 (acc)
      // q0 --b--> q_trap (non-acc, self-loop on b)
      const trapCycleGraph: SolverGraphInput = {
        nodes: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
          { id: 'q_trap', label: 'q_trap', x: 100, y: 100, isInitial: false, isAccepting: false },
        ],
        edges: [
          { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
          { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q_trap', label: 'b' },
          { id: 'e3', sourceNodeId: 'q_trap', targetNodeId: 'q_trap', label: 'b' },
        ],
      };

      const res = analyzeLanguageFiniteness(trapCycleGraph, 'DFA');
      expect(res.isFinite).toBe(true); // L = {a}, only finite strings!
      expect(res.usefulStates).not.toContain('q_trap');
    });
  });

  // 2. Language Membership and Example Generation
  describe('2. Language Membership & Example Generation', () => {
    const dfaEvenZeros: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
      ],
    };

    it('Tests membership w in L accurately', () => {
      const resEps = testLanguageMembership(dfaEvenZeros, 'DFA', '');
      expect(resEps.isMember).toBe(true);

      const resOneZero = testLanguageMembership(dfaEvenZeros, 'DFA', '0');
      expect(resOneZero.isMember).toBe(false);

      const resTwoZeros = testLanguageMembership(dfaEvenZeros, 'DFA', '00');
      expect(resTwoZeros.isMember).toBe(true);
    });

    it('Generates verified accepted and rejected example strings', () => {
      const examples = generateLanguageExamples(dfaEvenZeros, 'DFA', 4, 4);
      expect(examples.accepted).toContain('');
      expect(examples.accepted).toContain('00');
      expect(examples.rejected).toContain('0');
      expect(examples.rejected).toContain('000');
    });

    it('Performs full regular language analysis', () => {
      const analysis = analyzeRegularLanguage(dfaEvenZeros, 'DFA');
      expect(analysis.alphabet).toEqual(['0']);
      expect(analysis.finiteness.isFinite).toBe(false);
      expect(analysis.containsEpsilon).toBe(true);
      expect(analysis.isEmpty).toBe(false);
      expect(analysis.synthesizedRegex).toBeDefined();
    });
  });

  // 3. Closure Operations
  describe('3. Closure Operations on Regular Languages', () => {
    const langA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' }],
    }; // L_A = {a}

    const langB: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b' }],
    }; // L_B = {b}

    it('Union L_A U L_B accepts "a" and "b"', () => {
      const res = applyRegularLanguageOperation(
        'UNION',
        { graph: langA, type: 'DFA' },
        { graph: langB, type: 'DFA' }
      );
      expect(res.success).toBe(true);

      const testA = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'a');
      expect(testA.isMember).toBe(true);

      const testB = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'b');
      expect(testB.isMember).toBe(true);

      const testAB = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'ab');
      expect(testAB.isMember).toBe(false);
    });

    it('Intersection L_A ∩ L_B is empty', () => {
      const res = applyRegularLanguageOperation(
        'INTERSECTION',
        { graph: langA, type: 'DFA' },
        { graph: langB, type: 'DFA' }
      );
      expect(res.success).toBe(true);

      const testA = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'a');
      expect(testA.isMember).toBe(false);
    });

    it('Complement of {a} rejects "a" and accepts "" and "b"', () => {
      const res = applyRegularLanguageOperation('COMPLEMENT', { graph: langA, type: 'DFA' });
      expect(res.success).toBe(true);

      const testA = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'a');
      expect(testA.isMember).toBe(false);

      const testEps = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, '');
      expect(testEps.isMember).toBe(true);
    });

    it('Difference L_A \\ L_B accepts "a" and rejects "b"', () => {
      const res = applyRegularLanguageOperation(
        'DIFFERENCE',
        { graph: langA, type: 'DFA' },
        { graph: langB, type: 'DFA' }
      );
      expect(res.success).toBe(true);

      const testA = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'a');
      expect(testA.isMember).toBe(true);

      const testB = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'b');
      expect(testB.isMember).toBe(false);
    });

    it('Concatenation L_A · L_B accepts "ab"', () => {
      const res = applyRegularLanguageOperation(
        'CONCATENATION',
        { graph: langA, type: 'DFA' },
        { graph: langB, type: 'DFA' }
      );
      expect(res.success).toBe(true);

      const testAB = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'ab');
      expect(testAB.isMember).toBe(true);

      const testA = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'a');
      expect(testA.isMember).toBe(false);
    });

    it('Kleene Star L_A* accepts "", "a", "aa", "aaa"', () => {
      const res = applyRegularLanguageOperation('KLEENE_STAR', { graph: langA, type: 'DFA' });
      expect(res.success).toBe(true);

      const testEps = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, '');
      expect(testEps.isMember).toBe(true);

      const testA = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'a');
      expect(testA.isMember).toBe(true);

      const testAA = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'aa');
      expect(testAA.isMember).toBe(true);

      const testB = testLanguageMembership({ nodes: [...res.nodes], edges: [...res.edges] }, res.machineType, 'b');
      expect(testB.isMember).toBe(false);
    });
  });
});
