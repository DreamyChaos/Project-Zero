import { describe, it, expect } from 'vitest';
import {
  generateEquivalenceProof,
  generateCounterexampleTrace,
  generateTransformationProof,
} from '../proof-generator';
import { compareAutomataLanguages } from '../dfa-equivalence';
import { convertNfaToDfa } from '../nfa-to-dfa';
import { minimizeDFA } from '../dfa-minimizer';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Formal Proof & Counterexample Explorer Engine Tests', () => {
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

  it('1. Generates formal equivalence proof for equivalent machines', () => {
    const eqResult = compareAutomataLanguages(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesA, edges: edgesA },
      'DFA'
    );

    const proof = generateEquivalenceProof(eqResult, 'DFA A', 'DFA A (Copy)');

    expect(proof.isEquivalent).toBe(true);
    expect(proof.category).toBe('EQUIVALENCE');
    expect(proof.steps.length).toBeGreaterThan(0);
    expect(proof.steps[0].type).toBe('INITIAL_CONFIGURATION');
    expect(proof.steps[proof.steps.length - 1].type).toBe('RESULT');
    expect(proof.conclusion).toContain('L(DFA A) = L(DFA A (Copy))');
  });

  it('2. Generates formal non-equivalence proof with distinguishing counterexample step', () => {
    const eqResult = compareAutomataLanguages(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA'
    );

    const proof = generateEquivalenceProof(eqResult, 'DFA A', 'DFA B');

    expect(proof.isEquivalent).toBe(false);
    expect(proof.category).toBe('COUNTEREXAMPLE');
    expect(proof.counterexample).toBeDefined();

    const hasDistinguishingStep = proof.steps.some((s) => s.type === 'DISTINGUISHING_CONFIGURATION');
    expect(hasDistinguishingStep).toBe(true);
    expect(proof.conclusion).toContain('≠');
  });

  it('3. Reconstructs step-by-step counterexample trace w = "a"', () => {
    const traceSteps = generateCounterexampleTrace(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA',
      'a'
    );

    expect(traceSteps.length).toBe(2); // Step 0 (initial), Step 1 ('a')
    expect(traceSteps[0].stepIndex).toBe(0);
    expect(traceSteps[0].consumedPrefix).toBe('');
    expect(traceSteps[1].consumedPrefix).toBe('a');
    expect(traceSteps[1].symbol).toBe('a');
    expect(traceSteps[1].isAcceptingA).toBe(true);
    expect(traceSteps[1].isAcceptingB).toBe(false);
    expect(traceSteps[1].isDistinguishing).toBe(true);
  });

  it('4. Reconstructs counterexample trace for empty string counterexample ε', () => {
    // Machine A accepts ε, Machine B rejects ε
    const nodesAAccEps: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
    ];
    const nodesBRejEps: StateNode[] = [
      { id: 'p0', label: 'p0', x: 0, y: 0, isInitial: true, isAccepting: false },
    ];

    const traceSteps = generateCounterexampleTrace(
      { nodes: nodesAAccEps, edges: [] },
      'DFA',
      { nodes: nodesBRejEps, edges: [] },
      'DFA',
      ''
    );

    expect(traceSteps.length).toBe(1);
    expect(traceSteps[0].isDistinguishing).toBe(true);
    expect(traceSteps[0].isAcceptingA).toBe(true);
    expect(traceSteps[0].isAcceptingB).toBe(false);
  });

  it('5. Generates formal transformation proof for NFA to DFA subset construction', () => {
    const nfaNodes: StateNode[] = [
      { id: 'n0', label: 'n0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'n1', label: 'n1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const nfaEdges: TransitionEdge[] = [
      { id: 'ne0', sourceNodeId: 'n0', targetNodeId: 'n1', label: 'a' },
    ];

    const conv = convertNfaToDfa({ nodes: nfaNodes, edges: nfaEdges });
    const proof = generateTransformationProof(conv);

    expect(proof.category).toBe('TRANSFORMATION');
    expect(proof.steps.length).toBeGreaterThan(0);
    expect(proof.conclusion).toContain('NFA successfully converted');
  });

  it('6. Generates formal transformation proof for DFA Minimization', () => {
    const minRes = minimizeDFA({ nodes: nodesA, edges: edgesA });
    const proof = generateTransformationProof(minRes);

    expect(proof.category).toBe('TRANSFORMATION');
    expect(proof.steps.length).toBeGreaterThan(0);
    expect(proof.conclusion).toContain('DFA minimized');
  });

  it('7. Hostile Safety Test: Proof generation does NOT mutate original input graphs', () => {
    const nodesCopy = JSON.parse(JSON.stringify(nodesA));
    const edgesCopy = JSON.parse(JSON.stringify(edgesA));

    const eqResult = compareAutomataLanguages(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA'
    );
    generateEquivalenceProof(eqResult, 'DFA A', 'DFA B');
    generateCounterexampleTrace(
      { nodes: nodesA, edges: edgesA },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA',
      'a'
    );

    expect(nodesA).toEqual(nodesCopy);
    expect(edgesA).toEqual(edgesCopy);
  });
});
