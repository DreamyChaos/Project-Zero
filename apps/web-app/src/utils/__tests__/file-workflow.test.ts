import { describe, it, expect } from 'vitest';
import { serializeMachine, deserializeMachine } from '../serialization';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Machine File Workflow & Validation Tests', () => {
  const dfaNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 100, y: 100, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 300, y: 100, isInitial: false, isAccepting: true },
  ];

  const dfaEdges: TransitionEdge[] = [
    { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0', isSelfLoop: true },
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
    { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
    { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1', isSelfLoop: true },
  ];

  const nfaNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
    { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
  ];

  const nfaEdges: TransitionEdge[] = [
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' },
    { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
    { id: 'e3', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'a', parallelIndex: 1 },
  ];

  it('A & B. DFA save and load round trip', () => {
    const jsonStr = serializeMachine(dfaNodes, dfaEdges, 'DFA', { name: 'Test_DFA' });
    const restored = deserializeMachine(jsonStr);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.machineType).toBe('DFA');
    expect(restored.metadata?.name).toBe('Test_DFA');
    expect(restored.nodes).toEqual(dfaNodes);
    expect(restored.edges).toEqual(dfaEdges);
  });

  it('C, D, E & F. NFA save and load round trip preserving ε and parallel transitions', () => {
    const jsonStr = serializeMachine(nfaNodes, nfaEdges, 'NFA');
    const restored = deserializeMachine(jsonStr);

    expect(restored.machineType).toBe('NFA');
    expect(restored.nodes).toEqual(nfaNodes);
    expect(restored.edges).toEqual(nfaEdges);
    expect(restored.edges.some((e) => e.label === 'ε')).toBe(true);
    expect(restored.edges.filter((e) => e.label === 'a')).toHaveLength(2);
  });

  it('G. PDA save and load round trip preserving machineType and initialStackSymbol', () => {
    const pdaNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const pdaEdges: TransitionEdge[] = [
      {
        id: 'e1',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: 'a, Z0 -> AZ0',
        inputSymbol: 'a',
        stackTop: 'Z0',
        stackReplacement: 'AZ0',
      },
    ];

    const jsonStr = serializeMachine(pdaNodes, pdaEdges, 'PDA', { name: 'Test_PDA' }, '$');
    const restored = deserializeMachine(jsonStr);

    expect(restored.machineType).toBe('PDA');
    expect(restored.initialStackSymbol).toBe('$');
    expect(restored.nodes).toEqual(pdaNodes);
    expect(restored.edges).toEqual(pdaEdges);
  });

  it('I. Rejects malformed JSON', () => {
    expect(() => deserializeMachine('invalid-json-content')).toThrow();
  });

  it('J. Rejects unsupported schema versions', () => {
    expect(() => deserializeMachine('{ "schemaVersion": 99, "nodes": [], "edges": [] }')).toThrow(
      'Unsupported schema version'
    );
  });

  it('K. Rejects dangling edge endpoints atomically', () => {
    const invalidData = {
      schemaVersion: 1,
      machineType: 'DFA',
      nodes: [{ id: 'q0', x: 0, y: 0 }],
      edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q999', label: 'a' }], // q999 does not exist!
    };

    expect(() => deserializeMachine(invalidData)).toThrow(/dangling endpoint/);
  });

  it('Rejects NaN / Infinity coordinates safely', () => {
    const invalidNodeData = {
      schemaVersion: 1,
      machineType: 'DFA',
      nodes: [{ id: 'q0', x: NaN, y: 100 }],
      edges: [],
    };

    expect(() => deserializeMachine(invalidNodeData)).toThrow(/invalid id or coordinates/);
  });
});
