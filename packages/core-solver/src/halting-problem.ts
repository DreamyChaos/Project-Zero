import {
  SolverGraphInput,
  TMExecutionOptions,
  HaltingObservationResult,
  HaltingSimulationOutcome,
  DiagonalProofStep,
  HypotheticalDeciderEvaluation,
  HaltingDistinctionItem,
  HaltingProblemPreset,
} from './types';
import { executeTM } from './tm-executor';
import { DEFAULT_BLANK_SYMBOL } from './tm-validator';

/**
 * ============================================================
 * MODULE 5 — TOPIC 6: UNDECIDABILITY — HALTING PROBLEM
 * ============================================================
 *
 * Formal Language Specification:
 * HALT_TM = { <M, w> | M is a Turing machine and M halts on input w }
 *
 * Core Theorem:
 * HALT_TM is Undecidable (not Recursive).
 *
 * Recognizability Status:
 * HALT_TM is Turing-Recognizable (Recursively Enumerable).
 * A Universal Turing Machine can simulate M on w: if M halts, UTM halts and accepts.
 * If M loops forever, UTM loops forever.
 *
 * Non-Recursiveness & Complement:
 * Because HALT_TM is RE but undecidable, its complement complement(HALT_TM)
 * is NOT Turing-Recognizable (by the Two-Way Recognizability Theorem from Topic 4).
 *
 * CRITICAL EPISTEMOLOGICAL INVARIANTS:
 * 1. Halting != Acceptance:
 *    A machine halts if it terminates in ANY state (accepting OR rejecting).
 *    Rejecting halts are confirmed YES instances of HALT_TM!
 * 2. Finite Simulation != Undecidability Proof:
 *    A simulation step-limit timeout does NOT prove that a machine never halts.
 *    Undecidability of HALT_TM is a mathematical theorem established by diagonal
 *    contradiction, never by observing a finite execution timeout.
 * 3. Hypothetical Decider H is an ASSUMPTION FOR CONTRADICTION:
 *    H(<M, w>) is assumed purely to derive a mathematical contradiction.
 *    Project Zero does NOT claim to possess a universal halting algorithm.
 */

export const HALT_TM_DEFINITION = {
  languageName: 'HALT_TM (The Halting Problem)',
  formalNotation: 'HALT_TM = { <M, w> | M is a Turing machine and M halts on input w }',
  decidabilityClassification: 'UNDECIDABLE (Non-Recursive)',
  recognizabilityClassification: 'RECURSIVELY ENUMERABLE (Turing-Recognizable)',
  complementClassification: 'NOT RECURSIVELY ENUMERABLE (co-RE, but not RE)',
  haltingVersusAcceptanceRule:
    'Halting means reaching any configuration where no further move exists (including explicit rejecting halts). All halting runs are YES instances of HALT_TM.',
};

/**
 * Distinction items preventing common student traps and misconceptions.
 */
export const HALTING_DISTINCTIONS: ReadonlyArray<HaltingDistinctionItem> = [
  {
    topic: 'Halting vs Accepting',
    correctConcept:
      'HALT means termination: the machine reaches a halting configuration (either accepting or rejecting). An explicit reject halt is a YES instance of HALT_TM.',
    misconception: 'Conflating "halting" with "accepting" (assuming rejecting machines do not halt).',
    safetyWarning: 'A machine that halts and rejects on w proves that <M, w> ∈ HALT_TM.',
  },
  {
    topic: 'Bounded Timeout vs Infinite Non-Halting',
    correctConcept:
      'A step-limit timeout indicates only that the simulation reached a configured resource bound without observing termination.',
    misconception: 'Claiming that hitting a simulation timeout proves the machine never halts.',
    safetyWarning: 'Never conclude M loops forever simply because it did not halt in N steps.',
  },
  {
    topic: 'Theorem Proof vs Software Simulation',
    correctConcept:
      'Undecidability of HALT_TM is proven by a deductive diagonal contradiction argument showing no total algorithm can exist in principle.',
    misconception: 'Believing that software experiments or IDE tools "prove" undecidability.',
    safetyWarning: 'Undecidability is an inherent mathematical property, not an experimental software observation.',
  },
  {
    topic: 'Nature of the Decider H',
    correctConcept:
      'The decider H is a hypothetical mathematical assumption introduced solely to derive an irresolvable contradiction.',
    misconception: 'Thinking Project Zero or modern computers have implemented a partial or approximate halting decider.',
    safetyWarning: 'H is strictly an assumption for reductio ad absurdum.',
  },
  {
    topic: 'Undecidable vs Unsolvable Concrete Instances',
    correctConcept:
      'Undecidability means no SINGLE universal algorithm can decide halting for ALL machines and inputs. Individual machines can easily be analyzed.',
    misconception: 'Thinking that undecidability means no Turing machine can ever be known to halt.',
    safetyWarning: 'Thousands of specific Turing machines are easily proven to halt or loop.',
  },
];

/**
 * Structured 6-step diagonal contradiction proof of the undecidability of HALT_TM.
 */
export const DIAGONAL_PROOF_STEPS: ReadonlyArray<DiagonalProofStep> = [
  {
    stepId: 'ASSUME_DECIDER',
    stepNumber: 1,
    title: 'Assumption for Contradiction: Total Halting Decider H Exists',
    premise: 'Assume HALT_TM is decidable.',
    mathematicalStatement:
      '∃ total Turing machine H such that ∀<M, w>: H(<M, w>) = ACCEPT if M halts on w, and H(<M, w>) = REJECT if M loops on w.',
    logicalDeduction:
      'By definition of a decider, H must halt on EVERY valid encoded pair <M, w> in a finite number of steps, never looping indefinitely.',
    contradictionFlag: false,
  },
  {
    stepId: 'CONSTRUCT_DIAGONAL_D',
    stepNumber: 2,
    title: 'Construction of Diagonal Machine D',
    premise: 'Use H as an internal subroutine to construct a new Turing machine D.',
    mathematicalStatement:
      'D(<M>): 1. Run H on input <M, <M>>. 2. If H accepts (M halts on <M>), D loops forever. 3. If H rejects (M loops on <M>), D halts.',
    logicalDeduction:
      'Because H is assumed to be total, step 1 always terminates in finite time. Therefore D is a valid, well-defined Turing machine whose behavior inverts H\'s report.',
    contradictionFlag: false,
  },
  {
    stepId: 'SELF_APPLICATION',
    stepNumber: 3,
    title: 'Self-Application: Feeding D its Own Description <D>',
    premise: 'Since D is a valid Turing machine, its encoding <D> can be provided as input to D itself.',
    mathematicalStatement:
      'Consider the execution of D on input <D>: D(<D>). What does H(<D, <D>>) report?',
    logicalDeduction:
      'By the definition of H, H(<D, <D>>) must output either "HALTS" or "DOES NOT HALT". We evaluate both possible cases exhaustively.',
    contradictionFlag: false,
  },
  {
    stepId: 'CASE_HALTS',
    stepNumber: 4,
    title: 'Case 1: Suppose H says D halts on <D>',
    premise: 'Hypothesis: H(<D, <D>>) accepts (claiming D halts on <D>).',
    mathematicalStatement:
      'H(<D, <D>>) = ACCEPT  ==>  D(<D>) enters Step 2 of its program  ==>  D loops forever.',
    logicalDeduction:
      'Contradiction! If D halts on <D>, then by construction D must loop forever on <D>. A computation cannot simultaneously halt and loop.',
    contradictionFlag: true,
  },
  {
    stepId: 'CASE_LOOPS',
    stepNumber: 5,
    title: 'Case 2: Suppose H says D loops on <D>',
    premise: 'Hypothesis: H(<D, <D>>) rejects (claiming D loops forever on <D>).',
    mathematicalStatement:
      'H(<D, <D>>) = REJECT  ==>  D(<D>) enters Step 3 of its program  ==>  D halts immediately.',
    logicalDeduction:
      'Contradiction! If D does not halt on <D>, then by construction D must halt immediately. A computation cannot simultaneously loop and halt.',
    contradictionFlag: true,
  },
  {
    stepId: 'CONTRADICTION_CONCLUSION',
    stepNumber: 6,
    title: 'Final Conclusion: H Cannot Exist',
    premise: 'Both exhaustive cases for H(<D, <D>>) produce an inescapable logical contradiction.',
    mathematicalStatement:
      'D(<D>) halts  <===>  D(<D>) does not halt. (Logical Contradiction: P <===> ¬P).',
    logicalDeduction:
      'The initial assumption that a total halting decider H exists must be false. Therefore, no algorithm can decide the Halting Problem. HALT_TM is Undecidable.',
    contradictionFlag: true,
  },
];

/**
 * Evaluates the behavior of the diagonal machine D given a hypothetical answer from H.
 */
export function evaluateHypotheticalDecider(
  assumedDecision: 'HALTS' | 'DOES_NOT_HALT'
): HypotheticalDeciderEvaluation {
  if (assumedDecision === 'HALTS') {
    return {
      assumedDecision: 'HALTS',
      diagonalBehavior: 'LOOPS_FOREVER',
      resultingContradiction:
        'H claimed that D(<D>) halts. However, whenever H reports "halts", D is programmed to enter an infinite loop. Therefore D(<D>) loops forever, contradicting H\'s claim!',
      isContradictionProved: true,
    };
  } else {
    return {
      assumedDecision: 'DOES_NOT_HALT',
      diagonalBehavior: 'HALTS_AND_ACCEPTS',
      resultingContradiction:
        'H claimed that D(<D>) does not halt. However, whenever H reports "does not halt", D is programmed to halt immediately. Therefore D(<D>) halts, contradicting H\'s claim!',
      isContradictionProved: true,
    };
  }
}

/**
 * Curated presets demonstrating halting vs acceptance and non-halting loops.
 */
export const HALTING_PROBLEM_PRESETS: ReadonlyArray<HaltingProblemPreset> = [
  {
    id: 'preset-accepting-halt',
    name: 'Machine M_acc: Halts in Accepting State',
    shortDescription: 'Halts and accepts on string "1". YES instance of HALT_TM.',
    expectedHaltingBehavior: 'HALTS',
    isHaltingYESInstance: true,
    graph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 300, y: 150, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q_acc', label: '1 → 1, S', readSymbol: '1', writeSymbol: '1', moveDirection: 'S' },
      ],
    },
    sampleInputs: [
      { input: '1', expectedOutcome: 'HALTED_ACCEPT', isHalted: true, isAccepted: true, notes: 'Halts in q_acc (Halting YES instance)' },
    ],
  },
  {
    id: 'preset-rejecting-halt',
    name: 'Machine M_rej: Halts in Non-Accepting State',
    shortDescription: 'CRITICAL DEMONSTRATION: Halts and rejects on "0". STILL A YES INSTANCE OF HALT_TM!',
    expectedHaltingBehavior: 'HALTS',
    isHaltingYESInstance: true,
    graph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q_rej', label: 'q_rej', x: 300, y: 150, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q_rej', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' },
      ],
    },
    sampleInputs: [
      { input: '0', expectedOutcome: 'HALTED_REJECT', isHalted: true, isAccepted: false, notes: 'Halts in q_rej without accepting. YES instance of HALT_TM!' },
    ],
  },
  {
    id: 'preset-infinite-loop',
    name: 'Machine M_loop: Enters Infinite Scan',
    shortDescription: 'Scans infinitely rightwards across blank tape cells without ever halting.',
    expectedHaltingBehavior: 'LOOPS_FOREVER',
    isHaltingYESInstance: false,
    graph: {
      nodes: [
        { id: 'q_loop', label: 'q_loop', x: 150, y: 150, isInitial: true, isAccepting: false },
      ],
      edges: [
        { id: 'e_loop', sourceNodeId: 'q_loop', targetNodeId: 'q_loop', label: '□ → □, R', readSymbol: '□', writeSymbol: '□', moveDirection: 'R' },
        { id: 'e_sym', sourceNodeId: 'q_loop', targetNodeId: 'q_loop', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
      ],
    },
    sampleInputs: [
      { input: '', expectedOutcome: 'STEP_LIMIT_REACHED', isHalted: false, isAccepted: false, notes: 'Infinite rightward scan; hits step limit.' },
    ],
  },
];

/**
 * Observes the execution of a machine under bounded simulation and maps it to
 * formal Halting Problem semantics with strict epistemological safety.
 */
export function observeBoundedHalting(
  graph: SolverGraphInput,
  inputString: string,
  options?: TMExecutionOptions
): HaltingObservationResult {
  const maxSteps = options?.maxSteps ?? 200;
  const blankSymbol = options?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;

  const execution = executeTM(graph, inputString, {
    maxSteps,
    blankSymbol,
  });

  const isAccepted = execution.isAccepted;
  const isLimitReached = Boolean(
    execution.isInconclusive || execution.rejectionReason === 'INCONCLUSIVE_LIMIT'
  );

  let outcome: HaltingSimulationOutcome;
  let haltsMembershipClassification: 'YES_HALTS' | 'INCONCLUSIVE_TIMEOUT';
  let academicExplanation: string;
  let epistemologicalSafetyNote: string;

  if (isLimitReached) {
    outcome = 'STEP_LIMIT_REACHED';
    haltsMembershipClassification = 'INCONCLUSIVE_TIMEOUT';
    academicExplanation =
      'The simulation reached the configured step bound without halting. In computability theory, a finite timeout cannot establish whether the machine loops forever or halts after a trillion steps.';
    epistemologicalSafetyNote =
      'CRITICAL SAFETY GUARD: Reaching a step limit does NOT prove the machine loops forever. It indicates only that the finite bound was insufficient to observe termination.';
  } else if (isAccepted) {
    outcome = 'HALTED_ACCEPT';
    haltsMembershipClassification = 'YES_HALTS';
    academicExplanation =
      'The Turing machine halted in an accepting state. Because it terminated, <M, w> is definitively a YES instance of HALT_TM.';
    epistemologicalSafetyNote =
      'Termination verified: The machine halted in a designated accepting state.';
  } else {
    // Explicit halting in non-accepting state
    outcome = 'HALTED_REJECT';
    haltsMembershipClassification = 'YES_HALTS';
    academicExplanation =
      'The Turing machine halted in a non-accepting state (explicit rejection). CRUCIAL LESSON: Because the machine stopped, <M, w> IS A YES INSTANCE OF HALT_TM! Halting is distinct from accepting.';
    epistemologicalSafetyNote =
      'Halting verified: Machine stopped with no further moves. Demonstrates that Halting != Acceptance.';
  }

  return {
    machineName: 'Turing Machine Simulation',
    inputWord: inputString,
    outcome,
    isHalted: outcome !== 'STEP_LIMIT_REACHED',
    isAccepted,
    stepsExecuted: execution.steps.length,
    finalStateLabel: execution.finalStateLabel ?? undefined,
    haltsMembershipClassification,
    academicExplanation,
    epistemologicalSafetyNote,
  };
}
