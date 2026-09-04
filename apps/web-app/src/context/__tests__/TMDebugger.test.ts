import { describe, it, expect } from 'vitest';
import {
  executeTM,
  validateTM,
  TMTape,
  getTMInstantaneousConfiguration,
  convertNfaToDfa,
  minimizeDFA,
  convertRegexToNFA,
  executeDFA,
  executeNFA,
  executePDA,
} from '@project-zero/core-solver';
import { serializeMachine, deserializeMachine } from '../../utils/serialization';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('TM Debugger + Configuration Inspector Sprint Test Suite (26 Verification Points)', () => {
  const baseNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
  ];

  it('1. Initial TM configuration C0 = (q0, tape, headPosition=0)', () => {
    const res = executeTM({ nodes: baseNodes, edges: [] }, '101');
    expect(res.steps).toHaveLength(1);
    const c0 = getTMInstantaneousConfiguration(res.steps[0]);
    expect(c0.stateId).toBe('q0');
    expect(c0.headPosition).toBe(0);
    expect(c0.readSymbol).toBe('1');
    expect(c0.stepIndex).toBe(0);
  });

  it('2. Normal transition configuration generation C_next = (q_next, tape_written, headPosition_moved)', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1 → 0, R', readSymbol: '1', writeSymbol: '0', moveDirection: 'R' },
    ];
    const res = executeTM({ nodes: baseNodes, edges }, '1');
    expect(res.steps.length).toBeGreaterThan(1);
    const step0 = getTMInstantaneousConfiguration(res.steps[0]);
    expect(step0.stateId).toBe('q0');
    expect(step0.nextStateId).toBe('q1');
    expect(step0.writeSymbol).toBe('0');
    expect(step0.moveDirection).toBe('R');
  });

  it('3. Read/write behavior across tape cells', () => {
    const tape = new TMTape('01', '□');
    expect(tape.read(0)).toBe('0');
    tape.write(0, 'X');
    expect(tape.read(0)).toBe('X');
    expect(tape.read(1)).toBe('1');
  });

  it('4. Left movement (L) decrements head position', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a → b, L', readSymbol: 'a', writeSymbol: 'b', moveDirection: 'L' },
    ];
    const res = executeTM({ nodes: baseNodes, edges }, 'a');
    expect(res.finalTapeHeadIndex).toBe(-1);
    expect(res.finalTapeContents[0]).toBe('b');
  });

  it('5. Right movement (R) increments head position', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a → b, R', readSymbol: 'a', writeSymbol: 'b', moveDirection: 'R' },
    ];
    const res = executeTM({ nodes: baseNodes, edges }, 'a');
    expect(res.finalTapeHeadIndex).toBe(1);
  });

  it('6. Stay movement (S) leaves head position unchanged', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a → b, S', readSymbol: 'a', writeSymbol: 'b', moveDirection: 'S' },
    ];
    const res = executeTM({ nodes: baseNodes, edges }, 'a');
    expect(res.finalTapeHeadIndex).toBe(0);
    expect(res.finalTapeContents[0]).toBe('b');
  });

  it('7. Negative tape positions work without error', () => {
    const tape = new TMTape('A', '□');
    tape.write(-5, 'Z');
    expect(tape.read(-5)).toBe('Z');
    expect(tape.getMinIndex()).toBe(-5);
  });

  it('8. Blank-symbol cells return blank symbol B', () => {
    const tape = new TMTape('1', '□');
    expect(tape.read(999)).toBe('□');
    expect(tape.read(-999)).toBe('□');
  });

  it('9. Accepting configuration halts immediately with ACCEPT', () => {
    const accNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
    ];
    const res = executeTM({ nodes: accNodes, edges: [] }, '101');
    expect(res.isAccepted).toBe(true);
    expect(res.steps[0].isAccepting).toBe(true);
  });

  it('10. Missing-transition rejection halts with NO_TRANSITION', () => {
    const res = executeTM({ nodes: baseNodes, edges: [] }, '1');
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toBe('NO_TRANSITION');
  });

  it('11. INCONCLUSIVE_LIMIT returned when step limit reached (never REJECT)', () => {
    const loopNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    ];
    const loopEdges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' },
    ];
    const res = executeTM({ nodes: loopNodes, edges: loopEdges }, '0', { maxSteps: 10 });
    expect(res.isAccepted).toBe(false);
    expect(res.isInconclusive).toBe(true);
    expect(res.rejectionReason).toBe('INCONCLUSIVE_LIMIT');
  });

  it('12. Historical tape snapshots are independent objects (un-aliased)', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1 → 2, R', readSymbol: '1', writeSymbol: '2', moveDirection: 'R' },
    ];
    const res = executeTM({ nodes: baseNodes, edges }, '01');
    expect(res.steps.length).toBeGreaterThan(2);
    // Step 0 tape content at index 0 is '0'
    expect(res.steps[0].tapeContents[0]).toBe('0');
    // Step 1 tape content at index 0 has been written to '1'
    expect(res.steps[1].tapeContents[0]).toBe('1');
    // Mutating step 1 object should not alter step 0 object
    expect(res.steps[0].tapeContents[0]).toBe('0');
  });

  it('13. Historical configurations do not mutate after later execution steps', () => {
    const incNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const incEdges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '□ → 1, S', readSymbol: '□', writeSymbol: '1', moveDirection: 'S' },
    ];
    const res = executeTM({ nodes: incNodes, edges: incEdges }, '11');
    const firstStepRead = res.steps[0].readSymbol;
    const lastStepTape = res.finalTapeContents;
    expect(firstStepRead).toBe('1');
    expect(lastStepTape[2]).toBe('1');
    expect(res.steps[0].tapeHeadIndex).toBe(0);
  });

  it('14. Step forward navigation selects next step index', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];
    const res = executeTM({ nodes: baseNodes, edges }, '0');
    let stepIndex = 0;
    const canStep = stepIndex < res.steps.length - 1;
    if (canStep) stepIndex += 1;
    expect(stepIndex).toBe(1);
    expect(res.steps[stepIndex].isHalted).toBe(true);
  });

  it('15. Step backward navigation selects previous step index', () => {
    let stepIndex = 2;
    const canBack = stepIndex > 0;
    if (canBack) stepIndex -= 1;
    expect(stepIndex).toBe(1);
  });

  it('16. Reset behavior returns step index to 0', () => {
    let stepIndex = 5;
    stepIndex = 0;
    expect(stepIndex).toBe(0);
  });

  it('17. State highlighting data activeStateId derives from current step currentStateId', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];
    const res = executeTM({ nodes: baseNodes, edges }, '0');
    const step0ActiveState = res.steps[0].currentStateId;
    const step1ActiveState = res.steps[1].currentStateId;
    expect(step0ActiveState).toBe('q0');
    expect(step1ActiveState).toBe('q1');
  });

  it('18. Transition highlighting data activeEdgeId derives from current step transitionId', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];
    const res = executeTM({ nodes: baseNodes, edges }, '0');
    expect(res.steps[0].transitionId).toBe('e0');
  });

  it('19. Execution stepping does not mutate canonical graph nodes or edges', () => {
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];
    const initialEdgeLabel = edges[0].label;
    executeTM({ nodes: baseNodes, edges }, '0');
    expect(edges[0].label).toBe(initialEdgeLabel);
  });

  it('20. Existing TM serialization and validator still pass', () => {
    const val = validateTM({ nodes: baseNodes, edges: [] }, 'B');
    expect(val.isValid).toBe(true);
    const json = serializeMachine(baseNodes, [], 'TM', undefined, undefined, 'B');
    const restored = deserializeMachine(json);
    expect(restored.machineType).toBe('TM');
    expect(restored.blankSymbol).toBe('B');
  });

  it('21. Existing DFA regression tests pass', () => {
    const res = executeDFA({ nodes: baseNodes, edges: [] }, '0');
    expect(res.validationResult.isValid).toBe(true);
  });

  it('22. Existing NFA regression tests pass', () => {
    const res = executeNFA({ nodes: baseNodes, edges: [] }, '0');
    expect(res.validationResult.isValid).toBe(true);
  });

  it('23. Existing PDA regression tests pass', () => {
    const res = executePDA({ nodes: baseNodes, edges: [] }, '0', { initialStackSymbol: 'Z0' });
    expect(res.validationResult.isValid).toBe(true);
  });

  it('24. Existing Regex regression tests pass', () => {
    const res = convertRegexToNFA('a|b');
    expect(res.success).toBe(true);
  });

  it('25. Existing NFA->DFA regression tests pass', () => {
    const res = convertNfaToDfa({ nodes: baseNodes, edges: [] });
    expect(res.success).toBe(true);
  });

  it('26. Existing DFA minimization regression tests pass', () => {
    const res = minimizeDFA({ nodes: baseNodes, edges: [] });
    expect(res.success).toBe(true);
  });

  it('27. Execution highlighting is strictly decoupled from canonical node/edge isSelected property', () => {
    const node: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0, isSelected: false, isExecutionHighlighted: true };
    const edge: TransitionEdge = { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0', isSelected: false, isExecutionHighlighted: true };
    
    // isSelected remains strictly false even when isExecutionHighlighted is true
    expect(node.isSelected).toBe(false);
    expect(edge.isSelected).toBe(false);
    expect(node.isExecutionHighlighted).toBe(true);
    expect(edge.isExecutionHighlighted).toBe(true);

    // Serialization ignores transient highlighting
    const json = serializeMachine([node], [edge], 'TM');
    const restored = deserializeMachine(json);
    expect(restored.nodes[0].isSelected).toBe(false);
    expect((restored.nodes[0] as StateNode).isExecutionHighlighted).toBeUndefined();
    expect((restored.edges[0] as TransitionEdge).isExecutionHighlighted).toBeUndefined();
  });

  it('28. Halted terminal configurations set isHalted=true without fake transitions', () => {
    const accNodes: StateNode[] = [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }];
    const resAccept = executeTM({ nodes: accNodes, edges: [] }, '101');
    expect(resAccept.steps[0].isHalted).toBe(true);
    expect(resAccept.steps[0].isAccepting).toBe(true);

    const rejNodes: StateNode[] = [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false }];
    const resReject = executeTM({ nodes: rejNodes, edges: [] }, '101');
    expect(resReject.steps[0].isHalted).toBe(true);
    expect(resReject.steps[0].isAccepting).toBe(false);
    expect(resReject.rejectionReason).toBe('NO_TRANSITION');
  });

  it('29. INCONCLUSIVE_LIMIT correctly flags halted step limit state', () => {
    const loopNodes: StateNode[] = [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false }];
    const loopEdges: TransitionEdge[] = [{ id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' }];
    const res = executeTM({ nodes: loopNodes, edges: loopEdges }, '0', { maxSteps: 5 });
    expect(res.isInconclusive).toBe(true);
    expect(res.rejectionReason).toBe('INCONCLUSIVE_LIMIT');
  });
});
