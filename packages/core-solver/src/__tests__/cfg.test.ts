import { describe, it, expect } from 'vitest';
import {
  ContextFreeGrammar,
  validateCFG,
  analyzeCFG,
  generateDerivation,
  evaluateCFGMembership,
  buildParseTreeFromDerivation,
} from '../index';

describe('Context-Free Grammar (CFG) Foundation Tests', () => {
  // G1: S -> a S b | ε (L = { a^n b^n | n >= 0 })
  const g1: ContextFreeGrammar = {
    variables: ['S'],
    terminals: ['a', 'b'],
    startVariable: 'S',
    productions: [
      {
        id: 'p1',
        lhs: 'S',
        rhs: [
          { type: 'TERMINAL', value: 'a' },
          { type: 'NON_TERMINAL', value: 'S' },
          { type: 'TERMINAL', value: 'b' },
        ],
      },
      {
        id: 'p2',
        lhs: 'S',
        rhs: [{ type: 'EPSILON', value: 'ε' }],
      },
    ],
  };

  it('1. Validates G1 grammar structure cleanly', () => {
    const val = validateCFG(g1);
    expect(val.isValid).toBe(true);
    expect(val.errors.length).toBe(0);
  });

  it('2. Analyzes G1 fixed-point properties (nullable, generating, reachable)', () => {
    const analysis = analyzeCFG(g1);
    expect(analysis.nullableVariables).toContain('S');
    expect(analysis.generatingVariables).toContain('S');
    expect(analysis.reachableVariables).toContain('S');
    expect(analysis.uselessVariables.length).toBe(0);
    expect(analysis.isLanguageEmpty).toBe(false);
  });

  it('3. Generates Leftmost & Rightmost derivations for "aabb"', () => {
    const leftmost = generateDerivation(g1, 'aabb', { derivationType: 'LEFTMOST' });
    expect(leftmost.success).toBe(true);
    expect(leftmost.steps.length).toBe(4); // S -> aSb -> aaSbb -> aabb

    const rightmost = generateDerivation(g1, 'aabb', { derivationType: 'RIGHTMOST' });
    expect(rightmost.success).toBe(true);
    expect(rightmost.steps.length).toBe(4);
  });

  it('4. Evaluates membership for valid and invalid strings', () => {
    expect(evaluateCFGMembership(g1, '').isAccepted).toBe(true);
    expect(evaluateCFGMembership(g1, 'ab').isAccepted).toBe(true);
    expect(evaluateCFGMembership(g1, 'aabb').isAccepted).toBe(true);
    expect(evaluateCFGMembership(g1, 'aaabbb').isAccepted).toBe(true);

    expect(evaluateCFGMembership(g1, 'a').isAccepted).toBe(false);
    expect(evaluateCFGMembership(g1, 'b').isAccepted).toBe(false);
    expect(evaluateCFGMembership(g1, 'abb').isAccepted).toBe(false);
    expect(evaluateCFGMembership(g1, 'aab').isAccepted).toBe(false);
    expect(evaluateCFGMembership(g1, 'ba').isAccepted).toBe(false);
  });

  it('5. Builds parse tree from derivation', () => {
    const deriv = generateDerivation(g1, 'ab');
    const tree = buildParseTreeFromDerivation(deriv);

    expect(tree).not.toBeNull();
    expect(tree?.symbol.value).toBe('S');
    expect(tree?.children.length).toBeGreaterThan(0);
  });

  it('6. Hostile Test: Detects undefined variables and namespace collisions', () => {
    const badGrammar: ContextFreeGrammar = {
      variables: ['S', 'A'],
      terminals: ['A', 'b'], // 'A' in both V and Σ
      startVariable: 'S',
      productions: [
        {
          id: 'p1',
          lhs: 'S',
          rhs: [{ type: 'NON_TERMINAL', value: 'B' }], // B undeclared
        },
      ],
    };

    const val = validateCFG(badGrammar);
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.code === 'CFG_NAMESPACE_COLLISION')).toBe(true);
    expect(val.errors.some((e) => e.code === 'CFG_UNDEFINED_VARIABLE')).toBe(true);
  });

  it('7. Hostile Test: Detects non-generating variables and empty language L(G) = ∅', () => {
    const nonGenGrammar: ContextFreeGrammar = {
      variables: ['S', 'A', 'B'],
      terminals: ['a'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'A' }] },
        { id: 'p2', lhs: 'A', rhs: [{ type: 'NON_TERMINAL', value: 'B' }] },
        { id: 'p3', lhs: 'B', rhs: [{ type: 'NON_TERMINAL', value: 'A' }] },
      ],
    };

    const analysis = analyzeCFG(nonGenGrammar);
    expect(analysis.generatingVariables.length).toBe(0);
    expect(analysis.isLanguageEmpty).toBe(true);
  });

  it('8. Hostile Test: Supports multi-character terminals ("hello", "world")', () => {
    const multiCharGrammar: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['hello', 'world'],
      startVariable: 'S',
      productions: [
        {
          id: 'p1',
          lhs: 'S',
          rhs: [
            { type: 'TERMINAL', value: 'hello' },
            { type: 'TERMINAL', value: 'world' },
          ],
        },
      ],
    };

    const val = validateCFG(multiCharGrammar);
    expect(val.isValid).toBe(true);

    const mem = evaluateCFGMembership(multiCharGrammar, 'helloworld');
    expect(mem.isAccepted).toBe(true);
  });

  it('9. Hostile Test: Search limits protect against infinite loops in recursive grammars', () => {
    const recGrammar: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'S' }] },
      ],
    };

    const deriv = generateDerivation(recGrammar, 'a', { maxDepth: 10, maxStatesExplored: 50 });
    expect(deriv.success).toBe(false);
    expect(deriv.exploredStateCount).toBeGreaterThan(0);
  });
});
