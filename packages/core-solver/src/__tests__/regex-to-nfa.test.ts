import { describe, it, expect } from 'vitest';
import { parseRegex } from '../regex-parser';
import { convertRegexToNFA } from '../regex-to-nfa';
import { executeNFA } from '../nfa-executor';
import { convertNfaToDfa } from '../nfa-to-dfa';
import { executeDFA } from '../dfa-executor';
import { validateNFA } from '../nfa-validator';

describe('Regex → Thompson ε-NFA Pure Core Solver Tests', () => {
  it('A. Literal symbol regex (e.g. "a")', () => {
    const res = convertRegexToNFA('a');
    expect(res.success).toBe(true);
    expect(res.alphabet).toEqual(['a']);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'b').isAccepted).toBe(false);
  });

  it('B. Concatenation regex (e.g. "ab")', () => {
    const res = convertRegexToNFA('ab');
    expect(res.success).toBe(true);
    expect(res.alphabet).toEqual(['a', 'b']);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'ab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'a').isAccepted).toBe(false);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'b').isAccepted).toBe(false);
  });

  it('C. Alternation regex (e.g. "a|b")', () => {
    const res = convertRegexToNFA('a|b');
    expect(res.success).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'b').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'ab').isAccepted).toBe(false);
  });

  it('D. Kleene Star regex (e.g. "a*")', () => {
    const res = convertRegexToNFA('a*');
    expect(res.success).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, '').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'aaa').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'b').isAccepted).toBe(false);
  });

  it('E. Plus operator regex (e.g. "a+")', () => {
    const res = convertRegexToNFA('a+');
    expect(res.success).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, '').isAccepted).toBe(false);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'aa').isAccepted).toBe(true);
  });

  it('F. Optional operator regex (e.g. "a?")', () => {
    const res = convertRegexToNFA('a?');
    expect(res.success).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, '').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'aa').isAccepted).toBe(false);
  });

  it('G. Grouping regex (e.g. "(ab)*")', () => {
    const res = convertRegexToNFA('(ab)*');
    expect(res.success).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, '').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'ab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'abab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'aba').isAccepted).toBe(false);
  });

  it('H. Precedence handling (e.g. "a|bc" means "a|(bc)")', () => {
    const res = convertRegexToNFA('a|bc');
    expect(res.success).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'bc').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'ab').isAccepted).toBe(false);
  });

  it('I. Complex nested expression (e.g. "(a|b)*abb")', () => {
    const res = convertRegexToNFA('(a|b)*abb');
    expect(res.success).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'abb').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'aabb').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'babb').isAccepted).toBe(true);
    expect(executeNFA({ nodes: res.nodes, edges: res.edges }, 'ab').isAccepted).toBe(false);
  });

  it('J & K. Epsilon and Lambda symbol regexes', () => {
    const resEps = convertRegexToNFA('ε');
    expect(resEps.success).toBe(true);
    expect(executeNFA({ nodes: resEps.nodes, edges: resEps.edges }, '').isAccepted).toBe(true);

    const resLam = convertRegexToNFA('λ');
    expect(resLam.success).toBe(true);
    expect(executeNFA({ nodes: resLam.nodes, edges: resLam.edges }, '').isAccepted).toBe(true);
  });

  it('L. Rejects invalid syntax with machine & human-readable error messages (Step 4)', () => {
    expect(parseRegex('(a').success).toBe(false);
    expect(parseRegex('(a').errorMessage).toContain("Unclosed '('");

    expect(parseRegex('((a)').success).toBe(false);
    expect(parseRegex('((a)').errorMessage).toContain("Unclosed '('");

    expect(parseRegex('a)').success).toBe(false);
    expect(parseRegex('a)').errorMessage).toContain("Unmatched ')'");

    expect(parseRegex('(a))').success).toBe(false);
    expect(parseRegex('(a))').errorMessage).toContain("Unmatched ')'");

    expect(parseRegex('a|').success).toBe(false);
    expect(parseRegex('a|').errorMessage).toContain('Alternation requires an expression on the right');

    expect(parseRegex('|a').success).toBe(false);
    expect(parseRegex('|a').errorMessage).toContain('Expected valid sub-expression');

    expect(parseRegex('a||b').success).toBe(false);
    expect(parseRegex('a||b').errorMessage).toContain('Alternation requires an expression on the right');

    expect(parseRegex('*').success).toBe(false);
    expect(parseRegex('*').errorMessage).toContain('Kleene star requires an expression before it');

    expect(parseRegex('*a').success).toBe(false);
    expect(parseRegex('*a').errorMessage).toContain('Kleene star requires an expression before it');

    expect(parseRegex('+a').success).toBe(false);
    expect(parseRegex('+a').errorMessage).toContain('Plus operator requires an expression before it');

    expect(parseRegex('?a').success).toBe(false);
    expect(parseRegex('?a').errorMessage).toContain('Optional operator requires an expression before it');

    expect(parseRegex('()').success).toBe(false);
    expect(parseRegex('()').errorMessage).toContain('Expected valid sub-expression');

    expect(parseRegex('a**').success).toBe(false);
    expect(parseRegex('a**').errorMessage).toContain('Repeated postfix operators are not allowed');

    expect(parseRegex('a*+').success).toBe(false);
    expect(parseRegex('a*+').errorMessage).toContain('Repeated postfix operators are not allowed');

    expect(parseRegex('a*?').success).toBe(false);
    expect(parseRegex('a*?').errorMessage).toContain('Repeated postfix operators are not allowed');
  });

  it('M. Validates edge cases & whitespace handling (Step 4)', () => {
    // Empty expression evaluates to EPSILON AST
    const emptyRes = parseRegex('');
    expect(emptyRes.success).toBe(true);
    expect(emptyRes.ast?.type).toBe('EPSILON');

    // Whitespace only evaluates to EPSILON AST
    const wsRes = parseRegex('   \t\n ');
    expect(wsRes.success).toBe(true);
    expect(wsRes.ast?.type).toBe('EPSILON');

    // Whitespace within expression is ignored
    const spacedRes = convertRegexToNFA(' ( a | b ) * a b b ');
    expect(spacedRes.success).toBe(true);
    expect(executeNFA({ nodes: spacedRes.nodes, edges: spacedRes.edges }, 'abb').isAccepted).toBe(true);
    expect(executeNFA({ nodes: spacedRes.nodes, edges: spacedRes.edges }, 'aabb').isAccepted).toBe(true);
  });

  it('N. Step 9 Explicit Cross-Checks: 8 Canonical Expressions', () => {
    // 1. a
    const r1 = convertRegexToNFA('a');
    expect(executeNFA({ nodes: r1.nodes, edges: r1.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r1.nodes, edges: r1.edges }, '').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r1.nodes, edges: r1.edges }, 'b').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r1.nodes, edges: r1.edges }, 'aa').isAccepted).toBe(false);

    // 2. a*
    const r2 = convertRegexToNFA('a*');
    expect(executeNFA({ nodes: r2.nodes, edges: r2.edges }, '').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r2.nodes, edges: r2.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r2.nodes, edges: r2.edges }, 'aaaa').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r2.nodes, edges: r2.edges }, 'b').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r2.nodes, edges: r2.edges }, 'ab').isAccepted).toBe(false);

    // 3. a|b
    const r3 = convertRegexToNFA('a|b');
    expect(executeNFA({ nodes: r3.nodes, edges: r3.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r3.nodes, edges: r3.edges }, 'b').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r3.nodes, edges: r3.edges }, '').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r3.nodes, edges: r3.edges }, 'ab').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r3.nodes, edges: r3.edges }, 'c').isAccepted).toBe(false);

    // 4. ab
    const r4 = convertRegexToNFA('ab');
    expect(executeNFA({ nodes: r4.nodes, edges: r4.edges }, 'ab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r4.nodes, edges: r4.edges }, '').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r4.nodes, edges: r4.edges }, 'a').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r4.nodes, edges: r4.edges }, 'b').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r4.nodes, edges: r4.edges }, 'aba').isAccepted).toBe(false);

    // 5. (a|b)*
    const r5 = convertRegexToNFA('(a|b)*');
    expect(executeNFA({ nodes: r5.nodes, edges: r5.edges }, '').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r5.nodes, edges: r5.edges }, 'a').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r5.nodes, edges: r5.edges }, 'b').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r5.nodes, edges: r5.edges }, 'abba').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r5.nodes, edges: r5.edges }, 'baab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r5.nodes, edges: r5.edges }, 'c').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r5.nodes, edges: r5.edges }, 'abc').isAccepted).toBe(false);

    // 6. a(b|c)
    const r6 = convertRegexToNFA('a(b|c)');
    expect(executeNFA({ nodes: r6.nodes, edges: r6.edges }, 'ab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r6.nodes, edges: r6.edges }, 'ac').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r6.nodes, edges: r6.edges }, '').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r6.nodes, edges: r6.edges }, 'a').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r6.nodes, edges: r6.edges }, 'b').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r6.nodes, edges: r6.edges }, 'abc').isAccepted).toBe(false);

    // 7. (ab)*
    const r7 = convertRegexToNFA('(ab)*');
    expect(executeNFA({ nodes: r7.nodes, edges: r7.edges }, '').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r7.nodes, edges: r7.edges }, 'ab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r7.nodes, edges: r7.edges }, 'abab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r7.nodes, edges: r7.edges }, 'a').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r7.nodes, edges: r7.edges }, 'b').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r7.nodes, edges: r7.edges }, 'aba').isAccepted).toBe(false);

    // 8. a*b
    const r8 = convertRegexToNFA('a*b');
    expect(executeNFA({ nodes: r8.nodes, edges: r8.edges }, 'b').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r8.nodes, edges: r8.edges }, 'ab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r8.nodes, edges: r8.edges }, 'aaab').isAccepted).toBe(true);
    expect(executeNFA({ nodes: r8.nodes, edges: r8.edges }, '').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r8.nodes, edges: r8.edges }, 'a').isAccepted).toBe(false);
    expect(executeNFA({ nodes: r8.nodes, edges: r8.edges }, 'ba').isAccepted).toBe(false);
  });

  it('O. Multiple regex generations maintain pure state isolation (Step 8)', () => {
    // Generate Regex A
    const resA1 = convertRegexToNFA('(0|1)*01');
    expect(resA1.success).toBe(true);
    expect(executeNFA({ nodes: resA1.nodes, edges: resA1.edges }, '1001').isAccepted).toBe(true);
    expect(executeNFA({ nodes: resA1.nodes, edges: resA1.edges }, '1000').isAccepted).toBe(false);

    // Generate Regex B
    const resB = convertRegexToNFA('a*b+');
    expect(resB.success).toBe(true);
    expect(executeNFA({ nodes: resB.nodes, edges: resB.edges }, 'b').isAccepted).toBe(true);
    expect(executeNFA({ nodes: resB.nodes, edges: resB.edges }, 'aaabb').isAccepted).toBe(true);
    expect(executeNFA({ nodes: resB.nodes, edges: resB.edges }, '1001').isAccepted).toBe(false);

    // Regenerate Regex A
    const resA2 = convertRegexToNFA('(0|1)*01');
    expect(resA2.success).toBe(true);
    expect(resA2.nodes.length).toBe(resA1.nodes.length);
    expect(resA2.edges.length).toBe(resA1.edges.length);
    expect(executeNFA({ nodes: resA2.nodes, edges: resA2.edges }, '1001').isAccepted).toBe(true);
    expect(executeNFA({ nodes: resA2.nodes, edges: resA2.edges }, '1000').isAccepted).toBe(false);
  });

  it('P. Full Pipeline Test: Regex → ε-NFA → NFA Execution → NFA→DFA Conversion → DFA Execution', () => {
    const regex = '(a|b)*abb';
    const nfaRes = convertRegexToNFA(regex);
    expect(nfaRes.success).toBe(true);

    const valNFA = validateNFA({ nodes: nfaRes.nodes, edges: nfaRes.edges });
    expect(valNFA.isValid).toBe(true);

    const dfaRes = convertNfaToDfa({ nodes: nfaRes.nodes, edges: nfaRes.edges });
    expect(dfaRes.success).toBe(true);

    const testStrings = ['abb', 'aabb', 'babb', 'ab', 'a', 'b', 'bbaabb'];
    for (const str of testStrings) {
      const nfaExec = executeNFA({ nodes: nfaRes.nodes, edges: nfaRes.edges }, str);
      const dfaExec = executeDFA({ nodes: dfaRes.nodes, edges: dfaRes.edges }, str);
      expect(dfaExec.isAccepted).toBe(nfaExec.isAccepted);
    }
  });

  it('Thompson NFA invariant properties (1 initial state, 1 accepting state, valid graph)', () => {
    const res = convertRegexToNFA('(a|b)*c');
    expect(res.success).toBe(true);
    const initialStates = res.nodes.filter((n) => n.isInitial);
    const acceptingStates = res.nodes.filter((n) => n.isAccepting);

    expect(initialStates).toHaveLength(1);
    expect(acceptingStates).toHaveLength(1);

    const val = validateNFA({ nodes: res.nodes, edges: res.edges });
    expect(val.isValid).toBe(true);
  });

  it('Thompson construction trace generation with real state and transition telemetry', () => {
    const res = convertRegexToNFA('(a|b)*abb');
    expect(res.success).toBe(true);
    expect(res.trace).toBeDefined();
    expect(res.trace!.length).toBeGreaterThan(0);

    const literalSteps = res.trace!.filter((s) => s.opType === 'LITERAL');
    expect(literalSteps.length).toBe(5); // 2 from (a|b) + 3 from abb

    for (const step of res.trace!) {
      expect(step.fragment.startId).toBeDefined();
      expect(step.fragment.acceptId).toBeDefined();
    }
  });
});

