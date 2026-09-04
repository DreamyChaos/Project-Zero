import { describe, it, expect } from 'vitest';
import { executeTM, validateTM, TMTape } from '@project-zero/core-solver';
import { serializeMachine, deserializeMachine } from '../../utils/serialization';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Turing Machine Foundation + Execution Sprint Test Suite', () => {
  const baseNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
  ];

  it('1. Basic symbol rewrite', () => {
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

    const res = executeTM({ nodes: baseNodes, edges }, '0');
    expect(res.isAccepted).toBe(true);
    expect(res.steps[0].readSymbol).toBe('0');
    expect(res.steps[0].writeSymbol).toBe('1');
    expect(res.finalTapeContents[0]).toBe('1');
  });

  it('2. Move Right (R) head positioning', () => {
    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: 'a → a, R',
        readSymbol: 'a',
        writeSymbol: 'a',
        moveDirection: 'R',
      },
    ];

    const res = executeTM({ nodes: baseNodes, edges }, 'a');
    expect(res.isAccepted).toBe(true);
    expect(res.finalTapeHeadIndex).toBe(1);
  });

  it('3. Move Left (L) head positioning', () => {
    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: 'a → a, L',
        readSymbol: 'a',
        writeSymbol: 'a',
        moveDirection: 'L',
      },
    ];

    const res = executeTM({ nodes: baseNodes, edges }, 'a');
    expect(res.isAccepted).toBe(true);
    expect(res.finalTapeHeadIndex).toBe(-1);
  });

  it('4 & 5. Negative tape positions and blank-cell reading', () => {
    const tape = new TMTape('1', '□');
    expect(tape.read(0)).toBe('1');
    expect(tape.read(-1)).toBe('□');
    expect(tape.read(-10)).toBe('□');

    tape.write(-3, 'X');
    expect(tape.read(-3)).toBe('X');
    expect(tape.getMinIndex()).toBe(-3);
  });

  it('6. Blank-cell writing and sparse representation', () => {
    const tape = new TMTape('01', '□');
    tape.write(0, '□');
    expect(tape.read(0)).toBe('□');
    expect(tape.read(1)).toBe('1');
  });

  it('7. Empty input initialization (head at 0, blank reading)', () => {
    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: '□ → X, R',
        readSymbol: '□',
        writeSymbol: 'X',
        moveDirection: 'R',
      },
    ];

    const res = executeTM({ nodes: baseNodes, edges }, '');
    expect(res.isAccepted).toBe(true);
    expect(res.finalTapeContents[0]).toBe('X');
  });

  it('8. Accepting state reached halts execution with ACCEPT', () => {
    const accNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
    ];
    const accRes = executeTM({ nodes: accNodes, edges: [] }, '101');
    expect(accRes.isAccepted).toBe(true);
  });

  it('9. Rejecting/no-transition state halts with NO_TRANSITION', () => {
    const res = executeTM({ nodes: baseNodes, edges: [] }, '1');
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toBe('NO_TRANSITION');
  });

  it('10 & 11. Infinite loop TM halts safely at maxSteps returning INCONCLUSIVE_LIMIT', () => {
    const loopNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    ];
    const loopEdges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q0',
        label: '0 → 0, S',
        readSymbol: '0',
        writeSymbol: '0',
        moveDirection: 'S',
      },
    ];

    const res = executeTM({ nodes: loopNodes, edges: loopEdges }, '0', { maxSteps: 15 });
    expect(res.isAccepted).toBe(false);
    expect(res.isInconclusive).toBe(true);
    expect(res.rejectionReason).toBe('INCONCLUSIVE_LIMIT');
  });

  it('12. Deterministic duplicate-transition validation', () => {
    const dupEdges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 0, L', readSymbol: '0', writeSymbol: '0', moveDirection: 'L' },
    ];

    const val = validateTM({ nodes: baseNodes, edges: dupEdges }, '□');
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.code === 'DUPLICATE_TM_TRANSITION')).toBe(true);
  });

  it('13. Multiple-state validation for initial states', () => {
    const multiNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: true, isAccepting: true },
    ];
    const val = validateTM({ nodes: multiNodes, edges: [] }, '□');
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.code === 'MULTIPLE_INITIAL_STATES')).toBe(true);
  });

  it('14. Dangling transition validation', () => {
    const dangEdges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q999', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];
    const val = validateTM({ nodes: baseNodes, edges: dangEdges }, '□');
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.code === 'DANGLING_TRANSITION_ENDPOINT')).toBe(true);
  });

  it('15 & 16. Canonical binary incrementer TM (e.g. 111 -> 1000)', () => {
    // Binary Incrementer TM:
    // q0: Move right to end of input (on 0 or 1, move R; on □, move L to q1)
    // q1: Add 1 from LSB:
    //   if 1, write 0, move L (carry)
    //   if 0, write 1, move S -> q2 (ACCEPT)
    //   if □, write 1, move S -> q2 (ACCEPT)
    const incNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];

    const incEdges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '□ → □, L', readSymbol: '□', writeSymbol: '□', moveDirection: 'L' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1 → 0, L', readSymbol: '1', writeSymbol: '0', moveDirection: 'L' },
      { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q2', label: '0 → 1, S', readSymbol: '0', writeSymbol: '1', moveDirection: 'S' },
      { id: 'e5', sourceNodeId: 'q1', targetNodeId: 'q2', label: '□ → 1, S', readSymbol: '□', writeSymbol: '1', moveDirection: 'S' },
    ];

    const res1 = executeTM({ nodes: incNodes, edges: incEdges }, '101');
    expect(res1.isAccepted).toBe(true);
    expect(res1.finalTapeContents[0]).toBe('1');
    expect(res1.finalTapeContents[1]).toBe('1');
    expect(res1.finalTapeContents[2]).toBe('0'); // 101 + 1 = 110

    const res2 = executeTM({ nodes: incNodes, edges: incEdges }, '111');
    expect(res2.isAccepted).toBe(true);
    expect(res2.finalTapeContents[-1]).toBe('1');
    expect(res2.finalTapeContents[0]).toBe('0');
    expect(res2.finalTapeContents[1]).toBe('0');
    expect(res2.finalTapeContents[2]).toBe('0'); // 111 + 1 = 1000 (with MSB 1 at pos -1)
  });

  it('17. TM Save/load round-trip preserves machineType = TM and blankSymbol', () => {
    const tmEdges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const jsonStr = serializeMachine(baseNodes, tmEdges, 'TM', { name: 'Binary_Incrementer' }, undefined, '_');
    const restored = deserializeMachine(jsonStr);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.machineType).toBe('TM');
    expect(restored.blankSymbol).toBe('_');
    expect(restored.edges[0].readSymbol).toBe('0');
    expect(restored.edges[0].writeSymbol).toBe('1');
    expect(restored.edges[0].moveDirection).toBe('R');
  });

  it('18. DFA regression preservation', () => {
    const jsonStr = serializeMachine(baseNodes, [], 'DFA');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('DFA');
  });

  it('19. NFA regression preservation', () => {
    const jsonStr = serializeMachine(baseNodes, [], 'NFA');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('NFA');
  });

  it('20. PDA regression preservation', () => {
    const jsonStr = serializeMachine(baseNodes, [], 'PDA', undefined, '$');
    const restored = deserializeMachine(jsonStr);
    expect(restored.machineType).toBe('PDA');
    expect(restored.initialStackSymbol).toBe('$');
  });
});
