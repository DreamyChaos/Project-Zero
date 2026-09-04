import { describe, it, expect } from 'vitest';
import { executeTM, TMTape } from '../tm-executor';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Turing Machine Executor (executeTM & TMTape)', () => {
  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
  ];

  it('1. Simple symbol rewrite & Move Right', () => {
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

    const result = executeTM({ nodes, edges }, '0');
    expect(result.isAccepted).toBe(true);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].readSymbol).toBe('0');
    expect(result.steps[0].writeSymbol).toBe('1');
    expect(result.steps[0].moveDirection).toBe('R');
    expect(result.finalTapeContents[0]).toBe('1');
    expect(result.finalTapeHeadIndex).toBe(1);
  });

  it('2. Move Left and Stay (S) semantics', () => {
    const customNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];

    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: 'a → b, L',
        readSymbol: 'a',
        writeSymbol: 'b',
        moveDirection: 'L',
      },
      {
        id: 'e1',
        sourceNodeId: 'q1',
        targetNodeId: 'q2',
        label: '□ → c, S',
        readSymbol: '□',
        writeSymbol: 'c',
        moveDirection: 'S',
      },
    ];

    const result = executeTM({ nodes: customNodes, edges }, 'a');
    expect(result.isAccepted).toBe(true);
    expect(result.finalTapeContents[0]).toBe('b');
    expect(result.finalTapeContents[-1]).toBe('c');
    expect(result.finalTapeHeadIndex).toBe(-1);
  });

  it('3. Negative tape positions and blank tape reads', () => {
    const tape = new TMTape('1', '□');
    expect(tape.read(0)).toBe('1');
    expect(tape.read(-1)).toBe('□');
    expect(tape.read(10)).toBe('□');

    tape.write(-5, 'X');
    expect(tape.read(-5)).toBe('X');
    expect(tape.getMinIndex()).toBe(-5);
  });

  it('4. Missing transition halts and rejects', () => {
    const edges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: '1 → 1, R',
        readSymbol: '1',
        writeSymbol: '1',
        moveDirection: 'R',
      },
    ];

    const result = executeTM({ nodes, edges }, '0'); // reading '0' has no transition
    expect(result.isAccepted).toBe(false);
    expect(result.rejectionReason).toBe('NO_TRANSITION');
  });

  it('5. Execution step limit (INCONCLUSIVE_LIMIT)', () => {
    // Infinite loop: q0 -- 0 -> 0, S --> q0
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

    const result = executeTM({ nodes: loopNodes, edges: loopEdges }, '0', { maxSteps: 20 });
    expect(result.isAccepted).toBe(false);
    expect(result.isInconclusive).toBe(true);
    expect(result.rejectionReason).toBe('INCONCLUSIVE_LIMIT');
  });

  it('6. Empty input handling with blank symbol', () => {
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

    const result = executeTM({ nodes, edges }, '');
    expect(result.isAccepted).toBe(true);
    expect(result.finalTapeContents[0]).toBe('X');
  });

  it('7. Meaningful Language: Unary Increment (1^n -> 1^{n+1})', () => {
    // TM that scans right over 1s, replaces the first blank □ with 1, and halts in accepting state q2.
    const incNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const incEdges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q0',
        label: '1 → 1, R',
        readSymbol: '1',
        writeSymbol: '1',
        moveDirection: 'R',
      },
      {
        id: 'e1',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: '□ → 1, S',
        readSymbol: '□',
        writeSymbol: '1',
        moveDirection: 'S',
      },
    ];

    const result1 = executeTM({ nodes: incNodes, edges: incEdges }, '111');
    expect(result1.isAccepted).toBe(true);
    expect(result1.finalTapeContents[0]).toBe('1');
    expect(result1.finalTapeContents[1]).toBe('1');
    expect(result1.finalTapeContents[2]).toBe('1');
    expect(result1.finalTapeContents[3]).toBe('1'); // Increment 3 -> 4 ones
  });

  it('8. Boundary tests for maxSteps = 0, 1, and N', () => {
    const loopNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const loopEdges: TransitionEdge[] = [
      {
        id: 'e0',
        sourceNodeId: 'q0',
        targetNodeId: 'q1',
        label: '0 → 0, R',
        readSymbol: '0',
        writeSymbol: '0',
        moveDirection: 'R',
      },
    ];

    // maxSteps = 0 on non-accepting q0 returns INCONCLUSIVE_LIMIT
    const res0 = executeTM({ nodes: loopNodes, edges: loopEdges }, '0', { maxSteps: 0 });
    expect(res0.isAccepted).toBe(false);
    expect(res0.isInconclusive).toBe(true);

    // maxSteps = 1 reaches q1 which is accepting -> returns ACCEPT
    const res1 = executeTM({ nodes: loopNodes, edges: loopEdges }, '0', { maxSteps: 1 });
    expect(res1.isAccepted).toBe(true);
  });
});
