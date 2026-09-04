import { describe, it, expect } from 'vitest';
import { cykParse, tokenizeForCYK } from '../cyk-parser';
import { toChomskyNormalForm, validateCNF } from '../cfg-cnf';
import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGProduction,
  CFGParseTreeNode,
} from '../types';

// ===================================================================
// Helpers
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

// ===================================================================
// Grammar Fixtures
// ===================================================================

// G1: L = { aⁿbⁿ | n ≥ 0 }
const G_ANB: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [t('a'), nt('S'), t('b')]),
    prod('p2', 'S', [EPS]),
  ],
  startVariable: 'S',
};

// G_SIMPLE: S → AB, A → a, B → b (already CNF)
const G_SIMPLE_CNF: ContextFreeGrammar = {
  variables: ['S', 'A', 'B'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [nt('A'), nt('B')]),
    prod('p2', 'A', [t('a')]),
    prod('p3', 'B', [t('b')]),
  ],
  startVariable: 'S',
};

// Ambiguous grammar: S → SS | a
const G_AMBIGUOUS: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a'],
  productions: [
    prod('p1', 'S', [nt('S'), nt('S')]),
    prod('p2', 'S', [t('a')]),
  ],
  startVariable: 'S',
};

// Multi-character terminal grammar: S → E, E → E "+" E | "id"
const G_MULTI_TERM: ContextFreeGrammar = {
  variables: ['S', 'E'],
  terminals: ['id', '+'],
  productions: [
    prod('p1', 'S', [nt('E')]),
    prod('p2', 'E', [nt('E'), t('+'), nt('E')]),
    prod('p3', 'E', [t('id')]),
  ],
  startVariable: 'S',
};

// ===================================================================
// Tokenizer Tests
// ===================================================================

describe('CYK Tokenizer', () => {
  it('tokenizes single-char terminals', () => {
    const tokens = tokenizeForCYK('aabb', ['a', 'b']);
    expect(tokens).toEqual(['a', 'a', 'b', 'b']);
  });

  it('tokenizes multi-character terminals', () => {
    const tokens = tokenizeForCYK('id+id', ['id', '+']);
    expect(tokens).toEqual(['id', '+', 'id']);
  });

  it('returns null for untokenizable input', () => {
    const tokens = tokenizeForCYK('abc', ['a', 'b']);
    expect(tokens).toBeNull();
  });

  it('returns empty array for empty input', () => {
    const tokens = tokenizeForCYK('', ['a', 'b']);
    expect(tokens).toEqual([]);
  });

  it('uses greedy longest match', () => {
    const tokens = tokenizeForCYK('identifier', ['id', 'ident', 'ifier', 'identifier']);
    // longest match first should produce 'identifier' as single token
    expect(tokens).toEqual(['identifier']);
  });
});

// ===================================================================
// CYK Parser Tests with Pre-Built CNF
// ===================================================================

describe('CYK Parser: simple CNF grammar', () => {
  it('accepts "ab"', () => {
    const result = cykParse(G_SIMPLE_CNF, 'ab');
    expect(result.isAccepted).toBe(true);
    expect(result.tokens).toEqual(['a', 'b']);
    expect(result.isEpsilonAcceptance).toBe(false);
    expect(result.parseTree).toBeDefined();
  });

  it('rejects "a"', () => {
    const result = cykParse(G_SIMPLE_CNF, 'a');
    expect(result.isAccepted).toBe(false);
  });

  it('rejects "ba"', () => {
    const result = cykParse(G_SIMPLE_CNF, 'ba');
    expect(result.isAccepted).toBe(false);
  });

  it('rejects empty string (no S → ε)', () => {
    const result = cykParse(G_SIMPLE_CNF, '');
    expect(result.isAccepted).toBe(false);
    expect(result.isEpsilonAcceptance).toBe(false);
  });
});

describe('CYK Parser: ambiguous grammar', () => {
  it('accepts "a" (base case)', () => {
    const result = cykParse(G_AMBIGUOUS, 'a');
    expect(result.isAccepted).toBe(true);
    expect(result.parseTree).toBeDefined();
  });

  it('accepts "aa" (S → SS)', () => {
    const result = cykParse(G_AMBIGUOUS, 'aa');
    expect(result.isAccepted).toBe(true);
  });

  it('accepts "aaa" (multiple derivations)', () => {
    const result = cykParse(G_AMBIGUOUS, 'aaa');
    expect(result.isAccepted).toBe(true);
    // Should have multiple witnesses in some cells
    const topCell = result.table.cells[0][2];
    expect(topCell.witnesses.length).toBeGreaterThan(0);
  });

  it('rejects "b"', () => {
    const result = cykParse(G_AMBIGUOUS, 'b');
    expect(result.isAccepted).toBe(false);
  });
});

// ===================================================================
// CYK Parser Tests with CNF Transformation Pipeline
// ===================================================================

describe('CYK Parser: aⁿbⁿ via CNF pipeline', () => {
  const cnfResult = toChomskyNormalForm(G_ANB);
  const cnfGrammar = cnfResult.transformedGrammar;

  it('CNF transformation succeeds', () => {
    expect(cnfResult.success).toBe(true);
  });

  it('accepts ε (empty string)', () => {
    const result = cykParse(cnfGrammar, '');
    expect(result.isAccepted).toBe(true);
    expect(result.isEpsilonAcceptance).toBe(true);
    expect(result.parseTree).toBeDefined();
  });

  it('accepts "ab"', () => {
    const result = cykParse(cnfGrammar, 'ab');
    expect(result.isAccepted).toBe(true);
    expect(result.parseTree).toBeDefined();
  });

  it('accepts "aabb"', () => {
    const result = cykParse(cnfGrammar, 'aabb');
    expect(result.isAccepted).toBe(true);
  });

  it('accepts "aaabbb"', () => {
    const result = cykParse(cnfGrammar, 'aaabbb');
    expect(result.isAccepted).toBe(true);
  });

  it('rejects "a"', () => {
    const result = cykParse(cnfGrammar, 'a');
    expect(result.isAccepted).toBe(false);
  });

  it('rejects "abb"', () => {
    const result = cykParse(cnfGrammar, 'abb');
    expect(result.isAccepted).toBe(false);
  });

  it('rejects "aab"', () => {
    const result = cykParse(cnfGrammar, 'aab');
    expect(result.isAccepted).toBe(false);
  });

  it('rejects "ba"', () => {
    const result = cykParse(cnfGrammar, 'ba');
    expect(result.isAccepted).toBe(false);
  });
});

// ===================================================================
// Language Preservation: Bounded Regression Verification
// ===================================================================

describe('Language Preservation: bounded equivalence check (NOT a proof of unrestricted CFG equivalence)', () => {
  /**
   * IMPORTANT: This is BOUNDED REGRESSION VERIFICATION.
   * We compare CYK membership on the CNF grammar against
   * the expected language for a bounded set of test strings.
   * This is NOT a mathematical proof of unrestricted CFG equivalence.
   */

  it('aⁿbⁿ: positive and negative corpus matches', () => {
    const cnfResult = toChomskyNormalForm(G_ANB);
    expect(cnfResult.success).toBe(true);
    const cnf = cnfResult.transformedGrammar;

    const positive = ['', 'ab', 'aabb', 'aaabbb', 'aaaabbbb'];
    const negative = ['a', 'b', 'ba', 'aab', 'abb', 'abab', 'aabbb'];

    for (const s of positive) {
      const r = cykParse(cnf, s);
      expect(r.isAccepted).toBe(true);
    }
    for (const s of negative) {
      const r = cykParse(cnf, s);
      expect(r.isAccepted).toBe(false);
    }
  });

  it('ambiguous grammar: positive corpus matches', () => {
    // S → SS | a is already CNF
    const positive = ['a', 'aa', 'aaa', 'aaaa'];
    const negative = ['', 'b', 'ab'];

    for (const s of positive) {
      const r = cykParse(G_AMBIGUOUS, s);
      expect(r.isAccepted).toBe(true);
    }
    for (const s of negative) {
      const r = cykParse(G_AMBIGUOUS, s);
      expect(r.isAccepted).toBe(false);
    }
  });
});

// ===================================================================
// Multi-Character Terminal CYK Tests
// ===================================================================

describe('CYK Parser: multi-character terminals', () => {
  const cnfResult = toChomskyNormalForm(G_MULTI_TERM);
  const cnf = cnfResult.transformedGrammar;

  it('CNF transformation succeeds', () => {
    expect(cnfResult.success).toBe(true);
  });

  it('accepts "id"', () => {
    const result = cykParse(cnf, 'id');
    expect(result.isAccepted).toBe(true);
    expect(result.tokens).toEqual(['id']);
  });

  it('accepts "id+id"', () => {
    const result = cykParse(cnf, 'id+id');
    expect(result.isAccepted).toBe(true);
    expect(result.tokens).toEqual(['id', '+', 'id']);
  });

  it('accepts "id+id+id"', () => {
    const result = cykParse(cnf, 'id+id+id');
    expect(result.isAccepted).toBe(true);
  });

  it('rejects "+"', () => {
    const result = cykParse(cnf, '+');
    expect(result.isAccepted).toBe(false);
  });

  it('rejects "id+"', () => {
    const result = cykParse(cnf, 'id+');
    expect(result.isAccepted).toBe(false);
  });

  it('rejects invalid token', () => {
    const result = cykParse(cnf, 'xyz');
    expect(result.isAccepted).toBe(false);
    expect(result.rejectionExplanation).toContain('cannot be tokenized');
  });
});

// ===================================================================
// CYK Table Structure Tests
// ===================================================================

describe('CYK Table correctness', () => {
  it('produces correct cell structure', () => {
    const result = cykParse(G_SIMPLE_CNF, 'ab');
    expect(result.table.tokenCount).toBe(2);
    expect(result.table.tokens).toEqual(['a', 'b']);

    // table[0][0] should contain A (since A → a)
    const cell00 = result.table.cells[0][0];
    expect(cell00.spanStart).toBe(0);
    expect(cell00.spanEnd).toBe(0);
    expect(cell00.variables).toContain('A');

    // table[1][1] should contain B (since B → b)
    const cell11 = result.table.cells[1][1];
    expect(cell11.variables).toContain('B');

    // table[0][1] should contain S (since S → AB)
    const cell01 = result.table.cells[0][1];
    expect(cell01.variables).toContain('S');
  });

  it('stores witnesses for reconstruction', () => {
    const result = cykParse(G_SIMPLE_CNF, 'ab');
    const cell01 = result.table.cells[0][1];

    const sWitness = cell01.witnesses.find((w) => w.variable === 'S');
    expect(sWitness).toBeDefined();
    expect(sWitness!.leftVariable).toBe('A');
    expect(sWitness!.rightVariable).toBe('B');
    expect(sWitness!.splitPosition).toBe(0);
  });
});

// ===================================================================
// Parse Tree Reconstruction Tests
// ===================================================================

describe('CYK Parse Tree reconstruction', () => {
  it('reconstructs valid tree for "ab"', () => {
    const result = cykParse(G_SIMPLE_CNF, 'ab');
    expect(result.parseTree).toBeDefined();
    const tree = result.parseTree!;

    expect(tree.symbol.value).toBe('S');
    expect(tree.children.length).toBe(2);
    expect(tree.children[0].symbol.value).toBe('A');
    expect(tree.children[1].symbol.value).toBe('B');
  });

  it('reconstructs epsilon tree', () => {
    const cnf = toChomskyNormalForm(G_ANB).transformedGrammar;
    const result = cykParse(cnf, '');
    expect(result.parseTree).toBeDefined();
    const tree = result.parseTree!;

    expect(tree.symbol.type).toBe('NON_TERMINAL');
    expect(tree.children.length).toBe(1);
    expect(tree.children[0].symbol.type).toBe('EPSILON');
  });
});

// ===================================================================
// Edge Cases & Performance Bounds
// ===================================================================

describe('CYK Parser: edge cases', () => {
  it('handles single-token input', () => {
    const g: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a'],
      productions: [prod('p1', 'S', [t('a')])],
      startVariable: 'S',
    };
    const result = cykParse(g, 'a');
    expect(result.isAccepted).toBe(true);
  });

  it('reports boundedByLimit when maxTokens exceeded', () => {
    const result = cykParse(G_SIMPLE_CNF, 'ab', { maxTokens: 1 });
    expect(result.isAccepted).toBe(false);
    expect(result.boundedByLimit).toBe(true);
  });

  it('reports boundedByLimit when maxCells exceeded', () => {
    const cnf = toChomskyNormalForm(G_ANB).transformedGrammar;
    const longInput = 'a'.repeat(10) + 'b'.repeat(10);
    const result = cykParse(cnf, longInput, { maxCells: 5 });
    expect(result.boundedByLimit).toBe(true);
  });

  it('handles grammar rejecting ε correctly', () => {
    const result = cykParse(G_SIMPLE_CNF, '');
    expect(result.isAccepted).toBe(false);
    expect(result.isEpsilonAcceptance).toBe(false);
  });

  it('handles longer accepted input', () => {
    const cnf = toChomskyNormalForm(G_ANB).transformedGrammar;
    const result = cykParse(cnf, 'aaaaabbbbb');
    expect(result.isAccepted).toBe(true);
  });

  it('handles longer rejected input', () => {
    const cnf = toChomskyNormalForm(G_ANB).transformedGrammar;
    const result = cykParse(cnf, 'aaaaabbbb');
    expect(result.isAccepted).toBe(false);
  });
});

// ===================================================================
// MANDATORY TOPIC 9 SPECIFICATION TESTS (A through Q)
// ===================================================================

describe('Topic 9 Mandatory Tests: Tests A through Q', () => {
  // TEST A — SIMPLE ACCEPTANCE
  it('TEST A — Simple Acceptance: S → AB, A → a, B → b with "ab"', () => {
    const result = cykParse(G_SIMPLE_CNF, 'ab');
    expect(result.isAccepted).toBe(true);
    expect(result.table.cells[0][1].variables).toContain('S');
    expect(result.exactParseTreeCount).toBe(1);
    expect(result.isAmbiguous).toBe(false);
  });

  // TEST B — SIMPLE REJECTION
  it('TEST B — Simple Rejection: S → AB, A → a, B → b with "aa"', () => {
    const result = cykParse(G_SIMPLE_CNF, 'aa');
    expect(result.isAccepted).toBe(false);
    expect(result.table.cells[0][1].variables).not.toContain('S');
    expect(result.rejectionExplanation).toBeDefined();
  });

  // TEST C — SINGLE TOKEN ACCEPTANCE
  it('TEST C — Single Token Acceptance: S → a with "a"', () => {
    const g: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a'],
      productions: [prod('p1', 'S', [t('a')])],
      startVariable: 'S',
    };
    const result = cykParse(g, 'a');
    expect(result.isAccepted).toBe(true);
    expect(result.table.cells[0][0].variables).toContain('S');
  });

  // TEST D — SINGLE TOKEN REJECTION
  it('TEST D — Single Token Rejection: S → a with "b"', () => {
    const g: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a', 'b'],
      productions: [prod('p1', 'S', [t('a')])],
      startVariable: 'S',
    };
    const result = cykParse(g, 'b');
    expect(result.isAccepted).toBe(false);
    expect(result.table.cells[0][0].variables).not.toContain('S');
  });

  // TEST E — CLASSIC CYK TEXTBOOK EXAMPLE
  it('TEST E — Classic CYK Example: S → AB | BC, A → BA | a, B → CC | b, C → AB | a with "baaba"', () => {
    const classicGrammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B', 'C'],
      terminals: ['a', 'b'],
      productions: [
        prod('p1', 'S', [nt('A'), nt('B')]),
        prod('p2', 'S', [nt('B'), nt('C')]),
        prod('p3', 'A', [nt('B'), nt('A')]),
        prod('p4', 'A', [t('a')]),
        prod('p5', 'B', [nt('C'), nt('C')]),
        prod('p6', 'B', [t('b')]),
        prod('p7', 'C', [nt('A'), nt('B')]),
        prod('p8', 'C', [t('a')]),
      ],
      startVariable: 'S',
    };

    const cnfVal = validateCNF(classicGrammar);
    expect(cnfVal.isValid).toBe(true);

    const result = cykParse(classicGrammar, 'baaba');
    expect(result.isAccepted).toBe(true);
    expect(result.tokens).toEqual(['b', 'a', 'a', 'b', 'a']);

    // Check base cells (length 1):
    // pos 0 ('b'): B
    expect(result.table.cells[0][0].variables).toEqual(expect.arrayContaining(['B']));
    // pos 1 ('a'): A, C
    expect(result.table.cells[1][1].variables).toEqual(expect.arrayContaining(['A', 'C']));
    // pos 2 ('a'): A, C
    expect(result.table.cells[2][2].variables).toEqual(expect.arrayContaining(['A', 'C']));
    // pos 3 ('b'): B
    expect(result.table.cells[3][3].variables).toEqual(expect.arrayContaining(['B']));
    // pos 4 ('a'): A, C
    expect(result.table.cells[4][4].variables).toEqual(expect.arrayContaining(['A', 'C']));

    // Top root cell [0, 4] must contain S
    expect(result.table.cells[0][4].variables).toContain('S');
    expect(result.parseTree).toBeDefined();
    expect(result.parseTree!.symbol.value).toBe('S');
  });

  // TEST F — EMPTY INPUT HANDLING
  it('TEST F — Empty Input: handles ε-accepting and ε-rejecting grammars', () => {
    // Epsilon-accepting grammar
    const gEps: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a'],
      productions: [prod('p1', 'S', [EPS]), prod('p2', 'S', [t('a')])],
      startVariable: 'S',
    };
    const resEps = cykParse(gEps, '');
    expect(resEps.isAccepted).toBe(true);
    expect(resEps.isEpsilonAcceptance).toBe(true);
    expect(resEps.parseTree).toBeDefined();

    // Epsilon-rejecting grammar
    const resNoEps = cykParse(G_SIMPLE_CNF, '');
    expect(resNoEps.isAccepted).toBe(false);
    expect(resNoEps.isEpsilonAcceptance).toBe(false);
  });

  // TEST G — NON-CNF GRAMMAR (S → ABC)
  it('TEST G — Non-CNF Grammar: S → ABC fails CNF validation', () => {
    const nonCnf: ContextFreeGrammar = {
      variables: ['S', 'A', 'B', 'C'],
      terminals: ['a', 'b', 'c'],
      productions: [
        prod('p1', 'S', [nt('A'), nt('B'), nt('C')]),
        prod('p2', 'A', [t('a')]),
        prod('p3', 'B', [t('b')]),
        prod('p4', 'C', [t('c')]),
      ],
      startVariable: 'S',
    };
    const cnfVal = validateCNF(nonCnf);
    expect(cnfVal.isValid).toBe(false);
    expect(cnfVal.errors.some((e) => e.code === 'CNF_RHS_TOO_LONG')).toBe(true);

    // After converting through Topic 8 pipeline, CYK succeeds
    const converted = toChomskyNormalForm(nonCnf);
    expect(converted.success).toBe(true);
    const cykRes = cykParse(converted.transformedGrammar, 'abc');
    expect(cykRes.isAccepted).toBe(true);
  });

  // TEST H — UNIT PRODUCTION (S → A)
  it('TEST H — Unit Production: S → A, A → a fails CNF validation', () => {
    const unitGrammar: ContextFreeGrammar = {
      variables: ['S', 'A'],
      terminals: ['a'],
      productions: [prod('p1', 'S', [nt('A')]), prod('p2', 'A', [t('a')])],
      startVariable: 'S',
    };
    const cnfVal = validateCNF(unitGrammar);
    expect(cnfVal.isValid).toBe(false);
    expect(cnfVal.errors.some((e) => e.code === 'CNF_UNIT_PRODUCTION')).toBe(true);
  });

  // TEST I — TERMINAL MIXED WITH NONTERMINAL (S → aB)
  it('TEST I — Terminal Mixed with Nonterminal: S → aB fails CNF validation', () => {
    const mixedGrammar: ContextFreeGrammar = {
      variables: ['S', 'B'],
      terminals: ['a', 'b'],
      productions: [prod('p1', 'S', [t('a'), nt('B')]), prod('p2', 'B', [t('b')])],
      startVariable: 'S',
    };
    const cnfVal = validateCNF(mixedGrammar);
    expect(cnfVal.isValid).toBe(false);
    expect(cnfVal.errors.some((e) => e.code === 'CNF_TERMINAL_IN_BINARY')).toBe(true);
  });

  // TEST J — LONGER ACCEPTED STRING
  it('TEST J — Longer Accepted String with aⁿbⁿ', () => {
    const cnf = toChomskyNormalForm(G_ANB).transformedGrammar;
    const res = cykParse(cnf, 'aaabbb');
    expect(res.isAccepted).toBe(true);
    expect(res.table.tokenCount).toBe(6);
    expect(res.statistics).toBeDefined();
    expect(res.statistics!.populatedCells).toBeGreaterThan(0);
    expect(res.proofSteps).toBeDefined();
    expect(res.proofSteps!.length).toBeGreaterThan(0);
  });

  // TEST K — AMBIGUOUS CNF GRAMMAR (S → SS | a with "aaa")
  it('TEST K — Ambiguous Grammar: S → SS | a detects multiple parses', () => {
    const result = cykParse(G_AMBIGUOUS, 'aaa');
    expect(result.isAccepted).toBe(true);
    expect(result.isAmbiguous).toBe(true);
    // For "aaa", Catalan number C_2 = 2 distinct binary trees: (S(SS)) and ((SS)S)
    expect(result.exactParseTreeCount).toBe(2);
    expect(result.isExactCountKnown).toBe(true);
    expect(result.parseTrees).toBeDefined();
    expect(result.parseTrees!.length).toBe(2);
  });

  // TEST L — ALTERNATIVE SPLITS
  it('TEST L — Alternative Splits retained in cell witnesses', () => {
    const result = cykParse(G_AMBIGUOUS, 'aaa');
    const topCell = result.table.cells[0][2];
    const sWitnesses = topCell.witnesses.filter((w) => w.variable === 'S');
    // For "aaa" (indices 0..2), split can be k=0 or k=1
    const splits = sWitnesses.map((w) => w.splitPosition);
    expect(splits).toContain(0);
    expect(splits).toContain(1);
  });

  // TEST M — START SYMBOL NOT S
  it('TEST M — Start Symbol not S: works with E as start symbol', () => {
    const gE: ContextFreeGrammar = {
      variables: ['E', 'T'],
      terminals: ['x'],
      productions: [
        prod('p1', 'E', [nt('T'), nt('T')]),
        prod('p2', 'T', [t('x')]),
      ],
      startVariable: 'E',
    };
    const res = cykParse(gE, 'xx');
    expect(res.isAccepted).toBe(true);
    expect(res.table.cells[0][1].variables).toContain('E');
    expect(res.parseTree!.symbol.value).toBe('E');
  });

  // TEST N — GRAMMAR SWITCH STATE ISOLATION
  it('TEST N — Grammar Switch: independent runs do not leak state', () => {
    const res1 = cykParse(G_SIMPLE_CNF, 'ab');
    expect(res1.isAccepted).toBe(true);
    expect(res1.table.cells[0][1].variables).toContain('S');

    const res2 = cykParse(G_AMBIGUOUS, 'a');
    expect(res2.isAccepted).toBe(true);
    expect(res2.table.cells[0][0].variables).toContain('S');

    const res3 = cykParse(G_SIMPLE_CNF, 'ba');
    expect(res3.isAccepted).toBe(false);
    expect(res3.table.cells[0][1].variables).not.toContain('S');
  });

  // TEST O — INPUT SWITCH STATE ISOLATION
  it('TEST O — Input Switch: changing input produces cleanly recomputed result', () => {
    const res1 = cykParse(G_SIMPLE_CNF, 'ab');
    expect(res1.isAccepted).toBe(true);

    const res2 = cykParse(G_SIMPLE_CNF, 'aa');
    expect(res2.isAccepted).toBe(false);
  });

  // TEST P — RESET CLEANLINESS
  it('TEST P — Reset Cleanliness: options with tight limit do not affect subsequent runs', () => {
    const resBounded = cykParse(G_SIMPLE_CNF, 'ab', { maxTokens: 1 });
    expect(resBounded.boundedByLimit).toBe(true);

    const resNormal = cykParse(G_SIMPLE_CNF, 'ab');
    expect(resNormal.boundedByLimit).toBe(false);
    expect(resNormal.isAccepted).toBe(true);
  });

  // TEST Q — CNF CONVERSION INTEGRATION
  it('TEST Q — CNF Conversion Integration: original CFG unchanged, CNF valid, CYK correct', () => {
    const originalProdsCount = G_ANB.productions.length;
    const cnfTransform = toChomskyNormalForm(G_ANB);
    expect(cnfTransform.success).toBe(true);

    // Verify original grammar is immutable
    expect(G_ANB.productions.length).toBe(originalProdsCount);

    // Verify transformed grammar is valid CNF
    const val = validateCNF(cnfTransform.transformedGrammar);
    expect(val.isValid).toBe(true);

    // Verify CYK runs correctly on transformed grammar
    const cyk1 = cykParse(cnfTransform.transformedGrammar, 'aabb');
    expect(cyk1.isAccepted).toBe(true);
    const cyk2 = cykParse(cnfTransform.transformedGrammar, 'aab');
    expect(cyk2.isAccepted).toBe(false);
  });
});

// ===================================================================
// MATHEMATICAL INVARIANTS & CATALAN NUMBER PROPERTY TESTS
// ===================================================================

describe('Mathematical Invariant Tests', () => {
  it('Invariant: Catalan number parse tree counts for S → SS | a', () => {
    // For string of length n, number of binary parse trees is C_{n-1}
    // n = 1: C_0 = 1
    // n = 2: C_1 = 1
    // n = 3: C_2 = 2
    // n = 4: C_3 = 5
    // n = 5: C_4 = 14
    const r1 = cykParse(G_AMBIGUOUS, 'a');
    expect(r1.exactParseTreeCount).toBe(1);

    const r2 = cykParse(G_AMBIGUOUS, 'aa');
    expect(r2.exactParseTreeCount).toBe(1);

    const r3 = cykParse(G_AMBIGUOUS, 'aaa');
    expect(r3.exactParseTreeCount).toBe(2);

    const r4 = cykParse(G_AMBIGUOUS, 'aaaa');
    expect(r4.exactParseTreeCount).toBe(5);

    const r5 = cykParse(G_AMBIGUOUS, 'aaaaa');
    expect(r5.exactParseTreeCount).toBe(14);
  });

  it('Invariant: Every populated cell has valid production evidence and split bounds', () => {
    const res = cykParse(G_SIMPLE_CNF, 'ab');
    const { cells } = res.table;

    for (let i = 0; i < cells.length; i++) {
      for (let j = i; j < cells.length; j++) {
        const cell = cells[i][j];
        for (const witness of cell.witnesses) {
          expect(cell.variables).toContain(witness.variable);
          if (i === j) {
            expect(witness.splitPosition).toBe(i);
            expect(witness.productionRhs[0].type).toBe('TERMINAL');
          } else {
            expect(witness.splitPosition).toBeGreaterThanOrEqual(i);
            expect(witness.splitPosition).toBeLessThan(j);
            expect(witness.leftVariable).toBeDefined();
            expect(witness.rightVariable).toBeDefined();

            // Left child cell must contain leftVariable
            const leftCell = cells[i][witness.splitPosition];
            expect(leftCell.variables).toContain(witness.leftVariable);

            // Right child cell must contain rightVariable
            const rightCell = cells[witness.splitPosition + 1][j];
            expect(rightCell.variables).toContain(witness.rightVariable);
          }
        }
      }
    }
  });

  it('Invariant: Contributing cells are marked for accepted strings', () => {
    const res = cykParse(G_SIMPLE_CNF, 'ab');
    expect(res.isAccepted).toBe(true);
    // Root cell [0, 1] contributes
    expect(res.table.cells[0][1].contributesToParse).toBe(true);
    // Leaf cells [0, 0] and [1, 1] contribute
    expect(res.table.cells[0][0].contributesToParse).toBe(true);
    expect(res.table.cells[1][1].contributesToParse).toBe(true);
  });

  it('Invariant: All materialized parse trees strictly yield the original token sequence', () => {
    function getYield(node: CFGParseTreeNode): string {
      if (node.symbol.type === 'TERMINAL') return node.symbol.value;
      if (!node.children || node.children.length === 0) return '';
      return node.children.map(getYield).join('');
    }

    const res = cykParse(G_AMBIGUOUS, 'aaaa');
    expect(res.isAccepted).toBe(true);
    expect(res.parseTrees).toBeDefined();
    expect(res.parseTrees!.length).toBe(5);

    for (const tree of res.parseTrees!) {
      expect(getYield(tree)).toBe('aaaa');
    }
  });

  it('Invariant: Extremely ambiguous case overflow detection is mathematically honest', () => {
    // Highly ambiguous grammar:
    // S -> SS | a | b | c
    // S -> AA, A -> SS | a
    const G_HYPER_AMBIGUOUS: ContextFreeGrammar = {
      variables: ['S', 'A'],
      terminals: ['a'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'S' }, { type: 'NON_TERMINAL', value: 'S' }] },
        { id: 'p2', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'A' }, { type: 'NON_TERMINAL', value: 'A' }] },
        { id: 'p3', lhs: 'A', rhs: [{ type: 'NON_TERMINAL', value: 'S' }, { type: 'NON_TERMINAL', value: 'S' }] },
        { id: 'p4', lhs: 'S', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p5', lhs: 'A', rhs: [{ type: 'TERMINAL', value: 'a' }] },
      ],
    };

    // For length 20 on G_HYPER_AMBIGUOUS, the number of parse trees grows exponentially beyond MAX_SAFE_INTEGER
    const input20 = 'a'.repeat(25);
    const res = cykParse(G_HYPER_AMBIGUOUS, input20);
    expect(res.isAccepted).toBe(true);
    // If it overflows safe integer:
    if (!res.isExactCountKnown) {
      expect(res.exactParseTreeCount).toBe(Number.MAX_SAFE_INTEGER);
      expect(res.isParseTreeCapped).toBe(true);
    } else {
      expect(res.exactParseTreeCount).toBeGreaterThan(1000);
    }
  });
});
