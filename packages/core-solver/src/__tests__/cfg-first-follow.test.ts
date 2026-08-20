import { describe, it, expect } from 'vitest';
import {
  computeFirstSets,
  computeFollowSets,
  computeFirstOfSequence,
  computeProductionSelectSet,
  detectLeftRecursion,
  detectLeftFactoring,
} from '../cfg-first-follow';
import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGProduction,
  LL1_END_MARKER,
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
// E  → T E'
// E' → + T E' | ε
// T  → F T'
// T' → * F T' | ε
// F  → ( E ) | id
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

// Grammar with direct left recursion: E → E + T | T
const G_DIRECT_LEFT_REC: ContextFreeGrammar = {
  variables: ['E', 'T'],
  terminals: ['+', 'id'],
  productions: [
    prod('p1', 'E', [nt('E'), t('+'), nt('T')]),
    prod('p2', 'E', [nt('T')]),
    prod('p3', 'T', [t('id')]),
  ],
  startVariable: 'E',
};

// Grammar with indirect left recursion: A → B a, B → A b | c
const G_INDIRECT_LEFT_REC: ContextFreeGrammar = {
  variables: ['A', 'B'],
  terminals: ['a', 'b', 'c'],
  productions: [
    prod('p1', 'A', [nt('B'), t('a')]),
    prod('p2', 'B', [nt('A'), t('b')]),
    prod('p3', 'B', [t('c')]),
  ],
  startVariable: 'A',
};

// Grammar requiring left factoring: S → a B | a C
const G_LEFT_FACTOR: ContextFreeGrammar = {
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

describe('FIRST Sets Computation', () => {
  it('computes FIRST sets for classic expression grammar', () => {
    const first = computeFirstSets(G_EXPR_LL1);

    expect(first['E']).toEqual(['(', 'id']);
    expect(first['E1']).toEqual(['+', 'ε']);
    expect(first['T']).toEqual(['(', 'id']);
    expect(first['T1']).toEqual(['*', 'ε']);
    expect(first['F']).toEqual(['(', 'id']);
  });

  it('computes FIRST of symbol sequence with nullable propagation', () => {
    const first = computeFirstSets(G_EXPR_LL1);

    const seq1 = computeFirstOfSequence([nt('T'), nt('E1')], first);
    expect(seq1).toEqual(['(', 'id']);

    const seq2 = computeFirstOfSequence([nt('E1')], first);
    expect(seq2).toEqual(['+', 'ε']);
  });
});

describe('FOLLOW Sets Computation', () => {
  it('computes FOLLOW sets for classic expression grammar', () => {
    const first = computeFirstSets(G_EXPR_LL1);
    const follow = computeFollowSets(G_EXPR_LL1, first);

    expect(follow['E']).toContain(')');
    expect(follow['E']).toContain(LL1_END_MARKER);

    expect(follow['E1']).toContain(')');
    expect(follow['E1']).toContain(LL1_END_MARKER);

    expect(follow['T']).toContain('+');
    expect(follow['T']).toContain(')');
    expect(follow['T']).toContain(LL1_END_MARKER);

    expect(follow['T1']).toContain('+');
    expect(follow['T1']).toContain(')');
    expect(follow['T1']).toContain(LL1_END_MARKER);

    expect(follow['F']).toContain('*');
    expect(follow['F']).toContain('+');
    expect(follow['F']).toContain(')');
    expect(follow['F']).toContain(LL1_END_MARKER);
  });
});

describe('SELECT Sets Computation', () => {
  it('computes SELECT set for non-epsilon production', () => {
    const first = computeFirstSets(G_EXPR_LL1);
    const follow = computeFollowSets(G_EXPR_LL1, first);

    const sel_p1 = computeProductionSelectSet(G_EXPR_LL1.productions[0], first, follow);
    expect(sel_p1.selectSet).toEqual(['(', 'id']);
  });

  it('computes SELECT set for epsilon production (uses FOLLOW)', () => {
    const first = computeFirstSets(G_EXPR_LL1);
    const follow = computeFollowSets(G_EXPR_LL1, first);

    const sel_p3 = computeProductionSelectSet(G_EXPR_LL1.productions[2], first, follow); // E1 -> ε
    expect(sel_p3.selectSet).toContain(')');
    expect(sel_p3.selectSet).toContain(LL1_END_MARKER);
  });
});

describe('Left Recursion & Left Factoring Analysis', () => {
  it('detects direct left recursion', () => {
    const diag = detectLeftRecursion(G_DIRECT_LEFT_REC);
    expect(diag.isLeftRecursive).toBe(true);
    expect(diag.directVariables).toContain('E');
  });

  it('detects indirect left recursion cycles', () => {
    const diag = detectLeftRecursion(G_INDIRECT_LEFT_REC);
    expect(diag.isLeftRecursive).toBe(true);
    expect(diag.indirectCycles.length).toBeGreaterThan(0);
  });

  it('detects common prefixes requiring left factoring', () => {
    const suggestions = detectLeftFactoring(G_LEFT_FACTOR);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].variable).toBe('S');
    expect(suggestions[0].commonPrefixNotation).toBe('a');
  });
});
