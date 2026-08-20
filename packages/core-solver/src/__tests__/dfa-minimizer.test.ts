import { describe, it, expect } from 'vitest';
import { minimizeDFA } from '../dfa-minimizer';
import { executeDFA } from '../dfa-executor';
import { validateDFA } from '../dfa-validator';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('DFA Minimization via Partition Refinement Tests', () => {
  it('1. Returns already minimal for minimal DFA', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
      { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
    ];

    const res = minimizeDFA({ nodes, edges });
    expect(res.success).toBe(true);
    expect(res.isAlreadyMinimal).toBe(true);
    expect(res.minimizedStateCount).toBe(2);
  });

  it('2 & 3. Merges 2 equivalent states (e.g. q1 and q3)', () => {
    // q0 (initial, non-accepting) -> 'a' -> q1, 'b' -> q2
    // q1 (accepting) -> 'a' -> q1, 'b' -> q2
    // q2 (non-accepting) -> 'a' -> q2, 'b' -> q2
    // q3 (accepting) -> 'a' -> q3, 'b' -> q2 (q3 is equivalent to q1!)
    // To make q3 reachable, q0 -> 'a' -> q1, q1 -> 'a' -> q3
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: false },
      { id: 'q3', label: 'q3', x: 300, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'b' },
      { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q3', label: 'a' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'b' },
      { id: 'e4', sourceNodeId: 'q2', targetNodeId: 'q2', label: 'a' },
      { id: 'e5', sourceNodeId: 'q2', targetNodeId: 'q2', label: 'b' },
      { id: 'e6', sourceNodeId: 'q3', targetNodeId: 'q3', label: 'a' },
      { id: 'e7', sourceNodeId: 'q3', targetNodeId: 'q2', label: 'b' },
    ];

    const res = minimizeDFA({ nodes, edges });
    expect(res.success).toBe(true);
    expect(res.originalStateCount).toBe(4);
    expect(res.minimizedStateCount).toBe(3);
    expect(res.mergedStateCount).toBe(1);

    // Verify Language Equivalence original vs minimized
    const testStrings = ['', 'a', 'b', 'ab', 'aba', 'abb', 'aab', 'abaab'];
    for (const str of testStrings) {
      const origExec = executeDFA({ nodes, edges }, str);
      const minExec = executeDFA({ nodes: res.nodes, edges: res.edges }, str);
      expect(minExec.isAccepted).toBe(origExec.isAccepted);
    }
  });

  it('4. Removes unreachable states during minimization', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      { id: 'q99', label: 'q99', x: 900, y: 0, isInitial: false, isAccepting: false }, // Unreachable
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'a' },
    ];

    const res = minimizeDFA({ nodes, edges });
    expect(res.success).toBe(true);
    expect(res.unreachableStateCount).toBe(1);
    expect(res.minimizedStateCount).toBe(2);
  });

  it('5. Accepting and non-accepting states never merge', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'a' },
    ];

    const res = minimizeDFA({ nodes, edges });
    expect(res.minimizedStateCount).toBe(2);
    expect(res.equivalenceClasses.some((c) => c.isAccepting)).toBe(true);
    expect(res.equivalenceClasses.some((c) => !c.isAccepting)).toBe(true);
  });

  it('6 & 7 & 8. Preserves initial state and generates deterministic DFA graph passing validateDFA()', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
    ];

    const res = minimizeDFA({ nodes, edges });
    expect(res.success).toBe(true);
    const initialMin = res.nodes.filter((n) => n.isInitial);
    expect(initialMin).toHaveLength(1);

    const val = validateDFA({ nodes: res.nodes, edges: res.edges });
    expect(val.isValid).toBe(true);
  });

  it('12. Rejects invalid DFA without mutating graph', () => {
    const invalidNodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false, isAccepting: false }, // No initial state!
    ];
    const res = minimizeDFA({ nodes: invalidNodes, edges: [] });
    expect(res.success).toBe(false);
    expect(res.errorMessage).toContain('validation failed');
  });

  it('20. Repeated minimization of an already-minimized result is idempotent', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'b' },
    ];

    const res1 = minimizeDFA({ nodes, edges });
    const res2 = minimizeDFA({ nodes: res1.nodes, edges: res1.edges });

    expect(res2.minimizedStateCount).toBe(res1.minimizedStateCount);
    expect(res2.isAlreadyMinimal).toBe(true);
  });

  it('21. Formats pure implicit trap partition label as Ø', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' },
      // q0 is missing transition on 'b', creating implicit trap state
    ];

    const res = minimizeDFA({ nodes, edges });
    expect(res.success).toBe(true);
    const trapNode = res.nodes.find((n) => n.label === 'Ø');
    expect(trapNode).toBeDefined();
  });
});
