import { describe, it, expect } from 'vitest';
import { cykParse, tokenizeForCYK } from '../cyk-parser';
import { toChomskyNormalForm } from '../cfg-cnf';
import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGProduction,
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
