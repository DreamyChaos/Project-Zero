import {
  TMExecutionOptions,
  MappingReductionExample,
  ReductionExecutionCertificate,
  ComposedReductionResult,
  ReducibilityDistinctionItem,
} from './types';
import { executeTM } from './tm-executor';
import { DEFAULT_BLANK_SYMBOL } from './tm-validator';

/**
 * ============================================================
 * MODULE 5 — TOPIC 5: REDUCIBILITY
 * ============================================================
 *
 * Core Formal Definition of Many-One / Mapping Reduction:
 * A language A ⊆ Σ* is mapping reducible to language B ⊆ Γ* (written A ≤m B)
 * if there exists a total computable function f: Σ* → Γ* such that for every x ∈ Σ*:
 *
 *              x ∈ A  iff  f(x) ∈ B
 *
 * Directional Safety Invariant:
 * - A ≤m B means "B is at least as hard as A" (in terms of computability).
 * - A decider for B can be converted into a decider for A via:
 *       D_A(x) = D_B(f(x))
 * - The reduction arrow points: A ──f──> B.
 * - If B is decidable, then A is decidable.
 * - Contrapositive: If A is undecidable, then B is undecidable.
 *
 * Epistemological Safety:
 * - Finite software executions NEVER constitute a mathematical proof of undecidability.
 * - Totality and computability of f are algebraic/algorithmic invariants of the reduction,
 *   not empirical conclusions drawn from bounded runs.
 */

export const MAPPING_REDUCTION_DEFINITION = {
  notation: 'A ≤m B',
  formalStatement: 'A ≤m B iff ∃ total computable function f: Σ* → Γ* such that ∀x ∈ Σ*, x ∈ A ⇔ f(x) ∈ B.',
  directionSummary: 'Reduction maps instances of source problem A into instances of target problem B. B is at least as hard as A.',
  transferTheorem: 'If A ≤m B and B is decidable, then A is decidable.',
  contrapositiveTheorem: 'If A ≤m B and A is undecidable, then B is undecidable.',
};

/**
 * Curated list of educational distinctions guarding against common misconceptions.
 */
export const REDUCIBILITY_DISTINCTIONS: ReadonlyArray<ReducibilityDistinctionItem> = [
  {
    topic: 'Direction of Reduction',
    reducibilityMeans: 'A ≤m B means an algorithm for B can be used to solve A (B is at least as hard as A). The transformation function maps f: A → B.',
    doesNotMean: 'It does NOT mean A is at least as hard as B. The arrow does NOT point from B to A.',
    pedagogicalWarning: 'Never reverse the direction. A reduces to B means B can solve A.',
  },
  {
    topic: 'Symmetry & Mutual Reducibility',
    reducibilityMeans: 'A ≤m B is a preorder (reflexive and transitive). If both A ≤m B and B ≤m A hold, the problems are mutually reducible (A ≡m B).',
    doesNotMean: 'A ≤m B does NOT imply B ≤m A. Reductions are fundamentally asymmetric in general.',
    pedagogicalWarning: 'Do not assume a one-way reduction implies equivalence in both directions.',
  },
  {
    topic: 'Solvability vs Runtime Complexity',
    reducibilityMeans: 'In computability theory, A ≤m B transfers qualitative decidability (if B is decidable, A is decidable).',
    doesNotMean: 'It does NOT mean A and B have the same time or space complexity.',
    pedagogicalWarning: 'Mapping reductions transfer computability, not identical asymptotic complexity classes.',
  },
  {
    topic: 'Finite Experiments vs Undecidability Proofs',
    reducibilityMeans: 'A reduction is a rigorous mathematical proof demonstrating that no decider can exist for B if one does not exist for A.',
    doesNotMean: 'A finite computer run or step timeout does NOT prove a language is undecidable.',
    pedagogicalWarning: 'Observing a simulation timeout is a bounded artifact, never a proof of undecidability.',
  },
  {
    topic: 'Totality of the Reduction Function',
    reducibilityMeans: 'The reduction function f must be TOTAL and COMPUTABLE (it must halt and produce an output for EVERY string x ∈ Σ*).',
    doesNotMean: 'f cannot loop forever on non-members. Only the target recognizer can loop.',
    pedagogicalWarning: 'If f does not halt on some input x, it is not a valid mapping reduction.',
  },
];

/**
 * Curated bank of real, executable mapping reduction presets.
 */
export const REDUCTION_PRESETS: ReadonlyArray<MappingReductionExample> = [
  {
    id: 'alphabet-encoding-reduction',
    name: 'Alphabet Isomorphism Reduction',
    shortLabel: 'A_even1 ≤m B_even_b',
    reductionType: 'MAPPING',
    sourceLanguageName: 'L_even1 (Alphabet {0, 1})',
    sourceAlphabet: ['0', '1'],
    sourceFormalDef: 'L_A = { w ∈ {0, 1}* | |w|_1 mod 2 = 0 }',
    targetLanguageName: 'L_evenB (Alphabet {a, b})',
    targetAlphabet: ['a', 'b'],
    targetFormalDef: 'L_B = { w ∈ {a, b}* | |w|_b mod 2 = 0 }',
    transformationFormula: 'f(w): replace every "0" with "a", and every "1" with "b"',
    totalComputableProofNote:
      'f is total and computable because it performs a single finite linear scan over the string, replacing each character in O(|w|) steps.',
    transformFn: (x: string) => x.replace(/0/g, 'a').replace(/1/g, 'b'),
    sourceGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q_even', label: 'q_even', x: 280, y: 150, isInitial: false, isAccepting: false },
        { id: 'q_odd', label: 'q_odd', x: 460, y: 150, isInitial: false, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 280, y: 280, isInitial: false, isAccepting: true },
        { id: 'q_rej', label: 'q_rej', x: 460, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q_even', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q_odd', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e3', sourceNodeId: 'q_even', targetNodeId: 'q_even', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e4', sourceNodeId: 'q_even', targetNodeId: 'q_odd', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e5', sourceNodeId: 'q_even', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e6', sourceNodeId: 'q_odd', targetNodeId: 'q_odd', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e7', sourceNodeId: 'q_odd', targetNodeId: 'q_even', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e8', sourceNodeId: 'q_odd', targetNodeId: 'q_rej', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
      ],
    },
    targetGraph: {
      nodes: [
        { id: 't0', label: 't0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 't_even', label: 't_even', x: 280, y: 150, isInitial: false, isAccepting: false },
        { id: 't_odd', label: 't_odd', x: 460, y: 150, isInitial: false, isAccepting: false },
        { id: 't_acc', label: 't_acc', x: 280, y: 280, isInitial: false, isAccepting: true },
        { id: 't_rej', label: 't_rej', x: 460, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'te0', sourceNodeId: 't0', targetNodeId: 't_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'te1', sourceNodeId: 't0', targetNodeId: 't_even', label: 'a → a, R', readSymbol: 'a', writeSymbol: 'a', moveDirection: 'R' },
        { id: 'te2', sourceNodeId: 't0', targetNodeId: 't_odd', label: 'b → b, R', readSymbol: 'b', writeSymbol: 'b', moveDirection: 'R' },
        { id: 'te3', sourceNodeId: 't_even', targetNodeId: 't_even', label: 'a → a, R', readSymbol: 'a', writeSymbol: 'a', moveDirection: 'R' },
        { id: 'te4', sourceNodeId: 't_even', targetNodeId: 't_odd', label: 'b → b, R', readSymbol: 'b', writeSymbol: 'b', moveDirection: 'R' },
        { id: 'te5', sourceNodeId: 't_even', targetNodeId: 't_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'te6', sourceNodeId: 't_odd', targetNodeId: 't_odd', label: 'a → a, R', readSymbol: 'a', writeSymbol: 'a', moveDirection: 'R' },
        { id: 'te7', sourceNodeId: 't_odd', targetNodeId: 't_even', label: 'b → b, R', readSymbol: 'b', writeSymbol: 'b', moveDirection: 'R' },
        { id: 'te8', sourceNodeId: 't_odd', targetNodeId: 't_rej', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
      ],
    },
    testCases: [
      { sourceInput: '', expectedTargetInput: '', isSourceMember: true, isTargetMember: true, notes: 'Empty string (0 ones / 0 b\'s: even, accepted by both)' },
      { sourceInput: '0', expectedTargetInput: 'a', isSourceMember: true, isTargetMember: true, notes: '0 ones / 0 b\'s: even, accepted by both' },
      { sourceInput: '11', expectedTargetInput: 'bb', isSourceMember: true, isTargetMember: true, notes: '2 ones / 2 b\'s: even, accepted by both' },
      { sourceInput: '10100', expectedTargetInput: 'babaa', isSourceMember: true, isTargetMember: true, notes: '2 ones / 2 b\'s: even, accepted by both' },
      { sourceInput: '1', expectedTargetInput: 'b', isSourceMember: false, isTargetMember: false, notes: '1 one / 1 b: odd, rejected by both' },
      { sourceInput: '010', expectedTargetInput: 'aba', isSourceMember: false, isTargetMember: false, notes: '1 one / 1 b: odd, rejected by both' },
    ],
    educationalSignificance:
      'Demonstrates a canonical alphabet homomorphism reduction where every structural invariant of the language is preserved under a total computable token substitution.',
  },
  {
    id: 'prefix-embedding-reduction',
    name: 'Delimiter Prefix Embedding Reduction',
    shortLabel: 'L_0n1n ≤m L_#0n1n',
    reductionType: 'MAPPING',
    sourceLanguageName: 'L_0n1n (Balanced 0^n 1^n)',
    sourceAlphabet: ['0', '1'],
    sourceFormalDef: 'L_A = { 0^n 1^n | n ≥ 0 }',
    targetLanguageName: 'L_#0n1n (Prefixed #0^n 1^n)',
    targetAlphabet: ['#', '0', '1'],
    targetFormalDef: 'L_B = { #0^n 1^n | n ≥ 0 }',
    transformationFormula: 'f(w) = "#" + w',
    totalComputableProofNote:
      'f is total and computable because it prepends a single delimiter character "#" to the input string in constant/linear time.',
    transformFn: (x: string) => '#' + x,
    sourceGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 280, y: 150, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 460, y: 150, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 280, y: 280, isInitial: false, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 100, y: 280, isInitial: false, isAccepting: true },
        { id: 'q_rej', label: 'q_rej', x: 460, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0 → X, R', readSymbol: '0', writeSymbol: 'X', moveDirection: 'R' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'e5', sourceNodeId: 'q1', targetNodeId: 'q2', label: '1 → Y, L', readSymbol: '1', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'e6', sourceNodeId: 'q2', targetNodeId: 'q2', label: 'Y → Y, L', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'e7', sourceNodeId: 'q2', targetNodeId: 'q2', label: '0 → 0, L', readSymbol: '0', writeSymbol: '0', moveDirection: 'L' },
        { id: 'e8', sourceNodeId: 'q2', targetNodeId: 'q0', label: 'X → X, R', readSymbol: 'X', writeSymbol: 'X', moveDirection: 'R' },
        { id: 'e9', sourceNodeId: 'q3', targetNodeId: 'q3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'e10', sourceNodeId: 'q3', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e11', sourceNodeId: 'q3', targetNodeId: 'q_rej', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' },
        { id: 'e12', sourceNodeId: 'q3', targetNodeId: 'q_rej', label: '1 → 1, S', readSymbol: '1', writeSymbol: '1', moveDirection: 'S' },
      ],
    },
    targetGraph: {
      nodes: [
        { id: 'p_init', label: 'p_init', x: 80, y: 150, isInitial: true, isAccepting: false },
        { id: 'p0', label: 'p0', x: 220, y: 150, isInitial: false, isAccepting: false },
        { id: 'p1', label: 'p1', x: 380, y: 150, isInitial: false, isAccepting: false },
        { id: 'p2', label: 'p2', x: 540, y: 150, isInitial: false, isAccepting: false },
        { id: 'p3', label: 'p3', x: 380, y: 280, isInitial: false, isAccepting: false },
        { id: 'p_acc', label: 'p_acc', x: 220, y: 280, isInitial: false, isAccepting: true },
        { id: 'p_rej', label: 'p_rej', x: 540, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        // Read required '#' prefix
        { id: 'pe_hash', sourceNodeId: 'p_init', targetNodeId: 'p0', label: '# → #, R', readSymbol: '#', writeSymbol: '#', moveDirection: 'R' },
        // Then execute standard 0^n 1^n
        { id: 'pe0', sourceNodeId: 'p0', targetNodeId: 'p1', label: '0 → X, R', readSymbol: '0', writeSymbol: 'X', moveDirection: 'R' },
        { id: 'pe1', sourceNodeId: 'p0', targetNodeId: 'p3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'pe2', sourceNodeId: 'p0', targetNodeId: 'p_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'pe3', sourceNodeId: 'p1', targetNodeId: 'p1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'pe4', sourceNodeId: 'p1', targetNodeId: 'p1', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'pe5', sourceNodeId: 'p1', targetNodeId: 'p2', label: '1 → Y, L', readSymbol: '1', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'pe6', sourceNodeId: 'p2', targetNodeId: 'p2', label: 'Y → Y, L', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'pe7', sourceNodeId: 'p2', targetNodeId: 'p2', label: '0 → 0, L', readSymbol: '0', writeSymbol: '0', moveDirection: 'L' },
        { id: 'pe8', sourceNodeId: 'p2', targetNodeId: 'p0', label: 'X → X, R', readSymbol: 'X', writeSymbol: 'X', moveDirection: 'R' },
        { id: 'pe9', sourceNodeId: 'p3', targetNodeId: 'p3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'pe10', sourceNodeId: 'p3', targetNodeId: 'p_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'pe11', sourceNodeId: 'p3', targetNodeId: 'p_rej', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' },
        { id: 'pe12', sourceNodeId: 'p3', targetNodeId: 'p_rej', label: '1 → 1, S', readSymbol: '1', writeSymbol: '1', moveDirection: 'S' },
      ],
    },
    testCases: [
      { sourceInput: '', expectedTargetInput: '#', isSourceMember: true, isTargetMember: true, notes: 'n=0: ε ∈ L_0n1n, and # ∈ L_#0n1n' },
      { sourceInput: '01', expectedTargetInput: '#01', isSourceMember: true, isTargetMember: true, notes: 'n=1: 01 ∈ L_0n1n, and #01 ∈ L_#0n1n' },
      { sourceInput: '0011', expectedTargetInput: '#0011', isSourceMember: true, isTargetMember: true, notes: 'n=2: 0011 ∈ L_0n1n, and #0011 ∈ L_#0n1n' },
      { sourceInput: '0', expectedTargetInput: '#0', isSourceMember: false, isTargetMember: false, notes: 'Unbalanced: rejected by both' },
      { sourceInput: '10', expectedTargetInput: '#10', isSourceMember: false, isTargetMember: false, notes: 'Inverted: rejected by both' },
    ],
    educationalSignificance:
      'Shows how problems are embedded into structured target formats with framing delimiters, preserving language membership exactly.',
  },
  {
    id: 'identity-reduction',
    name: 'Reflexive Identity Reduction',
    shortLabel: 'L ≤m L',
    reductionType: 'MAPPING',
    sourceLanguageName: 'Any Language L (e.g. L_even1)',
    sourceAlphabet: ['0', '1'],
    sourceFormalDef: 'L_A = { w ∈ {0, 1}* | |w|_1 mod 2 = 0 }',
    targetLanguageName: 'Same Language L',
    targetAlphabet: ['0', '1'],
    targetFormalDef: 'L_B = L_A',
    transformationFormula: 'f(w) = w  (Identity function id)',
    totalComputableProofNote:
      'The identity function f(w) = w is trivially total and computable (implemented by a TM that halts immediately without moving or modifying the tape).',
    transformFn: (x: string) => x,
    sourceGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q_even', label: 'q_even', x: 280, y: 150, isInitial: false, isAccepting: false },
        { id: 'q_odd', label: 'q_odd', x: 460, y: 150, isInitial: false, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 280, y: 280, isInitial: false, isAccepting: true },
        { id: 'q_rej', label: 'q_rej', x: 460, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q_even', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q_odd', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e3', sourceNodeId: 'q_even', targetNodeId: 'q_even', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e4', sourceNodeId: 'q_even', targetNodeId: 'q_odd', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e5', sourceNodeId: 'q_even', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e6', sourceNodeId: 'q_odd', targetNodeId: 'q_odd', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e7', sourceNodeId: 'q_odd', targetNodeId: 'q_even', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e8', sourceNodeId: 'q_odd', targetNodeId: 'q_rej', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
      ],
    },
    targetGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q_even', label: 'q_even', x: 280, y: 150, isInitial: false, isAccepting: false },
        { id: 'q_odd', label: 'q_odd', x: 460, y: 150, isInitial: false, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 280, y: 280, isInitial: false, isAccepting: true },
        { id: 'q_rej', label: 'q_rej', x: 460, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q_even', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q_odd', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e3', sourceNodeId: 'q_even', targetNodeId: 'q_even', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e4', sourceNodeId: 'q_even', targetNodeId: 'q_odd', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e5', sourceNodeId: 'q_even', targetNodeId: 'q_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'e6', sourceNodeId: 'q_odd', targetNodeId: 'q_odd', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'e7', sourceNodeId: 'q_odd', targetNodeId: 'q_even', label: '1 → 1, R', readSymbol: '1', writeSymbol: '1', moveDirection: 'R' },
        { id: 'e8', sourceNodeId: 'q_odd', targetNodeId: 'q_rej', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
      ],
    },
    testCases: [
      { sourceInput: '0', expectedTargetInput: '0', isSourceMember: true, isTargetMember: true, notes: 'Reflexive identity member check' },
      { sourceInput: '1', expectedTargetInput: '1', isSourceMember: false, isTargetMember: false, notes: 'Reflexive identity non-member check' },
      { sourceInput: '11', expectedTargetInput: '11', isSourceMember: true, isTargetMember: true, notes: 'Reflexive identity member check' },
    ],
    educationalSignificance:
      'Proves reflexivity of reducibility (every language reduces to itself via the identity mapping).',
  },
  {
    id: 'prefix-to-wrapped-reduction',
    name: 'Prefix to Suffix Wrap Reduction',
    shortLabel: 'L_#0n1n ≤m L_#0n1n$',
    reductionType: 'MAPPING',
    sourceLanguageName: 'L_#0n1n (Prefixed #0^n 1^n)',
    sourceAlphabet: ['#', '0', '1'],
    sourceFormalDef: 'L_B = { #0^n 1^n | n ≥ 0 }',
    targetLanguageName: 'L_#0n1n$ (Bracketed #0^n 1^n$)',
    targetAlphabet: ['#', '0', '1', '$'],
    targetFormalDef: 'L_C = { #0^n 1^n$ | n ≥ 0 }',
    transformationFormula: 'g(w) = w + "$"',
    totalComputableProofNote:
      'g is total and computable because it appends the delimiter "$" to the end of the input in linear time.',
    transformFn: (x: string) => x + '$',
    sourceGraph: {
      nodes: [
        { id: 'p_init', label: 'p_init', x: 80, y: 150, isInitial: true, isAccepting: false },
        { id: 'p0', label: 'p0', x: 220, y: 150, isInitial: false, isAccepting: false },
        { id: 'p1', label: 'p1', x: 380, y: 150, isInitial: false, isAccepting: false },
        { id: 'p2', label: 'p2', x: 540, y: 150, isInitial: false, isAccepting: false },
        { id: 'p3', label: 'p3', x: 380, y: 280, isInitial: false, isAccepting: false },
        { id: 'p_acc', label: 'p_acc', x: 220, y: 280, isInitial: false, isAccepting: true },
        { id: 'p_rej', label: 'p_rej', x: 540, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'pe_hash', sourceNodeId: 'p_init', targetNodeId: 'p0', label: '# → #, R', readSymbol: '#', writeSymbol: '#', moveDirection: 'R' },
        { id: 'pe0', sourceNodeId: 'p0', targetNodeId: 'p1', label: '0 → X, R', readSymbol: '0', writeSymbol: 'X', moveDirection: 'R' },
        { id: 'pe1', sourceNodeId: 'p0', targetNodeId: 'p3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'pe2', sourceNodeId: 'p0', targetNodeId: 'p_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'pe3', sourceNodeId: 'p1', targetNodeId: 'p1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'pe4', sourceNodeId: 'p1', targetNodeId: 'p1', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'pe5', sourceNodeId: 'p1', targetNodeId: 'p2', label: '1 → Y, L', readSymbol: '1', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'pe6', sourceNodeId: 'p2', targetNodeId: 'p2', label: 'Y → Y, L', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'pe7', sourceNodeId: 'p2', targetNodeId: 'p2', label: '0 → 0, L', readSymbol: '0', writeSymbol: '0', moveDirection: 'L' },
        { id: 'pe8', sourceNodeId: 'p2', targetNodeId: 'p0', label: 'X → X, R', readSymbol: 'X', writeSymbol: 'X', moveDirection: 'R' },
        { id: 'pe9', sourceNodeId: 'p3', targetNodeId: 'p3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'pe10', sourceNodeId: 'p3', targetNodeId: 'p_acc', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
        { id: 'pe11', sourceNodeId: 'p3', targetNodeId: 'p_rej', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' },
        { id: 'pe12', sourceNodeId: 'p3', targetNodeId: 'p_rej', label: '1 → 1, S', readSymbol: '1', writeSymbol: '1', moveDirection: 'S' },
      ],
    },
    targetGraph: {
      nodes: [
        { id: 'w_init', label: 'w_init', x: 80, y: 150, isInitial: true, isAccepting: false },
        { id: 'w0', label: 'w0', x: 220, y: 150, isInitial: false, isAccepting: false },
        { id: 'w1', label: 'w1', x: 380, y: 150, isInitial: false, isAccepting: false },
        { id: 'w2', label: 'w2', x: 540, y: 150, isInitial: false, isAccepting: false },
        { id: 'w3', label: 'w3', x: 380, y: 280, isInitial: false, isAccepting: false },
        { id: 'w_acc', label: 'w_acc', x: 220, y: 280, isInitial: false, isAccepting: true },
        { id: 'w_rej', label: 'w_rej', x: 540, y: 280, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'we_hash', sourceNodeId: 'w_init', targetNodeId: 'w0', label: '# → #, R', readSymbol: '#', writeSymbol: '#', moveDirection: 'R' },
        { id: 'we0', sourceNodeId: 'w0', targetNodeId: 'w1', label: '0 → X, R', readSymbol: '0', writeSymbol: 'X', moveDirection: 'R' },
        { id: 'we1', sourceNodeId: 'w0', targetNodeId: 'w3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'we2', sourceNodeId: 'w0', targetNodeId: 'w_acc', label: '$ → $, S', readSymbol: '$', writeSymbol: '$', moveDirection: 'S' },
        { id: 'we3', sourceNodeId: 'w1', targetNodeId: 'w1', label: '0 → 0, R', readSymbol: '0', writeSymbol: '0', moveDirection: 'R' },
        { id: 'we4', sourceNodeId: 'w1', targetNodeId: 'w1', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'we5', sourceNodeId: 'w1', targetNodeId: 'w2', label: '1 → Y, L', readSymbol: '1', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'we6', sourceNodeId: 'w2', targetNodeId: 'w2', label: 'Y → Y, L', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'L' },
        { id: 'we7', sourceNodeId: 'w2', targetNodeId: 'w2', label: '0 → 0, L', readSymbol: '0', writeSymbol: '0', moveDirection: 'L' },
        { id: 'we8', sourceNodeId: 'w2', targetNodeId: 'w0', label: 'X → X, R', readSymbol: 'X', writeSymbol: 'X', moveDirection: 'R' },
        { id: 'we9', sourceNodeId: 'w3', targetNodeId: 'w3', label: 'Y → Y, R', readSymbol: 'Y', writeSymbol: 'Y', moveDirection: 'R' },
        { id: 'we10', sourceNodeId: 'w3', targetNodeId: 'w_acc', label: '$ → $, S', readSymbol: '$', writeSymbol: '$', moveDirection: 'S' },
        { id: 'we11', sourceNodeId: 'w3', targetNodeId: 'w_rej', label: '0 → 0, S', readSymbol: '0', writeSymbol: '0', moveDirection: 'S' },
        { id: 'we12', sourceNodeId: 'w3', targetNodeId: 'w_rej', label: '1 → 1, S', readSymbol: '1', writeSymbol: '1', moveDirection: 'S' },
        { id: 'we13', sourceNodeId: 'w3', targetNodeId: 'w_rej', label: '□ → □, S', readSymbol: '□', writeSymbol: '□', moveDirection: 'S' },
      ],
    },
    testCases: [
      { sourceInput: '#', expectedTargetInput: '#$', isSourceMember: true, isTargetMember: true, notes: 'n=0' },
      { sourceInput: '#01', expectedTargetInput: '#01$', isSourceMember: true, isTargetMember: true, notes: 'n=1' },
      { sourceInput: '#0', expectedTargetInput: '#0$', isSourceMember: false, isTargetMember: false, notes: 'Unbalanced' },
    ],
    educationalSignificance:
      'Serves as step 2 in composition: A = L_0n1n, B = L_#0n1n, C = L_#0n1n$. Demonstrates chain transitivity.',
  },
];

/**
 * Executes a mapping reduction: computes y = f(x), runs MA(x) and MB(y),
 * verifies equivalence, and emits a structured Reduction Certificate.
 */
export function executeMappingReduction(
  reduction: MappingReductionExample,
  inputX: string,
  options?: TMExecutionOptions
): ReductionExecutionCertificate {
  const blankSymbol = options?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;

  // 1. Compute transformed target input y = f(x)
  const transformedTargetInput = reduction.transformFn(inputX);

  // 2. Execute source machine MA on inputX
  const sourceExecution = executeTM(reduction.sourceGraph, inputX, {
    blankSymbol,
    maxSteps: options?.maxSteps ?? 500,
  });

  // 3. Execute target machine MB on transformed target input y
  const targetExecution = executeTM(reduction.targetGraph, transformedTargetInput, {
    blankSymbol,
    maxSteps: options?.maxSteps ?? 500,
  });

  const isSourceAccepted = sourceExecution.isAccepted;
  const isTargetAccepted = targetExecution.isAccepted;
  const isEquivalencePreserved = isSourceAccepted === isTargetAccepted;

  const solvabilityTransferSummary =
    `Because ${reduction.sourceLanguageName} ≤m ${reduction.targetLanguageName}, ` +
    `the decision D_A(x) = D_B(f(x)) produces ${isTargetAccepted ? 'ACCEPT' : 'REJECT'}.`;

  const boundedExecutionNote =
    'This verification confirms membership equivalence on this specific finite input. ' +
    'Totality and computability of f are proven mathematically by the transformation specification.';

  return {
    reductionId: reduction.id,
    reductionName: reduction.name,
    sourceInput: inputX,
    transformedTargetInput,
    sourceExecution,
    targetExecution,
    isSourceAccepted,
    isTargetAccepted,
    isEquivalencePreserved,
    totalityClaim: 'TOTAL: Algorithm terminates for all inputs in finite steps.',
    computabilityClaim: 'COMPUTABLE: Transformation is computable by a deterministic Turing machine.',
    solvabilityTransferSummary,
    boundedExecutionNote,
    verificationTimestamp: new Date().toISOString(),
  };
}

/**
 * Demonstrates transitivity / composition:
 * A ≤m B via f, and B ≤m C via g  ==>  A ≤m C via (g ∘ f).
 */
export function composeReductions(
  reductionAB: MappingReductionExample,
  reductionBC: MappingReductionExample,
  inputX: string
): ComposedReductionResult {
  const inputY = reductionAB.transformFn(inputX);
  const inputZ = reductionBC.transformFn(inputY);

  const execA = executeTM(reductionAB.sourceGraph, inputX);
  const execB = executeTM(reductionAB.targetGraph, inputY);
  const execC = executeTM(reductionBC.targetGraph, inputZ);

  const isMemberA = execA.isAccepted;
  const isMemberB = execB.isAccepted;
  const isMemberC = execC.isAccepted;

  const isChainEquivalencePreserved = isMemberA === isMemberB && isMemberB === isMemberC;

  return {
    languageAName: reductionAB.sourceLanguageName,
    languageBName: reductionAB.targetLanguageName,
    languageCName: reductionBC.targetLanguageName,
    sourceInputX: inputX,
    intermediateInputY: inputY,
    finalTargetInputZ: inputZ,
    isMemberA,
    isMemberB,
    isMemberC,
    isChainEquivalencePreserved,
    compositionFormula: `h(x) = g(f(x)): "${inputX}" ──f──> "${inputY}" ──g──> "${inputZ}"`,
  };
}
