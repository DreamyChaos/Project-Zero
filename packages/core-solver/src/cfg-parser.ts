import {
  ContextFreeGrammar,
  CFGProduction,
  GrammarSymbol,
} from './types';

/**
 * Standard Educational Context-Free Grammar Presets for Module 3 Topic 1.
 */
export const CFG_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  grammar: ContextFreeGrammar;
}> = [
  {
    id: 'anbn',
    name: 'L = { aⁿ bⁿ | n ≥ 0 }',
    description: 'Classic context-free language generating balanced "a"s and "b"s.',
    grammar: {
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
        { id: 'p2', lhs: 'S', rhs: [{ type: 'EPSILON', value: 'ε' }] },
      ],
    },
  },
  {
    id: 'as_b',
    name: 'L = a*b (Regular CFG)',
    description: 'Right-linear regular grammar generating any number of "a"s followed by a "b".',
    grammar: {
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
          ],
        },
        {
          id: 'p2',
          lhs: 'S',
          rhs: [{ type: 'TERMINAL', value: 'b' }],
        },
      ],
    },
  },
  {
    id: 'dyck',
    name: 'Balanced Parentheses (Dyck Language)',
    description: 'Well-formed nested and concatenated parentheses over {"(", ")"}.',
    grammar: {
      variables: ['S'],
      terminals: ['(', ')'],
      startVariable: 'S',
      productions: [
        {
          id: 'p1',
          lhs: 'S',
          rhs: [
            { type: 'NON_TERMINAL', value: 'S' },
            { type: 'NON_TERMINAL', value: 'S' },
          ],
        },
        {
          id: 'p2',
          lhs: 'S',
          rhs: [
            { type: 'TERMINAL', value: '(' },
            { type: 'NON_TERMINAL', value: 'S' },
            { type: 'TERMINAL', value: ')' },
          ],
        },
        { id: 'p3', lhs: 'S', rhs: [{ type: 'EPSILON', value: 'ε' }] },
      ],
    },
  },
  {
    id: 'palindromes',
    name: 'Palindromes over {a, b}',
    description: 'Generates all symmetric strings (even and odd length) over {a, b}.',
    grammar: {
      variables: ['P'],
      terminals: ['a', 'b'],
      startVariable: 'P',
      productions: [
        {
          id: 'p1',
          lhs: 'P',
          rhs: [
            { type: 'TERMINAL', value: 'a' },
            { type: 'NON_TERMINAL', value: 'P' },
            { type: 'TERMINAL', value: 'a' },
          ],
        },
        {
          id: 'p2',
          lhs: 'P',
          rhs: [
            { type: 'TERMINAL', value: 'b' },
            { type: 'NON_TERMINAL', value: 'P' },
            { type: 'TERMINAL', value: 'b' },
          ],
        },
        { id: 'p3', lhs: 'P', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p4', lhs: 'P', rhs: [{ type: 'TERMINAL', value: 'b' }] },
        { id: 'p5', lhs: 'P', rhs: [{ type: 'EPSILON', value: 'ε' }] },
      ],
    },
  },
  {
    id: 'arithmetic',
    name: 'Arithmetic Expressions (E, T, F)',
    description: 'Precedence-aware grammar for addition and multiplication expressions.',
    grammar: {
      variables: ['E', 'T', 'F'],
      terminals: ['+', '*', '(', ')', 'a', 'b'],
      startVariable: 'E',
      productions: [
        {
          id: 'p1',
          lhs: 'E',
          rhs: [
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: '+' },
            { type: 'NON_TERMINAL', value: 'T' },
          ],
        },
        { id: 'p2', lhs: 'E', rhs: [{ type: 'NON_TERMINAL', value: 'T' }] },
        {
          id: 'p3',
          lhs: 'T',
          rhs: [
            { type: 'NON_TERMINAL', value: 'T' },
            { type: 'TERMINAL', value: '*' },
            { type: 'NON_TERMINAL', value: 'F' },
          ],
        },
        { id: 'p4', lhs: 'T', rhs: [{ type: 'NON_TERMINAL', value: 'F' }] },
        {
          id: 'p5',
          lhs: 'F',
          rhs: [
            { type: 'TERMINAL', value: '(' },
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: ')' },
          ],
        },
        { id: 'p6', lhs: 'F', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p7', lhs: 'F', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
  {
    id: 'ambiguous_expr',
    name: 'Ambiguous Expression Grammar (E -> E+E | E*E | (E) | a | b)',
    description: 'Classic ambiguous grammar without explicit operator precedence or associativity.',
    grammar: {
      variables: ['E'],
      terminals: ['+', '*', '(', ')', 'a', 'b'],
      startVariable: 'E',
      productions: [
        {
          id: 'p1',
          lhs: 'E',
          rhs: [
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: '+' },
            { type: 'NON_TERMINAL', value: 'E' },
          ],
        },
        {
          id: 'p2',
          lhs: 'E',
          rhs: [
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: '*' },
            { type: 'NON_TERMINAL', value: 'E' },
          ],
        },
        {
          id: 'p3',
          lhs: 'E',
          rhs: [
            { type: 'TERMINAL', value: '(' },
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: ')' },
          ],
        },
        { id: 'p4', lhs: 'E', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p5', lhs: 'E', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
  {
    id: 'unambiguous_expr',
    name: 'Unambiguous Expression Grammar (E, T, F)',
    description: 'Stratified grammar strictly enforcing multiplication precedence and left-associativity.',
    grammar: {
      variables: ['E', 'T', 'F'],
      terminals: ['+', '*', '(', ')', 'a', 'b'],
      startVariable: 'E',
      productions: [
        {
          id: 'p1',
          lhs: 'E',
          rhs: [
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: '+' },
            { type: 'NON_TERMINAL', value: 'T' },
          ],
        },
        { id: 'p2', lhs: 'E', rhs: [{ type: 'NON_TERMINAL', value: 'T' }] },
        {
          id: 'p3',
          lhs: 'T',
          rhs: [
            { type: 'NON_TERMINAL', value: 'T' },
            { type: 'TERMINAL', value: '*' },
            { type: 'NON_TERMINAL', value: 'F' },
          ],
        },
        { id: 'p4', lhs: 'T', rhs: [{ type: 'NON_TERMINAL', value: 'F' }] },
        {
          id: 'p5',
          lhs: 'F',
          rhs: [
            { type: 'TERMINAL', value: '(' },
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: ')' },
          ],
        },
        { id: 'p6', lhs: 'F', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p7', lhs: 'F', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
  {
    id: 'ambiguous_simple',
    name: 'Ambiguous Repetition Grammar (S -> SS | a | ε)',
    description: 'Simple ambiguous grammar demonstrating multiple parse trees on sequence concatenation.',
    grammar: {
      variables: ['S'],
      terminals: ['a'],
      startVariable: 'S',
      productions: [
        {
          id: 'p1',
          lhs: 'S',
          rhs: [
            { type: 'NON_TERMINAL', value: 'S' },
            { type: 'NON_TERMINAL', value: 'S' },
          ],
        },
        { id: 'p2', lhs: 'S', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p3', lhs: 'S', rhs: [{ type: 'EPSILON', value: 'ε' }] },
      ],
    },
  },
  {
    id: 'left_rec_direct',
    name: 'Direct Left-Recursive Grammar (E -> E+T | T, T -> id)',
    description: 'Canonical direct left-recursive expression grammar requiring A -> β A\' transformation.',
    grammar: {
      variables: ['E', 'T'],
      terminals: ['+', 'id'],
      startVariable: 'E',
      productions: [
        {
          id: 'p1',
          lhs: 'E',
          rhs: [
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: '+' },
            { type: 'NON_TERMINAL', value: 'T' },
          ],
        },
        { id: 'p2', lhs: 'E', rhs: [{ type: 'NON_TERMINAL', value: 'T' }] },
        { id: 'p3', lhs: 'T', rhs: [{ type: 'TERMINAL', value: 'id' }] },
      ],
    },
  },
  {
    id: 'left_rec_indirect',
    name: 'Indirect Left-Recursive Grammar (A -> Ba | c, B -> Ab | d)',
    description: 'Indirect cycle A -> B -> A requiring ordered substitution before direct elimination.',
    grammar: {
      variables: ['A', 'B'],
      terminals: ['a', 'b', 'c', 'd'],
      startVariable: 'A',
      productions: [
        {
          id: 'p1',
          lhs: 'A',
          rhs: [
            { type: 'NON_TERMINAL', value: 'B' },
            { type: 'TERMINAL', value: 'a' },
          ],
        },
        { id: 'p2', lhs: 'A', rhs: [{ type: 'TERMINAL', value: 'c' }] },
        {
          id: 'p3',
          lhs: 'B',
          rhs: [
            { type: 'NON_TERMINAL', value: 'A' },
            { type: 'TERMINAL', value: 'b' },
          ],
        },
        { id: 'p4', lhs: 'B', rhs: [{ type: 'TERMINAL', value: 'd' }] },
      ],
    },
  },
  {
    id: 'left_fact_basic',
    name: 'Left Factoring — Basic (A -> ab | ac)',
    description: 'Basic common-prefix grammar requiring extraction of prefix "a".',
    grammar: {
      variables: ['A'],
      terminals: ['a', 'b', 'c'],
      startVariable: 'A',
      productions: [
        {
          id: 'p1',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'b' }],
        },
        {
          id: 'p2',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'c' }],
        },
      ],
    },
  },
  {
    id: 'left_fact_longest',
    name: 'Left Factoring — Longest Prefix (A -> abc | abd | abe)',
    description: '3-way alternative grammar requiring longest useful common prefix "ab".',
    grammar: {
      variables: ['A'],
      terminals: ['a', 'b', 'c', 'd', 'e'],
      startVariable: 'A',
      productions: [
        {
          id: 'p1',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'b' }, { type: 'TERMINAL', value: 'c' }],
        },
        {
          id: 'p2',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'b' }, { type: 'TERMINAL', value: 'd' }],
        },
        {
          id: 'p3',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'b' }, { type: 'TERMINAL', value: 'e' }],
        },
      ],
    },
  },
  {
    id: 'left_fact_nested',
    name: 'Left Factoring — Nested Chained (A -> abc | abd | aef)',
    description: 'Requires multi-pass factoring: first prefix "a", then nested prefix "b" inside helper nonterminal.',
    grammar: {
      variables: ['A'],
      terminals: ['a', 'b', 'c', 'd', 'e', 'f'],
      startVariable: 'A',
      productions: [
        {
          id: 'p1',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'b' }, { type: 'TERMINAL', value: 'c' }],
        },
        {
          id: 'p2',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'b' }, { type: 'TERMINAL', value: 'd' }],
        },
        {
          id: 'p3',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'e' }, { type: 'TERMINAL', value: 'f' }],
        },
      ],
    },
  },
  {
    id: 'left_fact_prefix_eps',
    name: 'Left Factoring — Prefix + Empty Suffix (A -> a | ab)',
    description: 'One production is a strict prefix of another, producing an ε base suffix in helper rule.',
    grammar: {
      variables: ['A'],
      terminals: ['a', 'b'],
      startVariable: 'A',
      productions: [
        {
          id: 'p1',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }],
        },
        {
          id: 'p2',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'b' }],
        },
      ],
    },
  },
  {
    id: 'left_fact_eps_alt',
    name: 'Left Factoring — Epsilon Alternative (A -> ε | ab | ac)',
    description: 'Contains independent ε alternative while other alternatives share common prefix "a".',
    grammar: {
      variables: ['A'],
      terminals: ['a', 'b', 'c'],
      startVariable: 'A',
      productions: [
        {
          id: 'p1',
          lhs: 'A',
          rhs: [{ type: 'EPSILON', value: 'ε' }],
        },
        {
          id: 'p2',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'b' }],
        },
        {
          id: 'p3',
          lhs: 'A',
          rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'TERMINAL', value: 'c' }],
        },
      ],
    },
  },
  {
    id: 'cnf_a',
    name: 'CNF-A (S -> aB, B -> b)',
    description: 'Basic CNF candidate with mixed terminal/nonterminal RHS requiring terminal helper.',
    grammar: {
      variables: ['S', 'B'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'NON_TERMINAL', value: 'B' }] },
        { id: 'p2', lhs: 'B', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
  {
    id: 'cnf_b',
    name: 'CNF-B (S -> ABC, A -> a, B -> b, C -> c)',
    description: '3-symbol nonterminal RHS requiring binary decomposition chain.',
    grammar: {
      variables: ['S', 'A', 'B', 'C'],
      terminals: ['a', 'b', 'c'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'A' }, { type: 'NON_TERMINAL', value: 'B' }, { type: 'NON_TERMINAL', value: 'C' }] },
        { id: 'p2', lhs: 'A', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p3', lhs: 'B', rhs: [{ type: 'TERMINAL', value: 'b' }] },
        { id: 'p4', lhs: 'C', rhs: [{ type: 'TERMINAL', value: 'c' }] },
      ],
    },
  },
  {
    id: 'cnf_c',
    name: 'CNF-C (S -> A, A -> B, B -> a)',
    description: 'Unit production transitive chain (S -> A -> B -> a).',
    grammar: {
      variables: ['S', 'A', 'B'],
      terminals: ['a'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'A' }] },
        { id: 'p2', lhs: 'A', rhs: [{ type: 'NON_TERMINAL', value: 'B' }] },
        { id: 'p3', lhs: 'B', rhs: [{ type: 'TERMINAL', value: 'a' }] },
      ],
    },
  },
  {
    id: 'cnf_d',
    name: 'CNF-D (S -> AB, A -> ε, B -> b)',
    description: 'Nullable variable A leading to ε-elimination and unit collapse.',
    grammar: {
      variables: ['S', 'A', 'B'],
      terminals: ['b'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'A' }, { type: 'NON_TERMINAL', value: 'B' }] },
        { id: 'p2', lhs: 'A', rhs: [{ type: 'EPSILON', value: 'ε' }] },
        { id: 'p3', lhs: 'B', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
  {
    id: 'cnf_e',
    name: 'CNF-E (S -> aSb | ε)',
    description: 'Recursive language with ε ∈ L(G), requiring start symbol ε preservation.',
    grammar: {
      variables: ['S'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'NON_TERMINAL', value: 'S' }, { type: 'TERMINAL', value: 'b' }] },
        { id: 'p2', lhs: 'S', rhs: [{ type: 'EPSILON', value: 'ε' }] },
      ],
    },
  },
  {
    id: 'gnf_a',
    name: 'GNF-A (S -> AB | a, A -> a, B -> b)',
    description: 'Leading nonterminal in S -> AB requiring substitution of A -> a to achieve GNF.',
    grammar: {
      variables: ['S', 'A', 'B'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'A' }, { type: 'NON_TERMINAL', value: 'B' }] },
        { id: 'p2', lhs: 'S', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p3', lhs: 'A', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p4', lhs: 'B', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
  {
    id: 'gnf_b',
    name: 'GNF-B (S -> Ab | a, A -> aA | b)',
    description: 'Mixed RHS with non-leading terminal requiring terminal helper isolation and substitution.',
    grammar: {
      variables: ['S', 'A'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'NON_TERMINAL', value: 'A' }, { type: 'TERMINAL', value: 'b' }] },
        { id: 'p2', lhs: 'S', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p3', lhs: 'A', rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'NON_TERMINAL', value: 'A' }] },
        { id: 'p4', lhs: 'A', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
  {
    id: 'gnf_c',
    name: 'GNF-C (E -> E+T | T, T -> T*F | F, F -> (E) | id)',
    description: 'Expression grammar with left recursion and nested substitutions.',
    grammar: {
      variables: ['E', 'T', 'F'],
      terminals: ['+', '*', '(', ')', 'id'],
      startVariable: 'E',
      productions: [
        { id: 'p1', lhs: 'E', rhs: [{ type: 'NON_TERMINAL', value: 'E' }, { type: 'TERMINAL', value: '+' }, { type: 'NON_TERMINAL', value: 'T' }] },
        { id: 'p2', lhs: 'E', rhs: [{ type: 'NON_TERMINAL', value: 'T' }] },
        { id: 'p3', lhs: 'T', rhs: [{ type: 'NON_TERMINAL', value: 'T' }, { type: 'TERMINAL', value: '*' }, { type: 'NON_TERMINAL', value: 'F' }] },
        { id: 'p4', lhs: 'T', rhs: [{ type: 'NON_TERMINAL', value: 'F' }] },
        { id: 'p5', lhs: 'F', rhs: [{ type: 'TERMINAL', value: '(' }, { type: 'NON_TERMINAL', value: 'E' }, { type: 'TERMINAL', value: ')' }] },
        { id: 'p6', lhs: 'F', rhs: [{ type: 'TERMINAL', value: 'id' }] },
      ],
    },
  },
  {
    id: 'gnf_d',
    name: 'GNF-D (S -> aS | b)',
    description: 'Right-recursive grammar already in Greibach Normal Form.',
    grammar: {
      variables: ['S'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        { id: 'p1', lhs: 'S', rhs: [{ type: 'TERMINAL', value: 'a' }, { type: 'NON_TERMINAL', value: 'S' }] },
        { id: 'p2', lhs: 'S', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
];





/**
 * Parses raw grammar text (e.g. BNF / standard CFG notation) into a structured ContextFreeGrammar 4-tuple G = (V, Σ, P, S).
 *
 * Supports:
 *  - Production arrows: "->", "→", "::="
 *  - Alternative expansions: "|"
 *  - Epsilon representations: "ε", "eps", "epsilon", "''", '""'
 *  - Multi-line rules
 */
export function parseCFGText(
  rawText: string,
  options?: {
    knownVariables?: string[];
    knownTerminals?: string[];
    startVariable?: string;
  }
): ContextFreeGrammar {
  const lines = rawText.split('\n');
  const rawProductions: Array<{ lhs: string; rhsTokens: string[] }> = [];

  const explicitVariables = new Set(options?.knownVariables || []);
  const explicitTerminals = new Set(options?.knownTerminals || []);
  const discoveredLHS = new Set<string>();

  // Pass 1: Extract LHS Nonterminals and Production lines
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    // Split on arrow ->, →, ::=
    const arrowMatch = trimmed.match(/^(.*?)\s*(?:->|→|::=)\s*(.*)$/);
    if (!arrowMatch) continue;

    const lhs = arrowMatch[1].trim();
    const rhsPart = arrowMatch[2].trim();

    if (lhs) {
      discoveredLHS.add(lhs);
      explicitVariables.add(lhs);

      // Split alternative productions by '|'
      const alternatives = rhsPart.split('|');
      for (const alt of alternatives) {
        const altTrimmed = alt.trim();
        // Tokenize RHS into discrete symbols
        // Handle spaced tokens or individual character tokens
        const tokens = tokenizeRhsString(altTrimmed);
        rawProductions.push({ lhs, rhsTokens: tokens });
      }
    }
  }

  // Pass 2: Classify Nonterminals vs Terminals
  const variables = Array.from(explicitVariables);
  const varSet = new Set(variables);
  const termSet = new Set<string>(explicitTerminals);

  const productions: CFGProduction[] = [];
  let prodCounter = 1;

  for (const raw of rawProductions) {
    const rhsSymbols: GrammarSymbol[] = [];

    if (
      raw.rhsTokens.length === 0 ||
      (raw.rhsTokens.length === 1 && isEpsilonToken(raw.rhsTokens[0]))
    ) {
      rhsSymbols.push({ type: 'EPSILON', value: 'ε' });
    } else {
      for (const token of raw.rhsTokens) {
        if (isEpsilonToken(token)) {
          rhsSymbols.push({ type: 'EPSILON', value: 'ε' });
        } else if (varSet.has(token)) {
          rhsSymbols.push({ type: 'NON_TERMINAL', value: token });
        } else if (isDefaultNonterminalName(token)) {
          varSet.add(token);
          if (!variables.includes(token)) variables.push(token);
          rhsSymbols.push({ type: 'NON_TERMINAL', value: token });
        } else {
          termSet.add(token);
          rhsSymbols.push({ type: 'TERMINAL', value: token });
        }
      }
    }

    productions.push({
      id: `p${prodCounter++}`,
      lhs: raw.lhs,
      rhs: rhsSymbols,
    });
  }

  // Determine start variable
  let startVariable = options?.startVariable || '';
  if (!startVariable || !varSet.has(startVariable)) {
    if (rawProductions.length > 0 && varSet.has(rawProductions[0].lhs)) {
      startVariable = rawProductions[0].lhs;
    } else if (variables.length > 0) {
      startVariable = variables[0];
    }
  }

  const terminals = Array.from(termSet).filter((t) => !varSet.has(t));
  const uniqueVariables = Array.from(varSet);

  return {
    variables: uniqueVariables,
    terminals,
    productions,
    startVariable,
  };

}

/**
 * Tokenizes a RHS alternative string into discrete grammar symbols.
 */
function tokenizeRhsString(rhsStr: string): string[] {
  if (!rhsStr || isEpsilonToken(rhsStr)) {
    return ['ε'];
  }

  // If the user used spaces, split on spaces
  if (/\s+/.test(rhsStr)) {
    return rhsStr.split(/\s+/).filter((t) => t.length > 0);
  }

  // Otherwise, split single characters (or multi-char tokens like E', id, num)
  const tokens: string[] = [];
  let i = 0;
  while (i < rhsStr.length) {
    const char = rhsStr[i];
    // Check for prime notation e.g. E'
    if (i + 1 < rhsStr.length && rhsStr[i + 1] === "'") {
      tokens.push(char + "'");
      i += 2;
    } else {
      tokens.push(char);
      i++;
    }
  }

  return tokens;
}

/**
 * Determines if a token denotes the empty string / epsilon.
 */
function isEpsilonToken(token: string): boolean {
  const trimmed = token.trim();
  const lower = trimmed.toLowerCase();
  return (
    trimmed === 'ε' ||
    lower === 'eps' ||
    lower === 'epsilon' ||
    lower === "''" ||
    lower === '""' ||
    lower === 'null' ||
    trimmed === ''
  );
}

/**
 * Checks if a token matches standard nonterminal casing (single uppercase letter e.g. S, A, B or with prime S').
 */
function isDefaultNonterminalName(token: string): boolean {
  return /^[A-Z][A-Z0-9_']*$/.test(token);
}

/**
 * Formats a ContextFreeGrammar into clean human-readable standard notation.
 */
export function formatCFGText(
  grammar: ContextFreeGrammar,
  options?: { compactAlternatives?: boolean }
): string {
  const { productions } = grammar;
  if (!productions || productions.length === 0) return '';

  if (options?.compactAlternatives) {
    const grouped = new Map<string, string[]>();
    for (const p of productions) {
      const rhsStr = p.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');
      if (!grouped.has(p.lhs)) {
        grouped.set(p.lhs, []);
      }
      grouped.get(p.lhs)!.push(rhsStr);
    }

    const lines: string[] = [];
    grouped.forEach((alternatives, lhs) => {
      lines.push(`${lhs} -> ${alternatives.join(' | ')}`);
    });
    return lines.join('\n');
  }

  return productions
    .map((p) => `${p.lhs} -> ${p.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ')}`)
    .join('\n');
}
