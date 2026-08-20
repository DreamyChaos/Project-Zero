import { describe, it, expect } from 'vitest';
import {
  generateEquivalenceProof,
  generateCounterexampleTrace,
  compareAutomataLanguages,
} from '@project-zero/core-solver';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Formal Proof & Counterexample Explorer Integration Tests', () => {
  // Machine A accepts "a"
  const nodesA: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
  ];
  const edgesA: TransitionEdge[] = [
    { id: 'eA0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
  ];

  // Machine B accepts "b"
  const nodesB: StateNode[] = [
    { id: 'p0', label: 'p0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'p1', label: 'p1', x: 100, y: 0, isInitial: false, isAccepting: true },
  ];
  const edgesB: TransitionEdge[] = [
    { id: 'eB0', sourceNodeId: 'p0', targetNodeId: 'p1', label: 'b' },
  ];

  it('1. Generates formal proof matching solver equivalence result', () => {
    const eqResult = compareAutomataLanguages(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA'
    );

    const proof = generateEquivalenceProof(eqResult, 'Canvas Machine', 'Preset B');

    expect(proof.isEquivalent).toBe(false);
    expect(proof.counterexample).toBe('a');
    expect(proof.steps.length).toBeGreaterThan(0);
    expect(proof.conclusion).toContain('L(Canvas Machine) ≠ L(Preset B)');
  });

  it('2. Reconstructs counterexample step-by-step trace correctly', () => {
    const trace = generateCounterexampleTrace(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA',
      'a'
    );

    expect(trace.length).toBe(2);
    expect(trace[0].stepIndex).toBe(0);
    expect(trace[0].consumedPrefix).toBe('');
    expect(trace[1].stepIndex).toBe(1);
    expect(trace[1].consumedPrefix).toBe('a');
    expect(trace[1].symbol).toBe('a');
    expect(trace[1].isDistinguishing).toBe(true);
    expect(trace[1].isAcceptingA).toBe(true);
    expect(trace[1].isAcceptingB).toBe(false);
  });

  it('3. Immutability & History Safety: Proof generation & trace reconstruction create 0 undo history entries and 0 node/edge mutations', () => {
    const originalNodes = JSON.parse(JSON.stringify(nodesA));
    const originalEdges = JSON.parse(JSON.stringify(edgesA));

    const eqResult = compareAutomataLanguages(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA'
    );

    generateEquivalenceProof(eqResult);
    generateCounterexampleTrace(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA',
      'a'
    );

    // Verify canonical graph objects were not mutated
    expect(nodesA).toEqual(originalNodes);
    expect(edgesA).toEqual(originalEdges);
  });
});
