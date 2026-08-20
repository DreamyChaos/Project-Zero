import { describe, it, expect } from 'vitest';
import {
  eliminateDirectLeftRecursion,
  eliminateIndirectLeftRecursion,
  leftFactorGrammar,
  transformToPredictiveGrammar,
  verifyBoundedLanguagePreservation,
} from '../cfg-transformations';
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

// 1. Simple direct recursion: E → E + T | T
const G_DIRECT_REC: ContextFreeGrammar = {
  variables: ['E', 'T'],
  terminals: ['+', 'id'],
  productions: [
    prod('p1', 'E', [nt('E'), t('+'), nt('T')]),
    prod('p2', 'E', [nt('T')]),
    prod('p3', 'T', [t('id')]),
  ],
  startVariable: 'E',
};

// 2. Multiple recursive alternatives: A → A a | A b | c | d
const G_MULTI_DIRECT: ContextFreeGrammar = {
  variables: ['A'],
  terminals: ['a', 'b', 'c', 'd'],
  productions: [
    prod('p1', 'A', [nt('A'), t('a')]),
    prod('p2', 'A', [nt('A'), t('b')]),
    prod('p3', 'A', [t('c')]),
    prod('p4', 'A', [t('d')]),
  ],
  startVariable: 'A',
};

// 3. Indirect recursion: A → B a, B → A b | c
const G_INDIRECT_REC: ContextFreeGrammar = {
  variables: ['A', 'B'],
  terminals: ['a', 'b', 'c'],
  productions: [
    prod('p1', 'A', [nt('B'), t('a')]),
    prod('p2', 'B', [nt('A'), t('b')]),
    prod('p3', 'B', [t('c')]),
  ],
  startVariable: 'A',
};

// 4. Longer indirect cycle: A → B x, B → C y, C → A z | d
const G_LONG_INDIRECT: ContextFreeGrammar = {
  variables: ['A', 'B', 'C'],
  terminals: ['x', 'y', 'z', 'd'],
  productions: [
    prod('p1', 'A', [nt('B'), t('x')]),
    prod('p2', 'B', [nt('C'), t('y')]),
    prod('p3', 'C', [nt('A'), t('z')]),
    prod('p4', 'C', [t('d')]),
  ],
  startVariable: 'A',
};

// 5. No recursion: S → a A, A → b
const G_NO_REC: ContextFreeGrammar = {
  variables: ['S', 'A'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [t('a'), nt('A')]),
    prod('p2', 'A', [t('b')]),
  ],
  startVariable: 'S',
};

// 6. Common prefix: A → a B | a C
const G_COMMON_PREFIX: ContextFreeGrammar = {
  variables: ['A', 'B', 'C'],
  terminals: ['a', 'b', 'c'],
  productions: [
    prod('p1', 'A', [t('a'), nt('B')]),
    prod('p2', 'A', [t('a'), nt('C')]),
    prod('p3', 'B', [t('b')]),
    prod('p4', 'C', [t('c')]),
  ],
  startVariable: 'A',
};

// 7. Repeated common prefix: A → a b c | a b d | a e
const G_REPEATED_PREFIX: ContextFreeGrammar = {
  variables: ['A'],
  terminals: ['a', 'b', 'c', 'd', 'e'],
  productions: [
    prod('p1', 'A', [t('a'), t('b'), t('c')]),
    prod('p2', 'A', [t('a'), t('b'), t('d')]),
    prod('p3', 'A', [t('a'), t('e')]),
  ],
  startVariable: 'A',
};

// 8. Epsilon alternatives: A → A a | ε
const G_EPSILON_ALT: ContextFreeGrammar = {
  variables: ['A'],
  terminals: ['a'],
  productions: [
    prod('p1', 'A', [nt('A'), t('a')]),
    prod('p2', 'A', [EPS]),
  ],
  startVariable: 'A',
};

// 9. Name collision: Grammar already has A' and A''
const G_COLLISION: ContextFreeGrammar = {
  variables: ['A', "A'", "A''"],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'A', [nt('A'), t('a')]),
    prod('p2', 'A', [t('b')]),
    prod('p3', "A'", [t('a')]),
    prod('p4', "A''", [t('b')]),
  ],
  startVariable: 'A',
};

// 10. Multi-character terminals: S → "while" "id" | "while" "num"
const G_MULTI_CHAR: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['while', 'id', 'num'],
  productions: [
    prod('p1', 'S', [t('while'), t('id')]),
    prod('p2', 'S', [t('while'), t('num')]),
  ],
  startVariable: 'S',
};

describe('Direct Left-Recursion Elimination', () => {
  it('eliminates direct left recursion in E → E + T | T', () => {
    const res = eliminateDirectLeftRecursion(G_DIRECT_REC);
    expect(res.success).toBe(true);
    expect(res.changed).toBe(true);

    const afterLL1 = analyzeLL1(res.transformedGrammar);
    expect(afterLL1.leftRecursion.isLeftRecursive).toBe(false);
  });

  it('handles multiple recursive and non-recursive alternatives', () => {
    const res = eliminateDirectLeftRecursion(G_MULTI_DIRECT);
    expect(res.success).toBe(true);
    expect(res.transformedGrammar.variables).toContain("A'");

    const afterLL1 = analyzeLL1(res.transformedGrammar);
    expect(afterLL1.leftRecursion.isLeftRecursive).toBe(false);
  });

  it('handles collision-safe variable generation when A\' exists', () => {
    const res = eliminateDirectLeftRecursion(G_COLLISION);
    expect(res.success).toBe(true);
    // Should generate A''' to avoid colliding with existing A' and A''
    expect(res.generatedSymbolNames).toContain("A'''");
  });

  it('handles epsilon alternatives A → A a | ε', () => {
    const res = eliminateDirectLeftRecursion(G_EPSILON_ALT);
    expect(res.success).toBe(true);
    const afterLL1 = analyzeLL1(res.transformedGrammar);
    expect(afterLL1.leftRecursion.isLeftRecursive).toBe(false);
  });
});

describe('Indirect Left-Recursion Elimination', () => {
  it('eliminates indirect left recursion in A → B a, B → A b | c', () => {
    const res = eliminateIndirectLeftRecursion(G_INDIRECT_REC);
    expect(res.success).toBe(true);
    expect(res.changed).toBe(true);

    const afterLL1 = analyzeLL1(res.transformedGrammar);
    expect(afterLL1.leftRecursion.isLeftRecursive).toBe(false);
  });

  it('eliminates longer indirect cycle A → B x, B → C y, C → A z | d', () => {
    const res = eliminateIndirectLeftRecursion(G_LONG_INDIRECT);
    expect(res.success).toBe(true);

    const afterLL1 = analyzeLL1(res.transformedGrammar);
    expect(afterLL1.leftRecursion.isLeftRecursive).toBe(false);
  });
});

describe('Left Factoring', () => {
  it('factors simple common prefix A → a B | a C', () => {
    const res = leftFactorGrammar(G_COMMON_PREFIX);
    expect(res.success).toBe(true);
    expect(res.changed).toBe(true);

    const afterLL1 = analyzeLL1(res.transformedGrammar);
    expect(afterLL1.leftFactoringSuggestions.length).toBe(0);
  });

  it('handles repeated left factoring for A → a b c | a b d | a e', () => {
    const res = leftFactorGrammar(G_REPEATED_PREFIX);
    expect(res.success).toBe(true);

    const afterLL1 = analyzeLL1(res.transformedGrammar);
    expect(afterLL1.leftFactoringSuggestions.length).toBe(0);
  });

  it('handles multi-character terminals in left factoring', () => {
    const res = leftFactorGrammar(G_MULTI_CHAR);
    expect(res.success).toBe(true);
    expect(res.changed).toBe(true);
  });
});

describe('Predictive Transformation Pipeline', () => {
  it('transforms non-LL(1) direct left-recursive expression grammar to LL(1)', () => {
    const res = transformToPredictiveGrammar(G_DIRECT_REC);
    expect(res.success).toBe(true);
    expect(res.afterLL1Analysis.isLL1).toBe(true);

    // Test predictive parser on transformed grammar
    const parseRes = parseLL1(res.transformedGrammar, 'id+id');
    expect(parseRes.isAccepted).toBe(true);
  });

  it('transforms indirect left-recursive grammar and eliminates left recursion', () => {
    const res = transformToPredictiveGrammar(G_INDIRECT_REC);
    expect(res.changed).toBe(true);
    expect(res.afterLL1Analysis.leftRecursion.isLeftRecursive).toBe(false);
  });

  it('transforms common-prefix grammar to LL(1)', () => {
    const res = transformToPredictiveGrammar(G_COMMON_PREFIX);
    expect(res.success).toBe(true);
    expect(res.afterLL1Analysis.isLL1).toBe(true);
  });

  it('passes through already LL(1) grammar without changes', () => {
    const res = transformToPredictiveGrammar(G_NO_REC);
    expect(res.success).toBe(true);
    expect(res.changed).toBe(false);
  });

  it('respects maxIterations limit', () => {
    const res = transformToPredictiveGrammar(G_DIRECT_REC, { maxIterations: 1 });
    expect(res.iterations).toBeLessThanOrEqual(1);
  });
});

describe('Language Preservation Verification & Immutability', () => {
  it('verifies bounded language preservation between original and transformed grammar', () => {
    const res = transformToPredictiveGrammar(G_DIRECT_REC);
    expect(res.languagePreservationStatus).toBe('VERIFIED_BOUNDED');

    const directCheck = verifyBoundedLanguagePreservation(G_DIRECT_REC, res.transformedGrammar);
    expect(directCheck.status).toBe('VERIFIED_BOUNDED');
  });

  it('does not mutate original input grammar', () => {
    const copy = JSON.parse(JSON.stringify(G_DIRECT_REC));
    transformToPredictiveGrammar(G_DIRECT_REC);
    expect(G_DIRECT_REC).toEqual(copy);
  });
});
