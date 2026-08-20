import { describe, it, expect } from 'vitest';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

// Helper function to simulate GraphContext queries cleanly
function createGraphStore() {
  const state = {
    nodes: [] as StateNode[],
    edges: [] as TransitionEdge[],
    machineType: 'DFA' as const,
  };

  const getInitialState = () => state.nodes.find((n) => n.isInitial);
  const getAcceptingStates = () => state.nodes.filter((n) => n.isAccepting);
  const getAlphabet = () => {
    const raw = state.edges.map((e) => e.label).filter((l) => l && l.trim().length > 0);
    return Array.from(new Set(raw)).sort();
  };
  const getOutgoingTransitions = (stateId: string) => state.edges.filter((e) => e.sourceNodeId === stateId);
  const getTransitionsForSymbol = (stateId: string, symbol: string) =>
    state.edges.filter((e) => e.sourceNodeId === stateId && e.label === symbol);
  const hasEpsilonTransitions = () =>
    state.edges.some((e) => !e.label || e.label === 'ε' || e.label === 'λ' || e.label.trim() === '');

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
    const initial = state.nodes.find((n) => n.isInitial);
    return {
      states: state.nodes.map((n) => n.label || n.id),
      alphabet: getAlphabet(),
      initialState: initial ? initial.label || initial.id : null,
      acceptingStates: state.nodes.filter((n) => n.isAccepting).map((n) => n.label || n.id),
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
    addEdge,
    updateEdge,
    removeEdge,
    getInitialState,
    getAcceptingStates,
    getAlphabet,
    getOutgoingTransitions,
    getTransitionsForSymbol,
    hasEpsilonTransitions,
    to5Tuple,
  };
}

describe('GraphContext — State Properties, Machine Metadata & Validation-Ready Foundation', () => {
  it('Phase 13 & 14 — Full Graph Model & Query Verification', () => {
    const store = createGraphStore();

    // 1. Add states q0, q1, q2, q3
    store.addNode({ id: 'q0', label: 'q0', x: 100, y: 100, isInitial: true });
    store.addNode({ id: 'q1', label: 'q1', x: 200, y: 100, isAccepting: true });
    store.addNode({ id: 'q2', label: 'q2', x: 200, y: 200 });
    store.addNode({ id: 'q3', label: 'q3', x: 100, y: 200, isAccepting: true });

    expect(store.state.nodes.length).toBe(4);
    expect(store.getAcceptingStates().length).toBe(2);
    expect(store.getInitialState()?.label).toBe('q0');
    expect(store.getAcceptingStates().map((n: StateNode) => n.label)).toEqual(['q1', 'q3']);

    // 2. Add transitions: q0--a-->q1, q0--b-->q3, q1--0-->q2, q2--1-->q3
    store.addEdge({ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' });
    store.addEdge({ id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q3', label: 'b' });
    store.addEdge({ id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q2', label: '0' });
    store.addEdge({ id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q3', label: '1' });

    expect(store.state.edges.length).toBe(4);
    expect(store.getAlphabet()).toEqual(['0', '1', 'a', 'b']);

    // 3. Test outgoing transition queries
    const q0Outgoing = store.getOutgoingTransitions('q0');
    expect(q0Outgoing.length).toBe(2);

    const q0b = store.getTransitionsForSymbol('q0', 'b');
    expect(q0b.length).toBe(1);
    expect(q0b[0].targetNodeId).toBe('q3');

    // 4. Test 5-tuple export
    const tuple5 = store.to5Tuple();
    expect(tuple5.states).toEqual(['q0', 'q1', 'q2', 'q3']);
    expect(tuple5.alphabet).toEqual(['0', '1', 'a', 'b']);
    expect(tuple5.initialState).toBe('q0');
    expect(tuple5.acceptingStates).toEqual(['q1', 'q3']);
    expect(tuple5.transitions.length).toBe(4);

    // 5. Edit symbol: a -> x
    store.updateEdge('e1', { label: 'x' });
    expect(store.getAlphabet()).toEqual(['0', '1', 'b', 'x']);

    // 6. Delete final transition using x
    store.removeEdge('e1');
    expect(store.state.edges.length).toBe(3);
    expect(store.getAlphabet()).toEqual(['0', '1', 'b']);

    // 7. Test single initial state enforcement: setting q2 as initial unsets q0
    store.updateNode('q2', { isInitial: true });
    expect(store.getInitialState()?.id).toBe('q2');
    expect(store.state.nodes.find((n: StateNode) => n.id === 'q0')?.isInitial).toBe(false);

    // 8. Test Unicode symbol support (ε)
    store.addEdge({ id: 'e5', sourceNodeId: 'q2', targetNodeId: 'q3', label: 'ε' });
    expect(store.hasEpsilonTransitions()).toBe(true);
    expect(store.getAlphabet()).toEqual(['0', '1', 'b', 'ε']);
  });
});
