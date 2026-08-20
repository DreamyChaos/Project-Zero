import { describe, it, expect } from 'vitest';
import {
  toChomskyNormalForm,
  validateCNF,
} from '../cfg-cnf';
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

// G1: L = { aⁿbⁿ | n ≥ 0 }  →  S → aSb | ε
const G_ANB: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [t('a'), nt('S'), t('b')]),
    prod('p2', 'S', [EPS]),
  ],
  startVariable: 'S',
};

// G2: Grammar with unit productions: S → A, A → B, B → a
const G_UNIT_CHAIN: ContextFreeGrammar = {
  variables: ['S', 'A', 'B'],
  terminals: ['a'],
  productions: [
    prod('p1', 'S', [nt('A')]),
    prod('p2', 'A', [nt('B')]),
    prod('p3', 'B', [t('a')]),
  ],
  startVariable: 'S',
};

// G3: Multiple nullable variables: S → AB, A → aA | ε, B → bB | ε
const G_MULTI_NULLABLE: ContextFreeGrammar = {
  variables: ['S', 'A', 'B'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [nt('A'), nt('B')]),
    prod('p2', 'A', [t('a'), nt('A')]),
    prod('p3', 'A', [EPS]),
    prod('p4', 'B', [t('b'), nt('B')]),
    prod('p5', 'B', [EPS]),
  ],
  startVariable: 'S',
};

// G4: RHS length 4: S → ABCD, A → a, B → b, C → c, D → d
const G_LONG_RHS: ContextFreeGrammar = {
  variables: ['S', 'A', 'B', 'C', 'D'],
  terminals: ['a', 'b', 'c', 'd'],
  productions: [
    prod('p1', 'S', [nt('A'), nt('B'), nt('C'), nt('D')]),
    prod('p2', 'A', [t('a')]),
    prod('p3', 'B', [t('b')]),
    prod('p4', 'C', [t('c')]),
    prod('p5', 'D', [t('d')]),
  ],
  startVariable: 'S',
};

// G5: Terminal + non-terminal mixture: S → aB | Bc, B → b
const G_MIXED: ContextFreeGrammar = {
  variables: ['S', 'B'],
  terminals: ['a', 'b', 'c'],
  productions: [
    prod('p1', 'S', [t('a'), nt('B')]),
    prod('p2', 'S', [nt('B'), t('c')]),
    prod('p3', 'B', [t('b')]),
  ],
  startVariable: 'S',
};

// G6: Already in CNF: S → AB, A → a, B → b
const G_ALREADY_CNF: ContextFreeGrammar = {
  variables: ['S', 'A', 'B'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [nt('A'), nt('B')]),
    prod('p2', 'A', [t('a')]),
    prod('p3', 'B', [t('b')]),
  ],
  startVariable: 'S',
};

// G7: Unreachable variable: S → a, X → b (X is unreachable)
const G_UNREACHABLE: ContextFreeGrammar = {
  variables: ['S', 'X'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [t('a')]),
    prod('p2', 'X', [t('b')]),
  ],
  startVariable: 'S',
};

// G8: Epsilon-only grammar: S → ε
const G_EPSILON_ONLY: ContextFreeGrammar = {
  variables: ['S'],
  terminals: [],
  productions: [
    prod('p1', 'S', [EPS]),
  ],
  startVariable: 'S',
};

// G9: Start symbol appears on RHS: S → aS | b
const G_START_ON_RHS: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [t('a'), nt('S')]),
    prod('p2', 'S', [t('b')]),
  ],
  startVariable: 'S',
};

// G10: Unit production cycle: S → A, A → B, B → A | a
const G_UNIT_CYCLE: ContextFreeGrammar = {
  variables: ['S', 'A', 'B'],
  terminals: ['a'],
  productions: [
    prod('p1', 'S', [nt('A')]),
    prod('p2', 'A', [nt('B')]),
    prod('p3', 'B', [nt('A')]),
    prod('p4', 'B', [t('a')]),
  ],
  startVariable: 'S',
};

// G11: Left-recursive: S → Sa | b
const G_LEFT_REC: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [nt('S'), t('a')]),
    prod('p2', 'S', [t('b')]),
  ],
  startVariable: 'S',
};

// G12: Non-generating variable: S → a | A, A → AB, B → b
const G_NON_GENERATING: ContextFreeGrammar = {
  variables: ['S', 'A', 'B'],
  terminals: ['a', 'b'],
  productions: [
    prod('p1', 'S', [t('a')]),
    prod('p2', 'S', [nt('A')]),
    prod('p3', 'A', [nt('A'), nt('B')]),
    prod('p4', 'B', [t('b')]),
  ],
  startVariable: 'S',
};

// G13: Multi-character terminals: S → "id" "+" "id"
const G_MULTI_CHAR_TERM: ContextFreeGrammar = {
  variables: ['S', 'E'],
  terminals: ['id', '+'],
  productions: [
    prod('p1', 'S', [nt('E')]),
    prod('p2', 'E', [nt('E'), t('+'), nt('E')]),
    prod('p3', 'E', [t('id')]),
  ],
  startVariable: 'S',
};

// G14: Duplicate productions: S → a, S → a
const G_DUPLICATE: ContextFreeGrammar = {
  variables: ['S'],
  terminals: ['a'],
  productions: [
    prod('p1', 'S', [t('a')]),
    prod('p2', 'S', [t('a')]),
  ],
  startVariable: 'S',
};

// G15: RHS length 3: S → ABC, A → a, B → b, C → c
const G_RHS3: ContextFreeGrammar = {
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

// ===================================================================
// CNF Transformation Tests
// ===================================================================

describe('CNF Transformation: toChomskyNormalForm', () => {
  it('transforms G1 (aⁿbⁿ) correctly preserving ε', () => {
    const result = toChomskyNormalForm(G_ANB);
    expect(result.success).toBe(true);
    expect(result.epsilonInOriginalLanguage).toBe(true);

    // Validate the result is valid CNF
    const cnfValidation = validateCNF(result.transformedGrammar);
    expect(cnfValidation.isValid).toBe(true);
    expect(cnfValidation.hasStartEpsilon).toBe(true);
  });

  it('transforms unit production chains', () => {
    const result = toChomskyNormalForm(G_UNIT_CHAIN);
    expect(result.success).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);

    // Should have no unit productions
    for (const p of result.transformedGrammar.productions) {
      if (p.rhs.length === 1) {
        expect(p.rhs[0].type).not.toBe('NON_TERMINAL');
      }
    }
  });

  it('handles multiple nullable variables', () => {
    const result = toChomskyNormalForm(G_MULTI_NULLABLE);
    expect(result.success).toBe(true);
    expect(result.epsilonInOriginalLanguage).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('binarizes RHS length 4', () => {
    const result = toChomskyNormalForm(G_LONG_RHS);
    expect(result.success).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);

    // Every production must have RHS ≤ 2
    for (const p of result.transformedGrammar.productions) {
      expect(p.rhs.length).toBeLessThanOrEqual(2);
    }
  });

  it('isolates terminals in mixed productions', () => {
    const result = toChomskyNormalForm(G_MIXED);
    expect(result.success).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('passes through already-CNF grammar', () => {
    const result = toChomskyNormalForm(G_ALREADY_CNF);
    expect(result.success).toBe(true);
    expect(result.epsilonInOriginalLanguage).toBe(false);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('removes unreachable variables', () => {
    const result = toChomskyNormalForm(G_UNREACHABLE);
    expect(result.success).toBe(true);

    // X should be removed
    expect(result.transformedGrammar.variables).not.toContain('X');
  });

  it('handles epsilon-only grammar', () => {
    const result = toChomskyNormalForm(G_EPSILON_ONLY);
    expect(result.success).toBe(true);
    expect(result.epsilonInOriginalLanguage).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('normalizes start symbol appearing on RHS', () => {
    const result = toChomskyNormalForm(G_START_ON_RHS);
    expect(result.success).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('handles unit production cycles', () => {
    const result = toChomskyNormalForm(G_UNIT_CYCLE);
    expect(result.success).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('handles left-recursive grammar', () => {
    const result = toChomskyNormalForm(G_LEFT_REC);
    expect(result.success).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('eliminates non-generating variables', () => {
    const result = toChomskyNormalForm(G_NON_GENERATING);
    expect(result.success).toBe(true);

    // A should be removed (it's non-generating since A → AB with A non-generating)
    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('handles multi-character terminals', () => {
    const result = toChomskyNormalForm(G_MULTI_CHAR_TERM);
    expect(result.success).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);
  });

  it('deduplicates productions', () => {
    const result = toChomskyNormalForm(G_DUPLICATE);
    expect(result.success).toBe(true);

    // Should not have duplicate productions
    const keys = new Set<string>();
    for (const p of result.transformedGrammar.productions) {
      const key = `${p.lhs}->${p.rhs.map((s) => `${s.type}:${s.value}`).join(',')}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  it('binarizes RHS length 3', () => {
    const result = toChomskyNormalForm(G_RHS3);
    expect(result.success).toBe(true);

    const cnf = validateCNF(result.transformedGrammar);
    expect(cnf.isValid).toBe(true);

    for (const p of result.transformedGrammar.productions) {
      expect(p.rhs.length).toBeLessThanOrEqual(2);
    }
  });

  it('does not mutate the original grammar', () => {
    const originalCopy = JSON.parse(JSON.stringify(G_ANB));
    toChomskyNormalForm(G_ANB);
    expect(G_ANB).toEqual(originalCopy);
  });

  it('produces transformation trace stages', () => {
    const result = toChomskyNormalForm(G_ANB);
    expect(result.stages.length).toBeGreaterThan(0);

    for (const stage of result.stages) {
      expect(stage.stage).toBeDefined();
      expect(stage.description).toBeDefined();
      expect(stage.mathematicalExplanation).toBeDefined();
      expect(stage.grammarBefore).toBeDefined();
      expect(stage.grammarAfter).toBeDefined();
    }
  });
});

// ===================================================================
// CNF Validator Tests
// ===================================================================

describe('CNF Validation: validateCNF', () => {
  it('accepts valid CNF grammar', () => {
    const result = validateCNF(G_ALREADY_CNF);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects grammar with RHS > 2', () => {
    const result = validateCNF(G_RHS3);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((d) => d.code === 'CNF_RHS_TOO_LONG')).toBe(true);
  });

  it('rejects unit productions', () => {
    const result = validateCNF(G_UNIT_CHAIN);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((d) => d.code === 'CNF_UNIT_PRODUCTION')).toBe(true);
  });

  it('rejects terminal in binary RHS', () => {
    const g: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a', 'b'],
      productions: [prod('p1', 'S', [t('a'), t('b')])],
      startVariable: 'S',
    };
    const result = validateCNF(g);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((d) => d.code === 'CNF_TERMINAL_IN_BINARY')).toBe(true);
  });

  it('accepts S → ε when S is start symbol', () => {
    const g: ContextFreeGrammar = {
      variables: ['S', 'A', 'B'],
      terminals: ['a', 'b'],
      productions: [
        prod('p1', 'S', [nt('A'), nt('B')]),
        prod('p2', 'S', [EPS]),
        prod('p3', 'A', [t('a')]),
        prod('p4', 'B', [t('b')]),
      ],
      startVariable: 'S',
    };
    const result = validateCNF(g);
    expect(result.isValid).toBe(true);
    expect(result.hasStartEpsilon).toBe(true);
  });

  it('rejects ε for non-start variable', () => {
    const g: ContextFreeGrammar = {
      variables: ['S', 'A'],
      terminals: ['a'],
      productions: [
        prod('p1', 'S', [nt('A')]),
        prod('p2', 'A', [EPS]),
      ],
      startVariable: 'S',
    };
    const result = validateCNF(g);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((d) => d.code === 'CNF_INVALID_EPSILON')).toBe(true);
  });
});
