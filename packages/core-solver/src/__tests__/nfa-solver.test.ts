import { describe, it, expect } from 'vitest';
import { validateNFA, normalizeSymbol, isEpsilonSymbol } from '../nfa-validator';
import { epsilonClosure, nfaMove, executeNFA } from '../nfa-executor';
import { SolverGraphInput } from '../types';

describe('NFA Validation & Execution Engine Unit Tests', () => {
  it('normalizes epsilon symbols correctly without converting plain letters', () => {
    expect(normalizeSymbol('ε')).toBe('ε');
    expect(normalizeSymbol('λ')).toBe('ε');
    expect(normalizeSymbol(' ε ')).toBe('ε');
    expect(normalizeSymbol('e')).toBe('e');
    expect(normalizeSymbol('epsilon')).toBe('epsilon');
    expect(isEpsilonSymbol('ε')).toBe(true);
    expect(isEpsilonSymbol('λ')).toBe(true);
    expect(isEpsilonSymbol('e')).toBe(false);
  });

  it('validates NFA graphs with duplicate symbol transitions and epsilon transitions', () => {
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'a' }, // Duplicate symbol transition
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε' }, // Epsilon transition
      ],
    };

    const res = validateNFA(graph);
    expect(res.isValid).toBe(true);
    expect(res.machineType).toBe('NFA');
    expect(res.errors).toEqual([]);
  });

  it('Phase 19 — Epsilon Cycle Test (prevents infinite recursion)', () => {
    // q0 --ε--> q1, q1 --ε--> q2, q2 --ε--> q1, q2 --a--> q3
    // q0 initial, q3 accepting
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 300, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'λ' },
        { id: 'e3', sourceNodeId: 'q2', targetNodeId: 'q1', label: 'ε' }, // Cycle!
        { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q3', label: 'a' },
      ],
    };

    const closure = epsilonClosure(['q0'], graph);
    expect(closure.map((n) => n.id)).toEqual(['q0', 'q1', 'q2']);

    const moved = nfaMove(closure, 'a', graph);
    expect(moved.map((n) => n.id)).toEqual(['q3']);

    const execResult = executeNFA(graph, 'a');
    expect(execResult.isAccepted).toBe(true);
    expect(execResult.finalStates.map((s) => s.id)).toContain('q3');
  });

  it('Phase 18 — Canonical NFA Test (Branching & Multiple Acceptance Paths)', () => {
    // q0 --ε--> q1, q0 --ε--> q2
    // q1 --a--> q3, q2 --b--> q4
    // q3 --a--> q3, q4 --b--> q4
    // q0 initial, q3 & q4 accepting
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 100, y: 100, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 200, y: 0, isInitial: false, isAccepting: true },
        { id: 'q4', label: 'q4', x: 200, y: 100, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'ε' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q3', label: 'a' },
        { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q4', label: 'b' },
        { id: 'e5', sourceNodeId: 'q3', targetNodeId: 'q3', label: 'a' },
        { id: 'e6', sourceNodeId: 'q4', targetNodeId: 'q4', label: 'b' },
      ],
    };

    expect(executeNFA(graph, '').isAccepted).toBe(false);
    expect(executeNFA(graph, 'a').isAccepted).toBe(true);
    expect(executeNFA(graph, 'b').isAccepted).toBe(true);
    expect(executeNFA(graph, 'aa').isAccepted).toBe(true);
    expect(executeNFA(graph, 'bb').isAccepted).toBe(true);
    expect(executeNFA(graph, 'ab').isAccepted).toBe(false);
    expect(executeNFA(graph, 'ba').isAccepted).toBe(false);
  });

  it('Phase 20 — Nondeterministic Branching Test', () => {
    // q0 --a--> q1, q0 --a--> q2
    // q1 --b--> q3, q2 --c--> q4
    // q0 initial, q3 & q4 accepting
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 100, y: 100, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 200, y: 0, isInitial: false, isAccepting: true },
        { id: 'q4', label: 'q4', x: 200, y: 100, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'a' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q3', label: 'b' },
        { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q4', label: 'c' },
      ],
    };

    const step1 = executeNFA(graph, 'ab');
    expect(step1.steps[0].nextStates.map((s) => s.id)).toEqual(['q1', 'q2']);
    expect(step1.isAccepted).toBe(true);

    const step2 = executeNFA(graph, 'ac');
    expect(step2.isAccepted).toBe(true);

    const step3 = executeNFA(graph, 'aa');
    expect(step3.isAccepted).toBe(false);
  });
});
