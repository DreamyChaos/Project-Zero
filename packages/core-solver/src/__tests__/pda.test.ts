import { describe, it, expect } from 'vitest';
import {
  validatePDA,
  parsePDATransition,
  parseStackSymbols,
  computePDAAlphabets,
} from '../pda-validator';
import {
  executePDA,
  formatInstantaneousDescription,
} from '../pda-executor';
import {
  SolverGraphInput,
} from '../types';

describe('Module 4 Topic 4 — Pushdown Automata (PDA) Engine', () => {
  // Common test fixture: L = { a^n b^n | n >= 1 }
  // q0 (initial): on 'a', Z0 -> push A Z0 -> q0; on 'a', A -> push AA -> q0; on 'b', A -> pop A -> q1
  // q1: on 'b', A -> pop A -> q1; on 'ε', Z0 -> Z0 -> q2 (accepting)
  const anbnPDA: SolverGraphInput = {
    nodes: [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ],
    edges: [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / AZ0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / AA' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε, Z0 / Z0' },
    ],
  };

  // Fixture: L = { a^n b^n | n >= 1 } accepting by EMPTY STACK
  // q0: on 'a', Z0 -> push A Z0 -> q0; on 'a', A -> push AA -> q0; on 'b', A -> pop A -> q1
  // q1: on 'b', A -> pop A -> q1; on 'ε', Z0 -> pop Z0 (ε) -> q1
  const anbnEmptyStackPDA: SolverGraphInput = {
    nodes: [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
    ],
    edges: [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / AZ0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / AA' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'ε, Z0 / ε' }, // pops Z0 to empty stack
    ],
  };

  // ============================================================
  // Test A: PDA construction with formal 7-tuple
  // ============================================================
  it('Test A: PDA construction with formal 7-tuple', () => {
    const val = validatePDA(anbnPDA, 'Z0');
    expect(val.isValid).toBe(true);
    expect(val.machineType).toBe('PDA');
  });

  // ============================================================
  // Test B: State set Q representation and validation
  // ============================================================
  it('Test B: State set Q representation and duplicate/missing initial check', () => {
    const noInitial: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false, isAccepting: false }],
      edges: [],
    };
    const valNoInit = validatePDA(noInitial, 'Z0');
    expect(valNoInit.isValid).toBe(false);
    expect(valNoInit.errors.some((e) => e.code === 'MISSING_INITIAL_STATE')).toBe(true);

    const multiInitial: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 50, y: 0, isInitial: true, isAccepting: false },
      ],
      edges: [],
    };
    const valMultiInit = validatePDA(multiInitial, 'Z0');
    expect(valMultiInit.isValid).toBe(false);
    expect(valMultiInit.errors.some((e) => e.code === 'MULTIPLE_INITIAL_STATES')).toBe(true);
  });

  // ============================================================
  // Test C: Input alphabet Sigma extraction
  // ============================================================
  it('Test C: Input alphabet Sigma extraction', () => {
    const { inputAlphabet } = computePDAAlphabets(anbnPDA, 'Z0');
    expect(inputAlphabet).toEqual(['a', 'b']);
  });

  // ============================================================
  // Test D: Stack alphabet Gamma extraction
  // ============================================================
  it('Test D: Stack alphabet Gamma extraction', () => {
    const { stackAlphabet } = computePDAAlphabets(anbnPDA, 'Z0');
    expect(stackAlphabet).toEqual(['A', 'Z0']);
  });

  // ============================================================
  // Test E: Initial state q0 validation
  // ============================================================
  it('Test E: Initial state q0 correctly identified', () => {
    const initialNode = anbnPDA.nodes.find((n) => n.isInitial);
    expect(initialNode?.id).toBe('q0');
  });

  // ============================================================
  // Test F: Initial stack symbol Z0 validation
  // ============================================================
  it('Test F: Initial stack symbol Z0 validation rejects empty symbol', () => {
    const val = validatePDA(anbnPDA, '');
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.code === 'MISSING_INITIAL_STACK_SYMBOL')).toBe(true);
  });

  // ============================================================
  // Test G: Accepting states F set validation
  // ============================================================
  it('Test G: Accepting states F set identified and warnings for empty F', () => {
    const noAccepting: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false }],
      edges: [],
    };
    const val = validatePDA(noAccepting, 'Z0');
    expect(val.warnings.length).toBeGreaterThan(0);
  });

  // ============================================================
  // Test H: Transition creation and parsing
  // ============================================================
  it('Test H: Transition creation and parsing (a, X / gamma)', () => {
    const parsed1 = parsePDATransition('a, Z0 / A Z0');
    expect(parsed1.inputSymbol).toBe('a');
    expect(parsed1.stackTop).toBe('Z0');
    expect(parsed1.stackReplacement).toBe('A Z0');

    const parsed2 = parsePDATransition('b, A -> ε');
    expect(parsed2.inputSymbol).toBe('b');
    expect(parsed2.stackTop).toBe('A');
    expect(parsed2.stackReplacement).toBe('ε');
  });

  // ============================================================
  // Test I: Input-symbol transition consumes token
  // ============================================================
  it('Test I: Input-symbol transition consumes token', () => {
    const res = executePDA(anbnPDA, 'ab');
    expect(res.isAccepted).toBe(true);
    const step1 = res.steps[1];
    expect(step1.readSymbol).toBe('a');
    expect(step1.remainingInput).toBe('b');
  });

  // ============================================================
  // Test J: Epsilon-input transition does NOT consume token
  // ============================================================
  it('Test J: Epsilon-input transition does NOT consume token', () => {
    const res = executePDA(anbnPDA, 'ab');
    const epsStep = res.steps.find((s) => s.readSymbol === null && s.stepIndex > 0);
    expect(epsStep).toBeDefined();
    expect(epsStep?.remainingInput).toBe('ε');
  });

  // ============================================================
  // Test K: Stack-symbol condition matches top of stack
  // ============================================================
  it('Test K: Stack-symbol condition matches top of stack', () => {
    const parsed = parseStackSymbols('AZ0');
    expect(parsed).toEqual(['A', 'Z0']);
  });

  // ============================================================
  // Test L: Epsilon stack condition allows transition without popping
  // ============================================================
  it('Test L: Epsilon stack condition allows transition without popping', () => {
    const pdaEpsStack: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, ε / B' },
      ],
    };
    const res = executePDA(pdaEpsStack, 'a');
    expect(res.isAccepted).toBe(true);
    // Stack before was [Z0], stack after should be [Z0, B] (B is on top, Z0 not popped)
    expect(res.steps[1].stackAfter).toEqual(['Z0', 'B']);
  });

  // ============================================================
  // Test M: Push operation (X -> YZ) correctly updates stack
  // ============================================================
  it('Test M: Push operation (X -> YZ) updates stack', () => {
    const res = executePDA(anbnPDA, 'ab');
    // Step 1: on 'a', Z0 -> AZ0 => stack becomes [Z0, A]
    expect(res.steps[1].stackAfter).toEqual(['Z0', 'A']);
    expect(res.steps[1].stackOperation).toBe('REPLACE');
  });

  // ============================================================
  // Test N: Pop operation (X -> eps) removes stack top
  // ============================================================
  it('Test N: Pop operation (X -> eps) removes stack top', () => {
    const res = executePDA(anbnPDA, 'ab');
    // Step 2: on 'b', A -> eps => stack becomes [Z0]
    expect(res.steps[2].stackAfter).toEqual(['Z0']);
    expect(res.steps[2].stackOperation).toBe('POP');
  });

  // ============================================================
  // Test O: Replace operation (X -> Y)
  // ============================================================
  it('Test O: Replace operation (X -> Y)', () => {
    const replacePDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / Y' },
      ],
    };
    const res = executePDA(replacePDA, 'a');
    expect(res.isAccepted).toBe(true);
    expect(res.steps[1].stackAfter).toEqual(['Y']);
    expect(res.steps[1].stackOperation).toBe('REPLACE');
  });

  // ============================================================
  // Test P: Correct stack-top ordering
  // ============================================================
  it('Test P: Correct stack-top ordering (gamma = YZ => Y is on top)', () => {
    const orderPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / YZ' },
      ],
    };
    const res = executePDA(orderPDA, 'a');
    expect(res.isAccepted).toBe(true);
    // Stack representation has top at stack[stack.length - 1]
    // Pushing right-to-left: push 'Z', then push 'Y' => stack is ['Z', 'Y'], with 'Y' at top!
    const after = res.steps[1].stackAfter;
    expect(after[after.length - 1]).toBe('Y');
    expect(after[0]).toBe('Z');
  });

  // ============================================================
  // Test Q: Transition applicability verification
  // ============================================================
  it('Test Q: Transition applicability for all 4 combinations', () => {
    const multiPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: false },
        { id: 'q3', label: 'q3', x: 300, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / AZ0' }, // a, X
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'b, ε / B' },     // b, ε
        { id: 'e3', sourceNodeId: 'q2', targetNodeId: 'q3', label: 'ε, B / ε' },     // ε, X
      ],
    };
    const res = executePDA(multiPDA, 'ab');
    expect(res.isAccepted).toBe(true);
  });

  // ============================================================
  // Test R: Input consumption updates remaining string
  // ============================================================
  it('Test R: Input consumption updates remaining string', () => {
    const res = executePDA(anbnPDA, 'aabb');
    expect(res.steps[0].remainingInput).toBe('aabb');
    expect(res.steps[1].remainingInput).toBe('abb');
    expect(res.steps[2].remainingInput).toBe('bb');
  });

  // ============================================================
  // Test S: Epsilon transition non-consumption invariant
  // ============================================================
  it('Test S: Epsilon transition non-consumption invariant', () => {
    const res = executePDA(anbnPDA, 'ab');
    const epsStep = res.steps[res.steps.length - 1];
    expect(epsStep.readSymbol).toBeNull();
  });

  // ============================================================
  // Test T: Configuration generation (q, w, alpha)
  // ============================================================
  it('Test T: Configuration generation formatted as (q, w, alpha)', () => {
    const id = formatInstantaneousDescription('q0', 'aabb', ['Z0', 'A']);
    expect(id).toBe('(q0, aabb, AZ0)'); // 'A' is on top, so appears leftmost in alpha
  });

  // ============================================================
  // Test U: Configuration trace correctness across multi-step
  // ============================================================
  it('Test U: Configuration trace correctness across multi-step execution', () => {
    const res = executePDA(anbnPDA, 'ab');
    for (const step of res.steps) {
      expect(step.instantaneousDescription).toBeDefined();
      expect(step.instantaneousDescription.startsWith('(')).toBe(true);
      expect(step.instantaneousDescription.endsWith(')')).toBe(true);
    }
  });

  // ============================================================
  // Test V: State transition correctness
  // ============================================================
  it('Test V: State transition correctness (q0 -> q1 -> q2)', () => {
    const res = executePDA(anbnPDA, 'ab');
    expect(res.steps[1].currentStateId).toBe('q0');
    expect(res.steps[2].currentStateId).toBe('q0');
    expect(res.steps[3].currentStateId).toBe('q1');
  });

  // ============================================================
  // Test W: Acceptance by final state
  // ============================================================
  it('Test W: Acceptance by final state L(M)', () => {
    const res = executePDA(anbnPDA, 'aabb', { acceptanceMode: 'FINAL_STATE' });
    expect(res.isAccepted).toBe(true);
    expect(res.finalStates[0].id).toBe('q2');
  });

  // ============================================================
  // Test X: Rejection by final-state condition
  // ============================================================
  it('Test X: Rejection by final-state condition', () => {
    const res = executePDA(anbnPDA, 'aabbb', { acceptanceMode: 'FINAL_STATE' });
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Test Y: Acceptance by empty stack N(M)
  // ============================================================
  it('Test Y: Acceptance by empty stack N(M)', () => {
    const res = executePDA(anbnEmptyStackPDA, 'aabb', { acceptanceMode: 'EMPTY_STACK' });
    expect(res.isAccepted).toBe(true);
  });

  // ============================================================
  // Test Z: Rejection by empty-stack condition
  // ============================================================
  it('Test Z: Rejection by empty-stack condition when stack non-empty', () => {
    const res = executePDA(anbnPDA, 'aabb', { acceptanceMode: 'EMPTY_STACK' });
    // In anbnPDA, step ends in state q2 with stack [Z0] (not empty), so empty stack mode must REJECT!
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toBe('STACK_NOT_EMPTY');
  });

  // ============================================================
  // Test AA: Input exhaustion requirement
  // ============================================================
  it('Test AA: Input exhaustion requirement for acceptance', () => {
    // String 'aab' is rejected because input is not exhausted when no moves remain
    const res = executePDA(anbnPDA, 'aab');
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Test AB: Extra input rejection
  // ============================================================
  it('Test AB: Extra input rejection', () => {
    const res = executePDA(anbnPDA, 'aabba');
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Test AC: Missing input rejection
  // ============================================================
  it('Test AC: Missing input rejection on truncated string', () => {
    const res = executePDA(anbnPDA, 'a');
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Test AD: Empty input acceptance handling
  // ============================================================
  it('Test AD: Empty input epsilon accepted if initial is accepting', () => {
    const epsAcceptPDA: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }],
      edges: [],
    };
    const res = executePDA(epsAcceptPDA, '');
    expect(res.isAccepted).toBe(true);
  });

  // ============================================================
  // Test AE: Epsilon-cycle protection via bounded BFS
  // ============================================================
  it('Test AE: Epsilon-cycle protection via bounded BFS', () => {
    const cyclePDA: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false }],
      edges: [{ id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'ε, Z0 / AZ0' }],
    };
    const res = executePDA(cyclePDA, 'a', { maxSteps: 15 });
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Test AF: Search limit reached reporting
  // ============================================================
  it('Test AF: Search limit reached reporting INCONCLUSIVE_LIMIT', () => {
    const infiniteTreePDA: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false }],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'ε, ε / A' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'ε, ε / B' },
      ],
    };
    const res = executePDA(infiniteTreePDA, 'a', { maxConfigurations: 20 });
    expect(res.isInconclusive).toBe(true);
    expect(res.rejectionReason).toBe('INCONCLUSIVE_LIMIT');
  });

  // ============================================================
  // Test AG: Pure solver idempotency and reset behavior
  // ============================================================
  it('Test AG: Pure solver idempotency and reset behavior', () => {
    const res1 = executePDA(anbnPDA, 'aabb');
    const res2 = executePDA(anbnPDA, 'aabb');
    expect(res1.isAccepted).toBe(res2.isAccepted);
    expect(res1.steps.length).toBe(res2.steps.length);
  });

  // ============================================================
  // Test AH: Single-step execution
  // ============================================================
  it('Test AH: Single-step execution trace holds valid properties', () => {
    const res = executePDA(anbnPDA, 'ab');
    const s0 = res.steps[0];
    expect(s0.stepIndex).toBe(0);
    expect(s0.stackBefore).toEqual(['Z0']);
  });

  // ============================================================
  // Test AI: Multi-step execution for a^n b^n
  // ============================================================
  it('Test AI: Multi-step execution for a^3 b^3', () => {
    const res = executePDA(anbnPDA, 'aaabbb');
    expect(res.isAccepted).toBe(true);
    expect(res.steps.length).toBe(8); // Start + 3 pushes + 3 pops + 1 accept
  });

  // ============================================================
  // Test AJ: Stack invariant verification
  // ============================================================
  it('Test AJ: Stack invariant matches push and pop count', () => {
    const res = executePDA(anbnPDA, 'aabb');
    // aabb has 2 'a's (stack reaches depth 3: [Z0, A, A]), 2 'b's (pops 2 'A's back to [Z0])
    let maxStackDepth = 0;
    for (const step of res.steps) {
      if (step.stackAfter.length > maxStackDepth) {
        maxStackDepth = step.stackAfter.length;
      }
    }
    expect(maxStackDepth).toBe(3);
    expect(res.steps[res.steps.length - 1].stackAfter).toEqual(['Z0']);
  });

  // ============================================================
  // Test AK: Active transition ID tracking
  // ============================================================
  it('Test AK: Active transition ID tracking', () => {
    const res = executePDA(anbnPDA, 'ab');
    expect(res.steps[1].transitionId).toBe('e0');
    expect(res.steps[2].transitionId).toBe('e2');
    expect(res.steps[3].transitionId).toBe('e4');
  });

  // ============================================================
  // Test AL: Trace consistency with instantaneous descriptions
  // ============================================================
  it('Test AL: Trace consistency with instantaneous descriptions', () => {
    const res = executePDA(anbnPDA, 'ab');
    for (const s of res.steps) {
      const stateLabel = s.nextStateLabel ?? s.currentStateLabel;
      expect(s.instantaneousDescription).toContain(stateLabel);
    }
  });

  // ============================================================
  // Test AM: Non-default initial state
  // ============================================================
  it('Test AM: Non-default initial state (p0 instead of q0)', () => {
    const customInitPDA: SolverGraphInput = {
      nodes: [
        { id: 'p0', label: 'p0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'p1', label: 'p1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'p0', targetNodeId: 'p1', label: 'x, Z0 / Z0' },
      ],
    };
    const res = executePDA(customInitPDA, 'x');
    expect(res.isAccepted).toBe(true);
    expect(res.steps[0].currentStateLabel).toBe('p0');
  });

  // ============================================================
  // Test AN: Multiple accepting states
  // ============================================================
  it('Test AN: Multiple accepting states (F = {q1, q2})', () => {
    const multiAcceptPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / Z0' },
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'b, Z0 / Z0' },
      ],
    };
    expect(executePDA(multiAcceptPDA, 'a').isAccepted).toBe(true);
    expect(executePDA(multiAcceptPDA, 'b').isAccepted).toBe(true);
    expect(executePDA(multiAcceptPDA, 'c').isAccepted).toBe(false);
  });

  // ============================================================
  // Test AO: Regression tests for existing automata
  // ============================================================
  it('Test AO: Project Zero combined BOTH acceptance mode', () => {
    const bothPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true }, // accepting state
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / ε' }, // pops Z0, empties stack
      ],
    };
    const resBoth = executePDA(bothPDA, 'a', { acceptanceMode: 'BOTH' });
    expect(resBoth.isAccepted).toBe(true);

    // If state is accepting but stack not empty:
    const nonEmptypda: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / Z0' },
      ],
    };
    expect(executePDA(nonEmptypda, 'a', { acceptanceMode: 'BOTH' }).isAccepted).toBe(false);
  });

  // ============================================================
  // Test AP: Regression tests for existing CFG/parsing features
  // ============================================================
  it('Test AP: Nondeterministic palindrome PDA L = { w c w^R }', () => {
    const palPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
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
      ],
    };

    expect(executePDA(palPDA, 'abcba').isAccepted).toBe(true);
    expect(executePDA(palPDA, 'abacaba').isAccepted).toBe(true);
    expect(executePDA(palPDA, 'abcab').isAccepted).toBe(false);
  });
});
