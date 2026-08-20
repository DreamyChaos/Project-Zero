import { describe, it, expect } from 'vitest';
import { analyzeMachine, explainExecutionRun } from '../machine-analyzer';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Deterministic Machine Analysis & Explanation Tests', () => {
  const dfaNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    { id: 'q_dead', label: 'q_dead', x: 200, y: 0, isInitial: false, isAccepting: false },
  ];

  const dfaEdges: TransitionEdge[] = [
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
    { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q_dead', label: '0' },
    { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
    { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q_dead', label: '0' },
    { id: 'e5', sourceNodeId: 'q_dead', targetNodeId: 'q_dead', label: '0' },
    { id: 'e6', sourceNodeId: 'q_dead', targetNodeId: 'q_dead', label: '1' },
  ];

  it('1. Analyzes complete valid DFA with reachable and trap states', () => {
    const analysis = analyzeMachine({ nodes: dfaNodes, edges: dfaEdges }, 'DFA');

    expect(analysis.isStructurallyValid).toBe(true);
    expect(analysis.isCompleteDFA).toBe(true);
    expect(analysis.stateCount).toBe(3);
    expect(analysis.transitionCount).toBe(6);
    expect(analysis.alphabet).toEqual(['0', '1']);
    expect(analysis.initialStateId).toBe('q0');
    expect(analysis.acceptingStateIds).toEqual(['q1']);
    expect(analysis.reachableStateIds).toHaveLength(3);
    expect(analysis.unreachableStateIds).toHaveLength(0);
    expect(analysis.trapStateIds).toEqual(['q_dead']);
    expect(analysis.observations.some((o) => o.includes('Trap/Dead state(s) detected'))).toBe(true);
  });

  it('2. Detects unreachable states deterministically', () => {
    const nodesWithUnreachable: StateNode[] = [
      ...dfaNodes,
      { id: 'q_isolated', label: 'q_isolated', x: 300, y: 0, isInitial: false, isAccepting: false },
    ];

    const analysis = analyzeMachine({ nodes: nodesWithUnreachable, edges: dfaEdges }, 'DFA');
    expect(analysis.unreachableStateIds).toEqual(['q_isolated']);
    expect(analysis.observations.some((o) => o.includes('Unreachable states detected'))).toBe(true);
  });

  it('3. Analyzes NFA with branching and epsilon transitions', () => {
    const nfaNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const nfaEdges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e3', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a' },
    ];

    const analysis = analyzeMachine({ nodes: nfaNodes, edges: nfaEdges }, 'NFA');
    expect(analysis.hasEpsilonTransitions).toBe(true);
    expect(analysis.hasNondeterministicBranching).toBe(true);
    expect(analysis.observations.some((o) => o.includes('ε/λ transitions'))).toBe(true);
  });

  it('4. Explains DFA execution run with formal derivations and step summaries', () => {
    const explanation = explainExecutionRun({ nodes: dfaNodes, edges: dfaEdges }, '11', 'DFA');

    expect(explanation.isAccepted).toBe(true);
    expect(explanation.stepSummaries).toHaveLength(2);
    expect(explanation.derivations).toHaveLength(2);
    expect(explanation.formalProofText).toContain('δ(q0, 1) = q1');
    expect(explanation.formalProofText).toContain('∈ F (Accepting Set), therefore string is ACCEPTED');
  });

  it('5. Explains rejected execution run accurately', () => {
    const explanation = explainExecutionRun({ nodes: dfaNodes, edges: dfaEdges }, '10', 'DFA');

    expect(explanation.isAccepted).toBe(false);
    expect(explanation.formalProofText).toContain('∉ F (Accepting Set), therefore string is REJECTED');
  });

  it('6. Analyzes TM machine structure deterministically', () => {
    const tmNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const tmEdges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const analysis = analyzeMachine({ nodes: tmNodes, edges: tmEdges }, 'TM');
    expect(analysis.isStructurallyValid).toBe(true);
    expect(analysis.machineType).toBe('TM');
    expect(analysis.stateCount).toBe(2);
    expect(analysis.transitionCount).toBe(1);
  });
});
