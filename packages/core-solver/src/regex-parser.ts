import { RegexASTNode, RegexParseResult } from './types';

export type TokenType =
  | 'LITERAL'
  | 'LPAREN'
  | 'RPAREN'
  | 'ALTERNATION'
  | 'STAR'
  | 'PLUS'
  | 'QUESTION'
  | 'EPSILON';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Tokenizes a regular expression string into structured tokens.
 * Surrounding insignificant whitespace is ignored; literal Unicode symbols, ε, λ, |, *, +, ?, (, ) are tokenized.
 */
export function tokenizeRegex(input: string): Token[] {
  const tokens: Token[] = [];
  const chars = Array.from(input);
  let pos = 0;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    // Ignore spaces except if whitespace rules dictate
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      pos += char.length;
      continue;
    }

    if (char === 'ε' || char === 'λ') {
      tokens.push({ type: 'EPSILON', value: 'ε', position: pos });
    } else if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position: pos });
    } else if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position: pos });
    } else if (char === '|') {
      tokens.push({ type: 'ALTERNATION', value: '|', position: pos });
    } else if (char === '*') {
      tokens.push({ type: 'STAR', value: '*', position: pos });
    } else if (char === '+') {
      tokens.push({ type: 'PLUS', value: '+', position: pos });
    } else if (char === '?') {
      tokens.push({ type: 'QUESTION', value: '?', position: pos });
    } else {
      tokens.push({ type: 'LITERAL', value: char, position: pos });
    }

    pos += char.length;
  }

  return tokens;
}

/**
 * Parses tokenized regex into an Abstract Syntax Tree (AST) using Recursive Descent.
 * Precedence:
 *  1. Postfix operators (*, +, ?)
 *  2. Concatenation
 *  3. Alternation (|)
 */
export function parseRegex(input: string): RegexParseResult {
  const tokens = tokenizeRegex(input);
  if (tokens.length === 0) {
    return {
      success: true,
      ast: { type: 'EPSILON' },
    };
  }

  let tokenIdx = 0;

  function peek(): Token | null {
    return tokenIdx < tokens.length ? tokens[tokenIdx] : null;
  }

  function consume(): Token {
    return tokens[tokenIdx++];
  }

  // Expression := Term ('|' Term)*
  function parseExpression(): RegexASTNode {
    let left = parseConcatTerm();

    while (peek() && peek()!.type === 'ALTERNATION') {
      const altToken = consume();
      const nextPeek = peek();
      if (!nextPeek || nextPeek.type === 'RPAREN' || nextPeek.type === 'ALTERNATION') {
        throw {
          position: altToken.position,
          message: 'Alternation requires an expression on the right.',
        };
      }
      const right = parseConcatTerm();
      left = { type: 'UNION', left, right };
    }

    return left;
  }

  // ConcatTerm := Factor (Factor)*
  function parseConcatTerm(): RegexASTNode {
    const factors: RegexASTNode[] = [];

    while (peek() && peek()!.type !== 'ALTERNATION' && peek()!.type !== 'RPAREN') {
      factors.push(parseFactor());
    }

    if (factors.length === 0) {
      const p = peek();
      throw {
        position: p ? p.position : input.length,
        message: 'Expected valid sub-expression.',
      };
    }

    let node = factors[0];
    for (let i = 1; i < factors.length; i++) {
      node = { type: 'CONCAT', left: node, right: factors[i] };
    }

    return node;
  }

  // Factor := Base ('*' | '+' | '?')*
  function parseFactor(): RegexASTNode {
    let node = parseBase();

    while (peek() && (peek()!.type === 'STAR' || peek()!.type === 'PLUS' || peek()!.type === 'QUESTION')) {
      const opToken = consume();

      // Disallow double postfix operators like a** or a*+
      const nextOp = peek();
      if (nextOp && (nextOp.type === 'STAR' || nextOp.type === 'PLUS' || nextOp.type === 'QUESTION')) {
        throw {
          position: nextOp.position,
          message: 'Repeated postfix operators are not allowed.',
        };
      }

      if (opToken.type === 'STAR') {
        node = { type: 'STAR', expression: node };
      } else if (opToken.type === 'PLUS') {
        node = { type: 'PLUS', expression: node };
      } else if (opToken.type === 'QUESTION') {
        node = { type: 'OPTIONAL', expression: node };
      }
    }

    return node;
  }

  // Base := LITERAL | EPSILON | '(' Expression ')'
  function parseBase(): RegexASTNode {
    const token = peek();
    if (!token) {
      throw {
        position: input.length,
        message: 'Unexpected end of expression.',
      };
    }

    if (token.type === 'STAR' || token.type === 'PLUS' || token.type === 'QUESTION') {
      const opName = token.value === '*' ? 'Kleene star' : token.value === '+' ? 'Plus operator' : 'Optional operator';
      throw {
        position: token.position,
        message: `${opName} requires an expression before it.`,
      };
    }

    if (token.type === 'LITERAL') {
      consume();
      return { type: 'LITERAL', symbol: token.value };
    }

    if (token.type === 'EPSILON') {
      consume();
      return { type: 'EPSILON' };
    }

    if (token.type === 'LPAREN') {
      const lparenPos = token.position;
      consume(); // consume '('
      const subExpr = parseExpression();

      const nextToken = peek();
      if (!nextToken || nextToken.type !== 'RPAREN') {
        throw {
          position: lparenPos,
          message: `Unclosed '(' at position ${lparenPos}.`,
        };
      }
      consume(); // consume ')'
      return subExpr;
    }

    throw {
      position: token.position,
      message: `Unexpected token '${token.value}'.`,
    };
  }

  try {
    const ast = parseExpression();
    if (tokenIdx < tokens.length) {
      const remainingToken = tokens[tokenIdx];
      if (remainingToken.type === 'RPAREN') {
        throw {
          position: remainingToken.position,
          message: `Unmatched ')' at position ${remainingToken.position}.`,
        };
      }
      throw {
        position: remainingToken.position,
        message: `Unexpected token '${remainingToken.value}' at position ${remainingToken.position}.`,
      };
    }
    return { success: true, ast };
  } catch (err: unknown) {
    const errorObj = err as { position?: number; message?: string } | null;
    return {
      success: false,
      errorPosition: typeof errorObj?.position === 'number' ? errorObj.position : 0,
      errorMessage: errorObj?.message || 'Syntax error in regular expression.',
    };
  }
}
