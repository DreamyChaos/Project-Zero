import {
  LexicalRule,
  LexicalToken,
  LexicalError,
  LexicalAnalysisResult,
  LexicalRuleSetPreset,
  RegexToNFAResult,
} from './types';
import { convertRegexToNFA } from './regex-to-nfa';
import { executeNFA } from './nfa-executor';

/**
 * Curated standard lexical rule set presets for educational compiler construction.
 */
export const LEXICAL_RULE_SET_PRESETS: ReadonlyArray<LexicalRuleSetPreset> = [
  {
    id: 'basic-program',
    name: 'Basic Programming Language',
    description:
      'Standard language lexer featuring keywords, identifiers, numeric literals, relational and assignment operators, delimiters, single-line comments, and whitespace.',
    sampleSource: 'int count = 42;\nif count == 42 return true;',
    rules: [
      {
        id: 'r-kw-if',
        tokenType: 'KEYWORD_IF',
        regex: 'if',
        priority: 1,
        action: 'EMIT',
        enabled: true,
        description: 'Conditional if keyword',
      },
      {
        id: 'r-kw-else',
        tokenType: 'KEYWORD_ELSE',
        regex: 'else',
        priority: 2,
        action: 'EMIT',
        enabled: true,
        description: 'Conditional else keyword',
      },
      {
        id: 'r-kw-while',
        tokenType: 'KEYWORD_WHILE',
        regex: 'while',
        priority: 3,
        action: 'EMIT',
        enabled: true,
        description: 'Looping while keyword',
      },
      {
        id: 'r-kw-return',
        tokenType: 'KEYWORD_RETURN',
        regex: 'return',
        priority: 4,
        action: 'EMIT',
        enabled: true,
        description: 'Function return keyword',
      },
      {
        id: 'r-type-spec',
        tokenType: 'TYPE_SPEC',
        regex: 'int|float|char',
        priority: 5,
        action: 'EMIT',
        enabled: true,
        description: 'Primitive data type specifier',
      },
      {
        id: 'r-boolean',
        tokenType: 'BOOLEAN',
        regex: 'true|false',
        priority: 6,
        action: 'EMIT',
        enabled: true,
        description: 'Boolean literal constant',
      },
      {
        id: 'r-eq',
        tokenType: 'EQUALITY',
        regex: '==',
        priority: 7,
        action: 'EMIT',
        enabled: true,
        description: 'Equality comparison operator',
      },
      {
        id: 'r-assign',
        tokenType: 'ASSIGN',
        regex: '=',
        priority: 8,
        action: 'EMIT',
        enabled: true,
        description: 'Assignment operator',
      },
      {
        id: 'r-plus',
        tokenType: 'PLUS',
        regex: '\\+',
        priority: 9,
        action: 'EMIT',
        enabled: true,
        description: 'Addition operator',
      },
      {
        id: 'r-minus',
        tokenType: 'MINUS',
        regex: '-',
        priority: 10,
        action: 'EMIT',
        enabled: true,
        description: 'Subtraction operator',
      },
      {
        id: 'r-relational',
        tokenType: 'RELATIONAL',
        regex: '<|>|<=|>=|!=',
        priority: 11,
        action: 'EMIT',
        enabled: true,
        description: 'Relational comparison operator',
      },
      {
        id: 'r-ident',
        tokenType: 'IDENTIFIER',
        regex: '(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|0|1|2|3|4|5|6|7|8|9|_)*',
        priority: 12,
        action: 'EMIT',
        enabled: true,
        description: 'Alphanumeric variable/function identifier',
      },
      {
        id: 'r-int',
        tokenType: 'INTEGER',
        regex: '(0|1|2|3|4|5|6|7|8|9)+',
        priority: 13,
        action: 'EMIT',
        enabled: true,
        description: 'Unsigned integer numeric literal',
      },
      {
        id: 'r-float',
        tokenType: 'FLOAT',
        regex: '(0|1|2|3|4|5|6|7|8|9)+.(0|1|2|3|4|5|6|7|8|9)+',
        priority: 14,
        action: 'EMIT',
        enabled: true,
        description: 'Decimal floating-point literal',
      },
      {
        id: 'r-semi',
        tokenType: 'SEMICOLON',
        regex: ';',
        priority: 15,
        action: 'EMIT',
        enabled: true,
        description: 'Statement terminator semicolon',
      },
      {
        id: 'r-delim',
        tokenType: 'DELIMITER',
        regex: '({|}|,|:)',
        priority: 16,
        action: 'EMIT',
        enabled: true,
        description: 'Structural scope delimiter or separator',
      },
      {
        id: 'r-comment',
        tokenType: 'COMMENT',
        regex: '//(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|0|1|2|3|4|5|6|7|8|9|_|\\ )*',
        priority: 17,
        action: 'SKIP',
        enabled: true,
        description: 'Single-line comment marker (ignored during tokenization)',
      },
      {
        id: 'r-ws',
        tokenType: 'WHITESPACE',
        regex: '(\\ |\\t)+',
        priority: 18,
        action: 'SKIP',
        enabled: true,
        description: 'Inter-token space/tab characters (ignored)',
      },
    ],
  },
  {
    id: 'basic-arithmetic',
    name: 'Basic Arithmetic Expressions',
    description:
      'Lexer for arithmetic expressions with numbers, variables, binary math operators, parentheses, and assignments.',
    sampleSource: 'total = val + 100 * (x - 2)',
    rules: [
      {
        id: 'r-num',
        tokenType: 'INTEGER',
        regex: '(0|1|2|3|4|5|6|7|8|9)+',
        priority: 1,
        action: 'EMIT',
        enabled: true,
        description: 'Numeric operand',
      },
      {
        id: 'r-ident',
        tokenType: 'IDENTIFIER',
        regex: '(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|0|1|2|3|4|5|6|7|8|9)*',
        priority: 2,
        action: 'EMIT',
        enabled: true,
        description: 'Variable identifier',
      },
      {
        id: 'r-plus',
        tokenType: 'PLUS',
        regex: '\\+',
        priority: 3,
        action: 'EMIT',
        enabled: true,
        description: 'Addition operator',
      },
      {
        id: 'r-minus',
        tokenType: 'MINUS',
        regex: '-',
        priority: 4,
        action: 'EMIT',
        enabled: true,
        description: 'Subtraction operator',
      },
      {
        id: 'r-mul',
        tokenType: 'MULTIPLY',
        regex: '\\*',
        priority: 5,
        action: 'EMIT',
        enabled: true,
        description: 'Multiplication operator',
      },
      {
        id: 'r-div',
        tokenType: 'DIVIDE',
        regex: '/',
        priority: 6,
        action: 'EMIT',
        enabled: true,
        description: 'Division operator',
      },
      {
        id: 'r-assign',
        tokenType: 'ASSIGN',
        regex: '=',
        priority: 7,
        action: 'EMIT',
        enabled: true,
        description: 'Assignment operator',
      },
      {
        id: 'r-lparen',
        tokenType: 'LPAREN',
        regex: '\\(',
        priority: 8,
        action: 'EMIT',
        enabled: true,
        description: 'Left grouping parenthesis',
      },
      {
        id: 'r-rparen',
        tokenType: 'RPAREN',
        regex: '\\)',
        priority: 9,
        action: 'EMIT',
        enabled: true,
        description: 'Right grouping parenthesis',
      },
      {
        id: 'r-ws',
        tokenType: 'WHITESPACE',
        regex: '(\\ |\\t)+',
        priority: 10,
        action: 'SKIP',
        enabled: true,
        description: 'Whitespace separator',
      },
    ],
  },
  {
    id: 'minimal-binary',
    name: 'Binary Calculator Expression',
    description: 'Lexer for binary bitstring calculations.',
    sampleSource: '1010 + 11 = 1101',
    rules: [
      {
        id: 'r-bin',
        tokenType: 'BINARY_LIT',
        regex: '(0|1)+',
        priority: 1,
        action: 'EMIT',
        enabled: true,
        description: 'Binary bitstring literal',
      },
      {
        id: 'r-plus',
        tokenType: 'PLUS',
        regex: '\\+',
        priority: 2,
        action: 'EMIT',
        enabled: true,
        description: 'Plus operator',
      },
      {
        id: 'r-eq',
        tokenType: 'ASSIGN',
        regex: '=',
        priority: 3,
        action: 'EMIT',
        enabled: true,
        description: 'Assignment operator',
      },
      {
        id: 'r-ws',
        tokenType: 'WHITESPACE',
        regex: '(\\ |\\t)+',
        priority: 4,
        action: 'SKIP',
        enabled: true,
        description: 'Whitespace',
      },
    ],
  },
];

/**
 * Returns all available lexical rule set presets.
 */
export function getLexicalPresets(): ReadonlyArray<LexicalRuleSetPreset> {
  return LEXICAL_RULE_SET_PRESETS;
}

/**
 * Finds a specific preset by ID.
 */
export function getLexicalPresetById(id: string): LexicalRuleSetPreset | undefined {
  return LEXICAL_RULE_SET_PRESETS.find((p) => p.id === id);
}

/**
 * Pre-compiles lexical rules into Thompson NFAs.
 */
export interface CompiledLexicalRule {
  readonly rule: LexicalRule;
  readonly nfaResult: RegexToNFAResult;
}

export function compileLexicalRules(
  rules: ReadonlyArray<LexicalRule>
): CompiledLexicalRule[] {
  return rules
    .filter((r) => r.enabled && r.regex.trim().length > 0)
    .sort((a, b) => a.priority - b.priority)
    .map((rule) => ({
      rule,
      nfaResult: convertRegexToNFA(rule.regex.trim()),
    }));
}

/**
 * Extracts a contextual snippet around an unexpected character for error reporting.
 */
function extractSourceSnippet(source: string, offset: number): string {
  const start = Math.max(0, offset - 10);
  const end = Math.min(source.length, offset + 11);
  return source.substring(start, end).replace(/\n/g, '↵');
}

/**
 * Pure Lexical Scanner implementing Maximal Munch / Longest Match with rule priority tie-breaking.
 * Reuses the existing Thompson NFA construction and NFA execution engine.
 */
export function tokenizeSource(
  source: string,
  rules: ReadonlyArray<LexicalRule>
): LexicalAnalysisResult {
  if (!source || source.length === 0) {
    return {
      tokens: [],
      errors: [],
      skippedCount: 0,
      success: true,
    };
  }

  const compiledRules = compileLexicalRules(rules);

  // If no valid rules are available, treat everything as error or empty
  if (compiledRules.length === 0) {
    return {
      tokens: [],
      errors: [
        {
          message: 'No enabled lexical rules configured for tokenization.',
          unexpectedChar: source[0],
          offset: 0,
          line: 1,
          column: 1,
          sourceSnippet: extractSourceSnippet(source, 0),
        },
      ],
      skippedCount: 0,
      success: false,
    };
  }

  const tokens: LexicalToken[] = [];
  const errors: LexicalError[] = [];
  let skippedCount = 0;

  let offset = 0;
  let line = 1;
  let column = 1;

  while (offset < source.length) {
    const currentChar = source[offset];

    let bestMatchLength = 0;
    let bestRule: LexicalRule | null = null;

    // Maximal Munch: Test all compiled rules to find the longest matching prefix
    for (const { rule, nfaResult } of compiledRules) {
      if (!nfaResult.success || nfaResult.nodes.length === 0) {
        continue;
      }

      // Test candidate prefix lengths starting from remaining source length down to 1
      const remainingLength = source.length - offset;
      for (let len = remainingLength; len >= 1; len--) {
        if (len <= bestMatchLength) {
          // Cannot beat our currently known best match length for this or higher priority rule
          break;
        }

        const candidateSubstring = source.substring(offset, offset + len);
        const exec = executeNFA(
          { nodes: [...nfaResult.nodes], edges: [...nfaResult.edges] },
          candidateSubstring
        );

        if (exec.isAccepted) {
          bestMatchLength = len;
          bestRule = rule;
          break; // Found the longest match for this rule, move to next rule
        }
      }
    }

    // Did we find a valid token match?
    if (bestMatchLength > 0 && bestRule) {
      const lexeme = source.substring(offset, offset + bestMatchLength);

      if (bestRule.action === 'EMIT') {
        tokens.push({
          tokenType: bestRule.tokenType,
          lexeme,
          startOffset: offset,
          endOffset: offset + bestMatchLength,
          line,
          column,
          ruleId: bestRule.id,
        });
      } else {
        skippedCount++;
      }

      // Advance offset and update line/column metrics accurately
      for (let i = 0; i < lexeme.length; i++) {
        if (lexeme[i] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
      }

      offset += bestMatchLength;
    } else {
      // Special handling: if character is whitespace / tab / carriage return and no rule matched it, skip or error
      if (currentChar === '\r') {
        offset++;
        continue;
      }

      if (currentChar === '\n') {
        line++;
        column = 1;
        offset++;
        continue;
      }

      if (currentChar === '\t') {
        column += 4;
        offset++;
        continue;
      }

      // Report Lexical Error
      errors.push({
        message: `Unexpected character '${currentChar}' at line ${line}, column ${column}`,
        unexpectedChar: currentChar,
        offset,
        line,
        column,
        sourceSnippet: extractSourceSnippet(source, offset),
      });

      // Advance by 1 character to avoid infinite loop
      column++;
      offset++;
    }
  }

  return {
    tokens,
    errors,
    skippedCount,
    success: errors.length === 0,
  };
}
