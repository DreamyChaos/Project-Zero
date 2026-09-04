import { describe, it, expect } from 'vitest';
import {
  encodeTM,
  decodeTM,
  encodePair,
  decodePair,
  simulateUTM,
  verifyUniversalEquivalence,
  buildTMCanonicalizationMap,
  createUnaryAdditionTransducer,
  createBitwiseInversionTransducer,
  createBinaryIncrementTransducer,
  createUnaryCopierTransducer,
  executeTM,
  validateTM,
} from '../index';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Module 5 Topic 2 — Universal Turing Machine and Encoding', () => {
  // --------------------------------------------------------------------------
  // Category A: Deterministic Canonical State Numbering
  // --------------------------------------------------------------------------
  it('Category A: Canonical indexing assigns q1 to initial state and sorts accepting states', () => {
    const nodes: StateNode[] = [
      { id: 'node_b', label: 'B', x: 0, y: 0, isInitial: false, isAccepting: true },
      { id: 'node_init', label: 'Init', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'node_a', label: 'A', x: 0, y: 0, isInitial: false, isAccepting: true },
      { id: 'node_c', label: 'C', x: 0, y: 0, isInitial: false, isAccepting: false },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'node_init', targetNodeId: 'node_a', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const map = buildTMCanonicalizationMap({ nodes, edges }, '□');
    expect(map.stateToCanonicalIndex['node_init']).toBe(1);
    expect(map.canonicalIndexToStateLabel[1]).toBe('Init');

    // Accepting states A and B should get indices 2 and 3 sorted by label
    expect(map.stateToCanonicalIndex['node_a']).toBe(2);
    expect(map.stateToCanonicalIndex['node_b']).toBe(3);
    expect(map.stateToCanonicalIndex['node_c']).toBe(4);
  });

  // --------------------------------------------------------------------------
  // Category B: Canonical Symbol Ordering and Blank Preservation
  // --------------------------------------------------------------------------
  it('Category B: Canonical symbol indexing sorts non-blank symbols and places blank at index |Σ|+1', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'b → a, R', readSymbol: 'b', writeSymbol: 'a', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '□ → c, S', readSymbol: '□', writeSymbol: 'c', moveDirection: 'S' },
    ];

    const map = buildTMCanonicalizationMap({ nodes, edges }, '□');
    // Non-blank symbols: 'a', 'b', 'c' sorted alphabetically -> 1, 2, 3
    expect(map.symbolToCanonicalIndex['a']).toBe(1);
    expect(map.symbolToCanonicalIndex['b']).toBe(2);
    expect(map.symbolToCanonicalIndex['c']).toBe(3);
    // Blank symbol '□' -> 4
    expect(map.symbolToCanonicalIndex['□']).toBe(4);
    expect(map.blankCanonicalIndex).toBe(4);
  });

  // --------------------------------------------------------------------------
  // Category C: Binary Canonical Encoding
  // --------------------------------------------------------------------------
  it('Category C: encodeTM generates valid binary canonical code with proper delimiters', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const encoded = encodeTM({ nodes, edges });
    expect(encoded.binaryEncoding).toContain('111');
    expect(/^[01]+$/.test(encoded.binaryEncoding)).toBe(true);
    expect(encoded.transitionsCount).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Category D: Decode Binary Encoding and Graph Reconstruction
  // --------------------------------------------------------------------------
  it('Category D: decodeTM successfully parses binary string into valid TM graph', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const encoded = encodeTM({ nodes, edges });
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    expect(decoded.graph?.nodes.length).toBe(2);
    expect(decoded.graph?.edges.length).toBe(1);
    expect(decoded.graph?.nodes.find((n) => n.isInitial)).toBeDefined();
    expect(decoded.graph?.nodes.find((n) => n.isAccepting)).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Category E: Encode/Decode Roundtrip Bijective Invariance
  // --------------------------------------------------------------------------
  it('Category E: Binary encode/decode roundtrip preserves execution behavior', () => {
    const preset = createBitwiseInversionTransducer();
    const encoded = encodeTM(preset.graph);
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    expect(decoded.graph).toBeDefined();

    // Verify reconstructed machine executes identically to original
    const resultOriginal = executeTM(preset.graph, '0101');
    const resultDecoded = executeTM(decoded.graph!, '0101');

    expect(resultDecoded.isAccepted).toBe(resultOriginal.isAccepted);
    expect(resultDecoded.steps.length).toBe(resultOriginal.steps.length);
  });

  // --------------------------------------------------------------------------
  // Category F: Multiple Accepting States Support
  // --------------------------------------------------------------------------
  it('Category F: Supports and preserves multiple accepting states across roundtrip', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q_acc1', label: 'q_acc1', x: 0, y: 0, isInitial: false, isAccepting: true },
      { id: 'q_acc2', label: 'q_acc2', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q_acc1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q_acc2', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
    ];

    const encoded = encodeTM({ nodes, edges });
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    const decodedAccepting = decoded.graph?.nodes.filter((n) => n.isAccepting);
    expect(decodedAccepting?.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Category G: Stay ('S') Movement Preservation
  // --------------------------------------------------------------------------
  it('Category G: Direction S (Stay) is faithfully encoded and decoded', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'x → y, S', readSymbol: 'x', writeSymbol: 'y', moveDirection: 'S' },
    ];

    const encoded = encodeTM({ nodes, edges });
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    expect(decoded.graph?.edges[0].moveDirection).toBe('S');
  });

  // --------------------------------------------------------------------------
  // Category H: Pair Encoding <M, w>
  // --------------------------------------------------------------------------
  it('Category H: encodePair and decodePair correctly isolate machine and input word', () => {
    const preset = createBinaryIncrementTransducer();
    const pair = encodePair(preset.graph, '101');

    expect(pair.fullPairString).toContain('1111');

    const decodedPair = decodePair(pair.fullPairString);
    expect(decodedPair.isValid).toBe(true);
    expect(decodedPair.inputString).toBe('101');
    expect(decodedPair.graph?.nodes.length).toBe(preset.graph.nodes.length);
  });

  // --------------------------------------------------------------------------
  // Category I: Pair Encoding with Empty Word (w = ε)
  // --------------------------------------------------------------------------
  it('Category I: Empty string w = ε is unambiguously encoded and decoded in pair', () => {
    const preset = createBitwiseInversionTransducer();
    const pair = encodePair(preset.graph, '');
    const decodedPair = decodePair(pair.fullPairString);

    expect(decodedPair.isValid).toBe(true);
    expect(decodedPair.inputString).toBe('');
  });

  // --------------------------------------------------------------------------
  // Category J: Universal TM Simulation U(<M, w>)
  // --------------------------------------------------------------------------
  it('Category J: simulateUTM faithfully executes the encoded machine on input string', () => {
    const preset = createBinaryIncrementTransducer();
    const pair = encodePair(preset.graph, '11');
    const utmResult = simulateUTM(pair.fullPairString);

    expect(utmResult.isAccepted).toBe(true);
    expect(utmResult.status).toBe('COMPUTED');
    expect(utmResult.isEquivalentToDirect).toBe(true);
    // 11 + 1 overflows carry to the left: index -1 is '1', index 0 is '0', index 1 is '0'
    expect(utmResult.finalTapeContents[-1]).toBe('1');
    expect(utmResult.finalTapeContents[0]).toBe('0');
    expect(utmResult.finalTapeContents[1]).toBe('0');
  });

  // --------------------------------------------------------------------------
  // Category K: Equivalence Verification (Direct vs Universal)
  // --------------------------------------------------------------------------
  it('Category K: verifyUniversalEquivalence confirms exact 100% equivalence on presets', () => {
    const preset = createUnaryAdditionTransducer();
    const comparison = verifyUniversalEquivalence(preset.graph, '110111');

    expect(comparison.isEquivalent).toBe(true);
    expect(comparison.acceptanceMatch).toBe(true);
    expect(comparison.stepCountMatch).toBe(true);
    expect(comparison.haltingStateMatch).toBe(true);
    expect(comparison.tapeContentsMatch).toBe(true);
    expect(comparison.headPositionMatch).toBe(true);
    expect(comparison.mismatches).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Category L: Missing Transition Simulation Equivalence
  // --------------------------------------------------------------------------
  it('Category L: Universal simulation halts with MISSING_TRANSITION when transition is absent', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    // Only accepts '0'
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];

    const comparison = verifyUniversalEquivalence({ nodes, edges }, 'x');
    expect(comparison.isEquivalent).toBe(true);
    expect(comparison.acceptanceMatch).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Category M: Execution Limit Simulation Equivalence
  // --------------------------------------------------------------------------
  it('Category M: Infinite loop reaches execution limit identically in direct and universal simulation', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
    ];

    const comparison = verifyUniversalEquivalence({ nodes, edges }, '000', { maxSteps: 20 });
    expect(comparison.isEquivalent).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Category N: Malformed String Rejection
  // --------------------------------------------------------------------------
  it('Category N1: decodeTM rejects non-binary malformed strings', () => {
    const result = decodeTM('0101XYZ0101');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('non-binary');
  });

  it('Category N2: decodeTM rejects strings missing delimiter 111', () => {
    const result = decodeTM('00010001000');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('missing');
  });

  it('Category N3: decodePair rejects strings missing delimiter 1111', () => {
    const result = decodePair('0010011100');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('1111');
  });

  // --------------------------------------------------------------------------
  // Category O: Human-Readable Symbolic Format
  // --------------------------------------------------------------------------
  it('Category O: Symbolic format encodes and decodes deterministically', () => {
    const preset = createBitwiseInversionTransducer();
    const encoded = encodeTM(preset.graph, '□', 'SYMBOLIC_TUPLE');

    expect(encoded.symbolicEncoding).toContain('TM[Q={');
    expect(encoded.symbolicEncoding).toContain('δ(');

    const decoded = decodeTM(encoded.symbolicEncoding);
    expect(decoded.isValid).toBe(true);
    expect(decoded.graph?.nodes.length).toBe(preset.graph.nodes.length);
  });

  // --------------------------------------------------------------------------
  // Category P: Graph Immutability and Determinism
  // --------------------------------------------------------------------------
  it('Category P: Encoding does not mutate the source graph structure', () => {
    const preset = createUnaryCopierTransducer();
    const nodeCount = preset.graph.nodes.length;
    const edgeCount = preset.graph.edges.length;

    encodeTM(preset.graph);
    encodePair(preset.graph, '11');

    expect(preset.graph.nodes.length).toBe(nodeCount);
    expect(preset.graph.edges.length).toBe(edgeCount);
  });

  // --------------------------------------------------------------------------
  // Category Q: Zero Accepting States TM Handling
  // --------------------------------------------------------------------------
  it('Category Q: Handles zero accepting states without error', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: false },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
    ];

    const encoded = encodeTM({ nodes, edges });
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    const acceptingCount = decoded.graph?.nodes.filter((n) => n.isAccepting).length;
    expect(acceptingCount).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Category R: Oversized Input Protection (Resource Limit)
  // --------------------------------------------------------------------------
  it('Category R: Rejects oversized encodings exceeding length limit cleanly', () => {
    const oversized = '0'.repeat(100001);
    const resultTM = decodeTM(oversized);
    expect(resultTM.isValid).toBe(false);
    expect(resultTM.error).toContain('maximum allowed length');

    const resultPair = decodePair(oversized);
    expect(resultPair.isValid).toBe(false);
    expect(resultPair.error).toContain('maximum allowed length');
  });

  // --------------------------------------------------------------------------
  // Category S: Deterministic Reproducibility Across Repeated Encodes
  // --------------------------------------------------------------------------
  it('Category S: Repeated encoding calls produce byte-for-byte identical output', () => {
    const preset = createUnaryAdditionTransducer();
    const enc1 = encodeTM(preset.graph);
    const enc2 = encodeTM(preset.graph);

    expect(enc1.binaryEncoding).toBe(enc2.binaryEncoding);
    expect(enc1.symbolicEncoding).toBe(enc2.symbolicEncoding);

    const pair1 = encodePair(preset.graph, '101');
    const pair2 = encodePair(preset.graph, '101');
    expect(pair1.fullPairString).toBe(pair2.fullPairString);
  });

  // --------------------------------------------------------------------------
  // Category T: Unary Copier Preserves Scratch Symbols X and Y
  // --------------------------------------------------------------------------
  it('Category T: Scratch symbols (X, Y) are preserved across encoding and decoding', () => {
    const preset = createUnaryCopierTransducer();
    const encoded = encodeTM(preset.graph);
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    expect(encoded.canonicalMap.symbolToCanonicalIndex['X']).toBeDefined();
    expect(encoded.canonicalMap.symbolToCanonicalIndex['Y']).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Category U: Topic 1 Acceptor & Transducer Regression Protection
  // --------------------------------------------------------------------------
  it('Category U: Topic 1 Presets still validate and execute with exact transducer results', () => {
    const adder = createUnaryAdditionTransducer();
    const adderValidation = validateTM(adder.graph, adder.blankSymbol);
    expect(adderValidation.isValid).toBe(true);

    const inverter = createBitwiseInversionTransducer();
    expect(validateTM(inverter.graph, inverter.blankSymbol).isValid).toBe(true);

    const incrementer = createBinaryIncrementTransducer();
    expect(validateTM(incrementer.graph, incrementer.blankSymbol).isValid).toBe(true);

    const copier = createUnaryCopierTransducer();
    expect(validateTM(copier.graph, copier.blankSymbol).isValid).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Category V: Critical Issue 1 — Exact Input Alphabet Σ vs Tape Alphabet Γ Distinction
  // --------------------------------------------------------------------------
  it('Category V: Preserves exact Σ ⊆ Γ distinction when scratch symbol X is present', () => {
    // Σ = {0, 1}, Γ = {0, 1, □, X} where X is a scratch symbol
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0 → X, R', readSymbol: '0', writeSymbol: 'X', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
      { id: 'e3', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'X → X, R', readSymbol: 'X', writeSymbol: 'X', moveDirection: 'R' },
    ];

    const graph = { nodes, edges };
    const encoded = encodeTM(graph, { blankSymbol: '□', inputAlphabet: ['0', '1'] });

    expect(encoded.inputSymbolsCount).toBe(2);
    expect(encoded.inputAlphabet).toEqual(['0', '1']);
    // Tape alphabet should include scratch symbol X and blank □
    expect(encoded.tapeAlphabet).toContain('X');
    expect(encoded.tapeAlphabet).toContain('□');

    // Decode and verify exact recovered alphabets
    const decoded = decodeTM(encoded.binaryEncoding);
    expect(decoded.isValid).toBe(true);
    expect(decoded.inputAlphabet).toEqual(['0', '1']);
    expect(decoded.tapeAlphabet).toContain('X');
    expect(decoded.tapeAlphabet).toContain('□');
    expect(decoded.inputAlphabet).not.toContain('X');
    expect(decoded.inputAlphabet).not.toContain('□');
  });

  // --------------------------------------------------------------------------
  // Category W: Critical Issue 3 — Universal Simulation Trace Authenticity
  // --------------------------------------------------------------------------
  it('Category W: Universal Simulation Step telemetry originates from universal cycle', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];
    const graph = { nodes, edges };

    const utmResult = simulateUTM({ graph, inputString: '0' });
    expect(utmResult.isAccepted).toBe(true);
    expect(utmResult.steps.length).toBe(2);

    // Step 0: instantaneous pre-transition configuration
    const step0 = utmResult.steps[0];
    expect(step0.simulatedReadSymbol).toBe('0');
    expect(step0.simulatedWriteSymbol).toBe('1');
    expect(step0.simulatedMoveDirection).toBe('R');
    expect(step0.matchedTransitionCode).toContain('δ(q0, 0)');
    expect(step0.simulatedTapeHeadIndex).toBe(0);
    expect(step0.isHalted).toBe(false);

    // Step 1: halting configuration in accepting state q1
    const step1 = utmResult.steps[1];
    expect(step1.simulatedStateLabel).toBe('q1');
    expect(step1.simulatedTapeHeadIndex).toBe(1);
    expect(step1.isHalted).toBe(true);
    expect(step1.isAccepting).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Category X: Critical Issue 4 — Rigorous Round-Trip Verification (Machines A through F)
  // --------------------------------------------------------------------------
  it('Category X: Machine A — Σ = {0, 1}, Γ = {0, 1, □}', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];
    const graph = { nodes, edges };
    const encoded = encodeTM(graph, '□');
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    expect(decoded.blankSymbol).toBe('□');
    expect(decoded.inputAlphabet).toEqual(['0', '1']);

    // Execution equivalence on input "0"
    const directRes = executeTM(graph, '0');
    const decodedRes = executeTM(decoded.graph!, '0');
    expect(decodedRes.isAccepted).toBe(directRes.isAccepted);
    expect(decodedRes.finalTapeHeadIndex).toBe(directRes.finalTapeHeadIndex);
  });

  it('Category X: Machine B — Σ = {0, 1}, Γ = {0, 1, X, □} with genuine scratch symbol', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0 → X, R', readSymbol: '0', writeSymbol: 'X', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'X → 1, R', readSymbol: 'X', writeSymbol: '1', moveDirection: 'R' },
    ];
    const graph = { nodes, edges };
    const encoded = encodeTM(graph, { blankSymbol: '□', inputAlphabet: ['0', '1'] });
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    expect(decoded.inputAlphabet).toEqual(['0', '1']);
    expect(decoded.tapeAlphabet).toContain('X');
    expect(decoded.inputAlphabet).not.toContain('X');
  });

  it('Category X: Machine C — Multiple accepting states', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q_acc1', x: 0, y: 0, isInitial: false, isAccepting: true },
      { id: 'q2', label: 'q_acc2', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q2', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
    ];
    const graph = { nodes, edges };
    const encoded = encodeTM(graph);
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    const acceptingNodes = decoded.graph!.nodes.filter((n) => n.isAccepting);
    expect(acceptingNodes.length).toBe(2);

    expect(executeTM(decoded.graph!, '0').isAccepted).toBe(true);
    expect(executeTM(decoded.graph!, '1').isAccepted).toBe(true);
  });

  it('Category X: Machine D — Stay movement direction S', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, S', readSymbol: '0', writeSymbol: '1', moveDirection: 'S' },
    ];
    const graph = { nodes, edges };
    const encoded = encodeTM(graph);
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    const decodedEdge = decoded.graph!.edges[0];
    expect(decodedEdge.moveDirection).toBe('S');
    expect(executeTM(decoded.graph!, '0').finalTapeHeadIndex).toBe(0);
  });

  it('Category X: Machine E — Arbitrary state IDs and non-standard labels', () => {
    const nodes: StateNode[] = [
      { id: 'alpha_uuid_999', label: 'StartNode', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'beta_uuid_777', label: 'TargetNode', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'edge_arbitrary', sourceNodeId: 'alpha_uuid_999', targetNodeId: 'beta_uuid_777', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
    ];
    const graph = { nodes, edges };
    const encoded = encodeTM(graph);
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    expect(executeTM(decoded.graph!, '0').isAccepted).toBe(true);
  });

  it('Category X: Machine F — Multiple branching transitions and cycles', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 1, R', readSymbol: '0', writeSymbol: '1', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q0', label: '1 → 0, L', readSymbol: '1', writeSymbol: '0', moveDirection: 'L' },
      { id: 'e3', sourceNodeId: 'q0', targetNodeId: 'q2', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
    ];
    const graph = { nodes, edges };
    const encoded = encodeTM(graph, '□');
    const decoded = decodeTM(encoded.binaryEncoding);

    expect(decoded.isValid).toBe(true);
    expect(decoded.graph!.edges.length).toBe(3);
    const directRes = executeTM(graph, '01');
    const decodedRes = executeTM(decoded.graph!, '01');
    expect(decodedRes.isAccepted).toBe(directRes.isAccepted);
  });

  // --------------------------------------------------------------------------
  // Category Y: Critical Issue 5 — Pair Encoding Comprehensive Coverage
  // --------------------------------------------------------------------------
  it('Category Y: Decodes empty word, one-symbol word, and multi-symbol word without external metadata', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
    ];
    const graph = { nodes, edges };

    // Empty input w = ε
    const pairEmpty = encodePair(graph, '');
    const decodedEmpty = decodePair(pairEmpty.fullPairString);
    expect(decodedEmpty.isValid).toBe(true);
    expect(decodedEmpty.inputString).toBe('');

    // One-symbol input w = "0"
    const pairOne = encodePair(graph, '0');
    const decodedOne = decodePair(pairOne.fullPairString);
    expect(decodedOne.isValid).toBe(true);
    expect(decodedOne.inputString).toBe('0');

    // Multi-symbol input w = "010"
    const pairMulti = encodePair(graph, '010');
    const decodedMulti = decodePair(pairMulti.fullPairString);
    expect(decodedMulti.isValid).toBe(true);
    expect(decodedMulti.inputString).toBe('010');
  });

  it('Category Y: Handles malformed pair encoding, wrong symbol indices, and invalid syntax', () => {
    // Missing 1111 delimiter
    const malformed1 = '0010001001011101010101';
    expect(decodePair(malformed1).isValid).toBe(false);

    // Empty pair string
    expect(decodePair('').isValid).toBe(false);

    // Symbol index in input word exceeds symbols count in machine
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
    ];
    const encoded = encodeTM({ nodes, edges });
    // Append input word with symbol index 99 (0^99) which is not in machine
    const badPair = `${encoded.binaryEncoding}1111${'0'.repeat(99)}`;
    const decodedBad = decodePair(badPair);
    expect(decodedBad.isValid).toBe(false);
    expect(decodedBad.error).toContain('Invalid symbol index');
  });
});
