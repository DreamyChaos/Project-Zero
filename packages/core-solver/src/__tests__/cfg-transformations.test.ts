import { describe, it, expect } from 'vitest';
import {
  eliminateDirectLeftRecursion,
  eliminateIndirectLeftRecursion,
  eliminateLeftRecursion,
  leftFactorGrammar,
  transformToPredictiveGrammar,
  verifyBoundedLanguagePreservation,
} from '../cfg-transformations';
import { detectLeftRecursion, detectLeftFactoring } from '../cfg-first-follow';
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

describe('Topic 6 Mandatory Benchmark Grammars A-G', () => {
  // Grammar A: E -> E + T | T, T -> id
  it('Grammar A: Detects immediate left recursion and eliminates it cleanly', () => {
    const diag = detectLeftRecursion(G_DIRECT_REC);
    expect(diag.classification).toBe('IMMEDIATE_LEFT_RECURSION');
    expect(diag.directVariables).toContain('E');

    const elimRes = eliminateLeftRecursion(G_DIRECT_REC);
    expect(elimRes.success).toBe(true);
    expect(elimRes.detectionAfter.isLeftRecursive).toBe(false);
    expect(elimRes.transformedGrammar.variables).toContain("E'");
    expect(elimRes.languagePreservationStatus).toBe('VERIFIED_BOUNDED');
  });

  // Grammar B: A -> A a | A b | c | d
  it('Grammar B: Multiple recursive and non-recursive alternatives', () => {
    const diag = detectLeftRecursion(G_MULTI_DIRECT);
    expect(diag.classification).toBe('IMMEDIATE_LEFT_RECURSION');
    expect(diag.directVariables).toContain('A');

    const elimRes = eliminateLeftRecursion(G_MULTI_DIRECT);
    expect(elimRes.success).toBe(true);
    expect(elimRes.detectionAfter.isLeftRecursive).toBe(false);
  });

  // Grammar C: A -> B a | c, B -> A b | d
  it('Grammar C: Indirect left recursion cycle A -> B -> A', () => {
    const diag = detectLeftRecursion(G_INDIRECT_REC);
    expect(diag.classification).toBe('INDIRECT_LEFT_RECURSION');
    expect(diag.indirectCycles.length).toBeGreaterThan(0);

    const elimRes = eliminateLeftRecursion(G_INDIRECT_REC);
    expect(elimRes.success).toBe(true);
    expect(elimRes.detectionAfter.isLeftRecursive).toBe(false);
  });

  // Grammar D: A -> a A | b (Ordinary Right Recursion)
  it('Grammar D: Ordinary right recursion is NOT classified as left-recursive', () => {
    const grammarD: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a'), nt('A')]),
        prod('p2', 'A', [t('b')]),
      ],
    };

    const diag = detectLeftRecursion(grammarD);
    expect(diag.classification).toBe('NO_LEFT_RECURSION');
    expect(diag.isLeftRecursive).toBe(false);

    const elimRes = eliminateLeftRecursion(grammarD);
    expect(elimRes.changed).toBe(false);
  });

  // Grammar E: A -> A a | ε
  it('Grammar E: Left recursion with epsilon alternative', () => {
    const diag = detectLeftRecursion(G_EPSILON_ALT);
    expect(diag.classification).toBe('IMMEDIATE_LEFT_RECURSION');

    const elimRes = eliminateLeftRecursion(G_EPSILON_ALT);
    expect(elimRes.success).toBe(true);
    expect(elimRes.detectionAfter.isLeftRecursive).toBe(false);
  });

  // Grammar F: Multi-level indirect recursion A -> B a | c, B -> C b | d, C -> A c | e
  it('Grammar F: 3-variable indirect cycle A -> B -> C -> A', () => {
    const grammarF: ContextFreeGrammar = {
      variables: ['A', 'B', 'C'],
      terminals: ['a', 'b', 'c', 'd', 'e'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [nt('B'), t('a')]),
        prod('p2', 'A', [t('c')]),
        prod('p3', 'B', [nt('C'), t('b')]),
        prod('p4', 'B', [t('d')]),
        prod('p5', 'C', [nt('A'), t('c')]),
        prod('p6', 'C', [t('e')]),
      ],
    };

    const diag = detectLeftRecursion(grammarF);
    expect(diag.classification).toBe('INDIRECT_LEFT_RECURSION');
    expect(diag.indirectCycles.length).toBeGreaterThan(0);

    const elimRes = eliminateLeftRecursion(grammarF);
    expect(elimRes.success).toBe(true);
    expect(elimRes.detectionAfter.isLeftRecursive).toBe(false);
  });

  // Grammar G: A -> A b | a A | c (Mixed left and right recursion)
  it('Grammar G: Mixed left recursion A -> A b and right recursion A -> a A', () => {
    const grammarG: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b', 'c'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [nt('A'), t('b')]),
        prod('p2', 'A', [t('a'), nt('A')]),
        prod('p3', 'A', [t('c')]),
      ],
    };

    const diag = detectLeftRecursion(grammarG);
    expect(diag.classification).toBe('IMMEDIATE_LEFT_RECURSION');
    expect(diag.directVariables).toContain('A');

    const elimRes = eliminateLeftRecursion(grammarG);
    expect(elimRes.success).toBe(true);
    expect(elimRes.detectionAfter.isLeftRecursive).toBe(false);
  });

  // Hostile / Edge case: No beta production (A -> A a only)
  it('Handles no-beta case gracefully without crashing', () => {
    const hostileGrammar: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [nt('A'), t('a')]),
      ],
    };

    const elimRes = eliminateLeftRecursion(hostileGrammar);
    expect(elimRes.success).toBe(true);
    expect(elimRes.warnings.length).toBeGreaterThan(0);
    expect(elimRes.detectionAfter.isLeftRecursive).toBe(false);
  });
});

describe('Topic 7 Mandatory Benchmark Grammars A-I (Left Factoring)', () => {
  // Grammar A: A -> ab | ac
  it('Grammar A: Basic left factoring A -> ab | ac extracts common prefix "a"', () => {
    const grammarA: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b', 'c'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a'), t('b')]),
        prod('p2', 'A', [t('a'), t('c')]),
      ],
    };

    const diag = detectLeftFactoring(grammarA);
    expect(diag.requiresFactoring).toBe(true);
    expect(diag.groups.length).toBe(1);
    expect(diag.groups[0].commonPrefixNotation).toBe('a');

    const res = leftFactorGrammar(grammarA);
    expect(res.success).toBe(true);
    expect(res.changed).toBe(true);
    expect(res.detectionAfter.requiresFactoring).toBe(false);
    expect(res.transformedGrammar.variables).toContain("A'");
    expect(res.languagePreservationStatus).toBe('VERIFIED_BOUNDED');
  });

  // Grammar B: A -> abc | abd | abe (3-way longest prefix "ab")
  it('Grammar B: 3-way longest common prefix A -> abc | abd | abe extracts "ab"', () => {
    const grammarB: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b', 'c', 'd', 'e'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a'), t('b'), t('c')]),
        prod('p2', 'A', [t('a'), t('b'), t('d')]),
        prod('p3', 'A', [t('a'), t('b'), t('e')]),
      ],
    };

    const diag = detectLeftFactoring(grammarB);
    expect(diag.requiresFactoring).toBe(true);
    expect(diag.groups[0].commonPrefixNotation).toBe('a b');

    const res = leftFactorGrammar(grammarB);
    expect(res.success).toBe(true);
    expect(res.detectionAfter.requiresFactoring).toBe(false);
  });

  // Grammar C: A -> ab | ac | d | e (Partial factoring)
  it('Grammar C: Partial factoring factors only {ab, ac}, leaving {d, e} untouched', () => {
    const grammarC: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b', 'c', 'd', 'e'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a'), t('b')]),
        prod('p2', 'A', [t('a'), t('c')]),
        prod('p3', 'A', [t('d')]),
        prod('p4', 'A', [t('e')]),
      ],
    };

    const res = leftFactorGrammar(grammarC);
    expect(res.success).toBe(true);
    expect(res.detectionAfter.requiresFactoring).toBe(false);
    // Transformed grammar still derives d and e
    const aProds = res.transformedGrammar.productions.filter((p) => p.lhs === 'A');
    expect(aProds.some((p) => p.rhs.length === 1 && p.rhs[0].value === 'd')).toBe(true);
    expect(aProds.some((p) => p.rhs.length === 1 && p.rhs[0].value === 'e')).toBe(true);
  });

  // Grammar D: A -> abc | abd | aef (Nested multi-pass factoring)
  it('Grammar D: Nested factoring A -> abc | abd | aef performs multi-pass factoring', () => {
    const grammarD: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b', 'c', 'd', 'e', 'f'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a'), t('b'), t('c')]),
        prod('p2', 'A', [t('a'), t('b'), t('d')]),
        prod('p3', 'A', [t('a'), t('e'), t('f')]),
      ],
    };

    const res = leftFactorGrammar(grammarD);
    expect(res.success).toBe(true);
    expect(res.detectionAfter.requiresFactoring).toBe(false);
    expect(res.iterations).toBeGreaterThanOrEqual(1);
    expect(res.languagePreservationStatus).toBe('VERIFIED_BOUNDED');
  });

  // Grammar E: A -> a | ab (Prefix + Empty suffix)
  it('Grammar E: Prefix-of-another A -> a | ab generates epsilon suffix in helper', () => {
    const grammarE: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a')]),
        prod('p2', 'A', [t('a'), t('b')]),
      ],
    };

    const res = leftFactorGrammar(grammarE);
    expect(res.success).toBe(true);
    expect(res.detectionAfter.requiresFactoring).toBe(false);
    // Check that helper variable has an epsilon alternative
    const helperVar = res.generatedSymbolNames[0];
    const helperProds = res.transformedGrammar.productions.filter((p) => p.lhs === helperVar);
    expect(helperProds.some((p) => p.rhs.some((s) => s.type === 'EPSILON'))).toBe(true);
  });

  // Grammar F: A -> ε | ab | ac (Epsilon alternative remains independent)
  it('Grammar F: Epsilon alternative A -> ε | ab | ac remains untouched while factoring ab/ac', () => {
    const grammarF: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b', 'c'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [EPS]),
        prod('p2', 'A', [t('a'), t('b')]),
        prod('p3', 'A', [t('a'), t('c')]),
      ],
    };

    const res = leftFactorGrammar(grammarF);
    expect(res.success).toBe(true);
    expect(res.detectionAfter.requiresFactoring).toBe(false);
    const aProds = res.transformedGrammar.productions.filter((p) => p.lhs === 'A');
    expect(aProds.some((p) => p.rhs.some((s) => s.type === 'EPSILON'))).toBe(true);
  });

  // Grammar G: A -> aB | bB (Terminal-different alternatives, no common prefix)
  it('Grammar G: Terminal-different alternatives A -> aB | bB require NO factoring', () => {
    const grammarG: ContextFreeGrammar = {
      variables: ['A', 'B'],
      terminals: ['a', 'b', 'c'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a'), nt('B')]),
        prod('p2', 'A', [t('b'), nt('B')]),
        prod('p3', 'B', [t('c')]),
      ],
    };

    const diag = detectLeftFactoring(grammarG);
    expect(diag.requiresFactoring).toBe(false);

    const res = leftFactorGrammar(grammarG);
    expect(res.changed).toBe(false);
  });

  // Grammar H: A -> BC | DC (Nonterminal-different alternatives, no common prefix)
  it('Grammar H: Nonterminal-different alternatives A -> BC | DC require NO factoring', () => {
    const grammarH: ContextFreeGrammar = {
      variables: ['A', 'B', 'C', 'D'],
      terminals: ['x', 'y'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [nt('B'), nt('C')]),
        prod('p2', 'A', [nt('D'), nt('C')]),
        prod('p3', 'B', [t('x')]),
        prod('p4', 'D', [t('y')]),
        prod('p5', 'C', [t('x')]),
      ],
    };

    const diag = detectLeftFactoring(grammarH);
    expect(diag.requiresFactoring).toBe(false);

    const res = leftFactorGrammar(grammarH);
    expect(res.changed).toBe(false);
  });

  // Grammar I: A -> aAb | aAc | d (Recursive grammar left factoring)
  it('Grammar I: Recursive grammar A -> aAb | aAc | d factors common prefix "a A"', () => {
    const grammarI: ContextFreeGrammar = {
      variables: ['A'],
      terminals: ['a', 'b', 'c', 'd'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a'), nt('A'), t('b')]),
        prod('p2', 'A', [t('a'), nt('A'), t('c')]),
        prod('p3', 'A', [t('d')]),
      ],
    };

    const diag = detectLeftFactoring(grammarI);
    expect(diag.requiresFactoring).toBe(true);
    expect(diag.groups[0].commonPrefixNotation).toBe('a A');

    const res = leftFactorGrammar(grammarI);
    expect(res.success).toBe(true);
    expect(res.detectionAfter.requiresFactoring).toBe(false);
  });
});


