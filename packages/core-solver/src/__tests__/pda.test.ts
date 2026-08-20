import { describe, it, expect } from 'vitest';
import { validatePDA } from '../pda-validator';
import { executePDA } from '../pda-executor';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

describe('PDA Execution Engine Tests', () => {
  it('1. Validates a sound PDA correctly', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / Z0' },
    ];

    const val = validatePDA({ nodes, edges }, 'Z0');
    expect(val.isValid).toBe(true);
  });

  it('2. Executes deterministic PDA for L = { a^n b^n | n >= 1 }', () => {
    // q0 (initial): on 'a', Z0 -> push A Z0 -> q0; on 'a', A -> push AA -> q0; on 'b', A -> pop A -> q1
    // q1: on 'b', A -> pop A -> q1; on 'ε', Z0 -> Z0 -> q2 (accepting)
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / AZ0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / AA' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε, Z0 / Z0' },
    ];

    const resAccepted = executePDA({ nodes, edges }, 'aabb');
    expect(resAccepted.isAccepted).toBe(true);
    expect(resAccepted.steps.length).toBeGreaterThan(0);

    const resRejected = executePDA({ nodes, edges }, 'aabbb');
    expect(resRejected.isAccepted).toBe(false);

    const resMismatch = executePDA({ nodes, edges }, 'ab');
    expect(resMismatch.isAccepted).toBe(true);
  });

  it('3. Handles nondeterministic PDA branching for palindromes L = { w c w^R | w in {a,b}* }', () => {
    // q0: push symbols on input a,b; on 'c', ε / ε -> q1;
    // q1: pop matching symbols on input a,b; on 'ε', Z0 -> Z0 -> q2 (accepting)
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / AZ0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'b, Z0 / BZ0' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / AA' },
      { id: 'e3', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'b, A / BA' },
      { id: 'e4', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, B / AB' },
      { id: 'e5', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'b, B / BB' },
      { id: 'e6', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'c, Z0 / Z0' },
      { id: 'e7', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'c, A / A' },
      { id: 'e8', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'c, B / B' },
      { id: 'e9', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'a, A / ε' },
      { id: 'e10', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, B / ε' },
      { id: 'e11', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε, Z0 / Z0' },
    ];

    expect(executePDA({ nodes, edges }, 'abcba').isAccepted).toBe(true);
    expect(executePDA({ nodes, edges }, 'abacaba').isAccepted).toBe(true);
    expect(executePDA({ nodes, edges }, 'abcab').isAccepted).toBe(false);
  });

  it('4. Handles execution safety limit on infinite epsilon cycles', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'ε, Z0 / AZ0' },
    ];

    const res = executePDA({ nodes, edges }, 'a', { maxSteps: 20 });
    expect(res.isAccepted).toBe(false);
  });

  it('5. Handles comma-containing and multi-character stack symbols without state key collisions', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
    ];
    const edges: TransitionEdge[] = [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z,0 / A' },
    ];

    // Verify initial stack symbol Z,0 works correctly
    const res = executePDA({ nodes, edges }, '', { initialStackSymbol: 'Z,0' });
    expect(res.isAccepted).toBe(true);
    expect(res.branchTree?.totalNodes).toBeGreaterThanOrEqual(1);
  });
});
