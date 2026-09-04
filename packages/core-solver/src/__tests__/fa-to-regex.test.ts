import { describe, it, expect } from 'vitest';
import { convertAutomatonToRegex } from '../fa-to-regex';
import { SolverGraphInput } from '../types';
import { parseRegex } from '../regex-parser';
import { convertRegexToNFA } from '../regex-to-nfa';
import { compareAutomataLanguages } from '../dfa-equivalence';

describe('FA to Regular Expression — GNFA State Elimination (Module 2 Topic 4)', () => {
  it('1. Single state accepting ε: returns ε', () => {
    const graph: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }],
      edges: [],
    };

    const res = convertAutomatonToRegex(graph);
    expect(res.success).toBe(true);
    expect(res.simplifiedRegex).toBe('ε');
  });

  it('2. Single state with self loop on a: returns a*', () => {
    const graph: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }],
      edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a' }],
    };

    const res = convertAutomatonToRegex(graph);
    expect(res.success).toBe(true);
    expect(res.simplifiedRegex).toBe('a*');

    // Parse check
    const parse = parseRegex(res.simplifiedRegex);
    expect(parse.success).toBe(true);
  });

  it('3. Two-state machine for ab: returns ab', () => {
    const graph: SolverGraphInput = {
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

    const res = convertAutomatonToRegex(graph);
    expect(res.success).toBe(true);
    expect(res.simplifiedRegex).toBe('ab');

    // Cross-verification
    const nfa = convertRegexToNFA(res.simplifiedRegex);
    expect(nfa.success).toBe(true);
    const comp = compareAutomataLanguages(graph, 'DFA', { nodes: [...nfa.nodes], edges: [...nfa.edges] }, 'NFA');
    expect(comp.isEquivalent).toBe(true);
  });

  it('4. Parallel transitions: returns a|b', () => {
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b' },
      ],
    };

    const res = convertAutomatonToRegex(graph);
    expect(res.success).toBe(true);
    expect(res.simplifiedRegex).toMatch(/a\|b|b\|a/);

    const nfa = convertRegexToNFA(res.simplifiedRegex);
    const comp = compareAutomataLanguages(graph, 'NFA', { nodes: [...nfa.nodes], edges: [...nfa.edges] }, 'NFA');
    expect(comp.isEquivalent).toBe(true);
  });

  it('5. Loop on first state + transition to second state: a*b', () => {
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b' },
      ],
    };

    const res = convertAutomatonToRegex(graph);
    expect(res.success).toBe(true);
    expect(res.simplifiedRegex).toBe('a*b');

    const nfa = convertRegexToNFA(res.simplifiedRegex);
    const comp = compareAutomataLanguages(graph, 'DFA', { nodes: [...nfa.nodes], edges: [...nfa.edges] }, 'NFA');
    expect(comp.isEquivalent).toBe(true);
  });

  it('6. Multiple accepting states with state elimination trace', () => {
    // q0 (init, acc) --a--> q1 (acc)
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' }],
    };

    const res = convertAutomatonToRegex(graph);
    expect(res.success).toBe(true);
    expect(res.trace.length).toBe(2); // Eliminated q0 and q1

    const nfa = convertRegexToNFA(res.simplifiedRegex);
    const comp = compareAutomataLanguages(graph, 'DFA', { nodes: [...nfa.nodes], edges: [...nfa.edges] }, 'NFA');
    expect(comp.isEquivalent).toBe(true);
  });

  it('7. Empty language automaton (no accepting states): returns empty regex', () => {
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      ],
      edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' }],
    };

    const res = convertAutomatonToRegex(graph);
    expect(res.success).toBe(true);
    expect(res.regex).toBe('');
    expect(res.simplifiedRegex).toBe('');
  });

  it('8. Cyclic DFA (even number of 0s): preserves language', () => {
    // q0 (init, acc) --0--> q1, q1 --0--> q0
    const graph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
      ],
    };

    const res = convertAutomatonToRegex(graph);
    expect(res.success).toBe(true);

    const nfa = convertRegexToNFA(res.simplifiedRegex);
    expect(nfa.success).toBe(true);
    const comp = compareAutomataLanguages(graph, 'DFA', { nodes: [...nfa.nodes], edges: [...nfa.edges] }, 'NFA');
    expect(comp.isEquivalent).toBe(true);
  });
});
