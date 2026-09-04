import { describe, it, expect } from 'vitest';
import {
  ContextFreeGrammar,
  validateCFG,
  analyzeCFG,
  generateDerivation,
  evaluateCFGMembership,
  evaluateCFGBatchMembership,
  validateAlphabetSymbols,
  generateBoundedLanguageSample,
  analyzeGrammarAmbiguity,
  getParseTreeSignature,
  buildParseTreeFromDerivation,
  parseCFGText,
  formatCFGText,
  CFG_PRESETS,
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

  // Topic 1 Specific Tests: Parsing, Formatting, Presets, and Structural 4-Tuple Verification
  it('10. Parses multi-line CFG text with alternatives and epsilon', () => {
    const raw = `
      S -> a S b | ε
      A -> a A | b
    `;
    const parsed = parseCFGText(raw);
    expect(parsed.variables).toContain('S');
    expect(parsed.variables).toContain('A');
    expect(parsed.terminals).toContain('a');
    expect(parsed.terminals).toContain('b');
    expect(parsed.startVariable).toBe('S');
    expect(parsed.productions.length).toBe(4);

    const val = validateCFG(parsed);
    expect(val.isValid).toBe(true);
  });

  it('11. Formats CFG into compact and expanded text representations', () => {
    const formattedCompact = formatCFGText(g1, { compactAlternatives: true });
    expect(formattedCompact).toContain('S -> a S b | ε');

    const formattedExpanded = formatCFGText(g1);
    expect(formattedExpanded).toContain('S -> a S b');
    expect(formattedExpanded).toContain('S -> ε');
  });

  it('12. Validates all standard educational CFG presets', () => {
    expect(CFG_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const preset of CFG_PRESETS) {
      const val = validateCFG(preset.grammar);
      expect(val.isValid).toBe(true);
      expect(preset.grammar.variables).toContain(preset.grammar.startVariable);
      expect(preset.grammar.productions.length).toBeGreaterThan(0);
    }
  });

  it('13. Supports Dyck language (Balanced Parentheses) parsing and validation', () => {
    const dyckText = `
      S -> S S | ( S ) | ε
    `;
    const dyckGrammar = parseCFGText(dyckText);
    const val = validateCFG(dyckGrammar);
    expect(val.isValid).toBe(true);
    expect(dyckGrammar.terminals).toContain('(');
    expect(dyckGrammar.terminals).toContain(')');
  });

  it('14. Round-trip serialization preserves grammar 4-tuple G = (V, Σ, P, S)', () => {
    const jsonStr = JSON.stringify(g1);
    const deserialized: ContextFreeGrammar = JSON.parse(jsonStr);

    expect(deserialized.variables).toEqual(g1.variables);
    expect(deserialized.terminals).toEqual(g1.terminals);
    expect(deserialized.startVariable).toEqual(g1.startVariable);
    expect(deserialized.productions.length).toBe(g1.productions.length);

    const val = validateCFG(deserialized);
    expect(val.isValid).toBe(true);
  });

  // Topic 2 Specific Tests: Context-Free Languages & Membership
  it('15. Evaluates batch membership for L = { a^n b^n | n >= 0 }', () => {
    const candidates = ['ε', 'ab', 'aabb', 'aaabbb', 'a', 'b', 'aab', 'abb', 'ba'];
    const results = evaluateCFGBatchMembership(g1, candidates);

    const acceptMap = new Map(results.map((r) => [r.input, r.isAccepted]));
    expect(acceptMap.get('ε')).toBe(true);
    expect(acceptMap.get('ab')).toBe(true);
    expect(acceptMap.get('aabb')).toBe(true);
    expect(acceptMap.get('aaabbb')).toBe(true);

    expect(acceptMap.get('a')).toBe(false);
    expect(acceptMap.get('b')).toBe(false);
    expect(acceptMap.get('aab')).toBe(false);
    expect(acceptMap.get('abb')).toBe(false);
    expect(acceptMap.get('ba')).toBe(false);
  });

  it('16. Evaluates batch membership for linear grammar L = a*b', () => {
    const gLinear: ContextFreeGrammar = {
      variables: ['S'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        {
          id: 'p1',
          lhs: 'S',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'NON_TERMINAL', value: 'S' }],
        },
        {
          id: 'p2',
          lhs: 'S',
          rhs: [{ type: 'TERMINAL', value: 'b' }],
        },
      ],
    };

    const candidates = ['b', 'ab', 'aab', 'aaab', 'ε', 'a', 'ba'];
    const results = evaluateCFGBatchMembership(gLinear, candidates);

    const acceptMap = new Map(results.map((r) => [r.input, r.isAccepted]));
    expect(acceptMap.get('b')).toBe(true);
    expect(acceptMap.get('ab')).toBe(true);
    expect(acceptMap.get('aab')).toBe(true);
    expect(acceptMap.get('aaab')).toBe(true);

    expect(acceptMap.get('ε')).toBe(false);
    expect(acceptMap.get('a')).toBe(false);
    expect(acceptMap.get('ba')).toBe(false);
  });

  it('17. Detects and flags invalid alphabet symbols not in Σ', () => {
    const check = validateAlphabetSymbols(g1, 'abc');
    expect(check.isValid).toBe(false);
    expect(check.invalidSymbols).toContain('c');

    const evalRes = evaluateCFGMembership(g1, 'abc');
    expect(evalRes.isAccepted).toBe(false);
    expect(evalRes.hasInvalidAlphabetSymbols).toBe(true);
    expect(evalRes.reason).toContain('Alphabet Mismatch');
  });

  it('18. Generates bounded witness language sample for L(G)', () => {
    const sample = generateBoundedLanguageSample(g1, 6, 10);
    expect(sample).toContain('ε');
    expect(sample).toContain('ab');
    expect(sample).toContain('aabb');
    expect(sample).toContain('aaabbb');
    expect(sample).not.toContain('aab');
  });

  it('19. Rejects membership for grammars generating the empty language L(G) = ∅', () => {
    const emptyGrammar: ContextFreeGrammar = {
      variables: ['S', 'A'],
      terminals: ['a'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'A' }] },
        { id: 'p2', lhs: 'A', rhs: [{ type: 'NON_TERMINAL', value: 'A' }] },
      ],
    };

    const evalRes = evaluateCFGMembership(emptyGrammar, 'a');
    expect(evalRes.isAccepted).toBe(false);
  });

  it('20. Grammar edits dynamically update membership results with no stale state', () => {
    const parsed1 = parseCFGText('S -> a S b | ε');
    const res1 = evaluateCFGMembership(parsed1, 'aabb');
    expect(res1.isAccepted).toBe(true);

    const parsed2 = parseCFGText('S -> a S | b');
    const res2 = evaluateCFGMembership(parsed2, 'aabb');
    expect(res2.isAccepted).toBe(false);

    const res3 = evaluateCFGMembership(parsed2, 'aab');
    expect(res3.isAccepted).toBe(true);
  });

  // Topic 4 Specific Tests: Ambiguous and Unambiguous Grammars
  it('21. Discovers ambiguity witness with >= 2 distinct parse trees for canonical ambiguous grammar', () => {
    const ambGrammar = parseCFGText(`
      E -> E + E | E * E | ( E ) | a | b
    `);

    const result = analyzeGrammarAmbiguity(ambGrammar, 'a+a*a');
    expect(result.status).toBe('AMBIGUITY_WITNESS_FOUND');
    expect(result.isAmbiguous).toBe(true);
    expect(result.distinctParseCount).toBeGreaterThanOrEqual(2);
    expect(result.parseTrees.length).toBeGreaterThanOrEqual(2);

    // Verify trees are structurally different
    const sig0 = getParseTreeSignature(result.parseTrees[0]);
    const sig1 = getParseTreeSignature(result.parseTrees[1]);
    expect(sig0).not.toBe(sig1);

    // Verify Rightmost derivation evidence is generated
    expect(result.rightmostDerivations?.length).toBeGreaterThanOrEqual(2);
    expect(result.rightmostDerivations![0].derivationType).toBe('RIGHTMOST');
  });

  it('22. Finds exactly 1 parse tree for unambiguous expression grammar without false claim', () => {
    const unambGrammar = parseCFGText(`
      E -> E + T | T
      T -> T * F | F
      F -> ( E ) | a | b
    `);

    const result = analyzeGrammarAmbiguity(unambGrammar, 'a+a*a');
    expect(result.status).toBe('ONE_PARSE_FOUND_WITHIN_BOUND');
    expect(result.isAmbiguous).toBe(false);
    expect(result.distinctParseCount).toBe(1);
    expect(result.parseTrees.length).toBe(1);
  });

  it('23. Correctly classifies non-member strings as NOT_IN_LANGUAGE', () => {
    const ambGrammar = parseCFGText(`
      E -> E + E | E * E | a | b
    `);

    const result = analyzeGrammarAmbiguity(ambGrammar, 'a++b');
    expect(result.status).toBe('NOT_IN_LANGUAGE');
    expect(result.distinctParseCount).toBe(0);
    expect(result.parseTrees.length).toBe(0);
  });

  it('24. Rejects candidate with invalid alphabet symbols as INVALID_ALPHABET', () => {
    const ambGrammar = parseCFGText(`
      E -> E + E | a | b
    `);

    const result = analyzeGrammarAmbiguity(ambGrammar, 'a+c');
    expect(result.status).toBe('INVALID_ALPHABET');
    expect(result.reason).toContain('Alphabet Mismatch');
  });

  it('25. Discovers ambiguity on simple concatenation grammar S -> SS | a | ε', () => {
    const simpleAmb = parseCFGText(`
      S -> S S | a | ε
    `);

    const result = analyzeGrammarAmbiguity(simpleAmb, 'a');
    expect(result.status).toBe('AMBIGUITY_WITNESS_FOUND');
    expect(result.isAmbiguous).toBe(true);
    expect(result.distinctParseCount).toBeGreaterThanOrEqual(2);
  });

  it('26. Structural parse tree signature is invariant to UI element IDs', () => {
    const ambGrammar = parseCFGText('E -> E + E | a');
    const result = analyzeGrammarAmbiguity(ambGrammar, 'a+a+a');

    expect(result.isAmbiguous).toBe(true);
    const signatures = result.parseTrees.map(getParseTreeSignature);
    const uniqueSignatures = new Set(signatures);
    expect(uniqueSignatures.size).toBe(result.parseTrees.length);
  });
});



