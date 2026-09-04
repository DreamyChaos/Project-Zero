import { describe, it, expect } from 'vitest';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import { validateDFA, executeDFA } from '@project-zero/core-solver';

describe('Complete DFA Validation + Interaction Reliability Sprint', () => {
  const baseNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
  ];

  const baseEdges: TransitionEdge[] = [
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' },
    { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
    { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
    { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
  ];

  it('1. Valid canonical DFA passes validation with zero errors', () => {
    const val = validateDFA({ nodes: baseNodes, edges: baseEdges });
    expect(val.isValid).toBe(true);
    expect(val.errors.length).toBe(0);
  });

  it('2. Detects missing initial state', () => {
    const noInitNodes = baseNodes.map((n) => ({ ...n, isInitial: false }));
    const val = validateDFA({ nodes: noInitNodes, edges: baseEdges });
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.code === 'MISSING_INITIAL_STATE')).toBe(true);
  });

  it('3. Detects multiple initial states and returns affected state IDs', () => {
    const multiInitNodes = baseNodes.map((n) => ({ ...n, isInitial: true }));
    const val = validateDFA({ nodes: multiInitNodes, edges: baseEdges });
    expect(val.isValid).toBe(false);
    const err = val.errors.find((e) => e.code === 'MULTIPLE_INITIAL_STATES');
    expect(err).toBeDefined();
    expect(err?.affectedStateIds).toEqual(['q0', 'q1']);
  });

  it('4. Detects empty transition symbol and returns affected transition ID', () => {
    const emptyEdges = [...baseEdges, { id: 'e_empty', sourceNodeId: 'q0', targetNodeId: 'q1', label: ' ' }];
    const val = validateDFA({ nodes: baseNodes, edges: emptyEdges });
    expect(val.isValid).toBe(false);
    const err = val.errors.find((e) => e.code === 'EMPTY_TRANSITION_SYMBOL');
    expect(err).toBeDefined();
    expect(err?.affectedTransitionIds).toEqual(['e_empty']);
    expect(err?.message).toContain('Transition q0 → q1 has an empty input symbol');
  });

  it('5. Detects epsilon transition and returns affected transition ID', () => {
    const epsEdges = [...baseEdges, { id: 'e_eps', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' }];
    const val = validateDFA({ nodes: baseNodes, edges: epsEdges });
    expect(val.isValid).toBe(false);
    const err = val.errors.find((e) => e.code === 'EPSILON_TRANSITION');
    expect(err).toBeDefined();
    expect(err?.affectedTransitionIds).toEqual(['e_eps']);
    expect(err?.message).toContain('Transition q0 → q1 uses ε');
  });

  it('6. Detects duplicate same-symbol transition and returns affected state and edge IDs', () => {
    const dupEdges = [...baseEdges, { id: 'e_dup', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' }];
    const val = validateDFA({ nodes: baseNodes, edges: dupEdges });
    expect(val.isValid).toBe(false);
    const err = val.errors.find((e) => e.code === 'DUPLICATE_SYMBOL_TRANSITION');
    expect(err).toBeDefined();
    expect(err?.affectedStateIds).toEqual(['q0']);
    expect(err?.affectedTransitionIds).toContain('e1');
    expect(err?.affectedTransitionIds).toContain('e_dup');
  });

  it('7. Detects multiple simultaneous validation errors', () => {
    const multiErrEdges = [
      { id: 'e_eps', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' },
      { id: 'e_dup', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' },
    ];
    const val = validateDFA({ nodes: baseNodes, edges: multiErrEdges });
    expect(val.isValid).toBe(false);
    expect(val.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('8 & 9. Dynamic live validation transition (invalid -> valid -> invalid)', () => {
    const graph = { nodes: [...baseNodes], edges: [...baseEdges] };

    // Initially valid
    expect(validateDFA(graph).isValid).toBe(true);

    // Make invalid by adding duplicate transition
    graph.edges.push({ id: 'e_dup', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' });
    expect(validateDFA(graph).isValid).toBe(false);

    // Fix by removing duplicate transition
    graph.edges.pop();
    expect(validateDFA(graph).isValid).toBe(true);
  });

  it('10 & 11. Execution blocking for invalid DFA', () => {
    const invalidGraph = { nodes: baseNodes, edges: [{ id: 'e_eps', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' }] };
    const res = executeDFA(invalidGraph, '101');
    expect(res.validationResult.isValid).toBe(false);
    expect(res.rejectionReason).toBe('INVALID_MACHINE');
    expect(res.steps.length).toBe(0);
  });

  it('12. Missing runtime transition returns REJECT with NO_TRANSITION', () => {
    const sparseGraph = {
      nodes: baseNodes,
      edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' }],
    };
    const res = executeDFA(sparseGraph, '0');
    expect(res.validationResult.isValid).toBe(true);
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toBe('NO_TRANSITION');
  });

  it('13 & 14. ACCEPT and REJECT for valid input strings on canonical DFA', () => {
    const acceptRes = executeDFA({ nodes: baseNodes, edges: baseEdges }, '1011');
    expect(acceptRes.isAccepted).toBe(true);

    const rejectRes = executeDFA({ nodes: baseNodes, edges: baseEdges }, '1010');
    expect(rejectRes.isAccepted).toBe(false);
    expect(rejectRes.rejectionReason).toBe('NON_ACCEPTING_FINAL_STATE');
  });
});
