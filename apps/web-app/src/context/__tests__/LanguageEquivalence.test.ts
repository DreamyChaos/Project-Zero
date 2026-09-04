import { describe, it, expect } from 'vitest';
import { compareAutomataLanguages, analyzeMachine } from '@project-zero/core-solver';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Language Equivalence Workbench & UI Isolation Integration Tests', () => {
  it('1. Analyzes machine reachability, co-accessibility, and language emptiness', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
    ];

    const result = analyzeMachine({ nodes, edges }, 'DFA');
    expect(result.isLanguageEmpty).toBe(false);
    expect(result.reachableStateIds).toEqual(['q0', 'q1']);
    expect(result.coaccessibleStateIds).toEqual(['q1', 'q0']);
    expect(result.unreachableStateIds).toEqual([]);
  });

  it('2. Finds counterexample for non-equivalent DFAs without graph mutation', () => {
    const nodesA: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
    ];
    const nodesB: StateNode[] = [
      { id: 'p0', label: 'p0', x: 0, y: 0, isInitial: true, isAccepting: false },
    ];

    const initialNodesACopy = JSON.stringify(nodesA);
    const initialNodesBCopy = JSON.stringify(nodesB);

    const result = compareAutomataLanguages(
      { nodes: nodesA, edges: [] },
      'DFA',
      { nodes: nodesB, edges: [] },
      'DFA'
    );

    expect(result.isEquivalent).toBe(false);
    expect(result.counterexample).toBe('');

    // Guarantee analysis is 100% read-only and un-mutated
    expect(JSON.stringify(nodesA)).toBe(initialNodesACopy);
    expect(JSON.stringify(nodesB)).toBe(initialNodesBCopy);
  });

  it('3. Cross-automaton NFA vs DFA equivalence testing', () => {
    const nfaNodes: StateNode[] = [
      { id: 'n0', label: 'n0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'n1', label: 'n1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const nfaEdges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'n0', targetNodeId: 'n1', label: 'a' },
    ];

    const dfaNodes: StateNode[] = [
      { id: 'd0', label: 'd0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'd1', label: 'd1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const dfaEdges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'd0', targetNodeId: 'd1', label: 'a' },
    ];

    const result = compareAutomataLanguages(
      { nodes: nfaNodes, edges: nfaEdges },
      'NFA',
      { nodes: dfaNodes, edges: dfaEdges },
      'DFA'
    );

    expect(result.isEquivalent).toBe(true);
    expect(result.wasNFAConvertedA).toBe(true);
    expect(result.wasNFAConvertedB).toBe(false);
  });
});
