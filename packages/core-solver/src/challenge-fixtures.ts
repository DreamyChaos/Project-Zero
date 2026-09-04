import { ChallengeDefinition } from './types';

/**
 * Pure deterministic challenge library containing reference automata and test fixtures.
 */
export const CHALLENGE_LIBRARY: ReadonlyArray<ChallengeDefinition> = [
  {
    id: 'dfa-ends-01',
    title: 'DFA: Strings Ending in "01"',
    category: 'DFA',
    difficulty: 'BEGINNER',
    prompt: 'Construct a Deterministic Finite Automaton (DFA) over Σ = {0, 1} that accepts all strings ending in "01".',
    targetMachineType: 'DFA',
    expectedLanguageDescription: 'L = { w ∈ {0,1}* | w ends in "01" }',
    positiveExamples: ['01', '001', '101', '1101', '0001'],
    negativeExamples: ['', '0', '1', '10', '11', '010', '100'],
    hints: [
      'Think about what information the automaton needs to remember about the last 2 symbols consumed.',
      'Define state q0 for empty/neutral suffix, q1 for ending in "0", and q2 for ending in "01" (accepting).',
      'From q2 (ending in 01), on symbol 0 transition back to q1 (ending in 0); on symbol 1 transition to q0.'
    ],
    referenceMachineType: 'DFA',
    referenceGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 280, y: 150, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 460, y: 150, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q1', label: '0' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q2', label: '1' },
        { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q1', label: '0' },
        { id: 'e5', sourceNodeId: 'q2', targetNodeId: 'q0', label: '1' },
      ],
    },
  },
  {
    id: 'dfa-even-ones',
    title: 'DFA: Even Number of "1"s',
    category: 'DFA',
    difficulty: 'BEGINNER',
    prompt: 'Construct a DFA over Σ = {0, 1} that accepts strings containing an even number of "1"s (including zero "1"s).',
    targetMachineType: 'DFA',
    expectedLanguageDescription: 'L = { w ∈ {0,1}* | |w|_1 is even }',
    positiveExamples: ['', '0', '00', '11', '01010', '1111'],
    negativeExamples: ['1', '01', '10', '111', '01110'],
    hints: [
      'Track parity of count of 1s: state q_even (initial & accepting) and q_odd (non-accepting).',
      'Symbol 0 should be a self-loop on both states since it does not affect parity.',
      'Symbol 1 toggles between q_even and q_odd.'
    ],
    referenceMachineType: 'DFA',
    referenceGraph: {
      nodes: [
        { id: 'q_even', label: 'q_even', x: 150, y: 150, isInitial: true, isAccepting: true },
        { id: 'q_odd', label: 'q_odd', x: 350, y: 150, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q_even', targetNodeId: 'q_even', label: '0' },
        { id: 'e1', sourceNodeId: 'q_even', targetNodeId: 'q_odd', label: '1' },
        { id: 'e2', sourceNodeId: 'q_odd', targetNodeId: 'q_odd', label: '0' },
        { id: 'e3', sourceNodeId: 'q_odd', targetNodeId: 'q_even', label: '1' },
      ],
    },
  },
  {
    id: 'dfa-contains-101',
    title: 'DFA: Substring "101"',
    category: 'DFA',
    difficulty: 'INTERMEDIATE',
    prompt: 'Construct a DFA over Σ = {0, 1} that accepts any string containing "101" as a contiguous substring.',
    targetMachineType: 'DFA',
    expectedLanguageDescription: 'L = { w ∈ {0,1}* | w contains "101" }',
    positiveExamples: ['101', '0101', '1010', '1110100', '001011'],
    negativeExamples: ['', '0', '1', '10', '010', '100', '1100'],
    hints: [
      'Use 4 states representing matched prefix length: q0 (none), q1 ("1"), q2 ("10"), q3 ("101", accepting).',
      'Once in q3, self-loop on 0 and 1 because "101" has already been matched.',
      'In q2 ("10"), on symbol 0 transition back to q0 (since "100" resets matching prefix).'
    ],
    referenceMachineType: 'DFA',
    referenceGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 250, y: 150, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 400, y: 150, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 550, y: 150, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q2', label: '0' },
        { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q0', label: '0' },
        { id: 'e5', sourceNodeId: 'q2', targetNodeId: 'q3', label: '1' },
        { id: 'e6', sourceNodeId: 'q3', targetNodeId: 'q3', label: '0' },
        { id: 'e7', sourceNodeId: 'q3', targetNodeId: 'q3', label: '1' },
      ],
    },
  },
  {
    id: 'nfa-contains-ab',
    title: 'NFA: Substring "ab"',
    category: 'NFA',
    difficulty: 'BEGINNER',
    prompt: 'Construct a Non-Deterministic Finite Automaton (NFA) over Σ = {a, b} that accepts strings containing "ab".',
    targetMachineType: 'NFA',
    expectedLanguageDescription: 'L = { w ∈ {a,b}* | w contains "ab" }',
    positiveExamples: ['ab', 'aab', 'abb', 'bab', 'baba'],
    negativeExamples: ['', 'a', 'b', 'ba', 'bba'],
    hints: [
      'An NFA can stay in the initial state using non-deterministic branching on a and b.',
      'Nondeterministically guess when "ab" starts: transition q0 --a--> q1 --b--> q2 (accepting).',
      'q2 should self-loop on a and b.'
    ],
    referenceMachineType: 'NFA',
    referenceGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 150, y: 150, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 300, y: 150, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 450, y: 150, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'b' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'b' },
        { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q2', label: 'a' },
        { id: 'e5', sourceNodeId: 'q2', targetNodeId: 'q2', label: 'b' },
      ],
    },
  },
  {
    id: 'pda-an-bn',
    title: 'PDA: Context-Free Language {a^n b^n | n ≥ 1}',
    category: 'PDA',
    difficulty: 'INTERMEDIATE',
    prompt: 'Construct a Pushdown Automaton (PDA) that accepts strings of the form a^n b^n for n ≥ 1 (e.g. ab, aabb, aaabbb).',
    targetMachineType: 'PDA',
    expectedLanguageDescription: 'L = { a^n b^n | n ≥ 1 }',
    positiveExamples: ['ab', 'aabb', 'aaabbb', 'aaaabbbb'],
    negativeExamples: ['', 'a', 'b', 'aab', 'abb', 'ba', 'aba', 'aabbb'],
    hints: [
      'Push symbol A to stack for every input "a" consumed in initial state q0.',
      'On first "b", pop A and transition to state q1.',
      'In q1, continue popping A for every "b". Transition to accepting state q2 when initial stack symbol Z0 is restored.'
    ],
    referenceMachineType: 'PDA',
    referenceGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 150, y: 150, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 320, y: 150, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 490, y: 150, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / A Z0' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / A A' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, A / ε' },
        { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, A / ε' },
        { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε, Z0 / Z0' },
      ],
    },
  },
  {
    id: 'tm-unary-increment',
    title: 'TM: Unary Increment (1^n → 1^{n+1})',
    category: 'TM',
    difficulty: 'ADVANCED',
    prompt: 'Construct a Turing Machine (TM) that appends a "1" to a unary string of "1"s (e.g. 11 → 111).',
    targetMachineType: 'TM',
    expectedLanguageDescription: 'Computes f(1^n) = 1^{n+1}',
    positiveExamples: ['1', '11', '111', '1111'],
    negativeExamples: ['', '0', '01'],
    hints: [
      'Move right across all 1s on tape in state q0 until blank symbol □ is encountered.',
      'Write 1 over □ and halt in accepting state q_accept.'
    ],
    referenceMachineType: 'TM',
    referenceGraph: {
      nodes: [
        { id: 'q0', label: 'q0', x: 150, y: 150, isInitial: true, isAccepting: false },
        { id: 'q_acc', label: 'q_acc', x: 350, y: 150, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1 -> 1, R' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q_acc', label: '□ -> 1, S' },
      ],
    },
  },
];

export function getChallengeById(id: string): ChallengeDefinition | undefined {
  return CHALLENGE_LIBRARY.find((c) => c.id === id);
}
