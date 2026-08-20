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

  it('L. Rejects invalid syntax with machine & human-readable error messages', () => {
    expect(parseRegex('(a').success).toBe(false);
    expect(parseRegex('(a').errorMessage).toContain("Unclosed '('");
    expect(parseRegex('a|').success).toBe(false);
    expect(parseRegex('a|').errorMessage).toContain('Alternation requires an expression on the right');
    expect(parseRegex('*').success).toBe(false);
    expect(parseRegex('*').errorMessage).toContain('Kleene star requires an expression before it');
    expect(parseRegex('a**').success).toBe(false);
    expect(parseRegex('a**').errorMessage).toContain('Repeated postfix operators are not allowed');
  });

  it('N. Full Pipeline Test: Regex → ε-NFA → NFA Execution → NFA→DFA Conversion → DFA Execution', () => {
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
