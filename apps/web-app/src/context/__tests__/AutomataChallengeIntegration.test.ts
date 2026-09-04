import { describe, it, expect } from 'vitest';
import {
  CHALLENGE_LIBRARY,
  getChallengeById,
  gradeSubmission,
  getChallengeHint,
} from '@project-zero/core-solver';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Automata Challenge & Formal Grading Engine Integration Tests', () => {
  const challengeDfa = getChallengeById('dfa-ends-01')!;

  const candidateNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 280, y: 150, isInitial: false, isAccepting: false },
    { id: 'q2', label: 'q2', x: 460, y: 150, isInitial: false, isAccepting: true },
  ];
  const candidateEdges: TransitionEdge[] = [
    { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1' },
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
    { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q1', label: '0' },
    { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q2', label: '1' },
    { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q1', label: '0' },
    { id: 'e5', sourceNodeId: 'q2', targetNodeId: 'q0', label: '1' },
  ];

  it('1. Challenge library contains deterministic fixtures for DFA, NFA, PDA, and TM', () => {
    expect(CHALLENGE_LIBRARY.length).toBeGreaterThanOrEqual(6);
    expect(CHALLENGE_LIBRARY.some((c) => c.category === 'DFA')).toBe(true);
    expect(CHALLENGE_LIBRARY.some((c) => c.category === 'NFA')).toBe(true);
    expect(CHALLENGE_LIBRARY.some((c) => c.category === 'PDA')).toBe(true);
    expect(CHALLENGE_LIBRARY.some((c) => c.category === 'TM')).toBe(true);
  });

  it('2. Grades candidate DFA against reference automaton using exact language equivalence', () => {
    const result = gradeSubmission(challengeDfa, { nodes: candidateNodes, edges: candidateEdges }, 'DFA');

    expect(result.status).toBe('PASS');
    expect(result.score).toBe(100);
    expect(result.isExactLanguageMatch).toBe(true);
    expect(result.explanation).toContain('100/100');
  });

  it('3. Hostile Immutability Test: Challenge grading & hint requests cause 0 graph object mutations', () => {
    const nodesCopy = JSON.parse(JSON.stringify(candidateNodes));
    const edgesCopy = JSON.parse(JSON.stringify(candidateEdges));

    // Request hints
    getChallengeHint(challengeDfa, 0);
    getChallengeHint(challengeDfa, 1);

    // Grade submission
    gradeSubmission(challengeDfa, { nodes: candidateNodes, edges: candidateEdges }, 'DFA');

    // Assert graph objects were not mutated
    expect(candidateNodes).toEqual(nodesCopy);
    expect(candidateEdges).toEqual(edgesCopy);
  });
});
