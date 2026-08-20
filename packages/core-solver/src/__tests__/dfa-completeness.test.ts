import { describe, it, expect } from 'vitest';
import { validateDFA, analyzeDFACompleteness } from '../dfa-validator';
import { SolverGraphInput } from '../types';

describe('DFA Completeness Analysis', () => {
  it('detects a complete DFA', () => {
    // q0 --0--> q0, q0 --1--> q1, q1 --0--> q0, q1 --1--> q1
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
      ],
    };

    const validation = validateDFA(graph);
    expect(validation.isValid).toBe(true);

    const completeness = analyzeDFACompleteness(graph);
    expect(completeness.isComplete).toBe(true);
    expect(completeness.alphabet).toEqual(['0', '1']);
    expect(completeness.missingTransitions).toEqual([]);
  });

  it('detects missing transitions in incomplete DFA while remaining structurally valid', () => {
    // Canonical Phase 13 test case: delete q1 --0--> q0
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
      ],
    };

    const validation = validateDFA(graph);
    expect(validation.isValid).toBe(true);

    const completeness = analyzeDFACompleteness(graph);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.alphabet).toEqual(['0', '1']);
    expect(completeness.missingTransitions).toHaveLength(1);
    expect(completeness.missingTransitions[0]).toEqual({
      stateId: 'q1',
      stateLabel: 'q1',
      symbol: '0',
    });
  });

  it('detects multiple missing transitions across states', () => {
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
        { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'b' },
      ],
    };

    const completeness = analyzeDFACompleteness(graph);
    expect(completeness.isComplete).toBe(false);
    expect(completeness.alphabet).toEqual(['a', 'b']);
    // q0 is missing 'b', q1 is missing 'a', q2 is missing 'a' and 'b' -> total 4 missing
    expect(completeness.missingTransitions).toHaveLength(4);
  });
});
