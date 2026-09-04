import { describe, it, expect } from 'vitest';
import {
  computeFirstSets,
  computeFollowSets,
  computeFirstOfSequence,
  computeProductionSelectSet,
  computeDetailedFirstFollowAnalysis,
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
    const diag = detectLeftFactoring(G_LEFT_FACTOR);
    expect(diag.groups.length).toBe(1);
    expect(diag.groups[0].variable).toBe('S');
    expect(diag.groups[0].commonPrefixNotation).toBe('a');
  });

});

describe('Topic 5 Comprehensive Mathematical Invariants & Edge Cases', () => {
  it('Grammar A: S -> aA, A -> b', () => {
    const grammar: ContextFreeGrammar = {
      variables: ['S', 'A'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [t('a'), nt('A')]),
        prod('p2', 'A', [t('b')]),
      ],
    };

    const first = computeFirstSets(grammar);
    const follow = computeFollowSets(grammar, first);

    expect(first['S']).toEqual(['a']);
    expect(first['A']).toEqual(['b']);
    expect(follow['S']).toEqual(['$']);
    expect(follow['A']).toEqual(['$']);
  });

  it('Grammar B: S -> AB, A -> ε, B -> b (nullable propagation into FIRST(S))', () => {
    const grammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B'],
      terminals: ['b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A'), nt('B')]),
        prod('p2', 'A', [EPS]),
        prod('p3', 'B', [t('b')]),
      ],
    };

    const first = computeFirstSets(grammar);
    expect(first['A']).toEqual(['ε']);
    expect(first['B']).toEqual(['b']);
    expect(first['S']).toEqual(['b']); // not nullable since B is not nullable
  });

  it('Grammar C: S -> ABC, A -> ε, B -> ε, C -> c', () => {
    const grammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B', 'C'],
      terminals: ['c'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A'), nt('B'), nt('C')]),
        prod('p2', 'A', [EPS]),
        prod('p3', 'B', [EPS]),
        prod('p4', 'C', [t('c')]),
      ],
    };

    const first = computeFirstSets(grammar);
    expect(first['S']).toEqual(['c']);
  });

  it('Grammar D: S -> AB, A -> ε, B -> ε (all nullable)', () => {
    const grammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B'],
      terminals: [],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A'), nt('B')]),
        prod('p2', 'A', [EPS]),
        prod('p3', 'B', [EPS]),
      ],
    };

    const first = computeFirstSets(grammar);
    expect(first['S']).toEqual(['ε']);
  });

  it('Grammar E: Mutual recursion S -> A, A -> B, B -> A | b', () => {
    const grammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B'],
      terminals: ['b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A')]),
        prod('p2', 'A', [nt('B')]),
        prod('p3', 'B', [nt('A')]),
        prod('p4', 'B', [t('b')]),
      ],
    };

    const first = computeFirstSets(grammar);
    expect(first['S']).toEqual(['b']);
    expect(first['A']).toEqual(['b']);
    expect(first['B']).toEqual(['b']);
  });

  it('Recursive nullability fixed-point: A -> B, B -> A | ε', () => {
    const grammar: ContextFreeGrammar = {
      variables: ['A', 'B'],
      terminals: [],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [nt('B')]),
        prod('p2', 'B', [nt('A')]),
        prod('p3', 'B', [EPS]),
      ],
    };

    const first = computeFirstSets(grammar);
    expect(first['A']).toEqual(['ε']);
    expect(first['B']).toEqual(['ε']);
  });

  it('Complex FOLLOW with nullable suffixes: S -> ABC, A -> a | ε, B -> b | ε, C -> c | ε', () => {
    const grammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B', 'C'],
      terminals: ['a', 'b', 'c'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A'), nt('B'), nt('C')]),
        prod('p2', 'A', [t('a')]),
        prod('p3', 'A', [EPS]),
        prod('p4', 'B', [t('b')]),
        prod('p5', 'B', [EPS]),
        prod('p6', 'C', [t('c')]),
        prod('p7', 'C', [EPS]),
      ],
    };

    const first = computeFirstSets(grammar);
    const follow = computeFollowSets(grammar, first);

    expect(follow['S']).toEqual(['$']);
    expect(follow['A']).toContain('b');
    expect(follow['A']).toContain('c');
    expect(follow['A']).toContain('$');
    expect(follow['B']).toContain('c');
    expect(follow['B']).toContain('$');
    expect(follow['C']).toContain('$');
  });

  it('Production Order Independence: reversing productions preserves identical sets', () => {
    const grammar1: ContextFreeGrammar = G_EXPR_LL1;
    const grammar2: ContextFreeGrammar = {
      ...G_EXPR_LL1,
      productions: [...G_EXPR_LL1.productions].reverse(),
    };

    const first1 = computeFirstSets(grammar1);
    const first2 = computeFirstSets(grammar2);
    expect(first1).toEqual(first2);

    const follow1 = computeFollowSets(grammar1, first1);
    const follow2 = computeFollowSets(grammar2, first2);
    expect(follow1).toEqual(follow2);
  });

  it('Detailed First/Follow Analysis includes fixed-point iterations and explanations', () => {
    const result = computeDetailedFirstFollowAnalysis(G_EXPR_LL1);
    expect(result.isValid).toBe(true);
    expect(result.firstIterations.length).toBeGreaterThan(1);
    expect(result.followIterations.length).toBeGreaterThan(1);
    expect(result.explanations['E']).toBeDefined();
    expect(result.explanations['E'].firstRules.length).toBeGreaterThan(0);
    expect(result.explanations['E'].followRules.length).toBeGreaterThan(0);
    expect(result.explanations['E'].dependencies.firstDependsOn).toContain('T');
  });

  it('Rejects invalid grammar gracefully', () => {
    const invalidGrammar: ContextFreeGrammar = {
      variables: [],
      terminals: ['a'],
      productions: [],
      startVariable: '',
    };

    const result = computeDetailedFirstFollowAnalysis(invalidGrammar);
    expect(result.isValid).toBe(false);
    expect(result.diagnostics?.length).toBeGreaterThan(0);
  });
});

