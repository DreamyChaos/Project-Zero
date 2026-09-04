import { describe, it, expect } from 'vitest';
import { serializeMachine, deserializeMachine } from '../serialization';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Machine Serialization Utilities', () => {
  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 100, y: 100, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 300, y: 100, isInitial: false, isAccepting: true },
  ];

  const edges: TransitionEdge[] = [
    { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' },
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
    { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
    { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
  ];

  it('performs deterministic round-trip serialization for DFA', () => {
    const jsonStr = serializeMachine(nodes, edges, 'DFA');
    const restored = deserializeMachine(jsonStr);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.machineType).toBe('DFA');
    expect(restored.nodes).toEqual(nodes);
    expect(restored.edges).toEqual(edges);
  });

  it('sorts nodes and edges deterministically regardless of array input order', () => {
    const reversedNodes = [...nodes].reverse();
    const reversedEdges = [...edges].reverse();

    const jsonStr1 = serializeMachine(nodes, edges);
    const jsonStr2 = serializeMachine(reversedNodes, reversedEdges);

    expect(jsonStr1).toBe(jsonStr2);
  });

  it('rejects malformed json input safely', () => {
    expect(() => deserializeMachine('invalid-json')).toThrow();
    expect(() => deserializeMachine('{ "schemaVersion": 2 }')).toThrow('Unsupported schema version');
    expect(() => deserializeMachine('{ "schemaVersion": 1, "nodes": "invalid" }')).toThrow('missing nodes or edges array');
    expect(() => deserializeMachine({ schemaVersion: 1, nodes: [{ id: 'q0' }], edges: [] })).toThrow('Malformed state node');
  });

  it('1. DFA save/load preserves machineType = DFA', () => {
    const jsonStr = serializeMachine(nodes, edges, 'DFA');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('DFA');
  });

  it('2. NFA save/load preserves machineType = NFA', () => {
    const jsonStr = serializeMachine(nodes, edges, 'NFA');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('NFA');
  });

  it('3. PDA save/load preserves machineType = PDA', () => {
    const jsonStr = serializeMachine(nodes, edges, 'PDA');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('PDA');
  });

  it('4. PDA initialStackSymbol = Z0 round-trips', () => {
    const jsonStr = serializeMachine(nodes, edges, 'PDA', undefined, 'Z0');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('PDA');
    expect(restored.initialStackSymbol).toBe('Z0');
  });

  it('5. PDA initialStackSymbol = "$" round-trips', () => {
    const jsonStr = serializeMachine(nodes, edges, 'PDA', undefined, '$');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('PDA');
    expect(restored.initialStackSymbol).toBe('$');
  });

  it('6. PDA initialStackSymbol = "S0" round-trips', () => {
    const jsonStr = serializeMachine(nodes, edges, 'PDA', undefined, 'S0');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('PDA');
    expect(restored.initialStackSymbol).toBe('S0');
  });

  it('PDA initialStackSymbol = "STACK" round-trips', () => {
    const jsonStr = serializeMachine(nodes, edges, 'PDA', undefined, 'STACK');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('PDA');
    expect(restored.initialStackSymbol).toBe('STACK');
  });

  it('7. Older files without initialStackSymbol default safely to Z0 for PDA', () => {
    const olderPdaJson = JSON.stringify({
      schemaVersion: 1,
      machineType: 'PDA',
      nodes,
      edges,
    });
    const restored = deserializeMachine(olderPdaJson);
    expect(restored.machineType).toBe('PDA');
    expect(restored.initialStackSymbol).toBe('Z0');
  });

  it('8. Invalid machineType is rejected', () => {
    const invalidTypeJson = JSON.stringify({
      schemaVersion: 1,
      machineType: 'INVALID_TYPE',
      nodes,
      edges,
    });
    expect(() => deserializeMachine(invalidTypeJson)).toThrow(/invalid machine type/i);
  });

  it('9. Malformed PDA serialization is rejected atomically', () => {
    const malformedEdgeJson = JSON.stringify({
      schemaVersion: 1,
      machineType: 'PDA',
      nodes,
      edges: [
        {
          id: 'e0',
          sourceNodeId: 'q0',
          targetNodeId: 'q1',
          label: 'a, Z0 -> Z0',
          inputSymbol: 12345,
        },
      ],
    });
    expect(() => deserializeMachine(malformedEdgeJson)).toThrow(/invalid inputSymbol/i);

    const malformedStackSymbolJson = JSON.stringify({
      schemaVersion: 1,
      machineType: 'PDA',
      nodes,
      edges,
      initialStackSymbol: 9999,
    });
    expect(() => deserializeMachine(malformedStackSymbolJson)).toThrow(/invalid initialStackSymbol/i);
  });

  it('10. Existing PDA transition metadata still round-trips (inputSymbol, stackTop, stackReplacement)', () => {
    const pdaEdges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: 'a, Z0 -> AZ0',
        inputSymbol: 'a',
        stackTop: 'Z0',
        stackReplacement: 'AZ0',
      },
    ];
    const jsonStr = serializeMachine(nodes, pdaEdges, 'PDA', undefined, '$');
    const restored = deserializeMachine(jsonStr);

    expect(restored.machineType).toBe('PDA');
    expect(restored.initialStackSymbol).toBe('$');
    expect(restored.edges[0].inputSymbol).toBe('a');
    expect(restored.edges[0].stackTop).toBe('Z0');
    expect(restored.edges[0].stackReplacement).toBe('AZ0');
  });

  it('11. Existing DFA serialization tests pass', () => {
    const dfaJson = serializeMachine(nodes, edges, 'DFA', { name: 'Canonical_DFA' });
    const restored = deserializeMachine(dfaJson);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.machineType).toBe('DFA');
    expect(restored.metadata?.name).toBe('Canonical_DFA');
    expect(restored.nodes).toHaveLength(2);
    expect(restored.edges).toHaveLength(4);
    expect(restored.initialStackSymbol).toBeUndefined();
  });

  it('12. Existing NFA serialization tests pass', () => {
    const nfaEdges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
    ];
    const nfaJson = serializeMachine(nodes, nfaEdges, 'NFA', { name: 'Canonical_NFA' });
    const restored = deserializeMachine(nfaJson);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.machineType).toBe('NFA');
    expect(restored.metadata?.name).toBe('Canonical_NFA');
    expect(restored.edges.some((e) => e.label === 'ε')).toBe(true);
    expect(restored.initialStackSymbol).toBeUndefined();
  });
});
