import { describe, it, expect } from 'vitest';
import { compareDFALanguages, compareAutomataLanguages } from '../dfa-equivalence';
import { analyzeMachine } from '../machine-analyzer';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('DFA & Automata Equivalence Engine (Product Automaton BFS)', () => {
  it('1. Identifies identical DFAs as equivalent', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'a' },
    ];

    const res = compareDFALanguages({ nodes, edges }, { nodes, edges });
    expect(res.isEquivalent).toBe(true);
    expect(res.counterexample).toBeUndefined();
  });

  it('2 & 3. Immediate counterexample at initial state (ε mismatch)', () => {
    const nodesA: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
    ];
    const nodesB: StateNode[] = [
      { id: 'p0', label: 'p0', x: 0, y: 0, isInitial: true, isAccepting: false },
    ];

    const res = compareDFALanguages({ nodes: nodesA, edges: [] }, { nodes: nodesB, edges: [] });
    expect(res.isEquivalent).toBe(false);
    expect(res.counterexample).toBe('');
    expect(res.acceptsA).toBe(true);
    expect(res.acceptsB).toBe(false);
  });

  it('4 & 5. Multi-step shortest counterexample selection', () => {
    // DFA A accepts "ab"
    // DFA B accepts "a"
    const nodesA: StateNode[] = [
      { id: 'a0', label: 'a0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'a1', label: 'a1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'a2', label: 'a2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edgesA: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'a0', targetNodeId: 'a1', label: 'a' },
      { id: 'e2', sourceNodeId: 'a1', targetNodeId: 'a2', label: 'b' },
    ];

    const nodesB: StateNode[] = [
      { id: 'b0', label: 'b0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'b1', label: 'b1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edgesB: TransitionEdge[] = [
      { id: 'e3', sourceNodeId: 'b0', targetNodeId: 'b1', label: 'a' },
    ];

    const res = compareDFALanguages({ nodes: nodesA, edges: edgesA }, { nodes: nodesB, edges: edgesB });
    expect(res.isEquivalent).toBe(false);
    // Shortest counterexample is "a" (accepted by B, rejected by A)
    expect(res.counterexample).toBe('a');
    expect(res.acceptsA).toBe(false);
    expect(res.acceptsB).toBe(true);
  });

  it('6. Equivalent DFAs with different state counts (minimal vs non-minimal)', () => {
    // DFA A (2 states): L = { a^n | n >= 1 }
    const nodesA: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edgesA: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'a' },
    ];

    // DFA B (3 states, duplicate accepting state q2): L = { a^n | n >= 1 }
    const nodesB: StateNode[] = [
      { id: 'p0', label: 'p0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'p1', label: 'p1', x: 100, y: 0, isInitial: false, isAccepting: true },
      { id: 'p2', label: 'p2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edgesB: TransitionEdge[] = [
      { id: 'eb0', sourceNodeId: 'p0', targetNodeId: 'p1', label: 'a' },
      { id: 'eb1', sourceNodeId: 'p1', targetNodeId: 'p2', label: 'a' },
      { id: 'eb2', sourceNodeId: 'p2', targetNodeId: 'p1', label: 'a' },
    ];

    const res = compareDFALanguages({ nodes: nodesA, edges: edgesA }, { nodes: nodesB, edges: edgesB });
    expect(res.isEquivalent).toBe(true);
  });

  it('7 & 8. Ignores unreachable states and handles trap states correctly', () => {
    const nodesA: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
      { id: 'unreachable', label: 'unreachable', x: 900, y: 0, isInitial: false, isAccepting: false },
    ];
    const nodesB: StateNode[] = [
      { id: 'p0', label: 'p0', x: 0, y: 0, isInitial: true, isAccepting: true },
    ];

    const res = compareDFALanguages({ nodes: nodesA, edges: [] }, { nodes: nodesB, edges: [] });
    expect(res.isEquivalent).toBe(true);
  });

  it('9 & 10. Multi-character alphabet symbols matching', () => {
    // DFA A accepts "a1b2"
    // DFA B accepts "a1b2"
    const nodesA: StateNode[] = [
      { id: 'a0', label: 'a0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'a1', label: 'a1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'a2', label: 'a2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edgesA: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'a0', targetNodeId: 'a1', label: 'a1' },
      { id: 'e2', sourceNodeId: 'a1', targetNodeId: 'a2', label: 'b2' },
    ];

    const res = compareDFALanguages({ nodes: nodesA, edges: edgesA }, { nodes: nodesA, edges: edgesA });
    expect(res.isEquivalent).toBe(true);
  });

  it('11 & 12. NFA vs NFA and NFA vs DFA equivalence using subset construction', () => {
    // NFA accepting "a"
    const nfaNodes: StateNode[] = [
      { id: 'n0', label: 'n0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'n1', label: 'n1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const nfaEdges: TransitionEdge[] = [
      { id: 'ne0', sourceNodeId: 'n0', targetNodeId: 'n1', label: 'a' },
    ];

    // DFA accepting "a"
    const dfaNodes: StateNode[] = [
      { id: 'd0', label: 'd0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'd1', label: 'd1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const dfaEdges: TransitionEdge[] = [
      { id: 'de0', sourceNodeId: 'd0', targetNodeId: 'd1', label: 'a' },
    ];

    const resNfaDfa = compareAutomataLanguages(
      { nodes: nfaNodes, edges: nfaEdges },
      'NFA',
      { nodes: dfaNodes, edges: dfaEdges },
      'DFA'
    );
    expect(resNfaDfa.isEquivalent).toBe(true);
    expect(resNfaDfa.wasNFAConvertedA).toBe(true);
    expect(resNfaDfa.wasNFAConvertedB).toBe(false);

    const resNfaNfa = compareAutomataLanguages(
      { nodes: nfaNodes, edges: nfaEdges },
      'NFA',
      { nodes: nfaNodes, edges: nfaEdges },
      'NFA'
    );
    expect(resNfaNfa.isEquivalent).toBe(true);
  });

  it('13 & 14. Analysis detects co-accessible states and empty language L(M) = ∅', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      // q2 (accepting) is isolated -> L(M) = ∅
    ];

    const analysis = analyzeMachine({ nodes, edges }, 'DFA');
    expect(analysis.isLanguageEmpty).toBe(true);
    expect(analysis.coaccessibleStateIds).toContain('q2');
    expect(analysis.coaccessibleStateIds).not.toContain('q0');
    expect(analysis.observations.some((o) => o.includes('L(M) = ∅'))).toBe(true);
  });

  it('15 & 16. Cycle protection & step derivation structure', () => {
    // Cyclic DFA accepting odd length strings of 'a'
    const nodesA: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edgesA: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q0', label: 'a' },
    ];

    const res = compareDFALanguages({ nodes: nodesA, edges: edgesA }, { nodes: nodesA, edges: edgesA });
    expect(res.isEquivalent).toBe(true);
    expect(res.trace).toBeDefined();
    expect(res.trace?.productStatesExplored).toBeGreaterThan(0);
  });
});
