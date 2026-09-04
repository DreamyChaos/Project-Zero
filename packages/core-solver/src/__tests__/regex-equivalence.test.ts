import { describe, it, expect } from 'vitest';
import { checkAutomatonRegexEquivalence } from '../regex-equivalence';
import { SolverGraphInput } from '../types';

describe('FA ↔ Regular Expression Equivalence Engine (Module 2 Topic 4)', () => {
  const dfaAStar: SolverGraphInput = {
    nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }],
    edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a' }],
  };

  it('1. Equivalent: DFA(a*) vs Regex "a*"', () => {
    const res = checkAutomatonRegexEquivalence(dfaAStar, 'DFA', 'a*');
    expect(res.isEquivalent).toBe(true);
    expect(res.counterexample).toBeUndefined();
    expect(res.crossVerificationPassed).toBe(true);
  });

  it('2. Syntactically different but semantically equivalent: DFA(a*) vs Regex "(a*)*"', () => {
    const res = checkAutomatonRegexEquivalence(dfaAStar, 'DFA', '(a*)*');
    expect(res.isEquivalent).toBe(true);
    expect(res.counterexample).toBeUndefined();
  });

  it('3. Syntactically different equivalent union: DFA(a|b) vs Regex "b|a"', () => {
    const dfaUnion: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b' },
      ],
    };

    const res = checkAutomatonRegexEquivalence(dfaUnion, 'NFA', 'b|a');
    expect(res.isEquivalent).toBe(true);
  });

  it('4. Non-equivalent: DFA(a*) vs Regex "a" generates shortest counterexample ""', () => {
    const res = checkAutomatonRegexEquivalence(dfaAStar, 'DFA', 'a');
    expect(res.isEquivalent).toBe(false);
    expect(res.counterexample).toBe(''); // DFA accepts "", Regex "a" rejects ""
    expect(res.acceptsFA).toBe(true);
    expect(res.acceptsRegex).toBe(false);
  });

  it('5. Non-equivalent: DFA(ab) vs Regex "ba" generates counterexample', () => {
    const dfaAB: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'b' },
      ],
    };

    const res = checkAutomatonRegexEquivalence(dfaAB, 'DFA', 'ba');
    expect(res.isEquivalent).toBe(false);
    expect(res.counterexample).toBeDefined();
    expect(res.counterexample).toMatch(/ab|ba/);
  });

  it('6. Epsilon-NFA comparison: NFA with ε-transitions vs Regex', () => {
    // q0 (init) --ε--> q1 --a--> q2 (acc)
    const nfaEps: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'a' },
      ],
    };

    const res = checkAutomatonRegexEquivalence(nfaEps, 'NFA', 'a');
    expect(res.isEquivalent).toBe(true);
  });

  it('7. Malformed Regex input: returns validation error gracefully', () => {
    const res = checkAutomatonRegexEquivalence(dfaAStar, 'DFA', '(a|');
    expect(res.isEquivalent).toBe(false);
    expect(res.validationError).toContain('Regular Expression parse failed');
  });

  it('8. Invalid Automaton: returns validation error gracefully', () => {
    const invalidDFA: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false, isAccepting: true }],
      edges: [],
    };

    const res = checkAutomatonRegexEquivalence(invalidDFA, 'DFA', 'a*');
    expect(res.isEquivalent).toBe(false);
    expect(res.validationError).toContain('Finite Automaton validation failed');
  });

  it('9. State isolation: repeated checks do not leak state', () => {
    const res1 = checkAutomatonRegexEquivalence(dfaAStar, 'DFA', 'a*');
    expect(res1.isEquivalent).toBe(true);

    const res2 = checkAutomatonRegexEquivalence(dfaAStar, 'DFA', 'b*');
    expect(res2.isEquivalent).toBe(false);

    const res3 = checkAutomatonRegexEquivalence(dfaAStar, 'DFA', 'a*');
    expect(res3.isEquivalent).toBe(true);
    expect(res3.counterexample).toBeUndefined();
  });
});
