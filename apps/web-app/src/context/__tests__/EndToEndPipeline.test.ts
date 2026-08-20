import { describe, it, expect } from 'vitest';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import { validateDFA, executeDFA, computeTransitionMatrix } from '@project-zero/core-solver';

function createCanonicalPipelineStore() {
  const state = {
    nodes: [] as StateNode[],
    edges: [] as TransitionEdge[],
    machineType: 'DFA' as const,
  };

  const getInitialState = () => state.nodes.find((n) => n.isInitial);
  const getAcceptingStates = () => state.nodes.filter((n) => n.isAccepting);
  const getAlphabet = () => {
    const raw = state.edges.map((e) => e.label).filter((l) => l && l.trim().length > 0 && l !== 'ε' && l !== 'λ');
    return Array.from(new Set(raw)).sort();
  };

  const addNode = (node: StateNode) => {
    const isFirstNode = state.nodes.length === 0;
    const newNode = { ...node, isInitial: node.isInitial ?? isFirstNode };
    const isSettingInitial = newNode.isInitial === true;
    const existingNodes = isSettingInitial
      ? state.nodes.map((n) => ({ ...n, isInitial: false }))
      : state.nodes;
    state.nodes = [...existingNodes, newNode];
  };

  const updateNode = (id: string, patch: Partial<StateNode>) => {
    const isSettingInitial = patch.isInitial === true;
    state.nodes = state.nodes.map((n) => {
      if (n.id === id) {
        return { ...n, ...patch };
      }
      return isSettingInitial ? { ...n, isInitial: false } : n;
    });
  };

  const removeNode = (id: string) => {
    state.nodes = state.nodes.filter((n) => n.id !== id);
    state.edges = state.edges.filter((e) => e.sourceNodeId !== id && e.targetNodeId !== id);
  };

  const addEdge = (edge: TransitionEdge) => {
    if (!state.edges.some((e) => e.id === edge.id)) {
      state.edges.push(edge);
    }
  };

  const updateEdge = (id: string, patch: Partial<TransitionEdge>) => {
    state.edges = state.edges.map((e) => (e.id === id ? { ...e, ...patch } : e));
  };

  const removeEdge = (id: string) => {
    state.edges = state.edges.filter((e) => e.id !== id);
  };

  const to5Tuple = () => {
    const initial = getInitialState();
    return {
      states: state.nodes.map((n) => n.label || n.id),
      alphabet: getAlphabet(),
      initialState: initial ? initial.label || initial.id : null,
      acceptingStates: getAcceptingStates().map((n) => n.label || n.id),
      transitions: state.edges.map((e) => ({
        from: state.nodes.find((n) => n.id === e.sourceNodeId)?.label || e.sourceNodeId,
        symbol: e.label,
        to: state.nodes.find((n) => n.id === e.targetNodeId)?.label || e.targetNodeId,
      })),
    };
  };

  return {
    state,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    updateEdge,
    removeEdge,
    getInitialState,
    getAcceptingStates,
    getAlphabet,
    to5Tuple,
  };
}

describe('End-to-End Pipeline: Canvas → GraphContext → Core Solver → UI Execution', () => {
  it('Phase 6 — Canonical DFA Integration Test (L = { w ends in 1 })', () => {
    const pipeline = createCanonicalPipelineStore();

    // 1. Create states q0 (initial) and q1 (accepting)
    pipeline.addNode({ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false });
    pipeline.addNode({ id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true });

    // 2. Create transitions: q0--0-->q0, q0--1-->q1, q1--0-->q0, q1--1-->q1
    pipeline.addEdge({ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' });
    pipeline.addEdge({ id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' });
    pipeline.addEdge({ id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' });
    pipeline.addEdge({ id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' });

    // 3. Verify GraphContext state
    expect(pipeline.state.nodes.length).toBe(2);
    expect(pipeline.state.edges.length).toBe(4);
    expect(pipeline.getAlphabet()).toEqual(['0', '1']);
    expect(pipeline.getInitialState()?.label).toBe('q0');
    expect(pipeline.getAcceptingStates().map((n) => n.label)).toEqual(['q1']);

    // 4. Validate DFA graph via @project-zero/core-solver
    const val = validateDFA({ nodes: pipeline.state.nodes, edges: pipeline.state.edges });
    expect(val.isValid).toBe(true);

    // 5. Test Phase 6 exact test table against real solver execution
    const testCases = [
      { input: '', expected: false },
      { input: '0', expected: false },
      { input: '1', expected: true },
      { input: '10', expected: false },
      { input: '11', expected: true },
      { input: '1010', expected: false },
      { input: '1011', expected: true },
      { input: '111', expected: true },
      { input: '100', expected: false },
    ];

    for (const tc of testCases) {
      const res = executeDFA({ nodes: pipeline.state.nodes, edges: pipeline.state.edges }, tc.input);
      expect(res.isAccepted).toBe(tc.expected);
      expect(res.validationResult.isValid).toBe(true);
    }

    // 6. Test Transition Matrix generation
    const matrix = computeTransitionMatrix({ nodes: pipeline.state.nodes, edges: pipeline.state.edges });
    expect(matrix.symbols).toEqual(['0', '1']);
    expect(matrix.hasAmbiguity).toBe(false);
    expect(matrix.entries.length).toBe(2);

    // 7. Test 5-Tuple export
    const tuple5 = pipeline.to5Tuple();
    expect(tuple5.states).toEqual(['q0', 'q1']);
    expect(tuple5.alphabet).toEqual(['0', '1']);
    expect(tuple5.initialState).toBe('q0');
    expect(tuple5.acceptingStates).toEqual(['q1']);
    expect(tuple5.transitions.length).toBe(4);
  });

  it('Phase 4 & 9 — Dynamic Invalid DFA Detection and Solver Reaction', () => {
    const pipeline = createCanonicalPipelineStore();
    pipeline.addNode({ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true });
    pipeline.addNode({ id: 'q1', label: 'q1', x: 100, y: 0, isAccepting: true });

    // Add duplicate transition on symbol '0' (NFA branching)
    pipeline.addEdge({ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' });
    pipeline.addEdge({ id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' });

    const val = validateDFA({ nodes: pipeline.state.nodes, edges: pipeline.state.edges });
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.code === 'DUPLICATE_SYMBOL_TRANSITION')).toBe(true);

    const exec = executeDFA({ nodes: pipeline.state.nodes, edges: pipeline.state.edges }, '0');
    expect(exec.isAccepted).toBe(false);
    expect(exec.rejectionReason).toBe('INVALID_MACHINE');
  });

  it('Phase 3 — Symbol Editing & Dynamic Alphabet Update', () => {
    const pipeline = createCanonicalPipelineStore();
    pipeline.addNode({ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true });
    pipeline.addNode({ id: 'q1', label: 'q1', x: 100, y: 0 });

    pipeline.addEdge({ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' });
    expect(pipeline.getAlphabet()).toEqual(['a']);

    // Edit 'a' -> 'x'
    pipeline.updateEdge('e1', { label: 'x' });
    expect(pipeline.getAlphabet()).toEqual(['x']);

    // Remove edge
    pipeline.removeEdge('e1');
    expect(pipeline.getAlphabet()).toEqual([]);
  });
});
