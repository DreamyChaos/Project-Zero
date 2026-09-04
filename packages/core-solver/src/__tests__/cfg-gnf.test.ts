import { describe, it, expect } from 'vitest';
import {
  toGreibachNormalForm,
  validateGNF,
} from '../cfg-gnf';
import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGProduction,
} from '../types';
import { evaluateCFGMembership } from '../cfg-membership';

// ===================================================================
// Test Helpers
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
// 1. GNF Validator Tests
// ===================================================================

describe('GNF Validator Tests', () => {
  it('Accepts valid GNF productions A -> a, A -> aBC, S -> ε', () => {
    const validGrammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B', 'C'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [EPS]),
        prod('p2', 'S', [t('a'), nt('B'), nt('C')]),
        prod('p3', 'A', [t('a')]),
        prod('p4', 'B', [t('b')]),
        prod('p5', 'C', [t('a'), nt('A')]),
      ],
    };

    const res = validateGNF(validGrammar);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.hasStartEpsilon).toBe(true);
  });

  it('Rejects A -> BC (leading nonterminal)', () => {
    const invalidGrammar: ContextFreeGrammar = {
      variables: ['A', 'B', 'C'],
      terminals: ['a'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [nt('B'), nt('C')]),
        prod('p2', 'B', [t('a')]),
        prod('p3', 'C', [t('a')]),
      ],
    };

    const res = validateGNF(invalidGrammar);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'GNF_LEADING_NON_TERMINAL')).toBe(true);
  });

  it('Rejects A -> Ba (leading nonterminal with terminal)', () => {
    const invalidGrammar: ContextFreeGrammar = {
      variables: ['A', 'B'],
      terminals: ['a'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [nt('B'), t('a')]),
        prod('p2', 'B', [t('a')]),
      ],
    };

    const res = validateGNF(invalidGrammar);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'GNF_LEADING_NON_TERMINAL')).toBe(true);
  });

  it('Rejects A -> a B c (terminal after nonterminal)', () => {
    const invalidGrammar: ContextFreeGrammar = {
      variables: ['A', 'B'],
      terminals: ['a', 'c'],
      startVariable: 'A',
      productions: [
        prod('p1', 'A', [t('a'), nt('B'), t('c')]),
        prod('p2', 'B', [t('a')]),
      ],
    };

    const res = validateGNF(invalidGrammar);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'GNF_TERMINAL_AFTER_FIRST')).toBe(true);
  });

  it('Rejects non-start epsilon production A -> ε', () => {
    const invalidGrammar: ContextFreeGrammar = {
      variables: ['S', 'A'],
      terminals: ['a'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [t('a'), nt('A')]),
        prod('p2', 'A', [EPS]),
      ],
    };

    const res = validateGNF(invalidGrammar);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.code === 'GNF_INVALID_EPSILON')).toBe(true);
  });
});

// ===================================================================
// 2. Mandatory GNF Test Grammars A-D
// ===================================================================

describe('Mandatory GNF Test Grammars A-D', () => {
  // Grammar GNF-A: S -> AB | a, A -> a, B -> b
  it('Grammar GNF-A: S -> AB | a, A -> a, B -> b converts to valid GNF', () => {
    const grammarA: ContextFreeGrammar = {
      variables: ['S', 'A', 'B'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A'), nt('B')]),
        prod('p2', 'S', [t('a')]),
        prod('p3', 'A', [t('a')]),
        prod('p4', 'B', [t('b')]),
      ],
    };

    const res = toGreibachNormalForm(grammarA);
    expect(res.success).toBe(true);
    expect(res.gnfValidation.isValid).toBe(true);

    // Language verification: produces 'ab' and 'a'
    const words = ['a', 'ab', 'b', 'aa', 'aba'];
    for (const w of words) {
      const orig = evaluateCFGMembership(grammarA, w);
      const gnf = evaluateCFGMembership(res.transformedGrammar, w);
      expect(gnf.isAccepted).toBe(orig.isAccepted);
    }
  });

  // Grammar GNF-B: S -> A b | a, A -> a A | b
  it('Grammar GNF-B: S -> Ab | a, A -> aA | b converts to valid GNF with terminal helpers', () => {
    const grammarB: ContextFreeGrammar = {
      variables: ['S', 'A'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A'), t('b')]),
        prod('p2', 'S', [t('a')]),
        prod('p3', 'A', [t('a'), nt('A')]),
        prod('p4', 'A', [t('b')]),
      ],
    };

    const res = toGreibachNormalForm(grammarB);
    expect(res.success).toBe(true);
    expect(res.gnfValidation.isValid).toBe(true);

    // Test strings: 'a' (yes), 'bb' (yes), 'aab' (no), 'abb' (yes), 'aabb' (yes)
    const testCases = ['a', 'bb', 'abb', 'aabb', 'b', 'aa', 'ba'];
    for (const w of testCases) {
      const orig = evaluateCFGMembership(grammarB, w);
      const gnf = evaluateCFGMembership(res.transformedGrammar, w);
      expect(gnf.isAccepted).toBe(orig.isAccepted);
    }
  });

  // Grammar GNF-C: Recursive arithmetic expressions E -> E + T | T, T -> T * F | F, F -> (E) | id
  it('Grammar GNF-C: Expression grammar with left recursion converts to valid GNF and terminates', () => {
    const grammarC: ContextFreeGrammar = {
      variables: ['E', 'T', 'F'],
      terminals: ['+', '*', '(', ')', 'id'],
      startVariable: 'E',
      productions: [
        prod('p1', 'E', [nt('E'), t('+'), nt('T')]),
        prod('p2', 'E', [nt('T')]),
        prod('p3', 'T', [nt('T'), t('*'), nt('F')]),
        prod('p4', 'T', [nt('F')]),
        prod('p5', 'F', [t('('), nt('E'), t(')')]),
        prod('p6', 'F', [t('id')]),
      ],
    };

    const res = toGreibachNormalForm(grammarC);
    expect(res.success).toBe(true);
    expect(res.gnfValidation.isValid).toBe(true);
    expect(res.stages.length).toBeGreaterThanOrEqual(1);

    // Every production in the transformed grammar must start with a terminal
    for (const p of res.transformedGrammar.productions) {
      expect(p.rhs[0].type).toBe('TERMINAL');
      for (let k = 1; k < p.rhs.length; k++) {
        expect(p.rhs[k].type).toBe('NON_TERMINAL');
      }
    }
  });

  // Grammar GNF-D: S -> aS | b (Right recursive, already GNF)
  it('Grammar GNF-D: S -> aS | b converts cleanly and remains valid GNF', () => {
    const grammarD: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [t('a'), nt('S')]),
        prod('p2', 'S', [t('b')]),
      ],
    };

    const res = toGreibachNormalForm(grammarD);
    expect(res.success).toBe(true);
    expect(res.gnfValidation.isValid).toBe(true);

    const testStrings = ['b', 'ab', 'aab', 'aaab', '', 'a', 'ba'];
    for (const w of testStrings) {
      const orig = evaluateCFGMembership(grammarD, w);
      const gnf = evaluateCFGMembership(res.transformedGrammar, w);
      expect(gnf.isAccepted).toBe(orig.isAccepted);
    }
  });
});

// ===================================================================
// 3. Immutability, Determinism, and Preservation
// ===================================================================

describe('GNF Immutability and Determinism', () => {
  it('Preserves original grammar immutably', () => {
    const original: ContextFreeGrammar = {
      variables: ['S', 'A', 'B'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A'), nt('B')]),
        prod('p2', 'A', [t('a')]),
        prod('p3', 'B', [t('b')]),
      ],
    };

    const deepCopy = JSON.stringify(original);
    const res = toGreibachNormalForm(original);

    expect(JSON.stringify(original)).toBe(deepCopy);
    expect(res.transformedGrammar).not.toBe(original);
  });

  it('Produces deterministic output on repeated transformations', () => {
    const grammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [nt('A'), nt('B')]),
        prod('p2', 'S', [t('a')]),
        prod('p3', 'A', [t('a'), nt('A')]),
        prod('p4', 'A', [t('b')]),
        prod('p5', 'B', [t('b')]),
      ],
    };

    const res1 = toGreibachNormalForm(grammar);
    const res2 = toGreibachNormalForm(grammar);

    expect(res1.transformedGrammar.variables).toEqual(res2.transformedGrammar.variables);
    expect(res1.transformedGrammar.productions.map((p) => `${p.lhs}->${p.rhs.map((s) => s.value).join('')}`)).toEqual(
      res2.transformedGrammar.productions.map((p) => `${p.lhs}->${p.rhs.map((s) => s.value).join('')}`)
    );
  });

  it('Handles epsilon in language correctly (S -> aSb | ε)', () => {
    const grammarEps: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        prod('p1', 'S', [t('a'), nt('S'), t('b')]),
        prod('p2', 'S', [EPS]),
      ],
    };

    const res = toGreibachNormalForm(grammarEps);
    expect(res.success).toBe(true);
    expect(res.gnfValidation.isValid).toBe(true);
    expect(res.epsilonInOriginalLanguage).toBe(true);

    // Epsilon is accepted
    const epsMem = evaluateCFGMembership(res.transformedGrammar, '');
    expect(epsMem.isAccepted).toBe(true);
  });
});
