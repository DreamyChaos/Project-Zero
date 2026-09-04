import {
  SolverGraphInput,
  TMExecutionOptions,
  ComputationalFormalModel,
  EffectiveProcedureExample,
  EffectiveProcedureClassification,
  ChurchTuringDistinctionItem,
  ChurchTuringDemonstrationResult,
} from './types';
import { executeTM } from './tm-executor';

/**
 * ============================================================
 * MODULE 5 — TOPIC 3: CHURCH-TURING THESIS
 * ============================================================
 *
 * Core Educational Formulation:
 * "The intuitive notion of an effectively computable procedure is captured
 *  by Turing-computable functions."
 *
 * Epistemological Invariant:
 * The Church–Turing Thesis connects an informal, intuitive notion
 * ("effective calculability" or "algorithm") with a rigorous, formal
 * mathematical definition ("Turing computability", "lambda-definability", etc.).
 *
 * CRITICAL PEDAGOGICAL RULES:
 * 1. It is a THESIS, not an axiomatic theorem. It cannot be mathematically proven
 *    from first-order axioms because the concept of "effective procedure" is intuitive.
 * 2. It is supported by the empirical and mathematical convergence of dozens of
 *    independent formal models, all of which proved to define precisely the
 *    SAME class of partial computable functions (f: Σ* ⇀ Γ*).
 * 3. Software simulations DO NOT prove the thesis; they illustrate that concrete
 *    computations map to this universal boundary.
 */

export const CHURCH_TURING_THESIS_STATEMENT =
  'The intuitive notion of an effectively computable procedure is captured by Turing-computable functions.';

/**
 * Curated registry of historically established, mathematically rigorous formal models
 * of computation that converge on the same class of computable functions.
 */
export const COMPUTATIONAL_FORMAL_MODELS: ReadonlyArray<ComputationalFormalModel> = [
  {
    id: 'turing-machine',
    name: 'Turing Machines (TM)',
    shortLabel: 'Turing Machine',
    founder: 'Alan Turing',
    yearIntroduced: 1936,
    category: 'MACHINE_BASED',
    corePrimitive: 'Discrete state-register, infinite discrete 1D tape, read/write tape head.',
    executionSemantics: 'Stepwise transition δ: Q × Γ → Q × Γ × {L, R, S} executing localized operations.',
    computabilityPower: 'Class of partial computable functions R (Turing-computable).',
    isExecutableInPlatform: true,
    platformExecutionNote: 'Production executable simulation via Project Zero deterministic TM engine.',
    formalEquivalenceCitation: 'Turing (1936) "On Computable Numbers, with an Application to the Entscheidungsproblem".',
  },
  {
    id: 'lambda-calculus',
    name: 'Untyped Lambda Calculus (λ-Calculus)',
    shortLabel: 'λ-Calculus',
    founder: 'Alonzo Church',
    yearIntroduced: 1936,
    category: 'FUNCTION_CALCULUS',
    corePrimitive: 'Variables, abstraction (λx.e), and function application (e1 e2).',
    executionSemantics: 'β-reduction rules ((λx.E) M → E[x := M]) and α-conversion.',
    computabilityPower: 'Class of partial computable functions R (λ-definable functions).',
    isExecutableInPlatform: false,
    platformExecutionNote: 'Conceptual equivalent model. Characterizes identical function class without ad-hoc simulation.',
    formalEquivalenceCitation: 'Church (1936), proven equivalent to Turing Machines by Turing (1937) "Computability and λ-Definability".',
  },
  {
    id: 'recursive-functions',
    name: 'General (μ-) Recursive Functions',
    shortLabel: 'μ-Recursive Functions',
    founder: 'Kurt Gödel, Jacques Herbrand, Stephen Cole Kleene',
    yearIntroduced: 1936,
    category: 'AXIOMATIC_RECURSION',
    corePrimitive: 'Zero function, Successor, Projection, Composition, Primitive Recursion, and Unbounded Search (μ-operator).',
    executionSemantics: 'Axiomatic composition of functions over ℕ; μ-minimization operator allows partial functions.',
    computabilityPower: 'Class of partial computable functions R (μ-recursive functions).',
    isExecutableInPlatform: false,
    platformExecutionNote: 'Conceptual equivalent model. Characterizes identical function class over natural numbers.',
    formalEquivalenceCitation: 'Kleene (1936) "General recursive functions of natural numbers", proven equivalent to λ-calculus and TMs.',
  },
  {
    id: 'post-systems',
    name: 'Post Canonical Production Systems',
    shortLabel: 'Post Systems',
    founder: 'Emil Post',
    yearIntroduced: 1936,
    category: 'STRING_REWRITING',
    corePrimitive: 'String assertion sets, alphabet tokens, and production rewrite rules ($1 g $2 → $1 h $2).',
    executionSemantics: 'Deterministic or non-deterministic string derivation by pattern matching and substitution.',
    computabilityPower: 'Class of partial computable functions R (Post-computable).',
    isExecutableInPlatform: false,
    platformExecutionNote: 'Conceptual equivalent model. Canonical string rewriting formalism.',
    formalEquivalenceCitation: 'Post (1936) "Finite Combinatory Processes - Formulation 1".',
  },
  {
    id: 'register-machines',
    name: 'Unlimited Register Machines (RAM / URM)',
    shortLabel: 'RAM Machine',
    founder: 'John C. Shepherdson & Howard E. Sturgis',
    yearIntroduced: 1963,
    category: 'REGISTER_ARCHITECTURE',
    corePrimitive: 'Discrete memory registers R1, R2, ..., arithmetic instructions (INC, DEC), conditional jumps (JNZ).',
    executionSemantics: 'Linear instruction counter sequencing through imperative assembly-like operations.',
    computabilityPower: 'Class of partial computable functions R (URM-computable).',
    isExecutableInPlatform: false,
    platformExecutionNote: 'Conceptual equivalent model. Modern architecture abstraction equivalent to TM.',
    formalEquivalenceCitation: 'Shepherdson & Sturgis (1963) "Computability of Recursive Functions".',
  },
];

/**
 * Rigorous boundary comparison: What the Church-Turing Thesis DOES and DOES NOT say.
 */
export const CHURCH_TURING_DISTINCTIONS: ReadonlyArray<ChurchTuringDistinctionItem> = [
  {
    topic: 'Effective Calculability Boundary',
    thesisDoesSay: 'Any algorithmically effective procedure can be carried out by a Turing Machine.',
    thesisDoesNotSay: 'Every mathematical problem has a computable solution (Undecidable problems exist, e.g., the Halting Problem).',
    misconceptionWarning: 'Do not confuse "every algorithmic process is TM-computable" with "all mathematical questions are solvable".',
  },
  {
    topic: 'Nature of the Claim (Thesis vs Theorem)',
    thesisDoesSay: 'The thesis connects an informal intuitive concept ("effective procedure") with a precise formal concept ("Turing machine").',
    thesisDoesNotSay: 'The thesis has been mathematically proven from axioms as a theorem.',
    misconceptionWarning: 'An informal concept cannot be deductively proven; it is validated by continuous empirical and formal convergence.',
  },
  {
    topic: 'Model Equivalence vs Mechanics',
    thesisDoesSay: 'Turing Machines, λ-Calculus, and μ-Recursive functions characterize precisely the same class of computable functions.',
    thesisDoesNotSay: 'All computational models share the same syntax, operational steps, or execution speed.',
    misconceptionWarning: 'Computability equivalence does NOT mean operational or structural identity.',
  },
  {
    topic: 'Computability vs Computational Complexity',
    thesisDoesSay: 'The thesis specifies the boundary of WHAT can be computed in principle, regardless of time or space requirements.',
    thesisDoesNotSay: 'All equivalent models require the same time/space complexity or polynomial running time.',
    misconceptionWarning: 'The Church-Turing Thesis concerns computability (decidability), NOT computational complexity classes (P, NP, EXPTIME).',
  },
  {
    topic: 'Program Termination & Halting',
    thesisDoesSay: 'Partial computable functions f: Σ* ⇀ Γ* may be undefined (run forever) on inputs outside their domain.',
    thesisDoesNotSay: 'Every program or Turing machine will eventually halt on all inputs.',
    misconceptionWarning: 'Total computability is a strictly smaller concept than partial computability.',
  },
  {
    topic: 'Physical Universe vs Algorithmic Mathematics',
    thesisDoesSay: 'Standard formalisms of discrete mechanical symbolic manipulation describe the same computable functions.',
    thesisDoesNotSay: 'Physical reality cannot contain analog or hypercomputational phenomena beyond human discrete algorithms.',
    misconceptionWarning: 'The original Church-Turing Thesis applies to human pencil-and-paper effective calculation, not physical cosmology.',
  },
];

/**
 * Curated bank of procedure examples for pedagogical classification.
 * Demonstrates why the phrase "effective procedure" requires precise formulation.
 */
export const EFFECTIVE_PROCEDURE_EXAMPLES: ReadonlyArray<EffectiveProcedureExample> = [
  {
    id: 'binary-increment-algo',
    title: 'Scan and Increment Binary Integer',
    procedureDescription:
      'Given a non-empty string of bits {0, 1} representing an integer, scan right to the blank, move left, flip trailing 1s to 0s, and flip the first 0 to 1 (or write 1 if reaching the left blank).',
    expectedClassification: 'FINITE_ALGORITHMIC',
    academicExplanation:
      'Every step is purely mechanical, deterministic, operates on a finite alphabet, and uses only local state transitions without guessing.',
    requiresHumanIntuitionOrOracle: false,
    isMechanicallyExecutable: true,
    pedagogicalTakeaway:
      'Conforms completely to Turing\'s 1936 definition of an effective mechanical procedure.',
  },
  {
    id: 'halting-oracle-check',
    title: 'Check Program Halting via Presumed Oracle',
    procedureDescription:
      'Given the source code of an arbitrary program P and input x, inspect P and output YES if P terminates on x within any finite time, or NO if P runs forever.',
    expectedClassification: 'NON_EFFECTIVE_ORACLE',
    academicExplanation:
      'This requires an uncomputable decision step (an oracle for the Halting Problem). No mechanical finite procedure can achieve this for all programs.',
    requiresHumanIntuitionOrOracle: true,
    isMechanicallyExecutable: false,
    pedagogicalTakeaway:
      'Illustrates that intuitively worded procedures may fail to be "effective" because they demand non-mechanical or infinite omniscience.',
  },
  {
    id: 'find-most-beautiful-string',
    title: 'Select the "Most Elegant" Valid Formula',
    procedureDescription:
      'Given a set of valid logical formulas, select the one that exhibits the highest aesthetic beauty and conceptual harmony.',
    expectedClassification: 'UNDERSPECIFIED',
    academicExplanation:
      'The criterion ("aesthetic beauty", "conceptual harmony") is subjective, non-deterministic, and lacks any discrete mathematical specification.',
    requiresHumanIntuitionOrOracle: true,
    isMechanicallyExecutable: false,
    pedagogicalTakeaway:
      'An effective procedure requires unambiguous, deterministic, finite rules that can be carried out without subjective human interpretation.',
  },
  {
    id: 'unary-addition-algo',
    title: 'Unary Addition by Blank Replacement',
    procedureDescription:
      'Given tape input 1^m + 1^n, scan to the delimiter +, replace + with 1, scan right to the terminal 1, replace it with blank □, and halt.',
    expectedClassification: 'FINITE_ALGORITHMIC',
    academicExplanation:
      'Operates deterministically on finite symbols with a finite state control, completing in m + n + O(1) steps.',
    requiresHumanIntuitionOrOracle: false,
    isMechanicallyExecutable: true,
    pedagogicalTakeaway:
      'Classic Turing machine transducer implementing the addition function f(m, n) = m + n effectively.',
  },
  {
    id: 'goldbach-infinite-scan',
    title: 'Search All Even Integers for Goldbach Counterexample',
    procedureDescription:
      'Test 4, 6, 8, ... in order to check if each is a sum of two primes. If a counterexample is found, output it. If none exists across all infinitely many even numbers, halt and output "Goldbach conjecture is true".',
    expectedClassification: 'NON_EFFECTIVE_ORACLE',
    academicExplanation:
      'The step "if none exists across all infinitely many even numbers" cannot be performed in a finite mechanical step. A machine searching sequentially cannot declare completion after inspecting infinite cases without a mathematical proof.',
    requiresHumanIntuitionOrOracle: true,
    isMechanicallyExecutable: false,
    pedagogicalTakeaway:
      'An effective procedure must provide a finite recipe for each step; an infinite search cannot terminate with a negative answer by exhaustion.',
  },
];

/**
 * Classifies an educational procedure by ID and returns detailed feedback.
 */
export function classifyEffectiveProcedure(
  exampleId: string,
  userSelectedClassification: EffectiveProcedureClassification
): {
  isCorrect: boolean;
  example: EffectiveProcedureExample;
  feedback: string;
} {
  const example = EFFECTIVE_PROCEDURE_EXAMPLES.find((e) => e.id === exampleId);
  if (!example) {
    throw new Error(`Unknown effective procedure example ID: ${exampleId}`);
  }

  const isCorrect = userSelectedClassification === example.expectedClassification;
  const feedback = isCorrect
    ? `Correct! ${example.academicExplanation} Takeaway: ${example.pedagogicalTakeaway}`
    : `Incorrect. This procedure is classified as ${example.expectedClassification}. ${example.academicExplanation}`;

  return {
    isCorrect,
    example,
    feedback,
  };
}

/**
 * Demonstrates how an actual executable computation in Project Zero
 * connects to the Church-Turing Thesis.
 *
 * It runs the given machine M on input w using Project Zero's deterministic
 * executeTM engine (bounded by options.maxSteps).
 * It then maps the concrete execution result to the abstract class of
 * partial computable functions f: Σ* ⇀ Γ* and generates the formal equivalence
 * summary across canonical computational models.
 */
export function demonstrateChurchTuringEquivalence(
  graph: SolverGraphInput,
  inputString: string,
  options?: TMExecutionOptions
): ChurchTuringDemonstrationResult {
  const execution = executeTM(graph, inputString, options);

  const lastStep = execution.steps[execution.steps.length - 1];
  const isHalted = lastStep ? lastStep.isHalted : true;
  const isAccepted = execution.isAccepted;
  const stepCount = execution.steps.length;
  const haltingStateLabel = lastStep ? lastStep.currentStateLabel : undefined;

  let statusLabel: string;
  if (isAccepted) {
    statusLabel = 'HALTED_ACCEPT (Domain of Computable Function)';
  } else if (execution.isInconclusive || execution.rejectionReason === 'INCONCLUSIVE_LIMIT') {
    statusLabel = 'INCONCLUSIVE_LIMIT (Potential Non-Termination / Divergence ⊥)';
  } else {
    statusLabel = `HALTED_REJECT (${execution.rejectionReason ?? 'NON_ACCEPTING'})`;
  }

  // Formal partial function notation: f: Σ* ⇀ Γ*
  const partialFunctionNotation = isAccepted
    ? `f("${inputString}") = Defined (${stepCount} steps) ∈ Dom(f)`
    : execution.isInconclusive
    ? `f("${inputString}") = Undefined / Diverges (⊥) ∉ Dom(f)`
    : `f("${inputString}") = Rejected / Halted outside F (${stepCount} steps)`;

  const touchedTapeCellsCount = execution.finalTapeContents
    ? Object.keys(execution.finalTapeContents).length
    : 0;

  const equivalentModelsSummary = [
    {
      modelName: 'Turing Machine (Project Zero)',
      equivalenceStatus: 'EXECUTED_DIRECTLY' as const,
      theoreticalCorrespondence: `Executed directly in ${stepCount} step(s) with ${touchedTapeCellsCount} touched tape cells.`,
    },
    {
      modelName: 'Lambda Calculus (λ-Calculus)',
      equivalenceStatus: 'CONCEPTUAL_EQUIVALENT' as const,
      theoreticalCorrespondence: `Representable as a Church numeral/string term with a confluent β-reduction sequence terminating in normal form iff the TM halts.`,
    },
    {
      modelName: 'General Recursive Functions (μ-Recursion)',
      equivalenceStatus: 'CONCEPTUAL_EQUIVALENT' as const,
      theoreticalCorrespondence: `Representable as a partial recursive function over Gödel numbers ℕ with unbounded minimization μy[T(e, x, y) = 0].`,
    },
    {
      modelName: 'Register Machine (RAM/URM)',
      equivalenceStatus: 'CONCEPTUAL_EQUIVALENT' as const,
      theoreticalCorrespondence: `Representable as an imperative assembly program with finite registers computing the identical input-output mapping.`,
    },
  ];

  const educationalThesisInsight =
    'By the Church-Turing Thesis, any procedure effectively computable in one of these formalisms can be computed by every other formalism. Project Zero executes the Turing Machine model directly; the equivalent models define the exact same computability boundary.';

  return {
    selectedModelId: 'turing-machine',
    inputString,
    executionResult: execution,
    isHalted,
    isAccepted,
    statusLabel,
    stepCount,
    haltingStateLabel,
    partialFunctionNotation,
    equivalentModelsSummary,
    educationalThesisInsight,
  };
}
