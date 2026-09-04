import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
export type { StateNode, TransitionEdge };
import { AutomatonType } from '@project-zero/shared';

export type DFAErrorCode =
  | 'MISSING_INITIAL_STATE'
  | 'MULTIPLE_INITIAL_STATES'
  | 'MISSING_ACCEPTING_STATE'
  | 'EPSILON_TRANSITION'
  | 'DUPLICATE_SYMBOL_TRANSITION'
  | 'EMPTY_TRANSITION_SYMBOL';

export type NFAErrorCode =
  | 'MISSING_INITIAL_STATE'
  | 'MULTIPLE_INITIAL_STATES'
  | 'MISSING_ACCEPTING_STATE'
  | 'EMPTY_TRANSITION_SYMBOL'
  | 'DANGLING_TRANSITION_ENDPOINT';

export type PDAErrorCode =
  | 'MISSING_INITIAL_STATE'
  | 'MULTIPLE_INITIAL_STATES'
  | 'MISSING_INITIAL_STACK_SYMBOL'
  | 'EMPTY_TRANSITION_SYMBOL'
  | 'DANGLING_TRANSITION_ENDPOINT'
  | 'MALFORMED_PDA_TRANSITION';

export type TMErrorCode =
  | 'MISSING_INITIAL_STATE'
  | 'MULTIPLE_INITIAL_STATES'
  | 'EMPTY_TRANSITION_SYMBOL'
  | 'INVALID_MOVE_DIRECTION'
  | 'MISSING_WRITE_SYMBOL'
  | 'DANGLING_TRANSITION_ENDPOINT'
  | 'DUPLICATE_TM_TRANSITION'
  | 'INVALID_BLANK_SYMBOL';

export type TMMoveDirection = 'L' | 'R' | 'S';

export interface DFAValidationError {
  readonly code: DFAErrorCode | NFAErrorCode | PDAErrorCode | TMErrorCode;
  readonly message: string;
  readonly affectedStateIds?: ReadonlyArray<string>;
  readonly affectedTransitionIds?: ReadonlyArray<string>;
}

export interface DFAValidationResult {
  readonly isValid: boolean;
  readonly machineType: AutomatonType;
  readonly errors: ReadonlyArray<DFAValidationError>;
  readonly warnings: ReadonlyArray<string>;
}

export type DFARejectionReason =
  | 'NO_TRANSITION'
  | 'NON_ACCEPTING_FINAL_STATE'
  | 'NO_ACCEPTING_STATE'
  | 'INVALID_MACHINE';

export interface DFAExecutionStep {
  readonly stepIndex: number;
  readonly currentStateId: string;
  readonly currentStateLabel: string;
  readonly readSymbol: string | null;
  readonly remainingInput: string;
  readonly transitionId?: string;
  readonly nextStateId?: string;
  readonly nextStateLabel?: string;
  readonly isHalted: boolean;
  readonly isAccepting: boolean;
}

export interface DFAExecutionResult {
  readonly isAccepted: boolean;
  readonly finalStateId: string | null;
  readonly finalStateLabel: string | null;
  readonly rejectionReason?: DFARejectionReason;
  readonly steps: ReadonlyArray<DFAExecutionStep>;
  readonly inputString: string;
  readonly validationResult: DFAValidationResult;
}

export interface NFAExecutionStep {
  readonly stepIndex: number;
  readonly currentStates: ReadonlyArray<{ id: string; label: string }>;
  readonly epsilonClosure: ReadonlyArray<{ id: string; label: string }>;
  readonly readSymbol: string | null;
  readonly remainingInput: string;
  readonly nextStates: ReadonlyArray<{ id: string; label: string }>;
  readonly isHalted: boolean;
  readonly isAccepting: boolean;
}

export interface NFAExecutionResult {
  readonly isAccepted: boolean;
  readonly finalStates: ReadonlyArray<{ id: string; label: string }>;
  readonly acceptingStates: ReadonlyArray<{ id: string; label: string }>;
  readonly rejectionReason?: DFARejectionReason;
  readonly steps: ReadonlyArray<NFAExecutionStep>;
  readonly inputString: string;
  readonly validationResult: DFAValidationResult;
}

export type PDAAcceptanceMode = 'FINAL_STATE' | 'EMPTY_STACK' | 'BOTH';

export type PDAStackOperation = 'PUSH' | 'POP' | 'REPLACE' | 'NOOP';

export interface PDAExecutionStep {
  readonly stepIndex: number;
  readonly currentStateId: string;
  readonly currentStateLabel: string;
  readonly activeStates: ReadonlyArray<{ id: string; label: string }>;
  readonly readSymbol: string | null;
  readonly remainingInput: string;
  readonly stackBefore: ReadonlyArray<string>;
  readonly stackAfter: ReadonlyArray<string>;
  readonly instantaneousDescription: string;
  readonly stackOperation?: PDAStackOperation;
  readonly stackTopRead?: string | null;
  readonly stackReplacement?: string;
  readonly transitionId?: string;
  readonly nextStateId?: string;
  readonly nextStateLabel?: string;
  readonly isHalted: boolean;
  readonly isAccepting: boolean;
}

export type PDARejectionReason =
  | 'NO_TRANSITION'
  | 'NON_ACCEPTING_FINAL_STATE'
  | 'STACK_NOT_EMPTY'
  | 'UNCONSUMED_INPUT'
  | 'INVALID_MACHINE'
  | 'INCONCLUSIVE_LIMIT';

export interface PDABranchNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly stateId: string;
  readonly stateLabel: string;
  readonly inputIndex: number;
  readonly stack: ReadonlyArray<string>;
  readonly transitionId?: string;
  readonly readSymbol: string | null;
  readonly depth: number;
  readonly status: 'ACTIVE' | 'EXPLORED' | 'ACCEPTING' | 'REJECTING' | 'PRUNED';
  readonly historySteps: ReadonlyArray<PDAExecutionStep>;
  readonly children: ReadonlyArray<PDABranchNode>;
}

export interface PDABranchTree {
  readonly root: PDABranchNode;
  readonly totalNodes: number;
  readonly maxDepth: number;
}

export type PDADeterminismConflictType =
  | 'DIRECT_CONFLICT'
  | 'EPSILON_INPUT_CONFLICT'
  | 'STACK_CONDITION_CONFLICT';

export interface PDADeterminismConflict {
  readonly stateId: string;
  readonly stateLabel: string;
  readonly conflictType: PDADeterminismConflictType;
  readonly transitionIds: ReadonlyArray<string>;
  readonly inputSymbol: string;
  readonly stackSymbol: string;
  readonly transitionLabels: ReadonlyArray<string>;
  readonly reason: string;
  readonly mathematicalExplanation: string;
}

export interface PDADeterminismAnalysis {
  readonly isDeterministic: boolean;
  readonly machineClassification: 'DPDA' | 'NPDA';
  readonly conflicts: ReadonlyArray<PDADeterminismConflict>;
  readonly deterministicTransitionsCount: number;
  readonly nondeterministicStates: ReadonlyArray<string>;
  readonly explanation: string;
}

export interface PDAExecutionResult {
  readonly isAccepted: boolean;
  readonly isInconclusive?: boolean;
  readonly acceptanceMode?: PDAAcceptanceMode;
  readonly finalStates: ReadonlyArray<{ id: string; label: string }>;
  readonly acceptingStates: ReadonlyArray<{ id: string; label: string }>;
  readonly rejectionReason?: PDARejectionReason;
  readonly steps: ReadonlyArray<PDAExecutionStep>;
  readonly inputString: string;
  readonly validationResult: DFAValidationResult;
  readonly initialStackSymbol: string;
  readonly inputAlphabet?: ReadonlyArray<string>;
  readonly stackAlphabet?: ReadonlyArray<string>;
  readonly determinismAnalysis?: PDADeterminismAnalysis;
  readonly isExecutionLinear?: boolean;
  readonly branchingPointsCount?: number;
  readonly branchTree?: PDABranchTree;
}

export interface TMExecutionStep {
  readonly stepIndex: number;
  readonly currentStateId: string;
  readonly currentStateLabel: string;
  readonly tapeHeadIndex: number;
  readonly tapeContents: Record<number, string>;
  readonly tapeString: string;
  readonly readSymbol: string;
  readonly writeSymbol: string;
  readonly moveDirection: TMMoveDirection;
  readonly transitionId?: string;
  readonly nextStateId?: string;
  readonly nextStateLabel?: string;
  readonly isHalted: boolean;
  readonly isAccepting: boolean;
}

export interface TMInstantaneousConfiguration {
  readonly stepIndex: number;
  readonly stateId: string;
  readonly stateLabel: string;
  readonly headPosition: number;
  readonly readSymbol: string;
  readonly writeSymbol?: string;
  readonly moveDirection?: TMMoveDirection;
  readonly nextStateId?: string;
  readonly nextStateLabel?: string;
  readonly transitionId?: string;
  readonly tapeContents: Record<number, string>;
  readonly tapeString: string;
  readonly isHalted: boolean;
  readonly isAccepting: boolean;
}

export type TMRejectionReason =
  | 'NO_TRANSITION'
  | 'NON_ACCEPTING_FINAL_STATE'
  | 'INVALID_MACHINE'
  | 'INCONCLUSIVE_LIMIT';

export interface TMExecutionOptions {
  readonly blankSymbol?: string;
  readonly maxSteps?: number;
}

export interface TMExecutionResult {
  readonly isAccepted: boolean;
  readonly isInconclusive?: boolean;
  readonly finalStateId: string | null;
  readonly finalStateLabel: string | null;
  readonly rejectionReason?: TMRejectionReason;
  readonly steps: ReadonlyArray<TMExecutionStep>;
  readonly inputString: string;
  readonly validationResult: DFAValidationResult;
  readonly blankSymbol: string;
  readonly finalTapeContents: Record<number, string>;
  readonly finalTapeHeadIndex: number;
}

export type TMMode = 'ACCEPTOR' | 'TRANSDUCER';

export type TMTransducerStatus =
  | 'COMPUTED'
  | 'HALTED_REJECT'
  | 'MISSING_TRANSITION'
  | 'INCONCLUSIVE_LIMIT'
  | 'INVALID_MACHINE';

export type TMOutputConvention =
  | 'NON_BLANK_SPAN' // Full span between min and max non-blank cells [i_min, i_max]
  | 'HEAD_RIGHT';    // From final head position to rightmost non-blank cell

export interface TMTransducerOutputRegion {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly length: number;
  readonly convention: TMOutputConvention;
}

export interface TMTransducerResult {
  readonly status: TMTransducerStatus;
  readonly inputString: string;
  readonly outputString: string | null; // null if not COMPUTED
  readonly outputRegion: TMTransducerOutputRegion | null;
  readonly executionResult: TMExecutionResult;
  readonly finalStateId: string | null;
  readonly finalStateLabel: string | null;
  readonly finalTapeHeadIndex: number;
  readonly finalTapeContents: Record<number, string>;
  readonly stepCount: number;
  readonly explanation: string;
}

export interface TMTransducerOptions {
  readonly blankSymbol?: string;
  readonly maxSteps?: number;
  readonly outputConvention?: TMOutputConvention;
}

// ============================================================================
// MODULE 5 TOPIC 2: UNIVERSAL TURING MACHINE AND ENCODING TYPES
// ============================================================================

export type TMEncodingFormat = 'BINARY_CANONICAL' | 'SYMBOLIC_TUPLE';

export interface TMEncodingOptions {
  readonly blankSymbol?: string;
  readonly inputAlphabet?: ReadonlyArray<string>; // Explicit Σ override
}

export interface TMCanonicalizationMap {
  readonly stateToCanonicalIndex: Record<string, number>; // stateId -> 1-based index (q1, q2...)
  readonly canonicalIndexToStateLabel: Record<number, string>;
  readonly symbolToCanonicalIndex: Record<string, number>; // symbol -> 1-based index (X1, X2...)
  readonly canonicalIndexToSymbol: Record<number, string>;
  readonly directionToCanonicalIndex: Record<TMMoveDirection, number>; // L->1, R->2, S->3
  readonly canonicalIndexToDirection: Record<number, TMMoveDirection>;
  readonly statesCount: number;
  readonly symbolsCount: number;
  readonly inputSymbolsCount: number; // |Σ|: number of input symbols (indices 1 ... |Σ|)
  readonly inputAlphabet: ReadonlyArray<string>; // Σ
  readonly tapeAlphabet: ReadonlyArray<string>; // Γ
  readonly initialCanonicalIndex: number;
  readonly acceptingCanonicalIndices: ReadonlyArray<number>;
  readonly blankCanonicalIndex: number;
}

export interface TMEncodedTransition {
  readonly sourceStateIndex: number;
  readonly readSymbolIndex: number;
  readonly targetStateIndex: number;
  readonly writeSymbolIndex: number;
  readonly moveDirectionIndex: number;
  readonly binaryCode: string; // e.g. "0^q 1 0^a 1 0^p 1 0^b 1 0^d"
  readonly symbolicCode: string; // e.g. "δ(q1, X1) -> (q2, X2, R)"
}

export interface TMEncodedRepresentation {
  readonly format: TMEncodingFormat;
  readonly canonicalMap: TMCanonicalizationMap;
  readonly transitions: ReadonlyArray<TMEncodedTransition>;
  readonly binaryEncoding: string; // Standard canonical binary code
  readonly symbolicEncoding: string; // Human-readable canonical tuple format
  readonly statesCount: number;
  readonly symbolsCount: number;
  readonly inputSymbolsCount: number;
  readonly inputAlphabet: ReadonlyArray<string>;
  readonly tapeAlphabet: ReadonlyArray<string>;
  readonly transitionsCount: number;
  readonly blankSymbol: string;
}

export interface UTMPairEncoding {
  readonly encodedMachine: string;
  readonly encodedInput: string;
  readonly fullPairString: string; // "<M, w>" formatted string
  readonly format: TMEncodingFormat;
  readonly blankSymbol: string;
}

export interface TMDecodeResult {
  readonly isValid: boolean;
  readonly graph?: SolverGraphInput;
  readonly inputAlphabet?: ReadonlyArray<string>; // Σ
  readonly tapeAlphabet?: ReadonlyArray<string>; // Γ
  readonly blankSymbol?: string;
  readonly error?: string;
  readonly warnings?: ReadonlyArray<string>;
  readonly canonicalMap?: TMCanonicalizationMap;
}

export interface UTMPairDecodeResult {
  readonly isValid: boolean;
  readonly graph?: SolverGraphInput;
  readonly inputAlphabet?: ReadonlyArray<string>; // Σ
  readonly tapeAlphabet?: ReadonlyArray<string>; // Γ
  readonly inputString?: string;
  readonly blankSymbol?: string;
  readonly error?: string;
}

export interface UTMSimulationStep {
  readonly stepIndex: number;
  readonly simulatedStateLabel: string;
  readonly simulatedStateIndex: number;
  readonly simulatedTapeContents: Record<number, string>;
  readonly simulatedTapeHeadIndex: number;
  readonly simulatedReadSymbol: string;
  readonly simulatedWriteSymbol: string;
  readonly simulatedMoveDirection: TMMoveDirection;
  readonly matchedTransitionCode?: string;
  readonly isHalted: boolean;
  readonly isAccepting: boolean;
  readonly isMissingTransition: boolean;
}

export interface UTMExecutionResult {
  readonly isAccepted: boolean;
  readonly status: TMTransducerStatus;
  readonly steps: ReadonlyArray<UTMSimulationStep>;
  readonly inputString: string;
  readonly blankSymbol: string;
  readonly finalTapeContents: Record<number, string>;
  readonly finalTapeHeadIndex: number;
  readonly decodedMachine: SolverGraphInput;
  readonly directExecutionResult: TMExecutionResult;
  readonly isEquivalentToDirect: boolean;
  readonly explanation: string;
}

export interface UTMEquivalenceComparison {
  readonly isEquivalent: boolean;
  readonly stepCountMatch: boolean;
  readonly acceptanceMatch: boolean;
  readonly haltingStateMatch: boolean;
  readonly tapeContentsMatch: boolean;
  readonly headPositionMatch: boolean;
  readonly mismatches: ReadonlyArray<string>;
  readonly directStepCount: number;
  readonly universalStepCount: number;
}

// ============================================================
// MODULE 5 — TOPIC 3: CHURCH-TURING THESIS TYPES
// ============================================================

export type ComputationalModelCategory =
  | 'MACHINE_BASED'
  | 'FUNCTION_CALCULUS'
  | 'AXIOMATIC_RECURSION'
  | 'STRING_REWRITING'
  | 'REGISTER_ARCHITECTURE';

export interface ComputationalFormalModel {
  readonly id: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly founder: string;
  readonly yearIntroduced: number;
  readonly category: ComputationalModelCategory;
  readonly corePrimitive: string;
  readonly executionSemantics: string;
  readonly computabilityPower: string;
  readonly isExecutableInPlatform: boolean;
  readonly platformExecutionNote: string;
  readonly formalEquivalenceCitation: string;
}

export type EffectiveProcedureClassification =
  | 'FINITE_ALGORITHMIC'
  | 'NON_EFFECTIVE_ORACLE'
  | 'UNDERSPECIFIED';

export interface EffectiveProcedureExample {
  readonly id: string;
  readonly title: string;
  readonly procedureDescription: string;
  readonly expectedClassification: EffectiveProcedureClassification;
  readonly academicExplanation: string;
  readonly requiresHumanIntuitionOrOracle: boolean;
  readonly isMechanicallyExecutable: boolean;
  readonly pedagogicalTakeaway: string;
}

export interface ChurchTuringDistinctionItem {
  readonly topic: string;
  readonly thesisDoesSay: string;
  readonly thesisDoesNotSay: string;
  readonly misconceptionWarning: string;
}

export interface ChurchTuringDemonstrationResult {
  readonly selectedModelId: string;
  readonly inputString: string;
  readonly executionResult: TMExecutionResult;
  readonly isHalted: boolean;
  readonly isAccepted: boolean;
  readonly statusLabel: string;
  readonly stepCount: number;
  readonly haltingStateLabel?: string;
  readonly partialFunctionNotation: string;
  readonly equivalentModelsSummary: ReadonlyArray<{
    readonly modelName: string;
    readonly equivalenceStatus: 'EXECUTED_DIRECTLY' | 'CONCEPTUAL_EQUIVALENT';
    readonly theoreticalCorrespondence: string;
  }>;
  readonly educationalThesisInsight: string;
}

// ============================================================
// MODULE 5 — TOPIC 4: RECURSIVE & RECURSIVELY ENUMERABLE LANGUAGES TYPES
// ============================================================

export type LanguageClassCategory =
  | 'REGULAR'
  | 'CONTEXT_FREE'
  | 'RECURSIVE'
  | 'RECURSIVELY_ENUMERABLE'
  | 'NON_RECURSIVE_RE'
  | 'NON_RE';

export type MachineHaltingType = 'DECIDER' | 'RECOGNIZER';

export interface RELanguageTestCase {
  readonly input: string;
  readonly isMember: boolean;
  readonly expectedHalt: boolean;
  readonly expectedAccept: boolean;
  readonly notes: string;
}

export interface RELanguageExample {
  readonly id: string;
  readonly name: string;
  readonly formalDefinition: string;
  readonly alphabet: ReadonlyArray<string>;
  readonly classCategory: LanguageClassCategory;
  readonly haltingType: MachineHaltingType;
  readonly graph: SolverGraphInput;
  readonly blankSymbol: string;
  readonly testCases: ReadonlyArray<RELanguageTestCase>;
  readonly academicContext: string;
  readonly deciderBehaviorSummary: string;
  readonly recognizerBehaviorSummary: string;
  readonly isExecutableInPlatform: boolean;
}

export interface REExecutionDemonstrationResult {
  readonly languageId: string;
  readonly languageName: string;
  readonly inputString: string;
  readonly haltingType: MachineHaltingType;
  readonly executionResult: TMExecutionResult;
  readonly isAccepted: boolean;
  readonly isHalted: boolean;
  readonly isBoundedLimitReached: boolean;
  readonly membershipStatus: 'MEMBER' | 'NON_MEMBER' | 'INCONCLUSIVE_BOUND_REACHED';
  readonly statusDisplayLabel: string;
  readonly academicExplanation: string;
  readonly boundedSafetyNote: string;
  readonly complementBehaviorNote: string;
}

export interface EnumeratorSimulationResult {
  readonly alphabet: ReadonlyArray<string>;
  readonly testedCandidateCount: number;
  readonly emittedWords: ReadonlyArray<string>;
  readonly maxWordsLimitReached: boolean;
  readonly isFinitePrefix: true;
  readonly academicDisclaimer: string;
}

export interface ComplementTheoremSpec {
  readonly theoremName: string;
  readonly formalStatement: string;
  readonly constructionProcedure: string;
  readonly mathematicalImplication: string;
}

// ============================================================
// MODULE 5 — TOPIC 5: REDUCIBILITY TYPES
// ============================================================

export type ReductionType = 'MAPPING' | 'TURING_ORACLE_CONCEPTUAL';

export interface MappingReductionTestCase {
  readonly sourceInput: string;
  readonly expectedTargetInput: string;
  readonly isSourceMember: boolean;
  readonly isTargetMember: boolean;
  readonly notes: string;
}

export interface MappingReductionExample {
  readonly id: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly reductionType: ReductionType;
  readonly sourceLanguageName: string;
  readonly sourceAlphabet: ReadonlyArray<string>;
  readonly sourceFormalDef: string;
  readonly targetLanguageName: string;
  readonly targetAlphabet: ReadonlyArray<string>;
  readonly targetFormalDef: string;
  readonly transformationFormula: string;
  readonly totalComputableProofNote: string;
  readonly sourceGraph: SolverGraphInput;
  readonly targetGraph: SolverGraphInput;
  readonly transformFn: (x: string) => string;
  readonly testCases: ReadonlyArray<MappingReductionTestCase>;
  readonly educationalSignificance: string;
}

export interface ReductionExecutionCertificate {
  readonly reductionId: string;
  readonly reductionName: string;
  readonly sourceInput: string;
  readonly transformedTargetInput: string;
  readonly sourceExecution: TMExecutionResult;
  readonly targetExecution: TMExecutionResult;
  readonly isSourceAccepted: boolean;
  readonly isTargetAccepted: boolean;
  readonly isEquivalencePreserved: boolean;
  readonly totalityClaim: string;
  readonly computabilityClaim: string;
  readonly solvabilityTransferSummary: string;
  readonly boundedExecutionNote: string;
  readonly verificationTimestamp: string;
}

export interface ComposedReductionResult {
  readonly languageAName: string;
  readonly languageBName: string;
  readonly languageCName: string;
  readonly sourceInputX: string;
  readonly intermediateInputY: string;
  readonly finalTargetInputZ: string;
  readonly isMemberA: boolean;
  readonly isMemberB: boolean;
  readonly isMemberC: boolean;
  readonly isChainEquivalencePreserved: boolean;
  readonly compositionFormula: string;
}

export interface ReducibilityDistinctionItem {
  readonly topic: string;
  readonly reducibilityMeans: string;
  readonly doesNotMean: string;
  readonly pedagogicalWarning: string;
}

// ============================================================
// MODULE 5 — TOPIC 6: HALTING PROBLEM & UNDECIDABILITY TYPES
// ============================================================

export type HaltingSimulationOutcome =
  | 'HALTED_ACCEPT'
  | 'HALTED_REJECT'
  | 'STEP_LIMIT_REACHED'
  | 'INVALID_MACHINE';

export interface HaltingObservationResult {
  readonly machineName: string;
  readonly inputWord: string;
  readonly outcome: HaltingSimulationOutcome;
  readonly isHalted: boolean;
  readonly isAccepted: boolean;
  readonly stepsExecuted: number;
  readonly finalStateLabel?: string;
  readonly haltsMembershipClassification: 'YES_HALTS' | 'INCONCLUSIVE_TIMEOUT';
  readonly academicExplanation: string;
  readonly epistemologicalSafetyNote: string;
}

export type DiagonalProofStepId =
  | 'ASSUME_DECIDER'
  | 'CONSTRUCT_DIAGONAL_D'
  | 'SELF_APPLICATION'
  | 'CASE_HALTS'
  | 'CASE_LOOPS'
  | 'CONTRADICTION_CONCLUSION';

export interface DiagonalProofStep {
  readonly stepId: DiagonalProofStepId;
  readonly stepNumber: number;
  readonly title: string;
  readonly mathematicalStatement: string;
  readonly premise: string;
  readonly logicalDeduction: string;
  readonly contradictionFlag: boolean;
}

export interface HypotheticalDeciderEvaluation {
  readonly assumedDecision: 'HALTS' | 'DOES_NOT_HALT';
  readonly diagonalBehavior: 'LOOPS_FOREVER' | 'HALTS_AND_ACCEPTS';
  readonly resultingContradiction: string;
  readonly isContradictionProved: true;
}

export interface HaltingDistinctionItem {
  readonly topic: string;
  readonly correctConcept: string;
  readonly misconception: string;
  readonly safetyWarning: string;
}

export interface HaltingProblemPreset {
  readonly id: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly expectedHaltingBehavior: 'HALTS' | 'LOOPS_FOREVER';
  readonly isHaltingYESInstance: boolean;
  readonly graph: SolverGraphInput;
  readonly sampleInputs: ReadonlyArray<{
    readonly input: string;
    readonly expectedOutcome: HaltingSimulationOutcome;
    readonly isHalted: boolean;
    readonly isAccepted: boolean;
    readonly notes: string;
  }>;
}

// ============================================================
// MODULE 5 — TOPIC 7: POST CORRESPONDENCE PROBLEM (PCP) TYPES
// ============================================================

export interface PCPDomino {
  readonly id: number;
  readonly top: string;
  readonly bottom: string;
}

export interface PCPInstance {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly alphabet: ReadonlyArray<string>;
  readonly dominoes: ReadonlyArray<PCPDomino>;
  readonly knownSolution?: ReadonlyArray<number>;
  readonly isMathematicallySolvable?: boolean;
}

export type PCPSearchStatus =
  | 'SOLUTION_FOUND'
  | 'BOUND_EXHAUSTED_NO_SOLUTION'
  | 'INVALID_INSTANCE';

export interface PCPSolutionWitness {
  readonly sequence: ReadonlyArray<number>;
  readonly topConcatenation: string;
  readonly bottomConcatenation: string;
  readonly length: number;
  readonly isExactMatch: boolean;
}

export interface PCPSearchResult {
  readonly status: PCPSearchStatus;
  readonly witness?: PCPSolutionWitness;
  readonly nodesExplored: number;
  readonly maxDepthReached: number;
  readonly executionTimeMs: number;
  readonly explanation: string;
  readonly epistemologicalNote: string;
}

export interface PCPSearchOptions {
  readonly maxDepth?: number;
  readonly maxNodes?: number;
  readonly maxStringLength?: number;
}

export interface PCPPrefixComparison {
  readonly status: 'MATCH' | 'TOP_IS_PREFIX' | 'BOTTOM_IS_PREFIX' | 'MISMATCH';
  readonly topString: string;
  readonly bottomString: string;
  readonly commonPrefix: string;
  readonly residualSuffix: string;
  readonly canBeExtended: boolean;
}

export interface PCPDistinctionItem {
  readonly topic: string;
  readonly correctConcept: string;
  readonly misconception: string;
  readonly safetyWarning: string;
}

// ============================================================
// MODULE 5 — TOPIC 8: TOOLS (JFLAP, REGEX, LEX, YACC) TYPES
// ============================================================

export type ComputationalToolId = 'jflap' | 'regex' | 'lex' | 'yacc';

export interface ToolDefinition {
  readonly id: ComputationalToolId;
  readonly name: string;
  readonly category: 'ENVIRONMENT' | 'SPECIFICATION' | 'LEXER_GENERATOR' | 'PARSER_GENERATOR';
  readonly formalConcept: string;
  readonly inputFormat: string;
  readonly outputArtifact: string;
  readonly primaryFunction: string;
  readonly projectZeroAnalogue: string;
  readonly academicLimitations: string;
}

export interface ToolComparisonMatrixEntry {
  readonly toolName: string;
  readonly inputModel: string;
  readonly internalEngine: string;
  readonly outputArtifact: string;
  readonly theoreticalClass: string;
}

export interface JFLAPWorkflowPreset {
  readonly id: string;
  readonly name: string;
  readonly targetModel: 'FA' | 'PDA' | 'TM' | 'CFG';
  readonly description: string;
  readonly learningObjective: string;
}

export interface RegexToolEvaluation {
  readonly regexString: string;
  readonly isValid: boolean;
  readonly error?: string;
  readonly astSummary?: string;
  readonly nfaStateCount?: number;
  readonly testResults: ReadonlyArray<{
    readonly input: string;
    readonly isAccepted: boolean;
  }>;
}

export interface YaccWorkflowEvaluation {
  readonly grammarText: string;
  readonly isValid: boolean;
  readonly error?: string;
  readonly stateCount: number;
  readonly hasConflicts: boolean;
  readonly conflictCount: number;
  readonly sampleParse?: {
    readonly input: string;
    readonly success: boolean;
    readonly stepsExecuted: number;
  };
}

export interface ToolDistinctionItem {
  readonly topic: string;
  readonly correctConcept: string;
  readonly misconception: string;
  readonly safetyWarning: string;
}


export interface DFATransitionMatrixEntry {
  readonly stateId: string;
  readonly stateLabel: string;
  readonly isInitial: boolean;
  readonly isAccepting: boolean;
  readonly transitions: Record<string, string | null>; // symbol -> targetStateLabel or null
  readonly hasAmbiguity: Record<string, boolean>; // symbol -> true if NFA duplicate
}

export interface DFATransitionMatrix {
  readonly symbols: ReadonlyArray<string>;
  readonly entries: ReadonlyArray<DFATransitionMatrixEntry>;
  readonly hasAmbiguity: boolean;
}

export interface DFAMissingTransition {
  readonly stateId: string;
  readonly stateLabel: string;
  readonly symbol: string;
}

export interface DFACompletenessResult {
  readonly isComplete: boolean;
  readonly alphabet: ReadonlyArray<string>;
  readonly missingTransitions: ReadonlyArray<DFAMissingTransition>;
  readonly totalRequiredTransitions: number;
  readonly totalPresentTransitions: number;
}

export interface SolverGraphInput {
  readonly nodes: ReadonlyArray<StateNode>;
  readonly edges: ReadonlyArray<TransitionEdge>;
}

export interface NFAConversionSubsetMap {
  readonly dfaStateId: string;
  readonly dfaStateLabel: string;
  readonly nfaStateIds: ReadonlyArray<string>;
  readonly nfaStateLabels: ReadonlyArray<string>;
  readonly isInitial: boolean;
  readonly isAccepting: boolean;
}

export interface NFAConversionStep {
  readonly stepIndex: number;
  readonly currentDfaStateId: string;
  readonly currentDfaStateLabel: string;
  readonly currentNfaStateIds: ReadonlyArray<string>;
  readonly currentNfaStateLabels: ReadonlyArray<string>;
  readonly symbol: string;
  readonly movedNfaStateIds: ReadonlyArray<string>;
  readonly movedNfaStateLabels: ReadonlyArray<string>;
  readonly targetEpsilonClosureIds: ReadonlyArray<string>;
  readonly targetEpsilonClosureLabels: ReadonlyArray<string>;
  readonly targetDfaStateId: string;
  readonly targetDfaStateLabel: string;
  readonly isNewState: boolean;
  readonly isAccepting: boolean;
  readonly isTrap: boolean;
}

export interface NFAConversionTrace {
  readonly initialSubsetIds: ReadonlyArray<string>;
  readonly initialSubsetLabels: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<NFAConversionStep>;
  readonly conversionResult: NFAConversionResult;
}

export interface NFAConversionResult {
  readonly success: boolean;
  readonly nodes: ReadonlyArray<StateNode>;
  readonly edges: ReadonlyArray<TransitionEdge>;
  readonly subsets: ReadonlyArray<NFAConversionSubsetMap>;
  readonly alphabet: ReadonlyArray<string>;
  readonly validationResult: DFAValidationResult;
  readonly errorMessage?: string;
  readonly trace?: NFAConversionTrace;
}

export type RegexASTNode =
  | { type: 'LITERAL'; symbol: string }
  | { type: 'EPSILON' }
  | { type: 'CONCAT'; left: RegexASTNode; right: RegexASTNode }
  | { type: 'UNION'; left: RegexASTNode; right: RegexASTNode }
  | { type: 'STAR'; expression: RegexASTNode }
  | { type: 'PLUS'; expression: RegexASTNode }
  | { type: 'OPTIONAL'; expression: RegexASTNode };

export interface RegexParseResult {
  readonly success: boolean;
  readonly ast?: RegexASTNode;
  readonly errorPosition?: number;
  readonly errorMessage?: string;
}

export interface ThompsonStep {
  readonly stepIndex: number;
  readonly opType: 'LITERAL' | 'EPSILON' | 'CONCAT' | 'UNION' | 'STAR' | 'PLUS' | 'OPTIONAL';
  readonly label: string;
  readonly description: string;
  readonly createdStateIds: ReadonlyArray<string>;
  readonly createdTransitions: ReadonlyArray<{ id: string; sourceId: string; targetId: string; label: string }>;
  readonly fragment: { startId: string; acceptId: string };
}

export interface ProgramConstructPreset {
  readonly id: string;
  readonly name: string;
  readonly category: 'Identifiers' | 'Numbers' | 'Keywords' | 'Operators' | 'Delimiters' | 'Literals';
  readonly regex: string;
  readonly description: string;
  readonly grammarRule: string;
  readonly academicContext: string;
  readonly sampleValid: ReadonlyArray<string>;
  readonly sampleInvalid: ReadonlyArray<string>;
}

export interface BatchTestResult {
  readonly input: string;
  readonly isAccepted: boolean;
  readonly expected?: boolean;
  readonly status: 'PASS' | 'FAIL';
  readonly finalStateLabels: ReadonlyArray<string>;
  readonly stepsCount: number;
}

export interface LexicalRule {
  readonly id: string;
  readonly tokenType: string;
  readonly regex: string;
  readonly priority: number;
  readonly action: 'EMIT' | 'SKIP';
  readonly enabled: boolean;
  readonly description?: string;
}

export interface LexicalToken {
  readonly tokenType: string;
  readonly lexeme: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly line: number;
  readonly column: number;
  readonly ruleId: string;
}

export interface LexicalError {
  readonly message: string;
  readonly unexpectedChar: string;
  readonly offset: number;
  readonly line: number;
  readonly column: number;
  readonly sourceSnippet: string;
}

export interface LexicalAnalysisResult {
  readonly tokens: ReadonlyArray<LexicalToken>;
  readonly errors: ReadonlyArray<LexicalError>;
  readonly skippedCount: number;
  readonly success: boolean;
}

export interface LexicalRuleSetPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly sampleSource: string;
  readonly rules: ReadonlyArray<LexicalRule>;
}

export interface RegexToNFAResult {
  readonly success: boolean;
  readonly inputRegex?: string;
  readonly nodes: ReadonlyArray<StateNode>;
  readonly edges: ReadonlyArray<TransitionEdge>;
  readonly alphabet: ReadonlyArray<string>;
  readonly ast?: RegexASTNode;
  readonly trace?: ReadonlyArray<ThompsonStep>;
  readonly validationResult?: DFAValidationResult;
  readonly errorMessage?: string;
  readonly errorPosition?: number;
}

export interface StateEliminationTransitionUpdate {
  readonly fromState: string;
  readonly toState: string;
  readonly directRegex: string;
  readonly loopRegex?: string;
  readonly viaRegex?: string;
  readonly resultRegex: string;
}

export interface StateEliminationStep {
  readonly stepIndex: number;
  readonly eliminatedStateId: string;
  readonly eliminatedStateLabel: string;
  readonly description: string;
  readonly updatedTransitions: ReadonlyArray<StateEliminationTransitionUpdate>;
  readonly remainingStateIds: ReadonlyArray<string>;
}

export interface AutomatonToRegexResult {
  readonly success: boolean;
  readonly regex: string;
  readonly simplifiedRegex: string;
  readonly trace: ReadonlyArray<StateEliminationStep>;
  readonly stateCount: number;
  readonly transitionCount: number;
  readonly alphabet: ReadonlyArray<string>;
  readonly errorMessage?: string;
}

export interface AutomatonRegexEquivalenceResult {
  readonly isEquivalent: boolean;
  readonly counterexample?: string;
  readonly acceptsFA?: boolean;
  readonly acceptsRegex?: boolean;
  readonly faType: AutomatonType;
  readonly inputRegex: string;
  readonly faGeneratedRegex?: string;
  readonly faSimplifiedRegex?: string;
  readonly regexToNFA?: RegexToNFAResult;
  readonly stateEliminationTrace?: ReadonlyArray<StateEliminationStep>;
  readonly productTrace?: DFAEquivalenceTrace;
  readonly productStatesExplored?: number;
  readonly validationError?: string;
  readonly crossVerificationPassed?: boolean;
}

// -------------------------------------------------------------
// MODULE 2 TOPIC 5: REGULAR LANGUAGES DOMAIN TYPES
// -------------------------------------------------------------

export type RegularLanguageClosureOp =
  | 'UNION'
  | 'INTERSECTION'
  | 'COMPLEMENT'
  | 'DIFFERENCE'
  | 'CONCATENATION'
  | 'KLEENE_STAR';

export interface LanguageFinitenessResult {
  readonly isFinite: boolean;
  readonly reachableStates: ReadonlyArray<string>;
  readonly coAccessibleStates: ReadonlyArray<string>;
  readonly usefulStates: ReadonlyArray<string>;
  readonly cyclesDetected: ReadonlyArray<ReadonlyArray<string>>;
  readonly explanation: string;
  readonly maxStringLength?: number;
}

export interface LanguageMembershipResult {
  readonly input: string;
  readonly isMember: boolean;
  readonly executionTrace: ReadonlyArray<string>;
  readonly finalState?: string;
}

export interface RegularLanguageAnalysis {
  readonly alphabet: ReadonlyArray<string>;
  readonly finiteness: LanguageFinitenessResult;
  readonly acceptedExamples: ReadonlyArray<string>;
  readonly rejectedExamples: ReadonlyArray<string>;
  readonly synthesizedRegex: string;
  readonly isEmpty: boolean;
  readonly containsEpsilon: boolean;
}

export interface RegularLanguageOperationResult {
  readonly success: boolean;
  readonly operation: RegularLanguageClosureOp;
  readonly nodes: ReadonlyArray<StateNode>;
  readonly edges: ReadonlyArray<TransitionEdge>;
  readonly machineType: AutomatonType;
  readonly alphabet: ReadonlyArray<string>;
  readonly resultRegex: string;
  readonly finiteness: LanguageFinitenessResult;
  readonly acceptedExamples: ReadonlyArray<string>;
  readonly rejectedExamples: ReadonlyArray<string>;
  readonly errorMessage?: string;
}

// -------------------------------------------------------------
// MODULE 2 TOPIC 6: PUMPING LEMMA DOMAIN TYPES
// -------------------------------------------------------------

export interface PumpingDecomposition {
  readonly x: string;
  readonly y: string;
  readonly z: string;
  readonly splitIndices: {
    readonly xLen: number;
    readonly yLen: number;
    readonly zLen: number;
  };
  readonly isValid: boolean;
  readonly validationError?: string;
}

export interface PumpingEvaluation {
  readonly i: number;
  readonly pumpedString: string;
  readonly length: number;
  readonly isMember: boolean;
  readonly membershipReason?: string;
}

export interface DecompositionProofResult {
  readonly decomposition: PumpingDecomposition;
  readonly evaluations: ReadonlyArray<PumpingEvaluation>;
  readonly hasDisprovingI: boolean;
  readonly disprovingI?: number;
  readonly disprovingString?: string;
  readonly reasoning: string;
}

export type PumpingProofStatus =
  | 'CONTRADICTION_PROVEN_NON_REGULAR'
  | 'CONSISTENT_WITH_REGULAR'
  | 'FAILED_TO_DISPROVE'
  | 'INVALID_INPUT';

export interface PumpingProofQuantifierResult {
  readonly languageId: string;
  readonly languageName: string;
  readonly languageSpec: string;
  readonly isLanguageRegularKnown: boolean;
  readonly pumpingLength: number;
  readonly witness: string;
  readonly isWitnessValid: boolean;
  readonly witnessValidationError?: string;
  readonly totalValidDecompositions: number;
  readonly decompositions: ReadonlyArray<DecompositionProofResult>;
  readonly allDecompositionsDisproved: boolean;
  readonly proofStatus: PumpingProofStatus;
  readonly proofSteps: ReadonlyArray<string>;
  readonly conclusion: string;
  readonly decompositionClassSummary?: string;
}

export interface PumpingPresetDefinition {
  readonly id: string;
  readonly name: string;
  readonly latex: string;
  readonly description: string;
  readonly isRegular: boolean;
  readonly suggestedP: number;
  readonly suggestedWitness: (p: number) => string;
  readonly membershipCheck: (str: string) => { isMember: boolean; reason: string };
  readonly regex?: string;
  readonly structuralAnalysis: (p: number) => string;
}

export interface MachineAnalysisResult {
  readonly machineType: AutomatonType;
  readonly stateCount: number;
  readonly transitionCount: number;
  readonly alphabet: ReadonlyArray<string>;
  readonly initialStateId?: string;
  readonly initialStateLabel?: string;
  readonly acceptingStateIds: ReadonlyArray<string>;
  readonly acceptingStateLabels: ReadonlyArray<string>;
  readonly reachableStateIds: ReadonlyArray<string>;
  readonly unreachableStateIds: ReadonlyArray<string>;
  readonly coaccessibleStateIds: ReadonlyArray<string>;
  readonly trapStateIds: ReadonlyArray<string>;
  readonly missingDFATransitionCount: number;
  readonly hasNondeterministicBranching: boolean;
  readonly hasEpsilonTransitions: boolean;
  readonly hasEpsilonCycles: boolean;
  readonly isStructurallyValid: boolean;
  readonly isCompleteDFA: boolean;
  readonly isLanguageEmpty: boolean;
  readonly observations: ReadonlyArray<string>;
}

export interface StepDerivation {
  readonly stepIndex: number;
  readonly fromState: string;
  readonly symbol: string;
  readonly toState: string;
  readonly formalNotation: string;
}

export interface ExecutionExplanationResult {
  readonly inputString: string;
  readonly machineType: 'DFA' | 'NFA';
  readonly isAccepted: boolean;
  readonly rejectionReason?: string;
  readonly stepSummaries: ReadonlyArray<string>;
  readonly derivations: ReadonlyArray<StepDerivation>;
  readonly formalProofText: string;
  readonly intuitionSummary: string;
}

export interface DFAMinimizationEquivalenceClass {
  readonly minimizedStateId: string;
  readonly minimizedStateLabel: string;
  readonly originalStateIds: ReadonlyArray<string>;
  readonly originalStateLabels: ReadonlyArray<string>;
  readonly isInitial: boolean;
  readonly isAccepting: boolean;
}

export interface DFAMinimizationStep {
  readonly stepIndex: number;
  readonly iteration: number;
  readonly currentPartitions: ReadonlyArray<ReadonlyArray<string>>;
  readonly currentPartitionLabels: ReadonlyArray<ReadonlyArray<string>>;
  readonly splitOccurred: boolean;
  readonly description: string;
  readonly signatures?: Record<string, string>;
}

export interface DFAMinimizationTrace {
  readonly reachableStateIds: ReadonlyArray<string>;
  readonly unreachableStateIds: ReadonlyArray<string>;
  readonly initialPartitions: ReadonlyArray<ReadonlyArray<string>>;
  readonly steps: ReadonlyArray<DFAMinimizationStep>;
  readonly finalPartitions: ReadonlyArray<ReadonlyArray<string>>;
  readonly minimizationResult: DFAMinimizationResult;
}

export interface DFAMinimizationResult {
  readonly success: boolean;
  readonly nodes: ReadonlyArray<StateNode>;
  readonly edges: ReadonlyArray<TransitionEdge>;
  readonly equivalenceClasses: ReadonlyArray<DFAMinimizationEquivalenceClass>;
  readonly originalStateCount: number;
  readonly reachableStateCount: number;
  readonly unreachableStateCount: number;
  readonly minimizedStateCount: number;
  readonly mergedStateCount: number;
  readonly isAlreadyMinimal: boolean;
  readonly validationResult: DFAValidationResult;
  readonly errorMessage?: string;
  readonly trace?: DFAMinimizationTrace;
}

export interface ProductAutomatonStep {
  readonly stepIndex: number;
  readonly stateA: string;
  readonly labelA: string;
  readonly stateB: string;
  readonly labelB: string;
  readonly symbol: string;
  readonly nextStateA: string;
  readonly nextLabelA: string;
  readonly nextStateB: string;
  readonly nextLabelB: string;
  readonly isMismatch: boolean;
  readonly productPairLabel: string;
  readonly nextProductPairLabel: string;
}

export interface ProductDistinguishingConfig {
  readonly pairLabel: string;
  readonly stateA: string;
  readonly labelA: string;
  readonly isAcceptingA: boolean;
  readonly stateB: string;
  readonly labelB: string;
  readonly isAcceptingB: boolean;
  readonly differentiatingSymbol: string | null;
}

export interface DFAEquivalenceTrace {
  readonly initialPair: string;
  readonly productStatesExplored: number;
  readonly derivationSteps: ReadonlyArray<ProductAutomatonStep>;
  readonly distinguishingConfig?: ProductDistinguishingConfig;
}

export interface DFAEquivalenceResult {
  readonly isEquivalent: boolean;
  readonly counterexample?: string;
  readonly acceptsA?: boolean;
  readonly acceptsB?: boolean;
  readonly productStatesExplored: number;
  readonly trace?: DFAEquivalenceTrace;
  readonly errorMessage?: string;
}

export interface AutomataEquivalenceResult {
  readonly isEquivalent: boolean;
  readonly counterexample?: string;
  readonly acceptsA?: boolean;
  readonly acceptsB?: boolean;
  readonly machineTypeA: AutomatonType;
  readonly machineTypeB: AutomatonType;
  readonly wasNFAConvertedA: boolean;
  readonly wasNFAConvertedB: boolean;
  readonly productStatesExplored: number;
  readonly trace?: DFAEquivalenceTrace;
  readonly errorMessage?: string;
}

export type AutomataDiagnosticSeverity = 'error' | 'warning' | 'info';

export type AutomataDiagnosticCode =
  | 'DFA_NO_INITIAL_STATE'
  | 'DFA_MULTIPLE_INITIAL_STATES'
  | 'DFA_EMPTY_TRANSITION_SYMBOL'
  | 'DFA_EPSILON_TRANSITION'
  | 'DFA_NONDETERMINISTIC_TRANSITION'
  | 'DFA_MISSING_TRANSITION'
  | 'DFA_UNREACHABLE_STATE'
  | 'DFA_DEAD_STATE'
  | 'DFA_NO_STATES'
  | 'DFA_DANGLING_TRANSITION_ENDPOINT'
  | 'NFA_NO_INITIAL_STATE'
  | 'NFA_MULTIPLE_INITIAL_STATES'
  | 'NFA_EMPTY_TRANSITION_SYMBOL'
  | 'NFA_UNREACHABLE_STATE'
  | 'NFA_DEAD_STATE'
  | 'NFA_NO_STATES'
  | 'NFA_DANGLING_TRANSITION_ENDPOINT'
  | 'PDA_NO_INITIAL_STATE'
  | 'PDA_MULTIPLE_INITIAL_STATES'
  | 'PDA_EMPTY_TRANSITION_SYMBOL'
  | 'PDA_INVALID_STACK_OPERATION'
  | 'PDA_MALFORMED_TRANSITION'
  | 'PDA_MISSING_INITIAL_STACK_SYMBOL'
  | 'PDA_UNREACHABLE_STATE'
  | 'PDA_DEAD_STATE'
  | 'PDA_NO_STATES'
  | 'PDA_DANGLING_TRANSITION_ENDPOINT'
  | 'TM_NO_INITIAL_STATE'
  | 'TM_MULTIPLE_INITIAL_STATES'
  | 'TM_EMPTY_TRANSITION_SYMBOL'
  | 'TM_INVALID_MOVE_DIRECTION'
  | 'TM_MISSING_WRITE_SYMBOL'
  | 'TM_DUPLICATE_TRANSITION'
  | 'TM_INVALID_BLANK_SYMBOL'
  | 'TM_MALFORMED_TRANSITION'
  | 'TM_UNREACHABLE_STATE'
  | 'TM_DEAD_STATE'
  | 'TM_NO_STATES'
  | 'TM_DANGLING_TRANSITION_ENDPOINT';

export type LanguageSafetyCategory =
  | 'SAFE'
  | 'POTENTIALLY_LANGUAGE_CHANGING'
  | 'LANGUAGE_CHANGING'
  | 'UNKNOWN';

export type RepairActionType =
  | 'SET_INITIAL_STATE'
  | 'REMOVE_NODE'
  | 'REMOVE_EDGE'
  | 'ADD_TRANSITION'
  | 'UPDATE_EDGE'
  | 'CREATE_TRAP_STATE_AND_TRANSITION';

export interface AutomataRepairSuggestion {
  readonly id: string;
  readonly diagnosticId: string;
  readonly title: string;
  readonly description: string;
  readonly category: LanguageSafetyCategory;
  readonly actionType: RepairActionType;
  readonly targetEntityId?: string;
  readonly payload?: Record<string, unknown>;
}

export interface AutomataDiagnostic {
  readonly id: string;
  readonly severity: AutomataDiagnosticSeverity;
  readonly machineType: AutomatonType;
  readonly code: AutomataDiagnosticCode;
  readonly title: string;
  readonly message: string;
  readonly mathematicalExplanation: string;
  readonly affectedStateIds: ReadonlyArray<string>;
  readonly affectedTransitionIds: ReadonlyArray<string>;
  readonly repairs: ReadonlyArray<AutomataRepairSuggestion>;
  readonly isAutoRepairable: boolean;
  readonly changesLanguageSemantics: boolean;
}

export interface AutomataDiagnosticReport {
  readonly machineType: AutomatonType;
  readonly isValid: boolean;
  readonly diagnostics: ReadonlyArray<AutomataDiagnostic>;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}

export interface RepairDiffResult {
  readonly addedNodes: ReadonlyArray<StateNode>;
  readonly removedNodes: ReadonlyArray<StateNode>;
  readonly addedEdges: ReadonlyArray<TransitionEdge>;
  readonly removedEdges: ReadonlyArray<TransitionEdge>;
  readonly modifiedEdges: ReadonlyArray<TransitionEdge>;
}

export interface RepairPreviewResult {
  readonly repairId: string;
  readonly diagnosticId: string;
  readonly beforeNodes: ReadonlyArray<StateNode>;
  readonly beforeEdges: ReadonlyArray<TransitionEdge>;
  readonly afterNodes: ReadonlyArray<StateNode>;
  readonly afterEdges: ReadonlyArray<TransitionEdge>;
  readonly diff: RepairDiffResult;
  readonly isAfterValid: boolean;
  readonly languageSafetyCategory: LanguageSafetyCategory;
  readonly mathematicalSafetyExplanation: string;
}

export type LanguageOperationType =
  | 'UNION'
  | 'INTERSECTION'
  | 'DIFFERENCE'
  | 'SYMMETRIC_DIFFERENCE'
  | 'COMPLEMENT';

export interface ProductAutomatonStepResult {
  readonly stepIndex: number;
  readonly productPairLabel: string;
  readonly symbol: string;
  readonly nextProductPairLabel: string;
  readonly isAccepting: boolean;
}

export interface ProductAutomatonResult {
  readonly success: boolean;
  readonly operation: LanguageOperationType;
  readonly nodes: ReadonlyArray<StateNode>;
  readonly edges: ReadonlyArray<TransitionEdge>;
  readonly alphabet: ReadonlyArray<string>;
  readonly reachableStateCount: number;
  readonly acceptingStateCount: number;
  readonly steps?: ReadonlyArray<ProductAutomatonStepResult>;
  readonly errorMessage?: string;
}

export type TransformationStepType =
  | 'REGEX_TO_NFA'
  | 'NFA_TO_DFA'
  | 'DFA_MINIMIZE'
  | 'COMPLEMENT';

export interface TransformationPipelineStepResult {
  readonly stepIndex: number;
  readonly stepName: string;
  readonly inputMachineType: AutomatonType;
  readonly outputMachineType: AutomatonType;
  readonly nodeCount: number;
  readonly edgeCount: number;
}

export interface TransformationPipelineResult {
  readonly success: boolean;
  readonly nodes: ReadonlyArray<StateNode>;
  readonly edges: ReadonlyArray<TransitionEdge>;
  readonly finalMachineType: AutomatonType;
  readonly stepResults: ReadonlyArray<TransformationPipelineStepResult>;
  readonly errorMessage?: string;
}

export type FormalProofStepType =
  | 'INITIAL_CONFIGURATION'
  | 'STATE_DISCOVERY'
  | 'TRANSITION_EVALUATION'
  | 'ACCEPTANCE_EVALUATION'
  | 'PRODUCT_STATE_DISCOVERY'
  | 'DISTINGUISHING_CONFIGURATION'
  | 'TERMINATION'
  | 'RESULT';

export interface FormalProofStepEntityState {
  readonly id: string;
  readonly label: string;
  readonly isAccepting: boolean;
}

export interface FormalProofStep {
  readonly stepIndex: number;
  readonly type: FormalProofStepType;
  readonly title: string;
  readonly description: string;
  readonly mathematicalNotation: string;
  readonly stateA?: FormalProofStepEntityState;
  readonly stateB?: FormalProofStepEntityState;
  readonly symbol?: string;
  readonly isMismatch?: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface FormalProofDerivation {
  readonly title: string;
  readonly category: 'EQUIVALENCE' | 'COUNTEREXAMPLE' | 'TRANSFORMATION' | 'ANALYSIS';
  readonly isEquivalent?: boolean;
  readonly counterexample?: string;
  readonly acceptsA?: boolean;
  readonly acceptsB?: boolean;
  readonly steps: ReadonlyArray<FormalProofStep>;
  readonly conclusion: string;
  readonly mathematicalJustification: string;
}

export interface CounterexampleStep {
  readonly stepIndex: number;
  readonly consumedPrefix: string;
  readonly symbol: string | null;
  readonly stateA: FormalProofStepEntityState;
  readonly stateB: FormalProofStepEntityState;
  readonly isAcceptingA: boolean;
  readonly isAcceptingB: boolean;
  readonly isDistinguishing: boolean;
  readonly productPairLabel: string;
}

export type ChallengeCategory = 'DFA' | 'NFA' | 'PDA' | 'TM' | 'EQUIVALENCE' | 'REGEX';
export type ChallengeDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface ChallengeDefinition {
  readonly id: string;
  readonly title: string;
  readonly category: ChallengeCategory;
  readonly difficulty: ChallengeDifficulty;
  readonly prompt: string;
  readonly targetMachineType: AutomatonType;
  readonly expectedLanguageDescription: string;
  readonly referenceGraph?: SolverGraphInput;
  readonly referenceMachineType?: AutomatonType;
  readonly positiveExamples?: ReadonlyArray<string>;
  readonly negativeExamples?: ReadonlyArray<string>;
  readonly hints: ReadonlyArray<string>;
  readonly maxStatesConstraint?: number;
  readonly maxTransitionsConstraint?: number;
  readonly requireDeterministic?: boolean;
}

export type GradingStatus = 'PASS' | 'FAIL' | 'INVALID_MACHINE' | 'INCOMPLETE';

export interface GradingCheckResult {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface ExampleEvaluation {
  readonly input: string;
  readonly expected: boolean;
  readonly actual: boolean;
  readonly passed: boolean;
}

export interface GradingResult {
  readonly challengeId: string;
  readonly status: GradingStatus;
  readonly score: number;
  readonly passedChecks: ReadonlyArray<GradingCheckResult>;
  readonly failedChecks: ReadonlyArray<GradingCheckResult>;
  readonly positiveExamplesEvaluations: ReadonlyArray<ExampleEvaluation>;
  readonly negativeExamplesEvaluations: ReadonlyArray<ExampleEvaluation>;
  readonly isExactLanguageMatch?: boolean;
  readonly shortestCounterexample?: string;
  readonly expectedCounterexampleResult?: boolean;
  readonly actualCounterexampleResult?: boolean;
  readonly explanation: string;
  readonly mathematicalReason: string;
}

export type GrammarSymbolType = 'TERMINAL' | 'NON_TERMINAL' | 'EPSILON';

export interface GrammarSymbol {
  readonly type: GrammarSymbolType;
  readonly value: string;
}

export interface CFGProduction {
  readonly id: string;
  readonly lhs: string;
  readonly rhs: ReadonlyArray<GrammarSymbol>;
}

export interface ContextFreeGrammar {
  readonly variables: ReadonlyArray<string>;
  readonly terminals: ReadonlyArray<string>;
  readonly productions: ReadonlyArray<CFGProduction>;
  readonly startVariable: string;
}

export type CFGDiagnosticSeverity = 'error' | 'warning' | 'info';

export type CFGDiagnosticCode =
  | 'CFG_NO_VARIABLES'
  | 'CFG_NO_TERMINALS_WHEN_REQUIRED'
  | 'CFG_NO_START_VARIABLE'
  | 'CFG_INVALID_START_VARIABLE'
  | 'CFG_DUPLICATE_VARIABLE'
  | 'CFG_DUPLICATE_TERMINAL'
  | 'CFG_NAMESPACE_COLLISION'
  | 'CFG_UNDEFINED_VARIABLE'
  | 'CFG_INVALID_EPSILON_USAGE'
  | 'CFG_EMPTY_PRODUCTION'
  | 'CFG_INVALID_PRODUCTION'
  | 'CFG_UNREACHABLE_VARIABLE'
  | 'CFG_NON_GENERATING_VARIABLE';

export interface CFGDiagnostic {
  readonly code: CFGDiagnosticCode;
  readonly severity: CFGDiagnosticSeverity;
  readonly message: string;
  readonly mathematicalExplanation: string;
  readonly affectedVariable?: string;
  readonly affectedProductionId?: string;
}

export interface CFGValidationResult {
  readonly isValid: boolean;
  readonly diagnostics: ReadonlyArray<CFGDiagnostic>;
  readonly errors: ReadonlyArray<CFGDiagnostic>;
  readonly warnings: ReadonlyArray<CFGDiagnostic>;
}

export interface CFGAnalysisResult {
  readonly variables: ReadonlyArray<string>;
  readonly terminals: ReadonlyArray<string>;
  readonly reachableVariables: ReadonlyArray<string>;
  readonly generatingVariables: ReadonlyArray<string>;
  readonly nullableVariables: ReadonlyArray<string>;
  readonly uselessVariables: ReadonlyArray<string>;
  readonly isLanguageEmpty: boolean;
  readonly hasLeftRecursion: boolean;
  readonly productionCount: number;
}

export type DerivationType = 'LEFTMOST' | 'RIGHTMOST' | 'GENERAL';

export interface DerivationStep {
  readonly stepIndex: number;
  readonly sententialForm: ReadonlyArray<GrammarSymbol>;
  readonly productionId?: string;
  readonly productionNotation?: string;
  readonly expandedVariable?: string;
  readonly expandedPosition?: number;
  readonly derivationType: DerivationType;
  readonly mathematicalNotation: string;
}

export interface CFGDerivationResult {
  readonly success: boolean;
  readonly derivationType: DerivationType;
  readonly targetInput: string;
  readonly steps: ReadonlyArray<DerivationStep>;
  readonly exploredStateCount: number;
  readonly errorMessage?: string;
}

export interface CFGMembershipResult {
  readonly isAccepted: boolean;
  readonly targetInput: string;
  readonly derivation?: CFGDerivationResult;
  readonly exploredStates: number;
  readonly reason: string;
  readonly boundedByLimit: boolean;
  readonly hasInvalidAlphabetSymbols?: boolean;
  readonly invalidSymbols?: ReadonlyArray<string>;
}

export interface CFGBatchEvaluationEntry {
  readonly input: string;
  readonly isAccepted: boolean;
  readonly reason: string;
  readonly boundedByLimit: boolean;
  readonly hasInvalidAlphabetSymbols: boolean;
  readonly invalidSymbols: ReadonlyArray<string>;
  readonly stepCount?: number;
}

export interface CFGParseTreeNode {
  readonly id: string;
  readonly symbol: GrammarSymbol;
  readonly productionId?: string;
  readonly children: ReadonlyArray<CFGParseTreeNode>;
  readonly depth: number;
}

export type CFGAmbiguityStatus =
  | 'AMBIGUITY_WITNESS_FOUND'
  | 'ONE_PARSE_FOUND_WITHIN_BOUND'
  | 'NOT_IN_LANGUAGE'
  | 'INVALID_ALPHABET'
  | 'SEARCH_LIMIT_REACHED'
  | 'INVALID_GRAMMAR';

export interface CFGAmbiguityResult {
  readonly status: CFGAmbiguityStatus;
  readonly isAmbiguous: boolean;
  readonly witnessString: string;
  readonly distinctParseCount: number;
  readonly parseTrees: ReadonlyArray<CFGParseTreeNode>;
  readonly derivations: ReadonlyArray<CFGDerivationResult>;
  readonly rightmostDerivations?: ReadonlyArray<CFGDerivationResult>;
  readonly exploredStates: number;
  readonly searchDepthLimit: number;
  readonly reason: string;
}


// ===================================================================
// CNF Transformation Types
// ===================================================================

export type CNFTransformationStage =
  | 'CNF_START'
  | 'START_SYMBOL_NORMALIZATION'
  | 'EPSILON_ELIMINATION'
  | 'UNIT_ELIMINATION'
  | 'USELESS_SYMBOL_ELIMINATION'
  | 'TERMINAL_ISOLATION'
  | 'BINARIZATION'
  | 'CNF_VALIDATION';

export interface CNFTransformationStageTrace {
  readonly stage: CNFTransformationStage;
  readonly description: string;
  readonly mathematicalExplanation: string;
  readonly grammarBefore: ContextFreeGrammar;
  readonly grammarAfter: ContextFreeGrammar;
  readonly addedProductions: ReadonlyArray<CFGProduction>;
  readonly removedProductions: ReadonlyArray<CFGProduction>;
  readonly addedVariables: ReadonlyArray<string>;
  readonly removedVariables: ReadonlyArray<string>;
}

export interface CNFTransformationResult {
  readonly success: boolean;
  readonly originalGrammar: ContextFreeGrammar;
  readonly transformedGrammar: ContextFreeGrammar;
  readonly epsilonInOriginalLanguage: boolean;
  readonly stages: ReadonlyArray<CNFTransformationStageTrace>;
  readonly introducedVariables: ReadonlyArray<string>;
  readonly eliminatedProductions: ReadonlyArray<CFGProduction>;
  readonly totalProductionsOriginal: number;
  readonly totalProductionsTransformed: number;
  readonly warnings: ReadonlyArray<string>;
  readonly validationResult: CFGValidationResult;
  readonly errorMessage?: string;
}

export type CNFDiagnosticCode =
  | 'CNF_RHS_TOO_LONG'
  | 'CNF_TERMINAL_IN_BINARY'
  | 'CNF_NON_TERMINAL_IN_UNIT_TERMINAL'
  | 'CNF_INVALID_EPSILON'
  | 'CNF_UNIT_PRODUCTION'
  | 'CNF_EMPTY_RHS';

export interface CNFDiagnostic {
  readonly code: CNFDiagnosticCode;
  readonly severity: CFGDiagnosticSeverity;
  readonly message: string;
  readonly mathematicalExplanation: string;
  readonly affectedProductionId?: string;
}

export interface CNFValidationResult {
  readonly isValid: boolean;
  readonly diagnostics: ReadonlyArray<CNFDiagnostic>;
  readonly errors: ReadonlyArray<CNFDiagnostic>;
  readonly warnings: ReadonlyArray<CNFDiagnostic>;
  readonly hasStartEpsilon: boolean;
  readonly startSymbol: string;
}

// ===================================================================
// GNF Transformation Types
// ===================================================================

export type GNFTransformationStage =
  | 'GNF_START'
  | 'START_SYMBOL_NORMALIZATION'
  | 'EPSILON_ELIMINATION'
  | 'UNIT_ELIMINATION'
  | 'USELESS_SYMBOL_ELIMINATION'
  | 'CNF_BASE_CONVERSION'
  | 'VARIABLE_ORDERING'
  | 'FORWARD_SUBSTITUTION_LEFT_RECURSION'
  | 'BACK_SUBSTITUTION'
  | 'HELPER_VARIABLE_SUBSTITUTION'
  | 'TERMINAL_NORMALIZATION'
  | 'GNF_VALIDATION';

export interface GNFTransformationStageTrace {
  readonly stage: GNFTransformationStage;
  readonly description: string;
  readonly mathematicalExplanation: string;
  readonly grammarBefore: ContextFreeGrammar;
  readonly grammarAfter: ContextFreeGrammar;
  readonly addedProductions: ReadonlyArray<CFGProduction>;
  readonly removedProductions: ReadonlyArray<CFGProduction>;
  readonly addedVariables: ReadonlyArray<string>;
  readonly removedVariables: ReadonlyArray<string>;
}

export interface GNFTransformationResult {
  readonly success: boolean;
  readonly originalGrammar: ContextFreeGrammar;
  readonly transformedGrammar: ContextFreeGrammar;
  readonly epsilonInOriginalLanguage: boolean;
  readonly stages: ReadonlyArray<GNFTransformationStageTrace>;
  readonly introducedVariables: ReadonlyArray<string>;
  readonly eliminatedProductions: ReadonlyArray<CFGProduction>;
  readonly totalProductionsOriginal: number;
  readonly totalProductionsTransformed: number;
  readonly warnings: ReadonlyArray<string>;
  readonly validationResult: CFGValidationResult;
  readonly gnfValidation: GNFValidationResult;
  readonly errorMessage?: string;
}

export type GNFDiagnosticCode =
  | 'GNF_LEADING_NON_TERMINAL'
  | 'GNF_TERMINAL_AFTER_FIRST'
  | 'GNF_INVALID_EPSILON'
  | 'GNF_EMPTY_RHS';

export interface GNFDiagnostic {
  readonly code: GNFDiagnosticCode;
  readonly severity: CFGDiagnosticSeverity;
  readonly message: string;
  readonly mathematicalExplanation: string;
  readonly affectedProductionId?: string;
}

export interface GNFValidationResult {
  readonly isValid: boolean;
  readonly diagnostics: ReadonlyArray<GNFDiagnostic>;
  readonly errors: ReadonlyArray<GNFDiagnostic>;
  readonly warnings: ReadonlyArray<GNFDiagnostic>;
  readonly hasStartEpsilon: boolean;
  readonly startSymbol: string;
}


// ===================================================================
// CYK Parser Types
// ===================================================================

export interface CYKCellWitness {
  readonly variable: string;
  readonly productionId: string;
  readonly productionLhs: string;
  readonly productionRhs: ReadonlyArray<GrammarSymbol>;
  readonly splitPosition: number;
  readonly leftVariable?: string;
  readonly rightVariable?: string;
}

export interface CYKCell {
  readonly spanStart: number;
  readonly spanEnd: number;
  readonly substring: string;
  readonly variables: ReadonlyArray<string>;
  readonly witnesses: ReadonlyArray<CYKCellWitness>;
  readonly contributesToParse?: boolean;
}

export interface CYKTable {
  readonly cells: ReadonlyArray<ReadonlyArray<CYKCell>>;
  readonly tokenCount: number;
  readonly tokens: ReadonlyArray<string>;
}

export interface CYKStatistics {
  readonly inputLength: number;
  readonly totalCells: number;
  readonly populatedCells: number;
  readonly productionsChecked: number;
  readonly successfulInsertions: number;
  readonly executionSteps: number;
  readonly parseAlternativesStored: number;
  readonly executionTimeMs: number;
}

export interface CYKParseResult {
  readonly isAccepted: boolean;
  readonly inputString: string;
  readonly tokens: ReadonlyArray<string>;
  readonly table: CYKTable;
  readonly exploredCellCount: number;
  readonly parseTree?: CFGParseTreeNode;
  readonly parseTrees?: ReadonlyArray<CFGParseTreeNode>;
  readonly exactParseTreeCount?: number;
  readonly isExactCountKnown?: boolean;
  readonly isAmbiguous?: boolean;
  readonly isParseTreeCapped?: boolean;
  readonly rejectionExplanation?: string;
  readonly boundedByLimit: boolean;
  readonly isEpsilonAcceptance: boolean;
  readonly proofSteps?: ReadonlyArray<CYKProofStep>;
  readonly statistics?: CYKStatistics;
}

// ===================================================================
// CYK Proof Trace Types
// ===================================================================

export type CYKProofStepType =
  | 'CYK_INITIALIZATION'
  | 'CYK_CELL_EVALUATION'
  | 'CYK_SPLIT_EVALUATION'
  | 'CYK_ACCEPTANCE'
  | 'CYK_REJECTION'
  | 'CYK_PARSE_RECONSTRUCTION';

export interface CYKProofStep {
  readonly stepIndex: number;
  readonly type: CYKProofStepType;
  readonly title: string;
  readonly description: string;
  readonly mathematicalNotation: string;
  readonly spanStart?: number;
  readonly spanEnd?: number;
  readonly splitPosition?: number;
  readonly variable?: string;
  readonly productionId?: string;
  readonly leftVariable?: string;
  readonly rightVariable?: string;
  readonly leftCellSpan?: { start: number; end: number };
  readonly rightCellSpan?: { start: number; end: number };
  readonly addedVariables?: ReadonlyArray<string>;
}

// ===================================================================
// LL(1) Analysis & Parser Types
// ===================================================================

export const LL1_END_MARKER = '$';

export type LL1ConflictType = 'FIRST_FIRST' | 'FIRST_FOLLOW' | 'OTHER';

export interface LL1ConflictEvidence {
  readonly productionId: string;
  readonly productionNotation: string;
  readonly reason: 'FIRST_SET' | 'FOLLOW_SET';
  readonly triggerSymbol: string;
  readonly explanation: string;
}

export interface LL1Conflict {
  readonly type: LL1ConflictType;
  readonly variable: string;
  readonly terminal: string;
  readonly productionIds: ReadonlyArray<string>;
  readonly productionNotations: ReadonlyArray<string>;
  readonly selectSetA: ReadonlyArray<string>;
  readonly selectSetB: ReadonlyArray<string>;
  readonly competingProductionEvidence?: ReadonlyArray<LL1ConflictEvidence>;
  readonly mathematicalExplanation: string;
}

export interface ProductionSelectSet {
  readonly productionId: string;
  readonly lhs: string;
  readonly rhsNotation: string;
  readonly selectSet: ReadonlyArray<string>;
  readonly isNullableRhs: boolean;
}

export interface LL1ParseTableCell {
  readonly variable: string;
  readonly terminal: string;
  readonly productionIds: ReadonlyArray<string>;
  readonly productions: ReadonlyArray<CFGProduction>;
  readonly hasConflict: boolean;
}

export interface LL1ParseTable {
  readonly variables: ReadonlyArray<string>;
  readonly terminals: ReadonlyArray<string>; // includes '$'
  readonly grid: Record<string, Record<string, LL1ParseTableCell>>;
  readonly totalConflicts: number;
}

export type LeftRecursionClassification =
  | 'NO_LEFT_RECURSION'
  | 'IMMEDIATE_LEFT_RECURSION'
  | 'INDIRECT_LEFT_RECURSION'
  | 'BOTH';

export interface LeftRecursionDiagnostic {
  readonly isLeftRecursive: boolean;
  readonly classification: LeftRecursionClassification;
  readonly directVariables: ReadonlyArray<string>;
  readonly directProductions: ReadonlyArray<CFGProduction>;
  readonly indirectCycles: ReadonlyArray<ReadonlyArray<string>>;
  readonly leftCornerDependencies: Record<string, ReadonlyArray<string>>;
  readonly explanation: string;
}


export interface LeftFactoringGroup {
  readonly variable: string;
  readonly commonPrefix: ReadonlyArray<GrammarSymbol>;
  readonly commonPrefixNotation: string;
  readonly matchedProductions: ReadonlyArray<CFGProduction>;
  readonly suffixes: ReadonlyArray<{
    readonly productionId: string;
    readonly suffixSymbols: ReadonlyArray<GrammarSymbol>;
    readonly suffixNotation: string;
  }>;
  readonly plannedTransformation: string;
}

export interface LeftFactoringSuggestion {
  readonly variable: string;
  readonly commonPrefix: ReadonlyArray<GrammarSymbol>;
  readonly commonPrefixNotation: string;
  readonly productionIds: ReadonlyArray<string>;
  readonly explanation: string;
}

export interface LeftFactoringDiagnostic {
  readonly requiresFactoring: boolean;
  readonly groups: ReadonlyArray<LeftFactoringGroup>;
  readonly factorableVariables: ReadonlyArray<string>;
  readonly totalPrefixGroups: number;
  readonly explanation: string;
}


export interface FirstFollowIterationStep {
  readonly iteration: number;
  readonly sets: Record<string, ReadonlyArray<string>>;
  readonly changed: boolean;
}

export interface SymbolFirstFollowExplanation {
  readonly variable: string;
  readonly isNullable: boolean;
  readonly nullableReason?: string;
  readonly firstSet: ReadonlyArray<string>;
  readonly firstRules: ReadonlyArray<string>;
  readonly followSet: ReadonlyArray<string>;
  readonly followRules: ReadonlyArray<string>;
  readonly dependencies: {
    readonly firstDependsOn: ReadonlyArray<string>;
    readonly followDependsOn: ReadonlyArray<string>;
  };
}

export interface FirstFollowAnalysisResult {
  readonly isValid: boolean;
  readonly variables: ReadonlyArray<string>;
  readonly terminals: ReadonlyArray<string>;
  readonly startVariable: string;
  readonly nullableVariables: ReadonlyArray<string>;
  readonly firstSets: Record<string, ReadonlyArray<string>>;
  readonly followSets: Record<string, ReadonlyArray<string>>;
  readonly firstIterations: ReadonlyArray<FirstFollowIterationStep>;
  readonly followIterations: ReadonlyArray<FirstFollowIterationStep>;
  readonly explanations: Record<string, SymbolFirstFollowExplanation>;
  readonly diagnostics?: ReadonlyArray<string>;
}


export interface LL1AnalysisResult {
  readonly isLL1: boolean;
  readonly firstSets: Record<string, ReadonlyArray<string>>;
  readonly followSets: Record<string, ReadonlyArray<string>>;
  readonly selectSets: ReadonlyArray<ProductionSelectSet>;
  readonly parseTable: LL1ParseTable;
  readonly conflicts: ReadonlyArray<LL1Conflict>;
  readonly nullableVariables: ReadonlyArray<string>;
  readonly leftRecursion: LeftRecursionDiagnostic;
  readonly leftFactoringSuggestions: ReadonlyArray<LeftFactoringSuggestion>;
  readonly leftFactoring?: LeftFactoringDiagnostic;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface LL1ParseStep {
  readonly stepIndex: number;
  readonly stack: ReadonlyArray<string>;
  readonly remainingInput: ReadonlyArray<string>;
  readonly lookahead: string;
  readonly action: string;
  readonly productionId?: string;
  readonly productionNotation?: string;
  readonly matchedTerminal?: string;
  readonly sententialForm?: ReadonlyArray<string>;
  readonly formattedSententialForm?: string;
  readonly mathematicalExplanation: string;
}

export interface LL1ParseResult {
  readonly isAccepted: boolean;
  readonly inputString: string;
  readonly tokens: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<LL1ParseStep>;
  readonly parseTree?: CFGParseTreeNode;
  readonly appliedProductionIds: ReadonlyArray<string>;
  readonly rejectionReason?: string;
  readonly boundedByLimit: boolean;
  readonly analysisResult: LL1AnalysisResult;
  readonly stats?: {
    readonly stepCount: number;
    readonly matchCount: number;
    readonly expansionCount: number;
    readonly epsilonCount: number;
  };
}

export type LL1ProofStepType =
  | 'FIRST_SET_INITIALIZATION'
  | 'FIRST_SET_PROPAGATION'
  | 'FIRST_SET_FIXED_POINT'
  | 'FOLLOW_SET_INITIALIZATION'
  | 'FOLLOW_SET_PROPAGATION'
  | 'FOLLOW_SET_FIXED_POINT'
  | 'SELECT_SET_COMPUTATION'
  | 'PARSE_TABLE_ENTRY'
  | 'LL1_CONFLICT'
  | 'LL1_VERDICT'
  | 'PREDICTIVE_PARSE_STEP'
  | 'PREDICTIVE_PARSE_ACCEPT'
  | 'PREDICTIVE_PARSE_REJECT';

export interface LL1ProofStep {
  readonly stepIndex: number;
  readonly type: LL1ProofStepType;
  readonly title: string;
  readonly description: string;
  readonly mathematicalNotation: string;
}

// ===================================================================
// Grammar Transformation Engine Types
// ===================================================================

export type GrammarTransformationType =
  | 'DIRECT_LEFT_RECURSION_ELIMINATION'
  | 'INDIRECT_LEFT_RECURSION_ELIMINATION'
  | 'LEFT_FACTORING'
  | 'PREDICTIVE_TRANSFORMATION_PIPELINE';

export type LanguagePreservationStatus =
  | 'VERIFIED_BOUNDED'
  | 'NOT_VERIFIED'
  | 'MISMATCH_DETECTED';

export type GrammarTransformationStepType =
  | 'TRANSFORMATION_START'
  | 'VARIABLE_ORDERING'
  | 'INDIRECT_SUBSTITUTION'
  | 'DIRECT_LEFT_RECURSION_DETECTED'
  | 'DIRECT_LEFT_RECURSION_ELIMINATION'
  | 'NEW_VARIABLE_GENERATED'
  | 'LEFT_FACTORIZATION_DETECTED'
  | 'LEFT_FACTORIZATION_APPLIED'
  | 'FIRST_FOLLOW_RECOMPUTATION'
  | 'LL1_REANALYSIS'
  | 'LANGUAGE_PRESERVATION_CHECK'
  | 'TRANSFORMATION_COMPLETE';

export interface GrammarTransformationStep {
  readonly stepIndex: number;
  readonly type: GrammarTransformationStepType;
  readonly title: string;
  readonly description: string;
  readonly mathematicalNotation: string;
  readonly affectedVariable?: string;
  readonly beforeProductions: ReadonlyArray<CFGProduction>;
  readonly afterProductions: ReadonlyArray<CFGProduction>;
  readonly generatedVariables: ReadonlyArray<string>;
}

export interface GrammarTransformationResult {
  readonly success: boolean;
  readonly originalGrammar: ContextFreeGrammar;
  readonly transformedGrammar: ContextFreeGrammar;
  readonly transformationType: GrammarTransformationType;
  readonly changed: boolean;
  readonly steps: ReadonlyArray<GrammarTransformationStep>;
  readonly generatedSymbolNames: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly languagePreservationStatus: LanguagePreservationStatus;
  readonly mismatchDetails?: string;
  readonly beforeLL1Analysis: LL1AnalysisResult;
  readonly afterLL1Analysis: LL1AnalysisResult;
  readonly iterations: number;
  readonly boundedByLimit: boolean;
}

export interface LeftRecursionEliminationResult extends GrammarTransformationResult {
  readonly detectionBefore: LeftRecursionDiagnostic;
  readonly detectionAfter: LeftRecursionDiagnostic;
}

export interface LeftFactoringResult extends GrammarTransformationResult {
  readonly detectionBefore: LeftFactoringDiagnostic;
  readonly detectionAfter: LeftFactoringDiagnostic;
}




// ===================================================================
// PDA ↔ CFG Translation Engine Types
// ===================================================================

export type TranslationDirection = 'CFG_TO_PDA' | 'PDA_TO_CFG';

export type PDACFGTranslationStepType =
  | 'TRANSLATION_START'
  | 'CFG_VALIDATION'
  | 'PDA_VALIDATION'
  | 'PDA_NORMALIZATION_START'
  | 'PDA_NORMALIZATION_FRESH_INITIAL_STATE'
  | 'PDA_NORMALIZATION_FRESH_STACK_BOTTOM'
  | 'PDA_NORMALIZATION_ACCEPTANCE_TO_EMPTY_STACK'
  | 'PDA_NORMALIZATION_COMPLETE'
  | 'CFG_TO_PDA_START_STATE'
  | 'CFG_TO_PDA_START_VARIABLE_PUSH'
  | 'CFG_TO_PDA_PRODUCTION_EXPANSION'
  | 'CFG_TO_PDA_TERMINAL_MATCH'
  | 'PDA_TO_CFG_TRIPLET_VARS_INIT'
  | 'PDA_TO_CFG_START_VARIABLE_PRODUCTIONS'
  | 'PDA_TO_CFG_POP_TRANSITION_PRODUCTIONS'
  | 'PDA_TO_CFG_REPLACEMENT_TRANSITION_PRODUCTIONS'
  | 'PDA_TO_CFG_USELESS_VARIABLE_CLEANUP'
  | 'LANGUAGE_PRESERVATION_CHECK'
  | 'TRANSLATION_COMPLETE';

export interface PDACFGTranslationStep {
  readonly stepIndex: number;
  readonly type: PDACFGTranslationStepType;
  readonly title: string;
  readonly description: string;
  readonly mathematicalNotation: string;
  readonly affectedSymbols?: ReadonlyArray<string>;
  readonly details?: string;
}

export interface LanguagePreservationCase {
  readonly inputString: string;
  readonly sourceAccepted: boolean;
  readonly targetAccepted: boolean;
  readonly match: boolean;
}

export interface PDACFGLanguagePreservationResult {
  readonly status: LanguagePreservationStatus;
  readonly totalTested: number;
  readonly totalMatches: number;
  readonly cases: ReadonlyArray<LanguagePreservationCase>;
  readonly mismatches: ReadonlyArray<LanguagePreservationCase>;
  readonly explanation: string;
}

export interface CFGToPDAResult {
  readonly success: boolean;
  readonly sourceCFG: ContextFreeGrammar;
  readonly targetPDAGraph: SolverGraphInput;
  readonly targetInitialStackSymbol: string;
  readonly steps: ReadonlyArray<PDACFGTranslationStep>;
  readonly generatedStates: ReadonlyArray<string>;
  readonly generatedStackSymbols: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly preservation: PDACFGLanguagePreservationResult;
}

export interface PDAToCFGResult {
  readonly success: boolean;
  readonly sourcePDAGraph: SolverGraphInput;
  readonly sourceInitialStackSymbol: string;
  readonly normalizedPDAGraph?: SolverGraphInput;
  readonly targetCFG: ContextFreeGrammar;
  readonly steps: ReadonlyArray<PDACFGTranslationStep>;
  readonly generatedVariables: ReadonlyArray<string>;
  readonly tripletMap: Record<string, { q: string; X: string; p: string }>;
  readonly warnings: ReadonlyArray<string>;
  readonly preservation: PDACFGLanguagePreservationResult;
}

// ===================================================================
// Module 4 — Topic 1: Introduction to Parsing Types
// ===================================================================

export type ParsingStatus = 'ACCEPT' | 'REJECT' | 'SEARCH_LIMIT_REACHED';

export interface TopDownParseStep {
  readonly stepIndex: number;
  readonly sententialForm: ReadonlyArray<GrammarSymbol>;
  readonly formattedSententialForm: string;
  readonly expandedSymbol?: string;
  readonly expandedIndex?: number;
  readonly selectedProduction?: CFGProduction;
  readonly matchedPrefix: string;
  readonly remainingInput: string;
  readonly explanation: string;
  readonly availableAlternatives?: ReadonlyArray<CFGProduction>;
}

export interface TopDownParseResult {
  readonly status: ParsingStatus;
  readonly isAccepted: boolean;
  readonly isSearchLimitReached: boolean;
  readonly inputString: string;
  readonly tokens: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<TopDownParseStep>;
  readonly parseTree?: CFGParseTreeNode;
  readonly exploredStateCount: number;
  readonly explanation: string;
  readonly startVariable: string;
}

export type BottomUpAction = 'SHIFT' | 'REDUCE' | 'ACCEPT' | 'ERROR';

export interface BottomUpActionChoice {
  readonly type: 'SHIFT' | 'REDUCE';
  readonly production?: CFGProduction;
  readonly matchedSuffix?: ReadonlyArray<GrammarSymbol>;
  readonly description: string;
}

export interface BottomUpParseStep {
  readonly stepIndex: number;
  readonly stack: ReadonlyArray<GrammarSymbol>;
  readonly formattedStack: string;
  readonly remainingTokens: ReadonlyArray<string>;
  readonly formattedRemainingInput: string;
  readonly action: BottomUpAction;
  readonly shiftedToken?: string;
  readonly reducedProduction?: CFGProduction;
  readonly reducedSymbols?: ReadonlyArray<GrammarSymbol>;
  readonly explanation: string;
  readonly availableChoices?: ReadonlyArray<BottomUpActionChoice>;
  readonly hasConflict?: boolean;
  readonly conflictType?: 'SHIFT_REDUCE' | 'REDUCE_REDUCE';
}

export interface BottomUpParseResult {
  readonly status: ParsingStatus;
  readonly isAccepted: boolean;
  readonly isSearchLimitReached: boolean;
  readonly inputString: string;
  readonly tokens: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<BottomUpParseStep>;
  readonly parseTree?: CFGParseTreeNode;
  readonly finalStack: ReadonlyArray<GrammarSymbol>;
  readonly exploredStateCount: number;
  readonly conflictsEncountered: number;
  readonly explanation: string;
  readonly startVariable: string;
}

export interface ParsingApproachComparison {
  readonly grammar: ContextFreeGrammar;
  readonly inputString: string;
  readonly tokens: ReadonlyArray<string>;
  readonly topDown: TopDownParseResult;
  readonly bottomUp: BottomUpParseResult;
  readonly agreement: boolean;
  readonly comparisonTable: ReadonlyArray<{
    readonly dimension: string;
    readonly topDown: string;
    readonly bottomUp: string;
  }>;
}

// ===================================================================
// Module 4 — Topic 3: SLR Parsing Types
// ===================================================================

export interface LR0Item {
  readonly id: string; // e.g. "p1:0"
  readonly productionId: string;
  readonly lhs: string;
  readonly rhs: ReadonlyArray<GrammarSymbol>;
  readonly dotPosition: number;
  readonly nextSymbol: GrammarSymbol | null; // symbol immediately after dot, or null if completed
  readonly isCompleted: boolean;
  readonly isKernel: boolean; // true if S' -> .S or dotPosition > 0
  readonly formatted: string; // e.g. "S -> · A B"
}

export interface LR0Transition {
  readonly symbol: string;
  readonly isTerminal: boolean;
  readonly targetStateId: number;
}

export interface LR0State {
  readonly id: number; // 0, 1, 2, ...
  readonly name: string; // "I0", "I1", ...
  readonly items: ReadonlyArray<LR0Item>;
  readonly kernelItems: ReadonlyArray<LR0Item>;
  readonly closureItems: ReadonlyArray<LR0Item>;
  readonly transitions: ReadonlyArray<LR0Transition>;
  readonly completedItems: ReadonlyArray<LR0Item>;
}

export interface CanonicalLR0Collection {
  readonly augmentedGrammar: ContextFreeGrammar;
  readonly augmentedStartSymbol: string;
  readonly states: ReadonlyArray<LR0State>;
  readonly initialStateId: number;
  readonly transitions: ReadonlyArray<{
    readonly fromStateId: number;
    readonly symbol: string;
    readonly toStateId: number;
  }>;
}

export type SLRActionType = 'SHIFT' | 'REDUCE' | 'ACCEPT';

export interface SLRAction {
  readonly type: SLRActionType;
  readonly targetStateId?: number; // for SHIFT
  readonly production?: CFGProduction; // for REDUCE
  readonly notation: string; // e.g. "S3" or "R2 (E -> T)" or "acc"
}

export interface SLRConflict {
  readonly stateId: number;
  readonly symbol: string;
  readonly conflictType: 'SHIFT_REDUCE' | 'REDUCE_REDUCE';
  readonly competingActions: ReadonlyArray<SLRAction>;
  readonly competingItems: ReadonlyArray<LR0Item>;
  readonly followEvidence?: ReadonlyArray<{
    readonly variable: string;
    readonly followSet: ReadonlyArray<string>;
  }>;
  readonly explanation: string;
}

export interface SLRTable {
  readonly states: ReadonlyArray<number>;
  readonly terminals: ReadonlyArray<string>; // includes '$'
  readonly variables: ReadonlyArray<string>;
  readonly actionGrid: Record<number, Record<string, ReadonlyArray<SLRAction>>>;
  readonly gotoGrid: Record<number, Record<string, number | null>>;
  readonly conflicts: ReadonlyArray<SLRConflict>;
  readonly isSLR: boolean;
  readonly followSets: Record<string, ReadonlyArray<string>>;
}

export interface SLRParseStep {
  readonly stepIndex: number;
  readonly stateStack: ReadonlyArray<number>;
  readonly symbolStack: ReadonlyArray<string>; // symbols as strings
  readonly remainingInput: ReadonlyArray<string>;
  readonly lookahead: string;
  readonly action: SLRAction | null;
  readonly actionDescription: string;
  readonly reducedProduction?: CFGProduction;
  readonly gotoState?: number;
  readonly stateStackAfter: ReadonlyArray<number>;
  readonly symbolStackAfter: ReadonlyArray<string>;
  readonly mathematicalExplanation: string;
}

export interface SLRParseResult {
  readonly isAccepted: boolean;
  readonly inputString: string;
  readonly tokens: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<SLRParseStep>;
  readonly parseTree?: CFGParseTreeNode;
  readonly rejectionReason?: string;
  readonly conflictEncountered?: SLRConflict;
  readonly stats: {
    readonly stepCount: number;
    readonly shiftCount: number;
    readonly reduceCount: number;
    readonly acceptReached: boolean;
  };
}

// ===================================================================
// Module 4 Topic 6: Interpretation of Syntactic Statements using PDA
// ===================================================================

export type SyntacticPDAActionType =
  | 'INIT'
  | 'EXPAND_VARIABLE'
  | 'MATCH_TERMINAL'
  | 'ACCEPT'
  | 'ERROR_MISMATCH'
  | 'ERROR_NO_RULE'
  | 'LIMIT_REACHED';

export interface SyntacticPDAInterpretationStep {
  readonly stepIndex: number;
  readonly actionType: SyntacticPDAActionType;
  readonly currentState: string;
  readonly inputIndex: number;
  readonly remainingInput: string;
  readonly currentLookahead: string | null;
  readonly stack: ReadonlyArray<string>; // Top of stack is stack[stack.length - 1] (leftmost in ID)
  readonly topSymbol: string | null;
  readonly instantaneousDescription: string; // Formal (q, w, α)
  readonly productionUsed?: CFGProduction;
  readonly matchedTerminal?: string;
  readonly sententialForm: string; // matchedPrefix + stack
  readonly matchedPrefix: string;
  readonly explanation: string;
  readonly mathematicalNotation: string;
  readonly isAccepting: boolean;
  readonly isHalted: boolean;
  readonly pdaTransitionLabel: string;
}

export interface SyntacticPDAInterpretationResult {
  readonly status: 'ACCEPT' | 'REJECT' | 'SEARCH_LIMIT_REACHED';
  readonly isAccepted: boolean;
  readonly inputStatement: string;
  readonly tokens: ReadonlyArray<string>;
  readonly grammar: ContextFreeGrammar;
  readonly steps: ReadonlyArray<SyntacticPDAInterpretationStep>;
  readonly exploredConfigurationsCount: number;
  readonly explanation: string;
  readonly targetPDAGraph: SolverGraphInput;
  readonly isAmbiguousDerivation?: boolean;
}












