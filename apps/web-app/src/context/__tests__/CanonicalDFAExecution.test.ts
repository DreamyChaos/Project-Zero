import { describe, it, expect } from 'vitest';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import { executeDFA, validateDFA, analyzeDFACompleteness } from '@project-zero/core-solver';

describe('Canonical DFA Execution & Execution Safety Tests', () => {
  it('executes canonical DFA correctly and updates completeness', () => {
    // Build canonical DFA:
    // q0 --0--> q0
    // q0 --1--> q1
    // q1 --0--> q0
    // q1 --1--> q1
    // q0 = initial, q1 = accepting
    const node0: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false };
    const node1: StateNode = { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true };

    const e0: TransitionEdge = { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' };
    const e1: TransitionEdge = { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' };
    const e2: TransitionEdge = { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' };
    const e3: TransitionEdge = { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' };

    const nodes = [node0, node1];
    let edges = [e0, e1, e2, e3];

    // Verification step 1: Validation and Completeness
    const validation1 = validateDFA({ nodes, edges });
    const completeness1 = analyzeDFACompleteness({ nodes, edges });
    expect(validation1.isValid).toBe(true);
    expect(completeness1.isComplete).toBe(true);

    // Verification step 2: Execution on string '1011' -> ACCEPT
    const exec1 = executeDFA({ nodes, edges }, '1011');
    expect(exec1.isAccepted).toBe(true);
    expect(exec1.finalStateId).toBe('q1');

    // Canonical Phase 13 deletion: delete q1 --0--> q0 (edge e2)
    edges = [e0, e1, e3];

    // Verification step 3: Graph remains structurally valid, but becomes incomplete
    const validation2 = validateDFA({ nodes, edges });
    const completeness2 = analyzeDFACompleteness({ nodes, edges });
    expect(validation2.isValid).toBe(true);
    expect(completeness2.isComplete).toBe(false);
    expect(completeness2.missingTransitions).toEqual([
      { stateId: 'q1', stateLabel: 'q1', symbol: '0' },
    ]);

    // Verification step 4: String '1011' after deleting q1 --0--> q0 (which was e2):
    // q0 -1-> q1 -0-> (missing!) -> halted.
    // So '1011' halts early on missing '0' from q1 and rejects safely with NO_TRANSITION!
    const exec2 = executeDFA({ nodes, edges }, '1011');
    expect(exec2.isAccepted).toBe(false);
    expect(exec2.rejectionReason).toBe('NO_TRANSITION');

    // String '1111': q0 -1-> q1 -1-> q1 -1-> q1 -1-> q1 (accepts!)
    const exec3 = executeDFA({ nodes, edges }, '1111');
    expect(exec3.isAccepted).toBe(true);
  });
});
