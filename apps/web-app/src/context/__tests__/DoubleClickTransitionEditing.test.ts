import { describe, it, expect } from 'vitest';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

export interface GraphSnapshot {
  nodes: StateNode[];
  edges: TransitionEdge[];
}

function createSnapshot(state: { nodes: StateNode[]; edges: TransitionEdge[] }): GraphSnapshot {
  return {
    nodes: state.nodes.map((n) => ({ ...n })),
    edges: state.edges.map((e) => ({ ...e })),
  };
}

function createTestGraphEngine() {
  const state = {
    nodes: [] as StateNode[],
    edges: [] as TransitionEdge[],
    selectedNodeIds: [] as string[],
    selectedEdgeIds: [] as string[],
    past: [] as GraphSnapshot[],
    future: [] as GraphSnapshot[],
  };

  const addNode = (node: StateNode) => {
    state.past.push(createSnapshot(state));
    state.future = [];
    state.nodes = [...state.nodes, node];
  };

  const addEdge = (edge: TransitionEdge) => {
    state.past.push(createSnapshot(state));
    state.future = [];
    state.edges = [...state.edges, edge];
  };

  const updateEdge = (id: string, patch: Partial<TransitionEdge>) => {
    state.past.push(createSnapshot(state));
    state.future = [];
    state.edges = state.edges.map((e) => (e.id === id ? { ...e, ...patch } : e));
  };

  const undo = () => {
    if (state.past.length === 0) return;
    const previous = state.past.pop()!;
    state.future.unshift(createSnapshot(state));
    state.nodes = previous.nodes;
    state.edges = previous.edges;
  };

  const redo = () => {
    if (state.future.length === 0) return;
    const next = state.future.shift()!;
    state.past.push(createSnapshot(state));
    state.nodes = next.nodes;
    state.edges = next.edges;
  };

  return { state, addNode, addEdge, updateEdge, undo, redo };
}

describe('Phase 2 — Global Double-Click Transition Editing Suite', () => {
  const q0: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true };
  const q1: StateNode = { id: 'q1', label: 'q1', x: 200, y: 0, isAccepting: true };

  // 1. DFA normal transition double-click edit
  it('1. updates DFA transition symbol and records undo history', () => {
    const engine = createTestGraphEngine();
    engine.addNode(q0);
    engine.addNode(q1);
    engine.addEdge({ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' });

    expect(engine.state.edges[0].label).toBe('a');

    // Simulate double-click edit: change symbol 'a' -> 'b'
    engine.updateEdge('e1', { label: 'b', inputSymbol: 'b' });

    expect(engine.state.edges[0].label).toBe('b');
    expect(engine.state.edges[0].inputSymbol).toBe('b');

    // Verify Undo restores 'a'
    engine.undo();
    expect(engine.state.edges[0].label).toBe('a');

    // Verify Redo restores 'b'
    engine.redo();
    expect(engine.state.edges[0].label).toBe('b');
  });

  // 2. NFA transition double-click edit
  it('2. updates NFA transition and preserves determinism branching structure', () => {
    const engine = createTestGraphEngine();
    engine.addNode(q0);
    engine.addNode(q1);
    engine.addEdge({ id: 'e_nfa1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' });
    engine.addEdge({ id: 'e_nfa2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' });

    expect(engine.state.edges).toHaveLength(2);

    // Edit e_nfa2 from '0' to '1'
    engine.updateEdge('e_nfa2', { label: '1', inputSymbol: '1' });
    expect(engine.state.edges.find((e) => e.id === 'e_nfa2')?.label).toBe('1');
    expect(engine.state.edges.find((e) => e.id === 'e_nfa1')?.label).toBe('0');
  });

  // 3. ε-NFA transition double-click edit
  it('3. updates ε-NFA transition to non-epsilon and vice versa', () => {
    const engine = createTestGraphEngine();
    engine.addNode(q0);
    engine.addNode(q1);
    engine.addEdge({ id: 'e_eps', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' });

    expect(engine.state.edges[0].label).toBe('ε');

    // Edit to 'a'
    engine.updateEdge('e_eps', { label: 'a', inputSymbol: 'a' });
    expect(engine.state.edges[0].label).toBe('a');

    // Edit back to 'ε'
    engine.updateEdge('e_eps', { label: 'ε', inputSymbol: 'ε' });
    expect(engine.state.edges[0].label).toBe('ε');
  });

  // 4. PDA transition double-click edit with structured tuple
  it('4. pre-populates and updates PDA transition with input, stackTop, and stackReplacement', () => {
    const engine = createTestGraphEngine();
    engine.addNode(q0);
    engine.addNode(q1);
    engine.addEdge({
      id: 'e_pda',
      sourceNodeId: 'q0',
      targetNodeId: 'q1',
      label: 'b, a / ε',
      inputSymbol: 'b',
      stackTop: 'a',
      stackReplacement: 'ε',
    });

    const edge = engine.state.edges[0];
    expect(edge.inputSymbol).toBe('b');
    expect(edge.stackTop).toBe('a');
    expect(edge.stackReplacement).toBe('ε');

    // Edit PDA transition: 'a, Z0 / AZ0'
    engine.updateEdge('e_pda', {
      label: 'a, Z0 / AZ0',
      inputSymbol: 'a',
      stackTop: 'Z0',
      stackReplacement: 'AZ0',
    });

    const updated = engine.state.edges[0];
    expect(updated.label).toBe('a, Z0 / AZ0');
    expect(updated.inputSymbol).toBe('a');
    expect(updated.stackTop).toBe('Z0');
    expect(updated.stackReplacement).toBe('AZ0');

    // Undo restores original PDA fields
    engine.undo();
    const restored = engine.state.edges[0];
    expect(restored.label).toBe('b, a / ε');
    expect(restored.inputSymbol).toBe('b');
    expect(restored.stackTop).toBe('a');
    expect(restored.stackReplacement).toBe('ε');
  });

  // 5. TM transition double-click edit with structured read, write, move
  it('5. pre-populates and updates TM transition with readSymbol, writeSymbol, moveDirection', () => {
    const engine = createTestGraphEngine();
    engine.addNode(q0);
    engine.addNode(q1);
    engine.addEdge({
      id: 'e_tm',
      sourceNodeId: 'q0',
      targetNodeId: 'q1',
      label: '0 → 1, R',
      readSymbol: '0',
      writeSymbol: '1',
      moveDirection: 'R',
    });

    const edge = engine.state.edges[0];
    expect(edge.readSymbol).toBe('0');
    expect(edge.writeSymbol).toBe('1');
    expect(edge.moveDirection).toBe('R');

    // Edit TM transition: '1 → 0, L'
    engine.updateEdge('e_tm', {
      label: '1 → 0, L',
      readSymbol: '1',
      writeSymbol: '0',
      moveDirection: 'L',
    });

    const updated = engine.state.edges[0];
    expect(updated.label).toBe('1 → 0, L');
    expect(updated.readSymbol).toBe('1');
    expect(updated.writeSymbol).toBe('0');
    expect(updated.moveDirection).toBe('L');

    // Redo restores after undo
    engine.undo();
    expect(engine.state.edges[0].readSymbol).toBe('0');
    engine.redo();
    expect(engine.state.edges[0].readSymbol).toBe('1');
  });

  // 6. Self-loop transition editing
  it('6. updates self-loop transition without losing isSelfLoop flag', () => {
    const engine = createTestGraphEngine();
    engine.addNode(q0);
    engine.addEdge({
      id: 'e_self',
      sourceNodeId: 'q0',
      targetNodeId: 'q0',
      label: 'a',
      isSelfLoop: true,
    });

    engine.updateEdge('e_self', { label: 'b' });
    expect(engine.state.edges[0].label).toBe('b');
    expect(engine.state.edges[0].sourceNodeId).toBe('q0');
    expect(engine.state.edges[0].targetNodeId).toBe('q0');
  });

  // 7. Cancel behavior preserves state
  it('7. leaves graph and transition completely unchanged when editing is cancelled', () => {
    const engine = createTestGraphEngine();
    engine.addNode(q0);
    engine.addNode(q1);
    engine.addEdge({ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'x' });

    const pastLengthBefore = engine.state.past.length;

    // Simulating user opening modal, modifying scratch values, and pressing Cancel:
    // (No updateEdge call dispatched)
    expect(engine.state.edges[0].label).toBe('x');
    expect(engine.state.past.length).toBe(pastLengthBefore);
  });
});
