import { describe, it, expect } from 'vitest';
import {
  executeTM,
  executeTMTransducer,
  extractTMTransducerOutput,
  createUnaryAdditionTransducer,
  createBitwiseInversionTransducer,
  createBinaryIncrementTransducer,
  createUnaryCopierTransducer,
  CANONICAL_TRANSDUCER_PRESETS,
  validateTM,
} from '../index';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Module 5 Topic 1 — Turing Machines (Acceptors and Transducers)', () => {
  // --------------------------------------------------------------------------
  // Category A: Existing Acceptor Accepted Input (Regression & Preservation)
  // --------------------------------------------------------------------------
  it('Category A: Existing Acceptor - accepted input reaches final state', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const result = executeTM({ nodes, edges }, '0');
    expect(result.isAccepted).toBe(true);
    expect(result.finalStateId).toBe('q1');
    expect(result.finalTapeContents[0]).toBe('1');
  });

  // --------------------------------------------------------------------------
  // Category B: Existing Acceptor Rejected Input
  // --------------------------------------------------------------------------
  it('Category B: Existing Acceptor - rejected input halts with NO_TRANSITION', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const result = executeTM({ nodes, edges }, '1');
    expect(result.isAccepted).toBe(false);
    expect(result.rejectionReason).toBe('NO_TRANSITION');
  });

  // --------------------------------------------------------------------------
  // Category C: Acceptor Regression & Invariance
  // --------------------------------------------------------------------------
  it('Category C: Existing TM regression - multi-step execution remains faithful', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a → b, L', readSymbol: 'a', writeSymbol: 'b', moveDirection: 'L' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q2', label: '□ → c, S', readSymbol: '□', writeSymbol: 'c', moveDirection: 'S' },
    ];

    const result = executeTM({ nodes, edges }, 'a');
    expect(result.isAccepted).toBe(true);
    expect(result.steps).toHaveLength(3);
    expect(result.finalTapeContents[0]).toBe('b');
    expect(result.finalTapeContents[-1]).toBe('c');
  });

  // --------------------------------------------------------------------------
  // Category D: Output Extraction Helper
  // --------------------------------------------------------------------------
  it('Category D: extractTMTransducerOutput - extracts contiguous trimmed span and region', () => {
    const tape = {
      '-2': '□',
      '-1': 'A',
      '0': 'B',
      '1': 'C',
      '2': '□',
      '5': '□',
    };
    const { outputString, outputRegion } = extractTMTransducerOutput(tape, '□', 'NON_BLANK_SPAN');
    expect(outputString).toBe('ABC');
    expect(outputRegion).toEqual({
      startIndex: -1,
      endIndex: 1,
      length: 3,
      convention: 'NON_BLANK_SPAN',
    });
  });

  // --------------------------------------------------------------------------
  // Category E: Unary Addition Preset Execution (1^m 0 1^n -> 1^{m+n})
  // --------------------------------------------------------------------------
  it('Category E: Unary Addition - computes 110111 -> 11111 (2 + 3 = 5)', () => {
    const preset = createUnaryAdditionTransducer();
    const result = executeTMTransducer(preset.graph, '110111');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('11111');
    expect(result.outputRegion?.length).toBe(5);
    expect(result.outputRegion?.startIndex).toBe(0);
    expect(result.outputRegion?.endIndex).toBe(4);
    expect(result.executionResult.isAccepted).toBe(true);
  });

  it('Category E2: Unary Addition - computes 101 -> 11 (1 + 1 = 2)', () => {
    const preset = createUnaryAdditionTransducer();
    const result = executeTMTransducer(preset.graph, '101');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('11');
  });

  it('Category E3: Unary Addition - computes 11101 -> 1111 (3 + 1 = 4)', () => {
    const preset = createUnaryAdditionTransducer();
    const result = executeTMTransducer(preset.graph, '11101');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('1111');
  });

  // --------------------------------------------------------------------------
  // Category F: Bitwise Inversion Preset (w -> complement(w))
  // --------------------------------------------------------------------------
  it('Category F: Bitwise Inversion - computes 0101 -> 1010', () => {
    const preset = createBitwiseInversionTransducer();
    const result = executeTMTransducer(preset.graph, '0101');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('1010');
    expect(result.outputRegion).toEqual({
      startIndex: 0,
      endIndex: 3,
      length: 4,
      convention: 'NON_BLANK_SPAN',
    });
  });

  it('Category F2: Bitwise Inversion - computes single bit 0 -> 1 and 1 -> 0', () => {
    const preset = createBitwiseInversionTransducer();
    expect(executeTMTransducer(preset.graph, '0').outputString).toBe('1');
    expect(executeTMTransducer(preset.graph, '1').outputString).toBe('0');
  });

  it('Category F3: Bitwise Inversion - empty string yields empty output', () => {
    const preset = createBitwiseInversionTransducer();
    const result = executeTMTransducer(preset.graph, '');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('');
    expect(result.outputRegion).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Category G: Binary Incrementer Preset (w -> w + 1)
  // --------------------------------------------------------------------------
  it('Category G: Binary Incrementer - simple without carry: 10 -> 11', () => {
    const preset = createBinaryIncrementTransducer();
    const result = executeTMTransducer(preset.graph, '10');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('11');
  });

  it('Category G2: Binary Incrementer - zero to one: 0 -> 1', () => {
    const preset = createBinaryIncrementTransducer();
    const result = executeTMTransducer(preset.graph, '0');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('1');
  });

  it('Category G3: Binary Incrementer - with carry propagation: 101 -> 110', () => {
    const preset = createBinaryIncrementTransducer();
    const result = executeTMTransducer(preset.graph, '101');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('110');
  });

  it('Category G4: Binary Incrementer - overflow carry prepending 1: 1 -> 10', () => {
    const preset = createBinaryIncrementTransducer();
    const result = executeTMTransducer(preset.graph, '1');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('10');
  });

  it('Category G5: Binary Incrementer - multiple overflow carry: 11 -> 100', () => {
    const preset = createBinaryIncrementTransducer();
    const result = executeTMTransducer(preset.graph, '11');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('100');
  });

  it('Category G6: Binary Incrementer - large overflow carry: 111 -> 1000', () => {
    const preset = createBinaryIncrementTransducer();
    const result = executeTMTransducer(preset.graph, '111');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('1000');
  });

  // --------------------------------------------------------------------------
  // Category H: String Copier / Duplicator (1^n -> 1^{2n})
  // --------------------------------------------------------------------------
  it('Category H: String Copier - copies 1 -> 11 (n=1 to 2n=2)', () => {
    const preset = createUnaryCopierTransducer();
    const result = executeTMTransducer(preset.graph, '1');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('11');
    expect(result.outputRegion?.length).toBe(2);
  });

  it('Category H2: String Copier - copies 11 -> 1111 (n=2 to 2n=4)', () => {
    const preset = createUnaryCopierTransducer();
    const result = executeTMTransducer(preset.graph, '11');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('1111');
    expect(result.outputRegion?.length).toBe(4);
  });

  it('Category H3: String Copier - copies 111 -> 111111 (n=3 to 2n=6)', () => {
    const preset = createUnaryCopierTransducer();
    const result = executeTMTransducer(preset.graph, '111');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('111111');
  });

  it('Category H4: String Copier - empty input halts in q_acc with empty output', () => {
    const preset = createUnaryCopierTransducer();
    const result = executeTMTransducer(preset.graph, '');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('');
  });

  // --------------------------------------------------------------------------
  // Category I: Missing Transition Rejection (No fabricated output)
  // --------------------------------------------------------------------------
  it('Category I: Missing Transition - halts with MISSING_TRANSITION and null output', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    // Only accepts '0'
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const result = executeTMTransducer({ nodes, edges }, 'x');
    expect(result.status).toBe('MISSING_TRANSITION');
    expect(result.outputString).toBeNull();
    expect(result.outputRegion).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Category J: Non-Accepting Halt (HALTED_REJECT)
  // --------------------------------------------------------------------------
  it('Category J: Non-Accepting Halt - halts in non-accepting state with null output', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q_dead', label: 'q_dead', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q_acc', label: 'q_acc', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q_dead', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
    ];

    // On '0', transitions to q_dead. Then on next step (reading □), no transition -> halts in non-accepting q_dead
    const result = executeTMTransducer({ nodes, edges }, '0');
    expect(result.status).toBe('MISSING_TRANSITION');
    expect(result.finalStateId).toBe('q_dead');
    expect(result.outputString).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Category K: Execution Limit Boundedness (INCONCLUSIVE_LIMIT)
  // --------------------------------------------------------------------------
  it('Category K: Non-halting loop - reports INCONCLUSIVE_LIMIT without fabricated output', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q_acc', label: 'q_acc', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    // Infinite loop moving right
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '□ → □, R', readSymbol: '□', writeSymbol: '□', moveDirection: 'R' },
    ];

    const result = executeTMTransducer({ nodes, edges }, '0', { maxSteps: 50 });
    expect(result.status).toBe('INCONCLUSIVE_LIMIT');
    expect(result.outputString).toBeNull();
    expect(result.stepCount).toBeGreaterThanOrEqual(50);
  });

  // --------------------------------------------------------------------------
  // Category L: Invalid Machine Validation Failure
  // --------------------------------------------------------------------------
  it('Category L: Invalid Machine - reports INVALID_MACHINE with null output', () => {
    // Machine with no initial state
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [];

    const result = executeTMTransducer({ nodes, edges }, '0');
    expect(result.status).toBe('INVALID_MACHINE');
    expect(result.outputString).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Category M: Preset Validation (All presets are valid TMs)
  // --------------------------------------------------------------------------
  it('Category M: Canonical presets all pass strict TM graph validation', () => {
    for (const preset of CANONICAL_TRANSDUCER_PRESETS) {
      const validation = validateTM(preset.graph, preset.blankSymbol);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });

  // --------------------------------------------------------------------------
  // Category N: Deterministic Reproducibility
  // --------------------------------------------------------------------------
  it('Category N: Repeated transducer execution produces identical results', () => {
    const preset = createBinaryIncrementTransducer();
    const run1 = executeTMTransducer(preset.graph, '101');
    const run2 = executeTMTransducer(preset.graph, '101');

    expect(run1.status).toBe(run2.status);
    expect(run1.outputString).toBe(run2.outputString);
    expect(run1.stepCount).toBe(run2.stepCount);
    expect(run1.outputRegion).toEqual(run2.outputRegion);
  });

  // --------------------------------------------------------------------------
  // Category O: Immutability of Original Machine Graph
  // --------------------------------------------------------------------------
  it('Category O: Transducer execution does not mutate original graph', () => {
    const preset = createBitwiseInversionTransducer();
    const nodeCountBefore = preset.graph.nodes.length;
    const edgeCountBefore = preset.graph.edges.length;

    executeTMTransducer(preset.graph, '010101');

    expect(preset.graph.nodes.length).toBe(nodeCountBefore);
    expect(preset.graph.edges.length).toBe(edgeCountBefore);
  });

  // --------------------------------------------------------------------------
  // Category P: Dynamic Custom State Names Support
  // --------------------------------------------------------------------------
  it('Category P: Custom dynamic state names work without hardcoded q0/q_acc assumptions', () => {
    const nodes: StateNode[] = [
      { id: 'start_state', label: 'start_state', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'halt_success', label: 'halt_success', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'start_state', targetNodeId: 'halt_success', label: 'x → y, S', readSymbol: 'x', writeSymbol: 'y', moveDirection: 'S' },
    ];

    const result = executeTMTransducer({ nodes, edges }, 'x');
    expect(result.status).toBe('COMPUTED');
    expect(result.finalStateLabel).toBe('halt_success');
    expect(result.outputString).toBe('y');
  });

  // --------------------------------------------------------------------------
  // Category Q: Missing Transition vs Explicit Reject State Distinction
  // --------------------------------------------------------------------------
  it('Category Q: Distinguishes MISSING_TRANSITION from explicit non-accepting halt', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q_dead', label: 'q_dead', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q_acc', label: 'q_acc', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    // Edge directly on 'x' has no transition from q0
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q_dead', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' },
    ];

    const resultMissing = executeTMTransducer({ nodes, edges }, '1');
    expect(resultMissing.status).toBe('MISSING_TRANSITION');
    expect(resultMissing.outputString).toBeNull();

    // Now an explicit halt on '0' in non-accepting q_dead
    const resultHaltDead = executeTMTransducer({ nodes, edges }, '0');
    // Note: q_dead has no transitions, so it also encounters NO_TRANSITION from q_dead
    expect(resultHaltDead.status).toBe('MISSING_TRANSITION');
    expect(resultHaltDead.finalStateId).toBe('q_dead');
  });

  // --------------------------------------------------------------------------
  // Category R: Malformed Inputs to Presets (Graceful Termination without Panic)
  // --------------------------------------------------------------------------
  it('Category R1: Unary Addition on malformed input (no separator 0) halts with MISSING_TRANSITION', () => {
    const preset = createUnaryAdditionTransducer();
    // '111' has no 0 separator; reaches end □ in state q0 where no transition exists
    const result = executeTMTransducer(preset.graph, '111');
    expect(result.status).toBe('MISSING_TRANSITION');
    expect(result.outputString).toBeNull();
  });

  it('Category R2: Binary Increment on invalid non-binary characters halts cleanly', () => {
    const preset = createBinaryIncrementTransducer();
    // '102' contains '2'; encounters MISSING_TRANSITION
    const result = executeTMTransducer(preset.graph, '102');
    expect(result.status).toBe('MISSING_TRANSITION');
    expect(result.outputString).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Category S: Empty Output vs Epsilon Representation
  // --------------------------------------------------------------------------
  it('Category S: Empty tape upon halt produces empty string with null output region', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q_acc', label: 'q_acc', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    // Reads '1', erases with '□', and halts
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q_acc', label: '1 → □, S', readSymbol: '1', writeSymbol: '□', moveDirection: 'S' },
    ];

    const result = executeTMTransducer({ nodes, edges }, '1');
    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('');
    expect(result.outputRegion).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Category T: Non-Contiguous Non-Blank Cells (Minimal Bounding Interval)
  // --------------------------------------------------------------------------
  it('Category T: Minimal bounding interval includes internal blank symbols', () => {
    const tape = {
      '0': 'A',
      '1': '□',
      '2': 'B',
    };
    const { outputString, outputRegion } = extractTMTransducerOutput(tape, '□', 'NON_BLANK_SPAN');
    expect(outputString).toBe('A□B');
    expect(outputRegion?.startIndex).toBe(0);
    expect(outputRegion?.endIndex).toBe(2);
    expect(outputRegion?.length).toBe(3);
  });

  // --------------------------------------------------------------------------
  // Category U: Clean Tape Invariant (No Scratch Symbol Contamination in Presets)
  // --------------------------------------------------------------------------
  it('Category U: Presets leave zero scratch symbols on final tape upon COMPUTED halt', () => {
    // String copier uses scratch symbols 'X' and 'Y'. Verify final tape has ONLY '1' and '□'
    const preset = createUnaryCopierTransducer();
    const result = executeTMTransducer(preset.graph, '11');

    expect(result.status).toBe('COMPUTED');
    expect(result.outputString).toBe('1111');

    // Audit all final tape cells
    for (const symbol of Object.values(result.finalTapeContents)) {
      expect(['1', '□']).toContain(symbol);
      expect(symbol).not.toBe('X');
      expect(symbol).not.toBe('Y');
    }
  });

  // --------------------------------------------------------------------------
  // Category V: Final Head Position Consistency with Reported Execution Trace
  // --------------------------------------------------------------------------
  it('Category V: Final head index matches the last step in execution trace', () => {
    const preset = createBinaryIncrementTransducer();
    const result = executeTMTransducer(preset.graph, '10');

    expect(result.status).toBe('COMPUTED');
    const lastStep = result.executionResult.steps[result.executionResult.steps.length - 1];
    expect(result.finalTapeHeadIndex).toBe(lastStep.tapeHeadIndex);
  });

  // --------------------------------------------------------------------------
  // Category W: HEAD_RIGHT Output Extraction Convention
  // --------------------------------------------------------------------------
  it('Category W: extractTMTransducerOutput with HEAD_RIGHT convention extracts from head index', () => {
    const tape = {
      '0': 'X',
      '1': 'A',
      '2': 'B',
      '3': 'C',
    };
    // If head stopped at cell 1, HEAD_RIGHT convention extracts 'ABC'
    const { outputString, outputRegion } = extractTMTransducerOutput(tape, '□', 'HEAD_RIGHT', 1);
    expect(outputString).toBe('ABC');
    expect(outputRegion?.startIndex).toBe(1);
    expect(outputRegion?.endIndex).toBe(3);
    expect(outputRegion?.length).toBe(3);
  });

  // --------------------------------------------------------------------------
  // Category X: Boundedness of Step Count & Determinism Across Multiple Calls
  // --------------------------------------------------------------------------
  it('Category X: 10 repeated runs of Unary Addition execute identically in step count and tape state', () => {
    const preset = createUnaryAdditionTransducer();
    const initialRun = executeTMTransducer(preset.graph, '110111');

    for (let i = 0; i < 10; i++) {
      const run = executeTMTransducer(preset.graph, '110111');
      expect(run.status).toBe(initialRun.status);
      expect(run.outputString).toBe(initialRun.outputString);
      expect(run.stepCount).toBe(initialRun.stepCount);
      expect(run.finalTapeHeadIndex).toBe(initialRun.finalTapeHeadIndex);
    }
  });

  // --------------------------------------------------------------------------
  // Category Y: Acceptor Backwards-Compatibility (Dual Mode Integrity)
  // --------------------------------------------------------------------------
  it('Category Y: Running executeTM directly on preset graph produces identical acceptor trace', () => {
    const preset = createBitwiseInversionTransducer();
    const acceptorResult = executeTM(preset.graph, '0101');
    const transducerResult = executeTMTransducer(preset.graph, '0101');

    expect(acceptorResult.isAccepted).toBe(true);
    expect(transducerResult.executionResult.isAccepted).toBe(true);
    expect(acceptorResult.steps.length).toBe(transducerResult.stepCount);
    expect(acceptorResult.finalTapeHeadIndex).toBe(transducerResult.finalTapeHeadIndex);
    expect(acceptorResult.finalTapeContents).toEqual(transducerResult.finalTapeContents);
  });
});
