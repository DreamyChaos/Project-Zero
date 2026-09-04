import { describe, it, expect } from 'vitest';
import {
  TOOL_DEFINITIONS,
  TOOL_COMPARISON_MATRIX,
  JFLAP_WORKFLOW_PRESETS,
  TOOLS_DISTINCTION_ITEMS,
  evaluateRegexTool,
  evaluateYaccWorkflow,
} from '../tools';
import {
  tokenizeSource,
} from '../lexical-analyzer';
import { LexicalRule } from '../types';

describe('Module 5 — Topic 8: Tools (JFLAP, REGEX, LEX, YACC)', () => {
  // ============================================================
  // Category A: Metadata, Registry & Ecosystem Comparison
  // ============================================================
  describe('Category A: Metadata & Ecosystem Registry', () => {
    it('defines exactly four canonical tools: JFLAP, REGEX, LEX, YACC', () => {
      expect(TOOL_DEFINITIONS.length).toBe(4);
      const ids = TOOL_DEFINITIONS.map((t) => t.id);
      expect(ids).toEqual(['jflap', 'regex', 'lex', 'yacc']);
    });

    it('documents academic limitations without making false claims', () => {
      const jflap = TOOL_DEFINITIONS.find((t) => t.id === 'jflap')!;
      expect(jflap.academicLimitations).toContain('Does NOT clone legacy Java desktop JFLAP');
      expect(jflap.academicLimitations).toContain('.jff');

      const regex = TOOL_DEFINITIONS.find((t) => t.id === 'regex')!;
      expect(regex.academicLimitations).toContain('Does NOT support non-regular programming extensions');

      const lex = TOOL_DEFINITIONS.find((t) => t.id === 'lex')!;
      expect(lex.academicLimitations).toContain('Does NOT emit historical C source files');

      const yacc = TOOL_DEFINITIONS.find((t) => t.id === 'yacc')!;
      expect(yacc.academicLimitations).toContain('Does NOT emit y.tab.c C code');
    });

    it('contains comprehensive comparison matrix entries', () => {
      expect(TOOL_COMPARISON_MATRIX.length).toBe(4);
      const names = TOOL_COMPARISON_MATRIX.map((c) => c.toolName);
      expect(names).toEqual(['JFLAP', 'REGEX', 'LEX', 'YACC']);
    });

    it('provides JFLAP workflow presets covering FA, PDA, TM, and CFG', () => {
      expect(JFLAP_WORKFLOW_PRESETS.length).toBe(4);
      const targets = JFLAP_WORKFLOW_PRESETS.map((p) => p.targetModel);
      expect(targets).toEqual(['FA', 'PDA', 'TM', 'CFG']);
    });

    it('includes pedagogical distinction items', () => {
      expect(TOOLS_DISTINCTION_ITEMS.length).toBe(4);
      const topics = TOOLS_DISTINCTION_ITEMS.map((d) => d.topic);
      expect(topics).toContain('Formal Regular Expressions vs Programming Language Regex');
      expect(topics).toContain('LEX Maximal Munch (Longest Match) Rule');
      expect(topics).toContain('YACC/SLR Parser Generator vs Interpreter');
    });
  });

  // ============================================================
  // Category B: Formal REGEX Engine Integration
  // ============================================================
  describe('Category B: Formal REGEX Evaluation', () => {
    it('evaluates valid formal regex and verifies word acceptance / rejection', () => {
      // (a|b)*abb accepts words ending in abb
      const res = evaluateRegexTool('(a|b)*abb', ['abb', 'aabb', 'babb', 'aba', 'b']);
      expect(res.isValid).toBe(true);
      expect(res.nfaStateCount).toBeGreaterThan(0);
      expect(res.testResults.length).toBe(5);

      const accepted = res.testResults.filter((r) => r.isAccepted).map((r) => r.input);
      const rejected = res.testResults.filter((r) => !r.isAccepted).map((r) => r.input);

      expect(accepted).toEqual(['abb', 'aabb', 'babb']);
      expect(rejected).toEqual(['aba', 'b']);
    });

    it('gracefully handles empty and syntactically malformed regular expressions', () => {
      const emptyRes = evaluateRegexTool('', ['a']);
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.error).toContain('cannot be empty');

      const invalidRes = evaluateRegexTool('(a|b*', ['a']);
      expect(invalidRes.isValid).toBe(false);
      expect(invalidRes.error).toBeDefined();
    });
  });

  // ============================================================
  // Category C: LEX Lexical Analysis (Maximal Munch & Priority)
  // ============================================================
  describe('Category C: LEX Lexical Analysis Integration', () => {
    const rules: LexicalRule[] = [
      {
        id: 'r-if',
        tokenType: 'KEYWORD_IF',
        regex: 'if',
        priority: 1,
        action: 'EMIT',
        enabled: true,
      },
      {
        id: 'r-id',
        tokenType: 'IDENTIFIER',
        regex: '(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)+',
        priority: 2,
        action: 'EMIT',
        enabled: true,
      },
      {
        id: 'r-num',
        tokenType: 'NUMBER',
        regex: '(0|1|2|3|4|5|6|7|8|9)+',
        priority: 3,
        action: 'EMIT',
        enabled: true,
      },
      {
        id: 'r-plus',
        tokenType: 'PLUS',
        regex: '\\+',
        priority: 4,
        action: 'EMIT',
        enabled: true,
      },
      {
        id: 'r-ws',
        tokenType: 'WHITESPACE',
        regex: '(\\ |\\t|\\n)+',
        priority: 5,
        action: 'SKIP',
        enabled: true,
      },
    ];

    it('demonstrates Maximal Munch: "ifelse" is tokenized as IDENTIFIER, not KEYWORD_IF', () => {
      const res = tokenizeSource('ifelse', rules);
      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(1);
      expect(res.tokens[0].tokenType).toBe('IDENTIFIER');
      expect(res.tokens[0].lexeme).toBe('ifelse');
    });

    it('demonstrates Rule Priority: "if" matches both KEYWORD_IF and IDENTIFIER, but KEYWORD_IF has priority 1', () => {
      const res = tokenizeSource('if', rules);
      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(1);
      expect(res.tokens[0].tokenType).toBe('KEYWORD_IF');
      expect(res.tokens[0].lexeme).toBe('if');
    });

    it('demonstrates SKIP actions and multi-token extraction', () => {
      const arithmeticRules: LexicalRule[] = [
        {
          id: 'r-ident',
          tokenType: 'IDENTIFIER',
          regex: '(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)+',
          priority: 1,
          action: 'EMIT',
          enabled: true,
        },
        {
          id: 'r-plus',
          tokenType: 'PLUS',
          regex: '\\+',
          priority: 2,
          action: 'EMIT',
          enabled: true,
        },
        {
          id: 'r-num',
          tokenType: 'NUMBER',
          regex: '(0|1|2|3|4|5|6|7|8|9)+',
          priority: 3,
          action: 'EMIT',
          enabled: true,
        },
        {
          id: 'r-ws',
          tokenType: 'WHITESPACE',
          regex: '(\\ |\\t)+',
          priority: 4,
          action: 'SKIP',
          enabled: true,
        },
      ];

      const res = tokenizeSource('count + 42', arithmeticRules);
      expect(res.success).toBe(true);
      expect(res.tokens.length).toBe(3);
      expect(res.tokens.map((t) => t.tokenType)).toEqual(['IDENTIFIER', 'PLUS', 'NUMBER']);
      expect(res.tokens.map((t) => t.lexeme)).toEqual(['count', '+', '42']);
      expect(res.skippedCount).toBeGreaterThan(0);
    });

    it('reports lexical errors for unexpected characters', () => {
      const arithmeticRules: LexicalRule[] = [
        {
          id: 'r-ident',
          tokenType: 'IDENTIFIER',
          regex: '(a|b|c)+',
          priority: 1,
          action: 'EMIT',
          enabled: true,
        },
      ];
      const res = tokenizeSource('@', arithmeticRules);
      expect(res.success).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors[0].unexpectedChar).toBe('@');
    });
  });

  // ============================================================
  // Category D: YACC / SLR Parser Workflow Integration
  // ============================================================
  describe('Category D: YACC / SLR Parser Workflow Integration', () => {
    it('evaluates classical expression grammar: E -> E + T | T, T -> a', () => {
      const grammarText = `
        E -> E + T
        E -> T
        T -> a
      `;
      const res = evaluateYaccWorkflow(grammarText, 'a+a');
      expect(res.isValid).toBe(true);
      expect(res.stateCount).toBeGreaterThan(0);
      expect(res.hasConflicts).toBe(false);
      expect(res.conflictCount).toBe(0);
      expect(res.sampleParse).toBeDefined();
      expect(res.sampleParse!.success).toBe(true);
      expect(res.sampleParse!.stepsExecuted).toBeGreaterThan(0);
    });

    it('detects shift/reduce conflicts on ambiguous grammar', () => {
      // Ambiguous expression grammar
      const ambiguousGrammar = `
        E -> E + E
        E -> a
      `;
      const res = evaluateYaccWorkflow(ambiguousGrammar, 'a+a');
      expect(res.isValid).toBe(true);
      expect(res.hasConflicts).toBe(true);
      expect(res.conflictCount).toBeGreaterThan(0);
    });

    it('handles malformed grammar syntax gracefully', () => {
      const res = evaluateYaccWorkflow('', '');
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
