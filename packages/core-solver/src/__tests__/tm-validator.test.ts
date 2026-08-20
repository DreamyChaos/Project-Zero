import { describe, it, expect } from 'vitest';
import { validateTM } from '../tm-validator';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Turing Machine Validator (validateTM)', () => {
  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
  ];

  it('validates a correct deterministic Turing Machine', () => {
    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: '0 → 1, R',
        readSymbol: '0',
        writeSymbol: '1',
        moveDirection: 'R',
      },
    ];

    const res = validateTM({ nodes, edges });
    expect(res.isValid).toBe(true);
    expect(res.machineType).toBe('TM');
    expect(res.errors).toHaveLength(0);
  });

  it('detects missing initial state', () => {
    const noInitialNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false },
    ];
    const res = validateTM({ nodes: noInitialNodes, edges: [] });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'MISSING_INITIAL_STATE')).toBe(true);
  });

  it('detects multiple initial states', () => {
    const multiInitialNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: true },
    ];
    const res = validateTM({ nodes: multiInitialNodes, edges: [] });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'MULTIPLE_INITIAL_STATES')).toBe(true);
  });

  it('detects duplicate deterministic transition for same state and read symbol', () => {
    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: '0 → 1, R',
        readSymbol: '0',
        writeSymbol: '1',
        moveDirection: 'R',
      },
      {
        id: 'e1',
        sourceNodeId: 'q0',
        targetNodeId: 'q0',
        label: '0 → 0, L',
        readSymbol: '0',
        writeSymbol: '0',
        moveDirection: 'L',
      },
    ];

    const res = validateTM({ nodes, edges });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'DUPLICATE_TM_TRANSITION')).toBe(true);
  });

  it('detects invalid or missing move direction', () => {
    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: '0 → 1, INVALID',
        readSymbol: '0',
        writeSymbol: '1',
        moveDirection: 'X' as unknown as import('../types').TMMoveDirection,
      },
    ];

    const res = validateTM({ nodes, edges });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'INVALID_MOVE_DIRECTION')).toBe(true);
  });

  it('detects dangling transition endpoints', () => {
    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q999',
        label: '0 → 1, R',
        readSymbol: '0',
        writeSymbol: '1',
        moveDirection: 'R',
      },
    ];

    const res = validateTM({ nodes, edges });
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'DANGLING_TRANSITION_ENDPOINT')).toBe(true);
  });
});
