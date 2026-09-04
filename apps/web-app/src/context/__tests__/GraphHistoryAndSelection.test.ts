import { describe, it, expect } from 'vitest';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

export interface GraphSnapshot {
  nodes: StateNode[];
  edges: TransitionEdge[];
}

function recomputeParallelIndices(edges: TransitionEdge[]): TransitionEdge[] {
  const pairGroups = new Map<string, TransitionEdge[]>();
  for (const edge of edges) {
    const key = [edge.sourceNodeId, edge.targetNodeId].sort().join('<->');
    const list = pairGroups.get(key) ?? [];
    list.push(edge);
    pairGroups.set(key, list);
  }

  const result: TransitionEdge[] = [];
  for (const group of pairGroups.values()) {
    if (group.length === 1) {
      const edge = group[0];
      const isSelfLoop = edge.sourceNodeId === edge.targetNodeId;
      result.push(isSelfLoop ? { ...edge, isSelfLoop: true } : { ...edge, parallelIndex: 0 });
    } else {
      group.forEach((edge, idx) => {
        let parallelIndex = 0;
        if (idx > 0) {
          const step = Math.ceil(idx / 2);
          parallelIndex = idx % 2 === 1 ? step : -step;
        }
        const isSelfLoop = edge.sourceNodeId === edge.targetNodeId;
        result.push({ ...edge, parallelIndex, isSelfLoop });
      });
    }
  }
  return result;
}

function createSnapshot(state: { nodes: StateNode[]; edges: TransitionEdge[] }): GraphSnapshot {
  return {
    nodes: state.nodes.map((n) => ({ ...n })),
    edges: state.edges.map((e) => ({ ...e })),
  };
}

function createGraphEngine() {
  const state = {
    nodes: [] as StateNode[],
    edges: [] as TransitionEdge[],
    selectedNodeIds: [] as string[],
    selectedEdgeIds: [] as string[],
    past: [] as GraphSnapshot[],
    future: [] as GraphSnapshot[],
    clipboard: null as { nodes: StateNode[]; edges: TransitionEdge[] } | null,
  };

  const addNode = (node: StateNode) => {
    state.past.push(createSnapshot(state));
    state.future = [];
    const isFirstNode = state.nodes.length === 0;
    const newNode = { ...node, isInitial: node.isInitial ?? isFirstNode };
    const isSettingInitial = newNode.isInitial === true;
    const existingNodes = isSettingInitial
      ? state.nodes.map((n) => ({ ...n, isInitial: false }))
      : state.nodes;
    state.nodes = [...existingNodes, newNode];
  };

  const removeNode = (id: string) => {
    state.past.push(createSnapshot(state));
    state.future = [];
    const remainingEdges = state.edges.filter(
      (e) => e.sourceNodeId !== id && e.targetNodeId !== id
    );
    state.nodes = state.nodes.filter((n) => n.id !== id);
    state.edges = recomputeParallelIndices(remainingEdges);
    state.selectedNodeIds = state.selectedNodeIds.filter((nid) => nid !== id);
    state.selectedEdgeIds = state.selectedEdgeIds.filter((eid) =>
      remainingEdges.some((e) => e.id === eid)
    );
  };

  const addEdge = (edge: TransitionEdge) => {
    if (state.edges.some((e) => e.id === edge.id)) return;
    state.past.push(createSnapshot(state));
    state.future = [];
    state.edges = recomputeParallelIndices([...state.edges, edge]);
  };

  const removeEdge = (id: string) => {
    state.past.push(createSnapshot(state));
    state.future = [];
    state.edges = recomputeParallelIndices(state.edges.filter((e) => e.id !== id));
    state.selectedEdgeIds = state.selectedEdgeIds.filter((eid) => eid !== id);
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

  const deleteSelected = () => {
    if (state.selectedNodeIds.length === 0 && state.selectedEdgeIds.length === 0) return;
    state.past.push(createSnapshot(state));
    state.future = [];
    const deleteNodeSet = new Set(state.selectedNodeIds);
    const deleteEdgeSet = new Set(state.selectedEdgeIds);
    state.nodes = state.nodes.filter((n) => !deleteNodeSet.has(n.id));
    state.edges = recomputeParallelIndices(
      state.edges.filter(
        (e) =>
          !deleteEdgeSet.has(e.id) &&
          !deleteNodeSet.has(e.sourceNodeId) &&
          !deleteNodeSet.has(e.targetNodeId)
      )
    );
    state.selectedNodeIds = [];
    state.selectedEdgeIds = [];
  };

  const clearCanvas = () => {
    if (state.nodes.length > 0 || state.edges.length > 0) {
      state.past.push(createSnapshot(state));
    }
    state.future = [];
    state.nodes = [];
    state.edges = [];
    state.selectedNodeIds = [];
    state.selectedEdgeIds = [];
  };

  const copySelection = () => {
    const selectedNodes = state.nodes.filter((n) => state.selectedNodeIds.includes(n.id));
    if (selectedNodes.length === 0) return;
    const selectedNodeIdSet = new Set(selectedNodes.map((n) => n.id));
    const internalEdges = state.edges.filter(
      (e) => selectedNodeIdSet.has(e.sourceNodeId) && selectedNodeIdSet.has(e.targetNodeId)
    );
    state.clipboard = {
      nodes: selectedNodes.map((n) => ({ ...n })),
      edges: internalEdges.map((e) => ({ ...e })),
    };
  };

  const pasteSelection = () => {
    if (!state.clipboard || state.clipboard.nodes.length === 0) return;
    state.past.push(createSnapshot(state));
    state.future = [];
    const idMap = new Map<string, string>();
    const pastedNodes: StateNode[] = state.clipboard.nodes.map((n) => {
      const newId = `node_pasted_${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(n.id, newId);
      return { ...n, id: newId, x: n.x + 30, y: n.y + 30, isInitial: false, isSelected: true };
    });
    const pastedEdges: TransitionEdge[] = state.clipboard.edges.map((e) => {
      const newEdgeId = `edge_pasted_${Math.random().toString(36).slice(2, 6)}`;
      return {
        ...e,
        id: newEdgeId,
        sourceNodeId: idMap.get(e.sourceNodeId)!,
        targetNodeId: idMap.get(e.targetNodeId)!,
        isSelected: true,
      };
    });
    state.nodes = [...state.nodes, ...pastedNodes];
    state.edges = recomputeParallelIndices([...state.edges, ...pastedEdges]);
    state.selectedNodeIds = pastedNodes.map((n) => n.id);
    state.selectedEdgeIds = pastedEdges.map((e) => e.id);
  };

  return {
    state,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    undo,
    redo,
    deleteSelected,
    clearCanvas,
    copySelection,
    pasteSelection,
  };
}

describe('GraphContext History, Multi-Selection, Copy/Paste & Canvas Operations', () => {
  const node1: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false };
  const node2: StateNode = { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true };
  const edge1: TransitionEdge = { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' };

  it('handles create state → undo → redo', () => {
    const engine = createGraphEngine();
    expect(engine.state.nodes).toHaveLength(0);

    engine.addNode(node1);
    expect(engine.state.nodes).toHaveLength(1);
    expect(engine.state.past).toHaveLength(1);

    engine.undo();
    expect(engine.state.nodes).toHaveLength(0);
    expect(engine.state.future).toHaveLength(1);

    engine.redo();
    expect(engine.state.nodes).toHaveLength(1);
    expect(engine.state.nodes[0].id).toBe('q0');
  });

  it('clears redo branch on new mutation after undo', () => {
    const engine = createGraphEngine();
    engine.addNode(node1);
    engine.undo();
    expect(engine.state.future).toHaveLength(1);

    engine.addNode(node2);
    expect(engine.state.future).toHaveLength(0);
  });

  it('handles node deletion removing connected edges automatically', () => {
    const engine = createGraphEngine();
    engine.addNode(node1);
    engine.addNode(node2);
    engine.addEdge(edge1);
    expect(engine.state.nodes).toHaveLength(2);
    expect(engine.state.edges).toHaveLength(1);

    engine.removeNode('q0');
    expect(engine.state.nodes).toHaveLength(1);
    expect(engine.state.edges).toHaveLength(0);

    engine.undo();
    expect(engine.state.nodes).toHaveLength(2);
    expect(engine.state.edges).toHaveLength(1);
  });

  it('supports multi-selection and bulk deletion', () => {
    const engine = createGraphEngine();
    engine.addNode(node1);
    engine.addNode(node2);
    engine.addEdge(edge1);

    engine.state.selectedNodeIds = ['q0', 'q1'];
    engine.state.selectedEdgeIds = ['e0'];

    engine.deleteSelected();
    expect(engine.state.nodes).toHaveLength(0);
    expect(engine.state.edges).toHaveLength(0);
    expect(engine.state.selectedNodeIds).toHaveLength(0);
  });

  it('handles copy and paste preserving relative positions and internal transitions', () => {
    const engine = createGraphEngine();
    engine.addNode(node1);
    engine.addNode(node2);
    engine.addEdge(edge1);

    engine.state.selectedNodeIds = ['q0', 'q1'];
    engine.copySelection();
    engine.pasteSelection();

    expect(engine.state.nodes).toHaveLength(4);
    expect(engine.state.edges).toHaveLength(2);
    expect(engine.state.selectedNodeIds).toHaveLength(2);
    expect(engine.state.selectedNodeIds[0]).not.toBe('q0');
  });

  it('excludes external transitions on copy/paste when only one endpoint is copied', () => {
    const engine = createGraphEngine();
    engine.addNode(node1);
    engine.addNode(node2);
    engine.addEdge(edge1);

    engine.state.selectedNodeIds = ['q0'];
    engine.copySelection();
    engine.pasteSelection();

    expect(engine.state.nodes).toHaveLength(3);
    expect(engine.state.edges).toHaveLength(1);
  });

  it('clears canvas completely on clearCanvas', () => {
    const engine = createGraphEngine();
    engine.addNode(node1);
    engine.addNode(node2);
    engine.addEdge(edge1);

    engine.clearCanvas();
    expect(engine.state.nodes).toHaveLength(0);
    expect(engine.state.edges).toHaveLength(0);
    expect(engine.state.past).toHaveLength(4);
  });
});
