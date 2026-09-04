import { describe, it, expect } from 'vitest';
import {
  constructProductAutomaton,
  complementDFA,
  executeTransformationPipeline,
} from '../automata-operations';
import { executeDFA } from '../dfa-executor';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Automata Relationship & Transformation Workbench Core Math Tests', () => {
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

  it('1. Computes UNION of Machine A ("a") and Machine B ("b")', () => {
    const res = constructProductAutomaton({ nodes: nodesA, edges: edgesA }, 'DFA', { nodes: nodesB, edges: edgesB }, 'DFA', 'UNION');
    expect(res.success).toBe(true);
    expect(res.operation).toBe('UNION');
    expect(res.nodes.length).toBeGreaterThan(0);

    // Verify generated DFA accepts "a" and "b"
    const execA = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'a');
    const execB = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'b');
    const execC = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'c');

    expect(execA.isAccepted).toBe(true);
    expect(execB.isAccepted).toBe(true);
    expect(execC.isAccepted).toBe(false);
  });

  it('2. Computes INTERSECTION of Machine A ("a" or "b") and Machine B ("a")', () => {
    // Machine A accepts "a" or "b"
    const nodesA2: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edgesA2: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b' },
    ];

    const res = constructProductAutomaton(
      { nodes: nodesA2, edges: edgesA2 },
      'DFA',
      { nodes: nodesA, edges: edgesA },
      'DFA',
      'INTERSECTION'
    );

    expect(res.success).toBe(true);
    expect(res.operation).toBe('INTERSECTION');

    const execA = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'a');
    const execB = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'b');

    expect(execA.isAccepted).toBe(true);
    expect(execB.isAccepted).toBe(false);
  });

  it('3. Computes DIFFERENCE L(A) \\ L(B)', () => {
    // Machine A accepts "a" or "b"
    const nodesA2: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edgesA2: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b' },
    ];

    // Machine B accepts "a"
    const res = constructProductAutomaton(
      { nodes: nodesA2, edges: edgesA2 },
      'DFA',
      { nodes: nodesA, edges: edgesA },
      'DFA',
      'DIFFERENCE'
    );

    expect(res.success).toBe(true);
    expect(res.operation).toBe('DIFFERENCE');

    const execA = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'a');
    const execB = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'b');

    expect(execA.isAccepted).toBe(false); // "a" is in B, so removed by difference
    expect(execB.isAccepted).toBe(true);  // "b" is in A but not B, so preserved
  });

  it('4. Computes COMPLEMENT L(M\') = Σ* \\ L(M)', () => {
    const res = complementDFA({ nodes: nodesA, edges: edgesA }, 'DFA');
    expect(res.success).toBe(true);
    expect(res.operation).toBe('COMPLEMENT');

    // "a" was accepted by Machine A -> must be REJECTED in complement
    // "b" or "" was rejected by Machine A -> must be ACCEPTED in complement
    const execA = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'a');
    const execEps = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, '');

    expect(execA.isAccepted).toBe(false);
    expect(execEps.isAccepted).toBe(true);
  });

  it('5. Auto-converts NFA operand to DFA before product construction', () => {
    // NFA operand with non-determinism
    const nfaNodes: StateNode[] = [
      { id: 'n0', label: 'n0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'n1', label: 'n1', x: 100, y: 0, isInitial: false, isAccepting: true },
      { id: 'n2', label: 'n2', x: 100, y: 100, isInitial: false, isAccepting: true },
    ];
    const nfaEdges: TransitionEdge[] = [
      { id: 'ne0', sourceNodeId: 'n0', targetNodeId: 'n1', label: 'a' },
      { id: 'ne1', sourceNodeId: 'n0', targetNodeId: 'n2', label: 'a' },
    ];

    const res = constructProductAutomaton(
      { nodes: nfaNodes, edges: nfaEdges },
      'NFA',
      { nodes: nodesB, edges: edgesB },
      'DFA',
      'UNION'
    );

    expect(res.success).toBe(true);
    const execA = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'a');
    const execB = executeDFA({ nodes: [...res.nodes], edges: [...res.edges] }, 'b');

    expect(execA.isAccepted).toBe(true);
    expect(execB.isAccepted).toBe(true);
  });

  it('6. Executes chained transformation pipeline (NFA → DFA → Minimize → Complement)', () => {
    const nfaNodes: StateNode[] = [
      { id: 'n0', label: 'n0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'n1', label: 'n1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const nfaEdges: TransitionEdge[] = [
      { id: 'ne0', sourceNodeId: 'n0', targetNodeId: 'n1', label: 'a' },
    ];

    const pipelineRes = executeTransformationPipeline(
      { nodes: nfaNodes, edges: nfaEdges },
      'NFA',
      ['NFA_TO_DFA', 'DFA_MINIMIZE', 'COMPLEMENT']
    );

    expect(pipelineRes.success).toBe(true);
    expect(pipelineRes.stepResults.length).toBe(3);
    expect(pipelineRes.finalMachineType).toBe('DFA');
  });

  it('7. Handles invalid machine operand gracefully without crashing', () => {
    const invalidNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false, isAccepting: false },
    ]; // No initial state

    const res = constructProductAutomaton(
      { nodes: invalidNodes, edges: [] },
      'DFA',
      { nodes: nodesB, edges: edgesB },
      'DFA',
      'UNION'
    );

    expect(res.success).toBe(false);
    expect(res.errorMessage).toContain('Missing initial start state');
  });
});
