import { describe, it, expect } from 'vitest';
import {
  tokenizeSource,
  compileLexicalRules,
  getLexicalPresets,
  getLexicalPresetById,
} from '../lexical-analyzer';
import { LexicalRule } from '../types';

describe('Lexical Analysis & Scanner Engine (Module 2 Topic 3)', () => {
  describe('Rule Set Presets', () => {
    it('should expose all standard curated presets', () => {
      const presets = getLexicalPresets();
      expect(presets.length).toBeGreaterThanOrEqual(3);
      expect(presets.some((p) => p.id === 'basic-program')).toBe(true);
      expect(presets.some((p) => p.id === 'basic-arithmetic')).toBe(true);
      expect(presets.some((p) => p.id === 'minimal-binary')).toBe(true);
    });

    it('should find preset by ID accurately', () => {
      const prog = getLexicalPresetById('basic-program');
      expect(prog).toBeDefined();
      expect(prog?.name).toContain('Basic Programming');
    });
  });

  describe('Maximal Munch & Longest Match Semantics', () => {
    it('should prefer longer token "==" over "=" when both patterns match prefix', () => {
      const rules: LexicalRule[] = [
        { id: 'r1', tokenType: 'ASSIGN', regex: '=', priority: 1, action: 'EMIT', enabled: true },
        { id: 'r2', tokenType: 'EQUALITY', regex: '==', priority: 2, action: 'EMIT', enabled: true },
      ];

      const res = tokenizeSource('==', rules);
      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(1);
      expect(res.tokens[0].tokenType).toBe('EQUALITY');
      expect(res.tokens[0].lexeme).toBe('==');
    });

    it('should tokenize multi-digit integers as single longest match token', () => {
      const rules: LexicalRule[] = [
        { id: 'r-int', tokenType: 'INTEGER', regex: '(0|1|2|3|4|5|6|7|8|9)+', priority: 1, action: 'EMIT', enabled: true },
      ];

      const res = tokenizeSource('102456', rules);
      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(1);
      expect(res.tokens[0].lexeme).toBe('102456');
    });
  });

  describe('Rule Priority & Keyword vs Identifier Disambiguation', () => {
    it('should classify "if" as KEYWORD_IF when keyword has higher priority than IDENTIFIER', () => {
      const rules: LexicalRule[] = [
        { id: 'r-kw', tokenType: 'KEYWORD_IF', regex: 'if', priority: 1, action: 'EMIT', enabled: true },
        { id: 'r-id', tokenType: 'IDENTIFIER', regex: '(a|b|c|d|i|f)(a|b|c|d|i|f)*', priority: 2, action: 'EMIT', enabled: true },
      ];

      const res = tokenizeSource('if', rules);
      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(1);
      expect(res.tokens[0].tokenType).toBe('KEYWORD_IF');
      expect(res.tokens[0].lexeme).toBe('if');
    });

    it('should classify "ifa" as IDENTIFIER because of maximal munch', () => {
      const rules: LexicalRule[] = [
        { id: 'r-kw', tokenType: 'KEYWORD_IF', regex: 'if', priority: 1, action: 'EMIT', enabled: true },
        { id: 'r-id', tokenType: 'IDENTIFIER', regex: '(a|b|c|d|i|f)(a|b|c|d|i|f)*', priority: 2, action: 'EMIT', enabled: true },
      ];

      const res = tokenizeSource('ifa', rules);
      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(1);
      expect(res.tokens[0].tokenType).toBe('IDENTIFIER');
      expect(res.tokens[0].lexeme).toBe('ifa');
    });
  });

  describe('Adjacent Tokens without Whitespace', () => {
    it('should tokenize "count=42+7;" correctly with zero whitespace', () => {
      const progPreset = getLexicalPresetById('basic-program')!;
      const res = tokenizeSource('count=42+7;', progPreset.rules);

      expect(res.success).toBe(true);
      const tokenTypes = res.tokens.map((t) => t.tokenType);
      expect(tokenTypes).toEqual(['IDENTIFIER', 'ASSIGN', 'INTEGER', 'PLUS', 'INTEGER', 'SEMICOLON']);
      expect(res.tokens.map((t) => t.lexeme)).toEqual(['count', '=', '42', '+', '7', ';']);
    });

    it('should tokenize arithmetic expressions like "x=x+1" accurately', () => {
      const arith = getLexicalPresetById('basic-arithmetic')!;
      const res = tokenizeSource('x=x+1', arith.rules);

      expect(res.success).toBe(true);
      expect(res.tokens.map((t) => t.lexeme)).toEqual(['x', '=', 'x', '+', '1']);
      expect(res.tokens.map((t) => t.tokenType)).toEqual(['IDENTIFIER', 'ASSIGN', 'IDENTIFIER', 'PLUS', 'INTEGER']);
    });
  });

  describe('Whitespace & Comment Actions', () => {
    it('should skip whitespace tokens and increment skippedCount', () => {
      const progPreset = getLexicalPresetById('basic-program')!;
      const res = tokenizeSource('int   count   =   42;', progPreset.rules);

      expect(res.success).toBe(true);
      expect(res.tokens.map((t) => t.lexeme)).toEqual(['int', 'count', '=', '42', ';']);
      expect(res.skippedCount).toBeGreaterThanOrEqual(3);
    });

    it('should skip single-line comments when configured as SKIP action', () => {
      const progPreset = getLexicalPresetById('basic-program')!;
      const res = tokenizeSource('//test comment\ncount = 1;', progPreset.rules);

      expect(res.success).toBe(true);
      expect(res.tokens.map((t) => t.lexeme)).toEqual(['count', '=', '1', ';']);
    });
  });

  describe('Line & Column Position Tracking', () => {
    it('should accurately calculate line and column offsets for multiline source', () => {
      const progPreset = getLexicalPresetById('basic-program')!;
      const source = 'int a = 1;\nint b = 2;';
      const res = tokenizeSource(source, progPreset.rules);

      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(10);

      // First line
      expect(res.tokens[0].lexeme).toBe('int');
      expect(res.tokens[0].line).toBe(1);
      expect(res.tokens[0].column).toBe(1);

      // Second line "int"
      const secondInt = res.tokens[5];
      expect(secondInt.lexeme).toBe('int');
      expect(secondInt.line).toBe(2);
      expect(secondInt.column).toBe(1);
    });
  });

  describe('Lexical Errors & Recovery', () => {
    it('should report detailed lexical errors on unexpected characters', () => {
      const progPreset = getLexicalPresetById('basic-program')!;
      const source = 'int count = 42 @ val;';
      const res = tokenizeSource(source, progPreset.rules);

      expect(res.success).toBe(false);
      expect(res.errors.length).toBe(1);
      expect(res.errors[0].unexpectedChar).toBe('@');
      expect(res.errors[0].line).toBe(1);
      expect(res.errors[0].column).toBe(16);

      // The valid tokens before and after should still be scanned
      expect(res.tokens.map((t) => t.lexeme)).toContain('int');
      expect(res.tokens.map((t) => t.lexeme)).toContain('count');
      expect(res.tokens.map((t) => t.lexeme)).toContain('42');
      expect(res.tokens.map((t) => t.lexeme)).toContain('val');
    });
  });

  describe('State Isolation & Boundary Conditions', () => {
    it('should return empty token list for empty source', () => {
      const progPreset = getLexicalPresetById('basic-program')!;
      const res = tokenizeSource('', progPreset.rules);

      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(0);
      expect(res.errors.length).toBe(0);
    });

    it('should compile rules deterministically without cross-mutation', () => {
      const rulesA = [...getLexicalPresetById('basic-program')!.rules];
      const rulesB = [...getLexicalPresetById('minimal-binary')!.rules];

      const compA = compileLexicalRules(rulesA);
      const compB = compileLexicalRules(rulesB);

      expect(compA.length).toBe(rulesA.length);
      expect(compB.length).toBe(rulesB.length);
      expect(compA[0].rule.tokenType).not.toBe(compB[0].rule.tokenType);
    });
  });
});
