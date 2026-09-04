import {
  SolverGraphInput,
  TMOutputConvention,
  TMTransducerOptions,
  TMTransducerOutputRegion,
  TMTransducerResult,
  TMTransducerStatus,
} from './types';
import { executeTM } from './tm-executor';
import { DEFAULT_BLANK_SYMBOL } from './tm-validator';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

/**
 * Extracts the deterministic transducer output string and output-region
 * from a halting Turing Machine tape according to the specified convention.
 *
 * PROJECT ZERO TRANSDUCER CONVENTIONS:
 * 1. 'NON_BLANK_SPAN' (Default canonical):
 *    Identifies all indices i where tape[i] !== blankSymbol.
 *    If no non-blank cell exists, output is '' (empty string) with null region.
 *    Otherwise, region is [min(i), max(i)] and output is the contiguous slice
 *    tape[min(i) ... max(i)], with any internal unassigned cells defaulting to blankSymbol.
 *
 * 2. 'HEAD_RIGHT':
 *    Extracts from finalHeadIndex up to the rightmost non-blank cell.
 *    Standard for Turing transducers where the head returns to the start of the output.
 */
export function extractTMTransducerOutput(
  tapeContents: Record<number, string>,
  blankSymbol: string = DEFAULT_BLANK_SYMBOL,
  convention: TMOutputConvention = 'NON_BLANK_SPAN',
  finalHeadIndex: number = 0
): { outputString: string; outputRegion: TMTransducerOutputRegion | null } {
  const nonBlankIndices: number[] = [];

  for (const [key, val] of Object.entries(tapeContents)) {
    const idx = Number(key);
    if (!Number.isNaN(idx) && val !== blankSymbol && val !== '') {
      nonBlankIndices.push(idx);
    }
  }

  if (nonBlankIndices.length === 0) {
    return {
      outputString: '',
      outputRegion: null,
    };
  }

  nonBlankIndices.sort((a, b) => a - b);
  const minIdx = nonBlankIndices[0];
  const maxIdx = nonBlankIndices[nonBlankIndices.length - 1];

  let start = minIdx;
  let end = maxIdx;

  if (convention === 'HEAD_RIGHT') {
    start = finalHeadIndex;
    if (start > end) {
      return {
        outputString: '',
        outputRegion: null,
      };
    }
  }

  const chars: string[] = [];
  for (let i = start; i <= end; i++) {
    const char = tapeContents[i] !== undefined ? tapeContents[i] : blankSymbol;
    chars.push(char);
  }

  const outputString = chars.join('');
  const outputRegion: TMTransducerOutputRegion = {
    startIndex: start,
    endIndex: end,
    length: end - start + 1,
    convention,
  };

  return { outputString, outputRegion };
}

/**
 * Executes a Turing Machine in Transducer Mode.
 *
 * THEORETICAL FOUNDATION & PROJECT ZERO EXECUTION CONTRACT:
 * In classic automata theory (Hopcroft & Ullman, Sipser), a Turing transducer computes
 * a partial function f: Σ* ⇀ Γ* whose domain is the set of inputs on which the machine
 * halts. Pure transducers do not strictly require a set of accepting states F (any halting
 * configuration where no transition is defined constitutes termination).
 *
 * In Project Zero's interactive educational architecture, to prevent accidental termination
 * (e.g. from an omitted transition or syntax typo in an incomplete student machine) from being
 * erroneously interpreted as a successfully computed output, the platform adopts the explicit
 * operational contract:
 * 1. The machine definition passes graph validation (isValid).
 * 2. The machine halts within maxSteps.
 * 3. The halting state is an explicitly designated accepting state (isAccepted === true, q ∈ F).
 *
 * Under this contract:
 * - If the machine halts in an accepting state (q ∈ F), status is 'COMPUTED' and output is extracted.
 * - If the machine halts in a non-accepting state, status is 'HALTED_REJECT' and output is null.
 * - If the machine halts due to an undefined transition before reaching F, status is 'MISSING_TRANSITION' and output is null.
 * - If maxSteps is exceeded, status is 'INCONCLUSIVE_LIMIT' and output is null.
 * No output is ever fabricated for incomplete or rejected computations.
 */
export function executeTMTransducer(
  graph: SolverGraphInput,
  inputString: string,
  options?: TMTransducerOptions
): TMTransducerResult {
  const blankSymbol = options?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;
  const convention = options?.outputConvention ?? 'NON_BLANK_SPAN';
  const executionResult = executeTM(graph, inputString, {
    blankSymbol,
    maxSteps: options?.maxSteps,
  });

  const stepCount = executionResult.steps.length;
  const finalStateId = executionResult.finalStateId;
  const finalStateLabel = executionResult.finalStateLabel;
  const finalTapeHeadIndex = executionResult.finalTapeHeadIndex;
  const finalTapeContents = executionResult.finalTapeContents;

  if (!executionResult.validationResult.isValid) {
    return {
      status: 'INVALID_MACHINE',
      inputString,
      outputString: null,
      outputRegion: null,
      executionResult,
      finalStateId,
      finalStateLabel,
      finalTapeHeadIndex,
      finalTapeContents,
      stepCount,
      explanation: `Turing Machine validation failed: ${executionResult.validationResult.errors.join('; ')}`,
    };
  }

  if (executionResult.isInconclusive || executionResult.rejectionReason === 'INCONCLUSIVE_LIMIT') {
    return {
      status: 'INCONCLUSIVE_LIMIT',
      inputString,
      outputString: null,
      outputRegion: null,
      executionResult,
      finalStateId,
      finalStateLabel,
      finalTapeHeadIndex,
      finalTapeContents,
      stepCount,
      explanation: `Execution limit reached without conclusive halt (${stepCount} steps). Transducer output is undefined.`,
    };
  }

  if (!executionResult.isAccepted) {
    const isMissingTransition = executionResult.rejectionReason === 'NO_TRANSITION';
    const status: TMTransducerStatus = isMissingTransition
      ? 'MISSING_TRANSITION'
      : 'HALTED_REJECT';

    const reasonText = isMissingTransition
      ? `Halted due to missing transition in state '${finalStateLabel}' for current symbol.`
      : `Halted in non-accepting state '${finalStateLabel}'.`;

    return {
      status,
      inputString,
      outputString: null,
      outputRegion: null,
      executionResult,
      finalStateId,
      finalStateLabel,
      finalTapeHeadIndex,
      finalTapeContents,
      stepCount,
      explanation: `Transduction unsuccessful (${status}): ${reasonText} Output is undefined (⊥).`,
    };
  }

  // Machine halted in an accepting state -> extract computed output
  const { outputString, outputRegion } = extractTMTransducerOutput(
    finalTapeContents,
    blankSymbol,
    convention,
    finalTapeHeadIndex
  );

  return {
    status: 'COMPUTED',
    inputString,
    outputString,
    outputRegion,
    executionResult,
    finalStateId,
    finalStateLabel,
    finalTapeHeadIndex,
    finalTapeContents,
    stepCount,
    explanation: `Transduction succeeded: Machine entered accepting state '${finalStateLabel}' and halted. Computed f_M('${inputString}') = '${outputString}' from tape region [${outputRegion ? `${outputRegion.startIndex}, ${outputRegion.endIndex}` : 'empty'}].`,
  };
}

// ============================================================================
// CANONICAL TRANSDUCER PRESETS (GENUINE VALIDATED TM GRAPHS)
// ============================================================================

export interface TMTransducerPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly mathematicalMapping: string;
  readonly inputAlphabet: string[];
  readonly tapeAlphabet: string[];
  readonly blankSymbol: string;
  readonly sampleInputs: string[];
  readonly graph: SolverGraphInput;
  readonly outputConvention: TMOutputConvention;
}

/**
 * PRESET A — UNARY ADDITION: 1^m 0 1^n -> 1^(m+n)
 *
 * Algorithm:
 * 1. q0: Start at index 0. If read '1', move R. When read '0' (the separator),
 *    overwrite '0' with '1' and move R to q1.
 * 2. q1: Traverse remaining '1's moving R until blank '□' is encountered.
 * 3. q1: Upon reading '□', move L to q2 to find the rightmost '1'.
 * 4. q2: Overwrite that trailing '1' with '□', move S to q_acc (accepting halt).
 *
 * Mathematical Invariant:
 * The separating '0' was turned into a '1' (+1 to total 1s), and the final '1'
 * was erased (-1 to total 1s). Net effect: exactly m + n contiguous '1's!
 * Example: '110111' -> '11111' (2 + 3 = 5).
 */
export function createUnaryAdditionTransducer(): TMTransducerPreset {
  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 300, y: 150, isInitial: false, isAccepting: false },
    { id: 'q2', label: 'q2', x: 500, y: 150, isInitial: false, isAccepting: false },
    { id: 'q_acc', label: 'q_acc', x: 700, y: 150, isInitial: false, isAccepting: true },
  ];

  const edges: TransitionEdge[] = [
    // q0: pass over first operand of 1s
    {
      id: 'e0',
      sourceNodeId: 'q0',
      targetNodeId: 'q0',
      label: '1 → 1, R',
      readSymbol: '1',
      writeSymbol: '1',
      moveDirection: 'R',
    },
    // q0 -> q1: replace separator '0' with '1'
    {
      id: 'e1',
      sourceNodeId: 'q0',
      targetNodeId: 'q1',
      label: '0 → 1, R',
      readSymbol: '0',
      writeSymbol: '1',
      moveDirection: 'R',
    },
    // q1: pass over second operand of 1s
    {
      id: 'e2',
      sourceNodeId: 'q1',
      targetNodeId: 'q1',
      label: '1 → 1, R',
      readSymbol: '1',
      writeSymbol: '1',
      moveDirection: 'R',
    },
    // q1 -> q2: find right end boundary (blank), step left
    {
      id: 'e3',
      sourceNodeId: 'q1',
      targetNodeId: 'q2',
      label: '□ → □, L',
      readSymbol: '□',
      writeSymbol: '□',
      moveDirection: 'L',
    },
    // q2 -> q_acc: erase the extra '1' with blank and halt
    {
      id: 'e4',
      sourceNodeId: 'q2',
      targetNodeId: 'q_acc',
      label: '1 → □, S',
      readSymbol: '1',
      writeSymbol: '□',
      moveDirection: 'S',
    },
  ];

  return {
    id: 'unary-addition',
    name: 'Unary Addition (1^m 0 1^n → 1^{m+n})',
    description: 'Computes unary arithmetic addition. Replaces separator 0 with 1, then erases trailing 1.',
    mathematicalMapping: 'f(1^m 0 1^n) = 1^{m+n}',
    inputAlphabet: ['1', '0'],
    tapeAlphabet: ['1', '0', '□'],
    blankSymbol: '□',
    sampleInputs: ['110111', '101', '11101', '101111'],
    graph: { nodes, edges },
    outputConvention: 'NON_BLANK_SPAN',
  };
}

/**
 * PRESET B — BITWISE INVERSION: w in {0, 1}* -> complement(w)
 *
 * Algorithm:
 * 1. q0: Start at index 0. If read '0', write '1', move R.
 * 2. q0: If read '1', write '0', move R.
 * 3. q0: If read '□' (empty input or end of string), move S to q_acc.
 *
 * Example: '0101' -> '1010', '' -> ''
 */
export function createBitwiseInversionTransducer(): TMTransducerPreset {
  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 150, y: 150, isInitial: true, isAccepting: false },
    { id: 'q_acc', label: 'q_acc', x: 400, y: 150, isInitial: false, isAccepting: true },
  ];

  const edges: TransitionEdge[] = [
    {
      id: 'e0',
      sourceNodeId: 'q0',
      targetNodeId: 'q0',
      label: '0 → 1, R',
      readSymbol: '0',
      writeSymbol: '1',
      moveDirection: 'R',
    },
    {
      id: 'e1',
      sourceNodeId: 'q0',
      targetNodeId: 'q0',
      label: '1 → 0, R',
      readSymbol: '1',
      writeSymbol: '0',
      moveDirection: 'R',
    },
    {
      id: 'e2',
      sourceNodeId: 'q0',
      targetNodeId: 'q_acc',
      label: '□ → □, S',
      readSymbol: '□',
      writeSymbol: '□',
      moveDirection: 'S',
    },
  ];

  return {
    id: 'bitwise-inversion',
    name: 'Bitwise Inversion (w → complement(w))',
    description: 'Flips every binary digit on the tape (0 → 1 and 1 → 0) in-place until blank.',
    mathematicalMapping: 'f(w) = complement(w)',
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', '□'],
    blankSymbol: '□',
    sampleInputs: ['0101', '1100', '1', '0', '0000'],
    graph: { nodes, edges },
    outputConvention: 'NON_BLANK_SPAN',
  };
}

/**
 * PRESET C — BINARY INCREMENT: w in {0, 1}* -> binary(w + 1)
 *
 * Algorithm (standard right-to-left ripple carry):
 * 1. q0: Scan to the end of the input (moving R over '0' and '1').
 * 2. q0 -> q1: Upon reading '□', move L to position head on the least-significant bit.
 * 3. q1 (Add with carry):
 *    - If read '0': write '1', move S to q_acc (carry resolved, done!).
 *    - If read '1': write '0', move L (carry propagates left).
 *    - If read '□': (all bits were 1, e.g. 11 -> 00 with carry):
 *      write '1', move S to q_acc (prepend leading 1, e.g. 11 -> 100).
 *
 * Examples:
 * '0' -> '1', '1' -> '10', '10' -> '11', '11' -> '100', '101' -> '110'
 */
export function createBinaryIncrementTransducer(): TMTransducerPreset {
  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 350, y: 150, isInitial: false, isAccepting: false },
    { id: 'q_acc', label: 'q_acc', x: 600, y: 150, isInitial: false, isAccepting: true },
  ];

  const edges: TransitionEdge[] = [
    // q0: scan right to end of binary number
    {
      id: 'e0',
      sourceNodeId: 'q0',
      targetNodeId: 'q0',
      label: '0 → 0, R',
      readSymbol: '0',
      writeSymbol: '0',
      moveDirection: 'R',
    },
    {
      id: 'e1',
      sourceNodeId: 'q0',
      targetNodeId: 'q0',
      label: '1 → 1, R',
      readSymbol: '1',
      writeSymbol: '1',
      moveDirection: 'R',
    },
    // q0 -> q1: hit blank at right, move left to LSB
    {
      id: 'e2',
      sourceNodeId: 'q0',
      targetNodeId: 'q1',
      label: '□ → □, L',
      readSymbol: '□',
      writeSymbol: '□',
      moveDirection: 'L',
    },
    // q1: ripple carry
    // 0 + 1 = 1 (no carry, halt)
    {
      id: 'e3',
      sourceNodeId: 'q1',
      targetNodeId: 'q_acc',
      label: '0 → 1, S',
      readSymbol: '0',
      writeSymbol: '1',
      moveDirection: 'S',
    },
    // 1 + 1 = 0 with carry left
    {
      id: 'e4',
      sourceNodeId: 'q1',
      targetNodeId: 'q1',
      label: '1 → 0, L',
      readSymbol: '1',
      writeSymbol: '0',
      moveDirection: 'L',
    },
    // Overflow off left end (e.g. 11 -> 00, now reading □ at left): write 1 and halt
    {
      id: 'e5',
      sourceNodeId: 'q1',
      targetNodeId: 'q_acc',
      label: '□ → 1, S',
      readSymbol: '□',
      writeSymbol: '1',
      moveDirection: 'S',
    },
  ];

  return {
    id: 'binary-increment',
    name: 'Binary Incrementer (w → w + 1)',
    description: 'Increments an arbitrary binary integer by 1 using ripple carry propagation.',
    mathematicalMapping: 'f(w) = binary(value(w) + 1)',
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', '□'],
    blankSymbol: '□',
    sampleInputs: ['0', '1', '10', '11', '101', '111'],
    graph: { nodes, edges },
    outputConvention: 'NON_BLANK_SPAN',
  };
}

/**
 * PRESET D — STRING COPIER (Unary Duplication): 1^n -> 1^{2n}
 *
 * Computes canonical string replication on unary alphabet {1}:
 * 1^n -> 1^{2n} (doubling unary string).
 *
 * Algorithm:
 * 1. q0: If input is empty (reading '□'), halt immediately in q_acc.
 *    Otherwise, find first unmarked '1', mark it as 'X', move R to q1.
 * 2. q1: Move right over remaining '1's and 'Y's until '□' is reached.
 * 3. q1 -> q2: Write 'Y' (the duplicate copy) at the end, and move L.
 * 4. q2: Move left over 'Y's and '1's until the marked 'X' is reached.
 * 5. q2 -> q0: Step right over 'X' to the next unmarked '1', repeat!
 * 6. q0 -> q_clean: When in q0 we read 'Y' (or '□'), all 1s have been duplicated as Ys!
 *    Move L into cleanup phase.
 * 7. q_clean: Move left replacing all 'X's back with '1's.
 * 8. q_clean -> q_clean_r: When blank '□' at the left is reached, move R.
 * 9. q_clean_r: Move right across '1's, converting every 'Y' to '1'.
 * 10. q_clean_r -> q_acc: Upon reaching blank '□' at the right, move S and halt in q_acc.
 *
 * Result: Exactly 2n contiguous '1's on the tape.
 * Example: '11' -> '1111', '1' -> '11', '' -> ''
 */
export function createUnaryCopierTransducer(): TMTransducerPreset {
  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 300, y: 80, isInitial: false, isAccepting: false },
    { id: 'q2', label: 'q2', x: 300, y: 220, isInitial: false, isAccepting: false },
    { id: 'q_clean', label: 'q_clean', x: 500, y: 150, isInitial: false, isAccepting: false },
    { id: 'q_clean_r', label: 'q_clean_r', x: 650, y: 150, isInitial: false, isAccepting: false },
    { id: 'q_acc', label: 'q_acc', x: 800, y: 150, isInitial: false, isAccepting: true },
  ];

  const edges: TransitionEdge[] = [
    // q0: Mark '1' as 'X' and go right to append copy
    {
      id: 'e0',
      sourceNodeId: 'q0',
      targetNodeId: 'q1',
      label: '1 → X, R',
      readSymbol: '1',
      writeSymbol: 'X',
      moveDirection: 'R',
    },
    // q0: If read 'Y', all 1s have been copied! Start cleaning up Xs going left
    {
      id: 'e1',
      sourceNodeId: 'q0',
      targetNodeId: 'q_clean',
      label: 'Y → Y, L',
      readSymbol: 'Y',
      writeSymbol: 'Y',
      moveDirection: 'L',
    },
    // q0: Empty input -> halt immediately
    {
      id: 'e1b',
      sourceNodeId: 'q0',
      targetNodeId: 'q_acc',
      label: '□ → □, S',
      readSymbol: '□',
      writeSymbol: '□',
      moveDirection: 'S',
    },

    // q1: Move right over remaining 1s and Ys to find the end
    {
      id: 'e2',
      sourceNodeId: 'q1',
      targetNodeId: 'q1',
      label: '1 → 1, R',
      readSymbol: '1',
      writeSymbol: '1',
      moveDirection: 'R',
    },
    {
      id: 'e3',
      sourceNodeId: 'q1',
      targetNodeId: 'q1',
      label: 'Y → Y, R',
      readSymbol: 'Y',
      writeSymbol: 'Y',
      moveDirection: 'R',
    },
    // q1 -> q2: Write 'Y' at end of tape and head left
    {
      id: 'e4',
      sourceNodeId: 'q1',
      targetNodeId: 'q2',
      label: '□ → Y, L',
      readSymbol: '□',
      writeSymbol: 'Y',
      moveDirection: 'L',
    },

    // q2: Move left over Ys and 1s until we see 'X'
    {
      id: 'e5',
      sourceNodeId: 'q2',
      targetNodeId: 'q2',
      label: 'Y → Y, L',
      readSymbol: 'Y',
      writeSymbol: 'Y',
      moveDirection: 'L',
    },
    {
      id: 'e6',
      sourceNodeId: 'q2',
      targetNodeId: 'q2',
      label: '1 → 1, L',
      readSymbol: '1',
      writeSymbol: '1',
      moveDirection: 'L',
    },
    // q2 -> q0: Step right over X to the next unmarked 1
    {
      id: 'e7',
      sourceNodeId: 'q2',
      targetNodeId: 'q0',
      label: 'X → X, R',
      readSymbol: 'X',
      writeSymbol: 'X',
      moveDirection: 'R',
    },

    // q_clean: Move left replacing Xs with 1s
    {
      id: 'e8',
      sourceNodeId: 'q_clean',
      targetNodeId: 'q_clean',
      label: 'X → 1, L',
      readSymbol: 'X',
      writeSymbol: '1',
      moveDirection: 'L',
    },
    // Hit □ at left while cleaning Xs -> switch to scanning right
    {
      id: 'e9',
      sourceNodeId: 'q_clean',
      targetNodeId: 'q_clean_r',
      label: '□ → □, R',
      readSymbol: '□',
      writeSymbol: '□',
      moveDirection: 'R',
    },

    // q_clean_r: pass over 1s
    {
      id: 'e10',
      sourceNodeId: 'q_clean_r',
      targetNodeId: 'q_clean_r',
      label: '1 → 1, R',
      readSymbol: '1',
      writeSymbol: '1',
      moveDirection: 'R',
    },
    // q_clean_r: replace Y with 1
    {
      id: 'e11',
      sourceNodeId: 'q_clean_r',
      targetNodeId: 'q_clean_r',
      label: 'Y → 1, R',
      readSymbol: 'Y',
      writeSymbol: '1',
      moveDirection: 'R',
    },
    // q_clean_r: hit □ at right -> done! Halt in q_acc
    {
      id: 'e12',
      sourceNodeId: 'q_clean_r',
      targetNodeId: 'q_acc',
      label: '□ → □, S',
      readSymbol: '□',
      writeSymbol: '□',
      moveDirection: 'S',
    },
  ];

  return {
    id: 'string-copier',
    name: 'String Copier / Duplicator (1^n → 1^{2n})',
    description: 'Copies/duplicates a unary string of 1s (w → ww). Restores scratch symbols and halts.',
    mathematicalMapping: 'f(1^n) = 1^{2n}',
    inputAlphabet: ['1'],
    tapeAlphabet: ['1', 'X', 'Y', '□'],
    blankSymbol: '□',
    sampleInputs: ['1', '11', '111', '1111'],
    graph: { nodes, edges },
    outputConvention: 'NON_BLANK_SPAN',
  };
}

export const CANONICAL_TRANSDUCER_PRESETS: ReadonlyArray<TMTransducerPreset> = [
  createUnaryAdditionTransducer(),
  createBitwiseInversionTransducer(),
  createBinaryIncrementTransducer(),
  createUnaryCopierTransducer(),
];
