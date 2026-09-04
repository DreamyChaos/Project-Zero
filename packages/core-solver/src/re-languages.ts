import {
  SolverGraphInput,
  TMExecutionOptions,
  MachineHaltingType,
  RELanguageExample,
  REExecutionDemonstrationResult,
  EnumeratorSimulationResult,
  ComplementTheoremSpec,
} from './types';
import { executeTM } from './tm-executor';
import { DEFAULT_BLANK_SYMBOL } from './tm-validator';

/**
 * ============================================================
 * MODULE 5 — TOPIC 4: RECURSIVE & RECURSIVELY ENUMERABLE LANGUAGES
 * ============================================================
 *
 * Core Formal Distinctions:
 * 1. DECIDER:
 *    A Turing machine M is a decider if M halts on EVERY input w in Sigma*.
 *    - If w in L, M accepts.
 *    - If w not in L, M rejects.
 *    The language L = L(M) is called RECURSIVE (or DECIDABLE).
 *
 * 2. RECOGNIZER:
 *    A Turing machine M is a recognizer if:
 *    - If w in L, M eventually halts and accepts.
 *    - If w not in L, M may halt and reject OR loop forever (diverge).
 *    The language L = L(M) is called RECURSIVELY ENUMERABLE (RE) (or TURING-RECOGNIZABLE).
 *
 * 3. HIERARCHY & CONTAINMENT:
 *    Regular ⊂ Context-Free ⊂ Recursive ⊂ Recursively Enumerable ⊆ All Languages.
 *    The containment Recursive ⊂ RE is PROPER. Every recursive language is RE,
 *    but there exist RE languages that are not recursive (e.g., A_TM, the Halting Problem).
 *
 * 4. COMPLEMENT PROPERTIES:
 *    - If L is Recursive, then complement(L) is Recursive (Deciders are closed under complement).
 *    - Fundamental Complementation Theorem: A language L is Recursive iff L is RE and complement(L) is RE.
 *
 * 5. ENUMERATOR EQUIVALENCE:
 *    A language is RE iff some Turing machine can enumerate exactly its strings.
 */

export const RE_LANGUAGE_DEFINITIONS = {
  recursive: {
    title: 'Recursive / Decidable Language',
    formalDefinition: 'L ⊆ Σ* is Recursive iff ∃ TM D such that ∀w ∈ Σ*, D halts on w, and D accepts w ⇔ w ∈ L.',
    haltingBehavior: 'Total: Halts on every input string (accepts members, explicitly rejects non-members).',
    complementProperty: 'Closed under complement: If L is recursive, then complement(L) is recursive.',
  },
  recursivelyEnumerable: {
    title: 'Recursively Enumerable (RE) / Turing-Recognizable Language',
    formalDefinition: 'L ⊆ Σ* is RE iff ∃ TM R such that ∀w ∈ L, R halts and accepts; for w ∉ L, R may reject or loop forever.',
    haltingBehavior: 'Partial: Guaranteed to halt and accept on members; may diverge (loop infinitely) on non-members.',
    complementProperty: 'Not closed under complement: The complement of an RE language is not necessarily RE.',
  },
  nonRecursive: {
    title: 'Non-Recursive / Undecidable Language',
    formalDefinition: 'L ⊆ Σ* is Non-Recursive iff no Turing machine can decide L (no algorithm can determine membership with guaranteed termination on all inputs).',
    subclasses: 'Includes non-recursive RE languages (e.g., A_TM) and non-RE languages (e.g., complement(A_TM)).',
  },
};

/**
 * Curated comparison table between Recursive (Decidable) and RE (Recognizable).
 */
export const RECURSIVE_VS_RE_COMPARISON: ReadonlyArray<{
  property: string;
  recursive: string;
  recursivelyEnumerable: string;
}> = [
  {
    property: 'Behavior on member input (w ∈ L)',
    recursive: 'Always halts and ACCEPTS',
    recursivelyEnumerable: 'Always halts and ACCEPTS',
  },
  {
    property: 'Behavior on non-member input (w ∉ L)',
    recursive: 'Always halts and REJECTS',
    recursivelyEnumerable: 'May REJECT or may LOOP FOREVER (diverge)',
  },
  {
    property: 'Halting guarantee on all inputs',
    recursive: 'YES (Total machine / Decider)',
    recursivelyEnumerable: 'NO (Partial machine / Recognizer)',
  },
  {
    property: 'Membership procedure classification',
    recursive: 'Decides membership (Algorithm)',
    recursivelyEnumerable: 'Recognizes membership (Semi-algorithm)',
  },
  {
    property: 'Closed under complementation',
    recursive: 'YES (Invert accept/reject states of decider)',
    recursivelyEnumerable: 'NO (Complement of RE is not necessarily RE)',
  },
  {
    property: 'Relationship to enumeration',
    recursive: 'Can be enumerated in lexicographical order',
    recursivelyEnumerable: 'Can be enumerated in some order (not necessarily sorted)',
  },
];

/**
 * Formal Complement Theorems.
 */
export const COMPLEMENT_THEOREMS: ReadonlyArray<ComplementTheoremSpec> = [
  {
    theoremName: 'Closure of Decidable Languages under Complement',
    formalStatement: 'If L is a recursive (decidable) language, then its complement L̄ = Σ* \\ L is also recursive.',
    constructionProcedure:
      'Given a decider D for L that halts on all inputs: construct D̄ by swapping the accepting and non-accepting halting conditions (if D halts in q_acc, D̄ rejects; if D halts outside F or has no transition, D̄ accepts). Because D always halts, D̄ always halts, so L̄ is decidable.',
    mathematicalImplication: 'The class of recursive languages is an algebra of sets closed under Boolean operations (complement, union, intersection).',
  },
  {
    theoremName: 'Two-Way Recognizability Decidability Criterion',
    formalStatement: 'A language L is recursive (decidable) if and only if both L is RE and L̄ is RE.',
    constructionProcedure:
      'Let M1 recognize L and M2 recognize L̄. For any input w, run M1(w) and M2(w) in parallel (dovetailing step-by-step). Since w ∈ L or w ∈ L̄, exactly one of the two machines must halt and accept. If M1 accepts, accept; if M2 accepts, reject. This combined machine always halts, thus deciding L.',
    mathematicalImplication: 'If a language L is RE but not recursive, its complement L̄ CANNOT be RE (otherwise L would be recursive).',
  },
];

/**
 * Curated bank of formal language examples with concrete executable Turing Machines.
 */
export const RE_LANGUAGE_PRESETS: ReadonlyArray<RELanguageExample> = [
  {
    id: 'decider-even-ones',
    name: 'L_even1: Strings with an even number of 1s',
    formalDefinition: 'L = { w ∈ {0, 1}* | |w|_1 mod 2 = 0 }',
    alphabet: ['0', '1'],
    classCategory: 'RECURSIVE',
    haltingType: 'DECIDER',
    blankSymbol: DEFAULT_BLANK_SYMBOL,
    academicContext:
      'Classic regular language (and hence context-free, recursive, and RE). Demonstrates a total decider that scans the entire finite input and always halts with a definitive accept or reject decision.',
    deciderBehaviorSummary: 'Scans the input bit-by-bit while tracking parity in state register. Halts in q_even on blank.',
    recognizerBehaviorSummary: 'Acts as a decider because it halts on all inputs.',
    isExecutableInPlatform: true,
    graph: {
      nodes: [
        { id: 'q_init', label: 'q_init', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q_even', label: 'q_even', x: 280, y: 150, isInitial: false, isAccepting: false },
        { id: 'q_odd', label: 'q_odd', x: 460, y: 150, isInitial: false, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 280, y: 280, isInitial: false, isAccepting: true },
        { id: 'q_rej', label: 'q_rej', x: 460, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        // From q_init:
        // empty input -> read blank -> accept (0 is even)
        { id: 'e0', sourceNodeId: 'q_init', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        // read 0 -> even count of 1s so far -> q_even
        { id: 'e1', sourceNodeId: 'q_init', targetNodeId: 'q_even', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        // read 1 -> odd count of 1s so far -> q_odd
        { id: 'e2', sourceNodeId: 'q_init', targetNodeId: 'q_odd', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },

        // In q_even:
        { id: 'e3', sourceNodeId: 'q_even', targetNodeId: 'q_even', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e4', sourceNodeId: 'q_even', targetNodeId: 'q_odd', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e5', sourceNodeId: 'q_even', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },

        // In q_odd:
        { id: 'e6', sourceNodeId: 'q_odd', targetNodeId: 'q_odd', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e7', sourceNodeId: 'q_odd', targetNodeId: 'q_even', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e8', sourceNodeId: 'q_odd', targetNodeId: 'q_rej', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
      ],
    },
    testCases: [
      { input: '', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'Zero 1s is even (member).' },
      { input: '0', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'Zero 1s is even (member).' },
      { input: '11', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'Two 1s is even (member).' },
      { input: '10100', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'Two 1s is even (member).' },
      { input: '1', isMember: false, expectedHalt: true, expectedAccept: false, notes: 'One 1 is odd (non-member).' },
      { input: '010', isMember: false, expectedHalt: true, expectedAccept: false, notes: 'One 1 is odd (non-member).' },
      { input: '111', isMember: false, expectedHalt: true, expectedAccept: false, notes: 'Three 1s is odd (non-member).' },
    ],
  },
  {
    id: 'decider-0n1n',
    name: 'L_0n1n: Balanced 0^n 1^n',
    formalDefinition: 'L = { 0^n 1^n | n ≥ 0 }',
    alphabet: ['0', '1'],
    classCategory: 'RECURSIVE',
    haltingType: 'DECIDER',
    blankSymbol: DEFAULT_BLANK_SYMBOL,
    academicContext:
      'Classic non-regular context-free language. A Turing decider matches matching 0s and 1s using tape scratch symbols, always halting on all input strings.',
    deciderBehaviorSummary: 'Repeatedly crosses off a 0 and a matching 1. Halts and accepts on balanced strings; halts and rejects on mismatches.',
    recognizerBehaviorSummary: 'Guaranteed total decider on all strings.',
    isExecutableInPlatform: true,
    graph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 280, y: 150, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 460, y: 150, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 280, y: 280, isInitial: false, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 100, y: 280, isInitial: false, isAccepting: true },
        { id: 'q_rej', label: 'q_rej', x: 460, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        // q0: read 0 -> write X, move R to q1
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → X, R', readSymbol: '0', writeSymbol: 'X', moveDirection: 'R' },
        // q0: read Y -> scan right in q3 to verify all matched
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        // q0: read □ -> empty string ε is 0^0 1^0 (accept)
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        // q1: scan right past 0s and Ys to find matching 1
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'e5', sourceNodeId: 'q1', targetNodeId: 'q2', label: '1 → Y, L', readSymbol: '1', writeSymbol: 'Y', moveDirection: 'L' },
        // q2: scan left past Ys and 0s back to X
        { id: 'e6', sourceNodeId: 'q2', targetNodeId: 'q2', label: 'Y → Y, L', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'e7', sourceNodeId: 'q2', targetNodeId: 'q2', label: '0 → 0, L', readSymbol: '0', writeSymbol: '0', moveDirection: 'L' },
        { id: 'e8', sourceNodeId: 'q2', targetNodeId: 'q0', label: 'X → X, R', readSymbol: 'X', writeSymbol: 'X', moveDirection: 'R' },
        // q3: scan past remaining Ys to ensure no stray 0s or 1s remain
        { id: 'e9', sourceNodeId: 'q3', targetNodeId: 'q3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'e10', sourceNodeId: 'q3', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e11', sourceNodeId: 'q3', targetNodeId: 'q_rej', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' },
        { id: 'e12', sourceNodeId: 'q3', targetNodeId: 'q_rej', label: '1 → 1, S', readSymbol: '1', writeSymbol: '1', moveDirection: 'S' },
      ],
    },
    testCases: [
      { input: '', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'n = 0 (member).' },
      { input: '01', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'n = 1 (member).' },
      { input: '0011', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'n = 2 (member).' },
      { input: '000111', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'n = 3 (member).' },
      { input: '0', isMember: false, expectedHalt: true, expectedAccept: false, notes: 'Missing matching 1 (non-member).' },
      { input: '10', isMember: false, expectedHalt: true, expectedAccept: false, notes: 'Inverted order (non-member).' },
      { input: '001', isMember: false, expectedHalt: true, expectedAccept: false, notes: 'Extra 0 (non-member).' },
    ],
  },
  {
    id: 'recognizer-loop-demo',
    name: 'L_contains1: Educational Recognizer (Loops on Non-Members)',
    formalDefinition: 'L = { w ∈ {0, 1}* | w contains at least one 1 }',
    alphabet: ['0', '1'],
    classCategory: 'RECURSIVELY_ENUMERABLE',
    haltingType: 'RECOGNIZER',
    blankSymbol: DEFAULT_BLANK_SYMBOL,
    academicContext:
      'Pedagogical recognizer designed to illustrate the recognizer contract: on any string with at least one 1, it halts and accepts; on strings containing only 0s (non-members), instead of rejecting, it enters an infinite rightward scan across blanks.',
    deciderBehaviorSummary: 'N/A — configured intentionally as a partial recognizer to illustrate non-halting divergence on non-members.',
    recognizerBehaviorSummary: 'Halts and accepts if "1" is encountered. If input contains no "1", it scans into the infinite blank tape without halting.',
    isExecutableInPlatform: true,
    graph: {
      nodes: [
        { id: 'q_scan', label: 'q_scan', x: 150, y: 150, isInitial: true, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 400, y: 150, isInitial: false, isAccepting: true },
        { id: 'q_loop', label: 'q_loop', x: 150, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        // q_scan: if read 1 -> accept immediately
        { id: 'e0', sourceNodeId: 'q_scan', targetNodeId: 'q_acc', label: '1 → 1, S', readSymbol: '1', writeSymbol: '1', moveDirection: 'S' },
        // q_scan: if read 0 -> move right
        { id: 'e1', sourceNodeId: 'q_scan', targetNodeId: 'q_scan', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        // q_scan: if hit blank -> transition to q_loop which runs forever to the right
        { id: 'e2', sourceNodeId: 'q_scan', targetNodeId: 'q_loop', label: '□ → □, R', readSymbol: '□', writeSymbol: '□', moveDirection: 'R' },
        // q_loop: infinite rightward scan on blanks
        { id: 'e3', sourceNodeId: 'q_loop', targetNodeId: 'q_loop', label: '□ → □, R', readSymbol: '□', writeSymbol: '□', moveDirection: 'R' },
        { id: 'e4', sourceNodeId: 'q_loop', targetNodeId: 'q_loop', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
      ],
    },
    testCases: [
      { input: '1', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'Contains 1 (halts and accepts).' },
      { input: '010', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'Contains 1 (halts and accepts).' },
      { input: '0001', isMember: true, expectedHalt: true, expectedAccept: true, notes: 'Contains 1 (halts and accepts).' },
      { input: '', isMember: false, expectedHalt: false, expectedAccept: false, notes: 'Empty string (loops forever across blanks).' },
      { input: '0', isMember: false, expectedHalt: false, expectedAccept: false, notes: 'Only 0s (loops forever across blanks).' },
      { input: '000', isMember: false, expectedHalt: false, expectedAccept: false, notes: 'Only 0s (loops forever across blanks).' },
    ],
  },
];

/**
 * Executes a machine under Decider or Recognizer semantics and returns a structured,
 * epistemologically safe demonstration result.
 */
export function demonstrateREExecution(
  graph: SolverGraphInput,
  inputString: string,
  haltingType: MachineHaltingType,
  options?: TMExecutionOptions
): REExecutionDemonstrationResult {
  const execution = executeTM(graph, inputString, options);

  const lastStep = execution.steps[execution.steps.length - 1];
  const isHalted = lastStep ? lastStep.isHalted : true;
  const isAccepted = execution.isAccepted;
  const isBoundedLimitReached = Boolean(
    execution.isInconclusive || execution.rejectionReason === 'INCONCLUSIVE_LIMIT'
  );

  let membershipStatus: 'MEMBER' | 'NON_MEMBER' | 'INCONCLUSIVE_BOUND_REACHED';
  let statusDisplayLabel: string;
  let academicExplanation: string;
  let boundedSafetyNote: string;

  if (isAccepted) {
    membershipStatus = 'MEMBER';
    statusDisplayLabel = 'ACCEPT: String is a Member (w ∈ L)';
    academicExplanation =
      'The Turing machine halted in an accepting state. By definition, input string w is confirmed to belong to the language L(M).';
    boundedSafetyNote = 'Membership mathematically established by explicit terminating acceptance.';
  } else if (isBoundedLimitReached) {
    membershipStatus = 'INCONCLUSIVE_BOUND_REACHED';
    statusDisplayLabel = 'INCONCLUSIVE: Bounded Step Limit Reached';
    if (haltingType === 'RECOGNIZER') {
      academicExplanation =
        'The recognizer did not reach an accepting state within the configured step bound. In a Turing recognizer, non-member inputs may run forever. However, reaching a finite execution bound does NOT prove non-membership.';
      boundedSafetyNote =
        'CRITICAL PEDAGOGICAL SAFETY: Reaching the step bound means the simulation was inconclusive. It does NOT mathematically prove w ∉ L.';
    } else {
      academicExplanation =
        'The decider did not halt within the configured step bound. Because deciders are mathematically total, this indicates the step bound was insufficient to complete the full decision procedure.';
      boundedSafetyNote =
        'Execution limit reached; the configured bound was insufficient to demonstrate the decider\'s total behavior.';
    }
  } else {
    // Machine explicitly halted outside accepting state (rejection)
    membershipStatus = 'NON_MEMBER';
    statusDisplayLabel = 'REJECT: Machine Halted in Non-Accepting State';
    academicExplanation =
      'The machine halted without accepting. For a decider, this guarantees w ∉ L. For a recognizer, an explicit rejecting halt also confirms non-membership.';
    boundedSafetyNote = 'Explicit rejection verified by termination outside the set of accepting states F.';
  }

  const complementBehaviorNote =
    haltingType === 'DECIDER'
      ? 'Because this machine is a Decider, swapping its accept and reject halting configurations yields a decider for the complement language L̄.'
      : 'Because this machine is a partial Recognizer, inverting its states does NOT yield a recognizer for L̄ because inputs that loop forever would continue to loop forever rather than being accepted.';

  return {
    languageId: 'custom-or-preset',
    languageName: 'Turing Machine Computation',
    inputString,
    haltingType,
    executionResult: execution,
    isAccepted,
    isHalted,
    isBoundedLimitReached,
    membershipStatus,
    statusDisplayLabel,
    academicExplanation,
    boundedSafetyNote,
    complementBehaviorNote,
  };
}

/**
 * Simulates a bounded Turing Enumerator for a machine M over alphabet Σ.
 * Systematically tests words in length-lexicographical (canonical) order:
 * ε, 0, 1, 00, 01, 10, 11, ...
 * up to maxWords emitted or candidate limit.
 */
export function simulateBoundedEnumerator(
  graph: SolverGraphInput,
  alphabet: ReadonlyArray<string> = ['0', '1'],
  maxEmittedWords: number = 8,
  maxStepsPerCandidate: number = 100,
  blankSymbol: string = DEFAULT_BLANK_SYMBOL
): EnumeratorSimulationResult {
  const sortedAlphabet = [...alphabet].sort();
  const emittedWords: string[] = [];
  let candidateQueue: string[] = [''];
  let testedCandidateCount = 0;
  const maxCandidatesToTest = 100;

  while (candidateQueue.length > 0 && emittedWords.length < maxEmittedWords && testedCandidateCount < maxCandidatesToTest) {
    const candidate = candidateQueue.shift()!;
    testedCandidateCount++;

    const run = executeTM(graph, candidate, {
      blankSymbol,
      maxSteps: maxStepsPerCandidate,
    });

    if (run.isAccepted) {
      emittedWords.push(candidate === '' ? 'ε' : candidate);
    }

    // Generate next length candidates
    if (testedCandidateCount < maxCandidatesToTest) {
      for (const sym of sortedAlphabet) {
        candidateQueue.push(candidate + sym);
      }
    }
  }

  return {
    alphabet: sortedAlphabet,
    testedCandidateCount,
    emittedWords,
    maxWordsLimitReached: emittedWords.length >= maxEmittedWords,
    isFinitePrefix: true,
    academicDisclaimer:
      'This output represents a FINITE PREFIX of an enumeration generated under bounded simulation. An infinite language cannot be completely enumerated in finite time.',
  };
}
