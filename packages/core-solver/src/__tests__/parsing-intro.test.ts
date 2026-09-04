import { describe, it, expect } from 'vitest';
import {
  parseTopDown,
  parseBottomUp,
  compareParsingApproaches,
  getTreeYield,
} from '../parsing-intro';
import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGProduction,
} from '../types';

// ===================================================================
// Fixtures
// ===================================================================

function nt(v: string): GrammarSymbol {
  return { type: 'NON_TERMINAL', value: v };
}
function t(v: string): GrammarSymbol {
  return { type: 'TERMINAL', value: v };
}
const EPS: GrammarSymbol = { type: 'EPSILON', value: 'ε' };

function prod(id: string, lhs: string, rhs: GrammarSymbol[]): CFGProduction {
  return { id, lhs, rhs };
}

// Simple grammar: S -> A B, A -> a, B -> b
const G_SIMPLE: ContextFreeGrammar = {
  variables: ['S', 'A', 'B'],
  terminals: ['a', 'b'],
  startVariable: 'S',
  productions: [
    prod('p1', 'S', [nt('A'), nt('B')]),
    prod('p2', 'A', [t('a')]),
    prod('p3', 'B', [t('b')]),
  ],
};

// Recursive grammar: S -> a S | b
const G_RECURSIVE: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a', 'b'],
  startVariable: 'S',
  productions: [
    prod('p1', 'S', [t('a'), nt('S')]),
    prod('p2', 'S', [t('b')]),
  ],
};

// Grammar with non-S start symbol: E -> E + T | T, T -> a
const G_NON_S: ContextFreeGrammar = {
  variables: ['E', 'T'],
  terminals: ['a', '+'],
  startVariable: 'E',
  productions: [
    prod('p1', 'E', [nt('E'), t('+'), nt('T')]),
    prod('p2', 'E', [nt('T')]),
    prod('p3', 'T', [t('a')]),
  ],
};

// Grammar with epsilon: S -> a S b | ε
const G_EPSILON: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a', 'b'],
  startVariable: 'S',
  productions: [
    prod('p1', 'S', [t('a'), nt('S'), t('b')]),
    prod('p2', 'S', [EPS]),
  ],
};

// Grammar with choice/conflict potential: S -> A a | b, A -> b
const G_CONFLICT: ContextFreeGrammar = {
  variables: ['S', 'A'],
  terminals: ['a', 'b'],
  startVariable: 'S',
  productions: [
    prod('p1', 'S', [nt('A'), t('a')]),
    prod('p2', 'S', [t('b')]),
    prod('p3', 'A', [t('b')]),
  ],
};

// Left-recursive grammar to test safe search bounding
const G_LEFT_REC: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a'],
  startVariable: 'S',
  productions: [
    prod('p1', 'S', [nt('S'), t('a')]),
    prod('p2', 'S', [t('a')]),
  ],
};

// ===================================================================
// 1. TOP-DOWN PARSING TESTS (Tests A through K)
// ===================================================================

describe('Top-Down Parsing Engine', () => {
  it('Test A: Simple successful derivation (S -> AB, "ab" => ACCEPT)', () => {
    const res = parseTopDown(G_SIMPLE, 'ab');
    expect(res.status).toBe('ACCEPT');
    expect(res.isAccepted).toBe(true);
    expect(res.isSearchLimitReached).toBe(false);
    expect(res.steps.length).toBeGreaterThanOrEqual(3);

    // Initial step starts from S
    expect(res.steps[0].sententialForm[0].value).toBe('S');

    // Final step has empty remaining input
    const lastStep = res.steps[res.steps.length - 1];
    expect(lastStep.remainingInput).toBe('');

    // Parse tree matches yield
    expect(res.parseTree).toBeDefined();
    expect(getTreeYield(res.parseTree!)).toBe('ab');
  });

  it('Test B: Wrong input rejection ("aa" => REJECT)', () => {
    const res = parseTopDown(G_SIMPLE, 'aa');
    expect(res.status).toBe('REJECT');
    expect(res.isAccepted).toBe(false);
    expect(res.isSearchLimitReached).toBe(false);
    expect(res.explanation).toContain('rejected');
  });

  it('Test C: Multiple production choices (S -> aS | b, "aab" => ACCEPT)', () => {
    const res = parseTopDown(G_RECURSIVE, 'aab');
    expect(res.status).toBe('ACCEPT');
    expect(res.isAccepted).toBe(true);
    expect(getTreeYield(res.parseTree!)).toBe('aab');
  });

  it('Test D: Terminal mismatch pruning', () => {
    // "ba" cannot start from S -> a S | b
    const res = parseTopDown(G_RECURSIVE, 'ba');
    expect(res.status).toBe('REJECT');
    expect(res.isAccepted).toBe(false);
  });

  it('Test E: Remaining nonterminal at end of input ("a" on G_SIMPLE => REJECT)', () => {
    const res = parseTopDown(G_SIMPLE, 'a');
    expect(res.status).toBe('REJECT');
    expect(res.isAccepted).toBe(false);
  });

  it('Test F: Non-S start symbol support (startVariable: E)', () => {
    const res = parseTopDown(G_NON_S, 'a+a');
    expect(res.status).toBe('ACCEPT');
    expect(res.startVariable).toBe('E');
    expect(res.steps[0].sententialForm[0].value).toBe('E');
    expect(getTreeYield(res.parseTree!)).toBe('a+a');
  });

  it('Test G: Reset / fresh invocation cleanliness', () => {
    const run1 = parseTopDown(G_SIMPLE, 'ab');
    const run2 = parseTopDown(G_SIMPLE, 'ab');
    expect(run1.status).toBe(run2.status);
    expect(run1.steps.length).toBe(run2.steps.length);
  });

  it('Test H: Input switching state isolation', () => {
    const runAccepted = parseTopDown(G_SIMPLE, 'ab');
    const runRejected = parseTopDown(G_SIMPLE, 'aa');
    const runAcceptedAgain = parseTopDown(G_SIMPLE, 'ab');

    expect(runAccepted.status).toBe('ACCEPT');
    expect(runRejected.status).toBe('REJECT');
    expect(runAcceptedAgain.status).toBe('ACCEPT');
    expect(runAcceptedAgain.steps.length).toBe(runAccepted.steps.length);
  });

  it('Test I: Grammar switching state isolation', () => {
    const run1 = parseTopDown(G_SIMPLE, 'ab');
    const run2 = parseTopDown(G_RECURSIVE, 'aab');
    const run3 = parseTopDown(G_SIMPLE, 'ab');

    expect(run1.status).toBe('ACCEPT');
    expect(run2.status).toBe('ACCEPT');
    expect(run3.status).toBe('ACCEPT');
    expect(run3.startVariable).toBe('S');
  });

  it('Test J: Parse-tree consistency & yield invariant', () => {
    const res = parseTopDown(G_EPSILON, 'ab');
    expect(res.status).toBe('ACCEPT');
    expect(getTreeYield(res.parseTree!)).toBe('ab');

    const resEps = parseTopDown(G_EPSILON, '');
    expect(resEps.status).toBe('ACCEPT');
    expect(getTreeYield(resEps.parseTree!)).toBe('');
  });

  it('Test K: Derivation trace correctness', () => {
    const res = parseTopDown(G_SIMPLE, 'ab');
    expect(res.status).toBe('ACCEPT');

    // Every expansion step (between initial and final completion) must record an applied production
    for (let i = 1; i < res.steps.length - 1; i++) {
      const step = res.steps[i];
      expect(step.selectedProduction).toBeDefined();
      expect(step.expandedSymbol).toBeDefined();
      expect(step.formattedSententialForm.length).toBeGreaterThan(0);
    }

    // Final completion step
    const finalStep = res.steps[res.steps.length - 1];
    expect(finalStep.remainingInput).toBe('');
    expect(finalStep.explanation).toContain('Derivation complete');
  });

  it('Test L: Bounded search distinction: SEARCH_LIMIT_REACHED != REJECT', () => {
    // Run on left-recursive grammar with extremely tight maxStates to trigger cutoff
    const res = parseTopDown(G_LEFT_REC, 'aaaaa', { maxStates: 3 });
    if (res.isSearchLimitReached) {
      expect(res.status).toBe('SEARCH_LIMIT_REACHED');
      expect(res.isAccepted).toBe(false);
      expect(res.explanation).toContain('safety limit');
    }
  });
});

// ===================================================================
// 2. BOTTOM-UP PARSING TESTS (Tests A through L)
// ===================================================================

describe('Bottom-Up (Shift-Reduce) Parsing Engine', () => {
  it('Test A: Simple successful shift/reduce sequence (S -> AB, "ab" => ACCEPT)', () => {
    const res = parseBottomUp(G_SIMPLE, 'ab');
    expect(res.status).toBe('ACCEPT');
    expect(res.isAccepted).toBe(true);
    expect(res.isSearchLimitReached).toBe(false);

    // Initial step: empty stack
    expect(res.steps[0].stack.length).toBe(0);

    // Final step: stack has [S], action is ACCEPT
    const finalStep = res.steps[res.steps.length - 1];
    expect(finalStep.action).toBe('ACCEPT');
    expect(finalStep.stack.length).toBe(1);
    expect(finalStep.stack[0].value).toBe('S');

    // Parse tree yield matches
    expect(res.parseTree).toBeDefined();
    expect(getTreeYield(res.parseTree!)).toBe('ab');
  });

  it('Test B: Wrong input rejection ("aa" => REJECT)', () => {
    const res = parseBottomUp(G_SIMPLE, 'aa');
    expect(res.status).toBe('REJECT');
    expect(res.isAccepted).toBe(false);
  });

  it('Test C: Shift operation correctness', () => {
    const res = parseBottomUp(G_SIMPLE, 'ab');
    const shiftSteps = res.steps.filter((s) => s.action === 'SHIFT');
    expect(shiftSteps.length).toBeGreaterThanOrEqual(1);

    for (const s of shiftSteps) {
      if (s.stepIndex > 0) {
        expect(s.shiftedToken).toBeDefined();
        // Top of stack is the shifted token
        expect(s.stack[s.stack.length - 1].value).toBe(s.shiftedToken);
      }
    }
  });

  it('Test D: Reduction operation correctness', () => {
    const res = parseBottomUp(G_SIMPLE, 'ab');
    const reduceSteps = res.steps.filter((s) => s.action === 'REDUCE');
    expect(reduceSteps.length).toBeGreaterThanOrEqual(2);

    for (const s of reduceSteps) {
      expect(s.reducedProduction).toBeDefined();
      // Stack top is the LHS of the reduced production
      expect(s.stack[s.stack.length - 1].value).toBe(s.reducedProduction!.lhs);
    }
  });

  it('Test E: Stack correctness (final stack is solely the start symbol)', () => {
    const res = parseBottomUp(G_SIMPLE, 'ab');
    expect(res.finalStack.length).toBe(1);
    expect(res.finalStack[0].value).toBe('S');
  });

  it('Test F: Remaining-input monotonicity', () => {
    const res = parseBottomUp(G_SIMPLE, 'ab');
    // As steps proceed, remaining tokens either stay same (on reduce) or decrease (on shift)
    for (let i = 1; i < res.steps.length; i++) {
      expect(res.steps[i].remainingTokens.length).toBeLessThanOrEqual(
        res.steps[i - 1].remainingTokens.length
      );
    }
  });

  it('Test G: Start-symbol acceptance with non-S start symbol (E)', () => {
    const res = parseBottomUp(G_NON_S, 'a');
    expect(res.status).toBe('ACCEPT');
    expect(res.startVariable).toBe('E');
    expect(res.finalStack[0].value).toBe('E');
    expect(getTreeYield(res.parseTree!)).toBe('a');
  });

  it('Test H: Detection of shift/reduce conflict choices', () => {
    // Under G_CONFLICT (S -> A a | b, A -> b), string "ba"
    // When 'b' is shifted onto stack:
    // Can REDUCE b to A (via A -> b) or REDUCE b to S (via S -> b)
    const res = parseBottomUp(G_CONFLICT, 'ba');
    expect(res.status).toBe('ACCEPT');
    expect(res.conflictsEncountered).toBeGreaterThanOrEqual(1);

    // At least one step has candidate choices recorded
    const conflictStep = res.steps.find((s) => s.hasConflict);
    expect(conflictStep).toBeDefined();
    expect(conflictStep!.availableChoices!.length).toBeGreaterThan(1);
  });

  it('Test I: Reset cleanliness', () => {
    const r1 = parseBottomUp(G_SIMPLE, 'ab');
    const r2 = parseBottomUp(G_SIMPLE, 'ab');
    expect(r1.status).toBe(r2.status);
    expect(r1.steps.length).toBe(r2.steps.length);
  });

  it('Test J: Input switching state isolation', () => {
    const r1 = parseBottomUp(G_SIMPLE, 'ab');
    const r2 = parseBottomUp(G_SIMPLE, 'aa');
    const r3 = parseBottomUp(G_SIMPLE, 'ab');

    expect(r1.status).toBe('ACCEPT');
    expect(r2.status).toBe('REJECT');
    expect(r3.status).toBe('ACCEPT');
  });

  it('Test K: Grammar switching state isolation', () => {
    const r1 = parseBottomUp(G_SIMPLE, 'ab');
    const r2 = parseBottomUp(G_RECURSIVE, 'aab');
    const r3 = parseBottomUp(G_SIMPLE, 'ab');

    expect(r1.status).toBe('ACCEPT');
    expect(r2.status).toBe('ACCEPT');
    expect(r3.status).toBe('ACCEPT');
  });

  it('Test L: Parse-tree consistency from bottom-up reductions', () => {
    const res = parseBottomUp(G_RECURSIVE, 'aab');
    expect(res.status).toBe('ACCEPT');
    expect(res.parseTree).toBeDefined();
    expect(getTreeYield(res.parseTree!)).toBe('aab');
  });

  it('Test M: Empty input string acceptance via epsilon rule', () => {
    const res = parseBottomUp(G_EPSILON, '');
    expect(res.status).toBe('ACCEPT');
    expect(res.isAccepted).toBe(true);
    expect(getTreeYield(res.parseTree!)).toBe('');
  });
});

// ===================================================================
// 3. COMPARISON & INVARIANT TESTS
// ===================================================================

describe('Comparison & Invariant Tests', () => {
  it('Case A: Both complete successfully on valid string => Both ACCEPT and yields match', () => {
    const comp = compareParsingApproaches(G_SIMPLE, 'ab');
    expect(comp.agreement).toBe(true);
    expect(comp.topDown.status).toBe('ACCEPT');
    expect(comp.bottomUp.status).toBe('ACCEPT');
    expect(getTreeYield(comp.topDown.parseTree!)).toBe('ab');
    expect(getTreeYield(comp.bottomUp.parseTree!)).toBe('ab');
  });

  it('Case B: Both complete and reject on invalid string => Both REJECT', () => {
    const comp = compareParsingApproaches(G_SIMPLE, 'aa');
    expect(comp.agreement).toBe(true);
    expect(comp.topDown.status).toBe('REJECT');
    expect(comp.bottomUp.status).toBe('REJECT');
  });

  it('Case C: Comparison table contains all 7 pedagogical dimensions', () => {
    const comp = compareParsingApproaches(G_SIMPLE, 'ab');
    expect(comp.comparisonTable.length).toBe(7);
    expect(comp.comparisonTable.some((r) => r.dimension === 'Parsing Direction')).toBe(true);
    expect(comp.comparisonTable.some((r) => r.dimension === 'Primary Operation')).toBe(true);
    expect(comp.comparisonTable.some((r) => r.dimension === 'Deterministic Extension')).toBe(true);
  });

  it('Invariant: Every top-down expansion uses an actual production of the grammar', () => {
    const res = parseTopDown(G_SIMPLE, 'ab');
    for (const step of res.steps) {
      if (step.selectedProduction) {
        expect(G_SIMPLE.productions).toContainEqual(step.selectedProduction);
      }
    }
  });

  it('Invariant: Every bottom-up reduction uses an actual production of the grammar', () => {
    const res = parseBottomUp(G_SIMPLE, 'ab');
    for (const step of res.steps) {
      if (step.reducedProduction) {
        expect(G_SIMPLE.productions).toContainEqual(step.reducedProduction);
      }
    }
  });

  it('Invariant: Bottom-up input pointer never moves backwards', () => {
    const res = parseBottomUp(G_RECURSIVE, 'aab');
    let prevRemaining = res.steps[0].remainingTokens.length;

    for (let i = 1; i < res.steps.length; i++) {
      const curRemaining = res.steps[i].remainingTokens.length;
      expect(curRemaining).toBeLessThanOrEqual(prevRemaining);
      prevRemaining = curRemaining;
    }
  });

  describe('Adversarial Micro-Audit: Start Symbol Dynamism & Epsilon Safeguard', () => {
    const G_START_E: ContextFreeGrammar = {
      variables: ['E', 'A', 'B'],
      terminals: ['a', 'b'],
      startVariable: 'E',
      productions: [
        {
          id: 'p1',
          lhs: 'E',
          rhs: [
            { type: 'NON_TERMINAL', value: 'A' },
            { type: 'NON_TERMINAL', value: 'B' },
          ],
        },
        {
          id: 'p2',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }],
        },
        {
          id: 'p3',
          lhs: 'B',
          rhs: [{ type: 'TERMINAL', value: 'b' }],
        },
      ],
    };

    it('Top-Down correctly handles start symbol E (NOT S)', () => {
      const res = parseTopDown(G_START_E, 'ab');
      expect(res.status).toBe('ACCEPT');
      expect(res.isAccepted).toBe(true);
      expect(res.startVariable).toBe('E');
      expect(res.parseTree).toBeDefined();
      expect(res.parseTree!.symbol.value).toBe('E');
      expect(getTreeYield(res.parseTree!)).toBe('ab');
      // Step 0 must begin with E
      expect(res.steps[0].sententialForm[0].value).toBe('E');
    });

    it('Bottom-Up correctly handles start symbol E (accepts only when stack reaches E)', () => {
      const res = parseBottomUp(G_START_E, 'ab');
      expect(res.status).toBe('ACCEPT');
      expect(res.isAccepted).toBe(true);
      expect(res.startVariable).toBe('E');
      expect(res.parseTree).toBeDefined();
      expect(res.parseTree!.symbol.value).toBe('E');
      expect(getTreeYield(res.parseTree!)).toBe('ab');
      // Final stack must be [E]
      expect(res.finalStack).toBeDefined();
      expect(res.finalStack!.length).toBe(1);
      expect(res.finalStack![0].value).toBe('E');
    });

    it('Both engines correctly reject invalid input "aa" on grammar with start symbol E', () => {
      const tdRes = parseTopDown(G_START_E, 'aa');
      expect(tdRes.status).toBe('REJECT');
      expect(tdRes.isAccepted).toBe(false);
      expect(tdRes.isSearchLimitReached).toBe(false);

      const buRes = parseBottomUp(G_START_E, 'aa');
      expect(buRes.status).toBe('REJECT');
      expect(buRes.isAccepted).toBe(false);
      expect(buRes.isSearchLimitReached).toBe(false);
    });

    it('Epsilon safeguard: parses legitimate epsilon reductions correctly without false rejection', () => {
      const G_EPSILON_VALID: ContextFreeGrammar = {
        variables: ['S', 'A', 'B'],
        terminals: ['a', 'b'],
        startVariable: 'S',
        productions: [
          {
            id: 'p1',
            lhs: 'S',
            rhs: [
              { type: 'NON_TERMINAL', value: 'A' },
              { type: 'NON_TERMINAL', value: 'B' },
            ],
          },
          {
            id: 'p2',
            lhs: 'A',
            rhs: [{ type: 'TERMINAL', value: 'a' }],
          },
          {
            id: 'p3',
            lhs: 'A',
            rhs: [{ type: 'EPSILON', value: 'ε' }],
          },
          {
            id: 'p4',
            lhs: 'B',
            rhs: [{ type: 'TERMINAL', value: 'b' }],
          },
        ],
      };

      // Input "b" requires A -> ε, then S -> A B derives "b"
      const tdRes = parseTopDown(G_EPSILON_VALID, 'b');
      expect(tdRes.status).toBe('ACCEPT');
      expect(getTreeYield(tdRes.parseTree!)).toBe('b');

      const buRes = parseBottomUp(G_EPSILON_VALID, 'b');
      expect(buRes.status).toBe('ACCEPT');
      expect(buRes.parseTree).toBeDefined();
      expect(buRes.parseTree!.symbol.value).toBe('S');
      expect(getTreeYield(buRes.parseTree!)).toBe('b');
    });
  });
});
