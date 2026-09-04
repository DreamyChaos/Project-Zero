import { describe, it, expect } from 'vitest';
import { analyzeLL1, parseLL1 } from '../ll1-parser';
import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGProduction,
  CFGParseTreeNode,
} from '../types';

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

// Classic expression grammar (LL1)
const G_EXPR_LL1: ContextFreeGrammar = {
  variables: ['E', 'E1', 'T', 'T1', 'F'],
  terminals: ['+', '*', '(', ')', 'id'],
  productions: [
    prod('p1', 'E', [nt('T'), nt('E1')]),
    prod('p2', 'E1', [t('+'), nt('T'), nt('E1')]),
    prod('p3', 'E1', [EPS]),
    prod('p4', 'T', [nt('F'), nt('T1')]),
    prod('p5', 'T1', [t('*'), nt('F'), nt('T1')]),
    prod('p6', 'T1', [EPS]),
    prod('p7', 'F', [t('('), nt('E'), t(')')]),
    prod('p8', 'F', [t('id')]),
  ],
  startVariable: 'E',
};

// FIRST/FIRST Conflict Grammar: S → a B | a C
const G_FF_CONFLICT: ContextFreeGrammar = {
  variables: ['S', 'B', 'C'],
  terminals: ['a', 'b', 'c'],
  productions: [
    prod('p1', 'S', [t('a'), nt('B')]),
    prod('p2', 'S', [t('a'), nt('C')]),
    prod('p3', 'B', [t('b')]),
    prod('p4', 'C', [t('c')]),
  ],
  startVariable: 'S',
};

// FIRST/FOLLOW Conflict Grammar: A → a | ε with 'a' ∈ FOLLOW(A)
// S → A a, A → a | ε
const G_FFOLLOW_CONFLICT: ContextFreeGrammar = {
  variables: ['S', 'A'],
  terminals: ['a'],
  productions: [
    prod('p1', 'S', [nt('A'), t('a')]),
    prod('p2', 'A', [t('a')]),
    prod('p3', 'A', [EPS]),
  ],
  startVariable: 'S',
};

describe('LL(1) Analysis & Table Generation', () => {
  it('confirms classic expression grammar is strictly LL(1)', () => {
    const analysis = analyzeLL1(G_EXPR_LL1);

    expect(analysis.isLL1).toBe(true);
    expect(analysis.conflicts.length).toBe(0);
    expect(analysis.parseTable.totalConflicts).toBe(0);
  });

  it('detects FIRST/FIRST conflicts', () => {
    const analysis = analyzeLL1(G_FF_CONFLICT);

    expect(analysis.isLL1).toBe(false);
    expect(analysis.conflicts.length).toBeGreaterThan(0);
    expect(analysis.conflicts.some((c) => c.type === 'FIRST_FIRST')).toBe(true);
  });

  it('detects FIRST/FOLLOW conflicts', () => {
    const analysis = analyzeLL1(G_FFOLLOW_CONFLICT);

    expect(analysis.isLL1).toBe(false);
    expect(analysis.conflicts.length).toBeGreaterThan(0);
    expect(analysis.conflicts.some((c) => c.type === 'FIRST_FOLLOW')).toBe(true);
  });
});

describe('Predictive Parser: Valid Expressions', () => {
  it('parses "id"', () => {
    const result = parseLL1(G_EXPR_LL1, 'id');

    expect(result.isAccepted).toBe(true);
    expect(result.tokens).toEqual(['id']);
    expect(result.parseTree).toBeDefined();
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('parses "id+id"', () => {
    const result = parseLL1(G_EXPR_LL1, 'id+id');

    expect(result.isAccepted).toBe(true);
    expect(result.tokens).toEqual(['id', '+', 'id']);
  });

  it('parses "id*id"', () => {
    const result = parseLL1(G_EXPR_LL1, 'id*id');

    expect(result.isAccepted).toBe(true);
  });

  it('parses "(id)"', () => {
    const result = parseLL1(G_EXPR_LL1, '(id)');

    expect(result.isAccepted).toBe(true);
  });

  it('parses complex expression "(id+id)*id"', () => {
    const result = parseLL1(G_EXPR_LL1, '(id+id)*id');

    expect(result.isAccepted).toBe(true);
  });
});

describe('Predictive Parser: Invalid Expressions', () => {
  it('rejects "+"', () => {
    const result = parseLL1(G_EXPR_LL1, '+');

    expect(result.isAccepted).toBe(false);
    expect(result.rejectionReason).toBeDefined();
  });

  it('rejects "id+"', () => {
    const result = parseLL1(G_EXPR_LL1, 'id+');

    expect(result.isAccepted).toBe(false);
  });

  it('rejects "(id"', () => {
    const result = parseLL1(G_EXPR_LL1, '(id');

    expect(result.isAccepted).toBe(false);
  });

  it('rejects "id**"', () => {
    const result = parseLL1(G_EXPR_LL1, 'id**');

    expect(result.isAccepted).toBe(false);
  });

  it('rejects untokenizable input "xyz"', () => {
    const result = parseLL1(G_EXPR_LL1, 'xyz');

    expect(result.isAccepted).toBe(false);
    expect(result.rejectionReason).toContain('cannot be tokenized');
  });
});

describe('Predictive Parser: Limits & Immutability', () => {
  it('reports boundedByLimit when maxSteps is exceeded', () => {
    const result = parseLL1(G_EXPR_LL1, 'id+id', { maxSteps: 2 });

    expect(result.isAccepted).toBe(false);
    expect(result.boundedByLimit).toBe(true);
  });

  it('does not mutate input grammar', () => {
    const originalCopy = JSON.parse(JSON.stringify(G_EXPR_LL1));
    parseLL1(G_EXPR_LL1, 'id+id');

    expect(G_EXPR_LL1).toEqual(originalCopy);
  });
});

describe('Module 4 Topic 2: Mandatory Core LL(1) Verification (Tests A - T)', () => {
  // Simple grammar: S -> A B, A -> a, B -> b
  const G_SIMPLE: ContextFreeGrammar = {
    variables: ['S', 'A', 'B'],
    terminals: ['a', 'b'],
    productions: [
      prod('p1', 'S', [nt('A'), nt('B')]),
      prod('p2', 'A', [t('a')]),
      prod('p3', 'B', [t('b')]),
    ],
    startVariable: 'S',
  };

  // Epsilon grammar: S -> A b, A -> a | ε
  const G_EPSILON: ContextFreeGrammar = {
    variables: ['S', 'A'],
    terminals: ['a', 'b'],
    productions: [
      prod('p1', 'S', [nt('A'), t('b')]),
      prod('p2', 'A', [t('a')]),
      prod('p3', 'A', [EPS]),
    ],
    startVariable: 'S',
  };

  // Pure epsilon accepting grammar: S -> a S | ε
  const G_EPS_ACCEPTING: ContextFreeGrammar = {
    variables: ['S'],
    terminals: ['a'],
    productions: [
      prod('p1', 'S', [t('a'), nt('S')]),
      prod('p2', 'S', [EPS]),
    ],
    startVariable: 'S',
  };

  // Helper yield
  function testTreeYield(node: CFGParseTreeNode): string {
    if (node.symbol.type === 'TERMINAL') return node.symbol.value;
    if (node.symbol.type === 'EPSILON') return '';
    return (node.children || []).map(testTreeYield).join('');
  }

  // TEST A: Simple Acceptance
  it('TEST A — Simple Acceptance: accepts "ab" on S -> AB, A -> a, B -> b', () => {
    const res = parseLL1(G_SIMPLE, 'ab');
    expect(res.isAccepted).toBe(true);
    expect(res.rejectionReason).toBeUndefined();
    expect(res.appliedProductionIds).toEqual(['p1', 'p2', 'p3']);
    expect(res.stats?.matchCount).toBe(2);
    expect(res.stats?.expansionCount).toBe(3);
  });

  // TEST B: Simple Rejection
  it('TEST B — Simple Rejection: rejects "aa" on S -> AB, A -> a, B -> b', () => {
    const res = parseLL1(G_SIMPLE, 'aa');
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toBeDefined();
    expect(res.parseTree).toBeUndefined();
  });

  // TEST C: Table Construction
  it('TEST C — Table Construction: verifies exact entries in M[A, a]', () => {
    const analysis = analyzeLL1(G_SIMPLE);
    expect(analysis.isLL1).toBe(true);
    expect(analysis.parseTable.grid['S']['a'].productionIds).toEqual(['p1']);
    expect(analysis.parseTable.grid['S']['b'].productionIds).toEqual([]);
    expect(analysis.parseTable.grid['S']['$'].productionIds).toEqual([]);
    expect(analysis.parseTable.grid['A']['a'].productionIds).toEqual(['p2']);
    expect(analysis.parseTable.grid['A']['b'].productionIds).toEqual([]);
    expect(analysis.parseTable.grid['B']['a'].productionIds).toEqual([]);
    expect(analysis.parseTable.grid['B']['b'].productionIds).toEqual(['p3']);
  });

  // TEST D: Terminal Match
  it('TEST D — Terminal Match: pops matched terminal and consumes input', () => {
    const res = parseLL1(G_SIMPLE, 'ab');
    const matchSteps = res.steps.filter((s) => s.matchedTerminal !== undefined);
    expect(matchSteps.length).toBe(2);
    expect(matchSteps[0].matchedTerminal).toBe('a');
    expect(matchSteps[0].lookahead).toBe('a');
    expect(matchSteps[1].matchedTerminal).toBe('b');
    expect(matchSteps[1].lookahead).toBe('b');
  });

  // TEST E: Nonterminal Expansion
  it('TEST E — Nonterminal Expansion: M[A, a] expands A -> a and pushes RHS', () => {
    const res = parseLL1(G_SIMPLE, 'ab');
    const expandA = res.steps.find((s) => s.productionId === 'p2');
    expect(expandA).toBeDefined();
    expect(expandA?.action).toBe('Expand A → a');
    expect(expandA?.stack[expandA.stack.length - 1]).toBe('A');
  });

  // TEST F: Epsilon Table Placement
  it('TEST F — Epsilon: A -> ε placed in table using FOLLOW(A)', () => {
    const analysis = analyzeLL1(G_EPSILON);
    // In G_EPSILON, S -> A b, so FOLLOW(A) = { 'b' }
    expect(analysis.followSets['A']).toContain('b');
    expect(analysis.parseTable.grid['A']['b'].productionIds).toContain('p3');
    // 'a' is in FIRST(A), so A -> a placed in M[A, a]
    expect(analysis.parseTable.grid['A']['a'].productionIds).toContain('p2');
    expect(analysis.isLL1).toBe(true);
  });

  // TEST G: FIRST/FIRST Conflict
  it('TEST G — FIRST/FIRST Conflict: detected and classified with competing evidence', () => {
    const analysis = analyzeLL1(G_FF_CONFLICT);
    expect(analysis.isLL1).toBe(false);
    const ff = analysis.conflicts.find((c) => c.variable === 'S' && c.terminal === 'a');
    expect(ff).toBeDefined();
    expect(ff?.type).toBe('FIRST_FIRST');
    expect(ff?.productionIds).toEqual(['p1', 'p2']);
    expect(ff?.competingProductionEvidence?.length).toBe(2);
    expect(ff?.competingProductionEvidence?.[0].reason).toBe('FIRST_SET');
    expect(ff?.competingProductionEvidence?.[1].reason).toBe('FIRST_SET');
  });

  // TEST H: FIRST/FOLLOW Conflict
  it('TEST H — FIRST/FOLLOW Conflict: detected and classified with competing evidence', () => {
    const analysis = analyzeLL1(G_FFOLLOW_CONFLICT);
    expect(analysis.isLL1).toBe(false);
    const ff = analysis.conflicts.find((c) => c.variable === 'A' && c.terminal === 'a');
    expect(ff).toBeDefined();
    expect(ff?.type).toBe('FIRST_FOLLOW');
    expect(ff?.competingProductionEvidence?.some((e) => e.reason === 'FOLLOW_SET')).toBe(true);
  });

  // TEST I: Empty Input Handling
  it('TEST I — Empty Input: ε accepted when valid, rejected when invalid', () => {
    // G_EPS_ACCEPTING should accept "" (or "ε")
    const resValid = parseLL1(G_EPS_ACCEPTING, '');
    expect(resValid.isAccepted).toBe(true);
    expect(resValid.parseTree).toBeDefined();
    expect(testTreeYield(resValid.parseTree!)).toBe('');

    // G_SIMPLE cannot derive ε, must reject ""
    const resInvalid = parseLL1(G_SIMPLE, '');
    expect(resInvalid.isAccepted).toBe(false);
  });

  // TEST J: Non-S Start Symbol
  it('TEST J — Non-S Start Symbol: start variable E works dynamically', () => {
    const G_START_E: ContextFreeGrammar = {
      variables: ['E', 'A', 'B'],
      terminals: ['a', 'b'],
      startVariable: 'E',
      productions: [
        prod('p1', 'E', [nt('A'), nt('B')]),
        prod('p2', 'A', [t('a')]),
        prod('p3', 'B', [t('b')]),
      ],
    };

    const res = parseLL1(G_START_E, 'ab');
    expect(res.isAccepted).toBe(true);
    expect(res.steps[0].stack).toEqual(['$', 'E']);
    expect(res.parseTree?.symbol.value).toBe('E');
    expect(testTreeYield(res.parseTree!)).toBe('ab');
  });

  // TEST K: Missing Table Entry Rejection
  it('TEST K — Missing Table Entry: reports clear syntax error', () => {
    const res = parseLL1(G_SIMPLE, 'b');
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toContain('Syntax Error: No parse table entry for M[S, b]');
  });

  // TEST L: Terminal Mismatch Rejection
  it('TEST L — Terminal Mismatch: reports clear mismatch error', () => {
    const G_TERMINAL_SEQ: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a', 'b'],
      productions: [prod('p1', 'S', [t('a'), t('b')])],
      startVariable: 'S',
    };
    const res = parseLL1(G_TERMINAL_SEQ, 'aa');
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toContain('Terminal mismatch at position 1: Expected "b", found "a"');
  });

  // TEST M: Extra Input Rejection
  it('TEST M — Extra Input: rejects input with unconsumed trailing tokens', () => {
    const res = parseLL1(G_SIMPLE, 'aba');
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toContain('Terminal mismatch');
  });

  // TEST N: Incomplete Input Rejection
  it('TEST N — Incomplete Input: rejects truncated input string', () => {
    const res = parseLL1(G_SIMPLE, 'a');
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toContain('No parse table entry for M[B, $]');
  });

  // TEST O: Parse Tree Yield Invariant
  it('TEST O — Parse Tree Yield: yield(tree) strictly equals input token stream', () => {
    const res1 = parseLL1(G_EXPR_LL1, 'id+id');
    expect(res1.isAccepted).toBe(true);
    expect(testTreeYield(res1.parseTree!)).toBe('id+id');

    const res2 = parseLL1(G_EXPR_LL1, '(id+id)*id');
    expect(res2.isAccepted).toBe(true);
    expect(testTreeYield(res2.parseTree!)).toBe('(id+id)*id');
  });

  // TEST P: Leftmost Derivation
  it('TEST P — Leftmost Derivation: sentential forms trace valid leftmost expansions', () => {
    const res = parseLL1(G_SIMPLE, 'ab');
    expect(res.isAccepted).toBe(true);

    const forms = res.steps.map((s) => s.formattedSententialForm);
    // Step 0: S
    expect(forms[0]).toBe('S');
    // After expanding S -> AB: A B
    expect(forms[1]).toBe('A B');
    // After expanding A -> a: a B
    expect(forms[2]).toBe('a B');
    // After matching a: a B
    expect(forms[3]).toBe('a B');
    // After expanding B -> b: a b
    expect(forms[4]).toBe('a b');
    // Final accept: a b
    expect(forms[forms.length - 1]).toBe('a b');
  });

  // TEST Q: Grammar Switch
  it('TEST Q — Grammar Switch: correctly recomputes analysis and parser between grammars', () => {
    const res1 = parseLL1(G_SIMPLE, 'ab');
    expect(res1.isAccepted).toBe(true);

    const res2 = parseLL1(G_EPSILON, 'b');
    expect(res2.isAccepted).toBe(true);

    // G_SIMPLE cannot parse 'b'
    const res3 = parseLL1(G_SIMPLE, 'b');
    expect(res3.isAccepted).toBe(false);
  });

  // TEST R: Input Switch
  it('TEST R — Input Switch: correctly recomputes for different inputs on same grammar', () => {
    const resA = parseLL1(G_EXPR_LL1, 'id');
    expect(resA.isAccepted).toBe(true);

    const resB = parseLL1(G_EXPR_LL1, 'id+id*id');
    expect(resB.isAccepted).toBe(true);

    const resC = parseLL1(G_EXPR_LL1, '+id');
    expect(resC.isAccepted).toBe(false);
  });

  // TEST S: Reset Invariance
  it('TEST S — Reset Invariance: multiple executions are pure and produce identical state', () => {
    const run1 = parseLL1(G_EXPR_LL1, 'id+id');
    const run2 = parseLL1(G_EXPR_LL1, 'id+id');

    expect(run1.isAccepted).toBe(run2.isAccepted);
    expect(run1.steps.length).toBe(run2.steps.length);
    expect(run1.appliedProductionIds).toEqual(run2.appliedProductionIds);
  });

  // TEST T: Transformed Grammar Flow
  it('TEST T — Transformed Grammar: left recursion elimination produces LL(1) parsable grammar', () => {
    // Left-recursive expression grammar:
    // E -> E + T | T
    // T -> id
    const G_LEFT_REC: ContextFreeGrammar = {
      variables: ['E', 'T'],
      terminals: ['+', 'id'],
      startVariable: 'E',
      productions: [
        prod('p1', 'E', [nt('E'), t('+'), nt('T')]),
        prod('p2', 'E', [nt('T')]),
        prod('p3', 'T', [t('id')]),
      ],
    };

    // Before transformation: Left-recursive, NOT LL(1)
    const beforeAnalysis = analyzeLL1(G_LEFT_REC);
    expect(beforeAnalysis.leftRecursion.isLeftRecursive).toBe(true);
    expect(beforeAnalysis.isLL1).toBe(false);

    // Equivalent transformed grammar without left recursion:
    // E -> T E'
    // E' -> + T E' | ε
    // T -> id
    const G_TRANSFORMED: ContextFreeGrammar = {
      variables: ['E', 'E1', 'T'],
      terminals: ['+', 'id'],
      startVariable: 'E',
      productions: [
        prod('tp1', 'E', [nt('T'), nt('E1')]),
        prod('tp2', 'E1', [t('+'), nt('T'), nt('E1')]),
        prod('tp3', 'E1', [EPS]),
        prod('tp4', 'T', [t('id')]),
      ],
    };

    const afterAnalysis = analyzeLL1(G_TRANSFORMED);
    expect(afterAnalysis.isLL1).toBe(true);
    expect(afterAnalysis.conflicts.length).toBe(0);

    const parseResult = parseLL1(G_TRANSFORMED, 'id+id');
    expect(parseResult.isAccepted).toBe(true);
    expect(testTreeYield(parseResult.parseTree!)).toBe('id+id');

    // Original grammar was not mutated
    expect(G_LEFT_REC.productions.length).toBe(3);
    expect(G_LEFT_REC.variables).toEqual(['E', 'T']);
  });
});
