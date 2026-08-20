import { describe, it, expect } from 'vitest';
import { analyzeLL1, parseLL1 } from '../ll1-parser';
import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGProduction,
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
