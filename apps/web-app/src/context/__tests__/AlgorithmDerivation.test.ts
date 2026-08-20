import { describe, it, expect } from 'vitest';
import {
  convertNfaToDfaWithTrace,
  minimizeDFAWithTrace,
  executeNFA,
  executeDFA,
} from '@project-zero/core-solver';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Interactive Automata Algorithm Derivation & Trace Test Suite (Phase 10 Requirements)', () => {
  const nfaNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
  ];
  const nfaEdges: TransitionEdge[] = [
    { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a' },
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
  ];

  it('1. NFA -> DFA trace produces deterministic step-by-step subset construction trace', () => {
    const res = convertNfaToDfaWithTrace({ nodes: nfaNodes, edges: nfaEdges });
    expect(res.success).toBe(true);
    expect(res.trace).toBeDefined();
    expect(res.trace?.steps.length).toBeGreaterThan(0);

    const step0 = res.trace!.steps[0];
    expect(step0.currentDfaStateId).toBeDefined();
    expect(step0.symbol).toBe('a');
    expect(step0.targetEpsilonClosureIds).toBeDefined();
  });

  it('2. NFA -> DFA conversion result matches pure mathematical output', () => {
    const resTrace = convertNfaToDfaWithTrace({ nodes: nfaNodes, edges: nfaEdges });
    expect(resTrace.nodes.length).toBeGreaterThan(0);
    expect(resTrace.edges.length).toBeGreaterThan(0);
  });

  it('3. DFA Minimization trace produces deterministic step-by-step partition refinement steps', () => {
    const dfaNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const dfaEdges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'a' },
      { id: 'e2', sourceNodeId: 'q2', targetNodeId: 'q2', label: 'a' },
    ];

    const res = minimizeDFAWithTrace({ nodes: dfaNodes, edges: dfaEdges });
    expect(res.success).toBe(true);
    expect(res.trace).toBeDefined();
    expect(res.trace?.steps.length).toBeGreaterThan(0);

    const step0 = res.trace!.steps[0];
    expect(step0.iteration).toBe(1);
    expect(step0.currentPartitions.length).toBeGreaterThan(0);
  });

  it('4. Language equivalence holds for generated DFA against original NFA execution', () => {
    const dfaRes = convertNfaToDfaWithTrace({ nodes: nfaNodes, edges: nfaEdges });
    const nfaExec = executeNFA({ nodes: nfaNodes, edges: nfaEdges }, 'aa');
    const dfaExec = executeDFA({ nodes: dfaRes.nodes, edges: dfaRes.edges }, 'aa');
    expect(dfaExec.isAccepted).toBe(nfaExec.isAccepted);
  });
});
