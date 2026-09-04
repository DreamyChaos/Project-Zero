import { describe, it, expect } from 'vitest';
import { gradeSubmission, getChallengeHint } from '../grading-engine';
import { getChallengeById } from '../challenge-fixtures';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('Automata Challenge & Formal Grading Engine Tests', () => {
  const dfaEnds01Challenge = getChallengeById('dfa-ends-01')!;

  // Correct DFA for "ends in 01"
  const correctDfaNodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
    { id: 'q1', label: 'q1', x: 280, y: 150, isInitial: false, isAccepting: false },
    { id: 'q2', label: 'q2', x: 460, y: 150, isInitial: false, isAccepting: true },
  ];
  const correctDfaEdges: TransitionEdge[] = [
    { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1' },
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
    { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q1', label: '0' },
    { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q2', label: '1' },
    { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q1', label: '0' },
    { id: 'e5', sourceNodeId: 'q2', targetNodeId: 'q0', label: '1' },
  ];

  it('1. Grades correct DFA submission as PASS (100/100) with exact language equivalence', () => {
    const result = gradeSubmission(dfaEnds01Challenge, { nodes: correctDfaNodes, edges: correctDfaEdges }, 'DFA');

    expect(result.status).toBe('PASS');
    expect(result.score).toBe(100);
    expect(result.isExactLanguageMatch).toBe(true);
    expect(result.shortestCounterexample).toBeUndefined();
    expect(result.failedChecks.length).toBe(0);
    expect(result.explanation).toContain('100/100');
  });

  it('2. Rejects invalid DFA submission (missing initial state) with INVALID_MACHINE status', () => {
    const invalidNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false, isAccepting: false },
    ];

    const result = gradeSubmission(dfaEnds01Challenge, { nodes: invalidNodes, edges: [] }, 'DFA');

    expect(result.status).toBe('INVALID_MACHINE');
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('invalid');
  });

  it('3. Rejects wrong machine type submission', () => {
    const result = gradeSubmission(dfaEnds01Challenge, { nodes: correctDfaNodes, edges: correctDfaEdges }, 'NFA');

    expect(result.status).toBe('FAIL');
    expect(result.failedChecks.some((c) => c.name.includes('Machine Type'))).toBe(true);
  });

  it('4. Detects non-equivalent DFA and produces shortest counterexample', () => {
    // Flawed DFA: accepts "0" instead of "01"
    const flawedDfaNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 100, y: 150, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 280, y: 150, isInitial: false, isAccepting: true },
    ];
    const flawedDfaEdges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
    ];

    const result = gradeSubmission(dfaEnds01Challenge, { nodes: flawedDfaNodes, edges: flawedDfaEdges }, 'DFA');

    expect(result.status).toBe('FAIL');
    expect(result.isExactLanguageMatch).toBe(false);
    expect(result.shortestCounterexample).toBeDefined();
    expect(result.explanation).toContain('Shortest distinguishing counterexample');
  });

  it('5. Evaluates positive and negative example arrays correctly', () => {
    const result = gradeSubmission(dfaEnds01Challenge, { nodes: correctDfaNodes, edges: correctDfaEdges }, 'DFA');

    expect(result.positiveExamplesEvaluations.length).toBeGreaterThan(0);
    expect(result.negativeExamplesEvaluations.length).toBeGreaterThan(0);
    expect(result.positiveExamplesEvaluations.every((e) => e.passed)).toBe(true);
    expect(result.negativeExamplesEvaluations.every((e) => e.passed)).toBe(true);
  });

  it('6. Progressive hint engine retrieves hints deterministically without state mutation', () => {
    const hint0 = getChallengeHint(dfaEnds01Challenge, 0);
    const hint1 = getChallengeHint(dfaEnds01Challenge, 1);
    const hintInvalid = getChallengeHint(dfaEnds01Challenge, 99);

    expect(hint0).toBeDefined();
    expect(hint1).toBeDefined();
    expect(hintInvalid).toBeNull();
  });

  it('7. Hostile Immutability Test: Grading process causes 0 mutations to candidate graph objects', () => {
    const nodesCopy = JSON.parse(JSON.stringify(correctDfaNodes));
    const edgesCopy = JSON.parse(JSON.stringify(correctDfaEdges));

    gradeSubmission(dfaEnds01Challenge, { nodes: correctDfaNodes, edges: correctDfaEdges }, 'DFA');

    expect(correctDfaNodes).toEqual(nodesCopy);
    expect(correctDfaEdges).toEqual(edgesCopy);
  });
});
