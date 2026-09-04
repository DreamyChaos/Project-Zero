import {
  ToolDefinition,
  ToolComparisonMatrixEntry,
  JFLAPWorkflowPreset,
  RegexToolEvaluation,
  YaccWorkflowEvaluation,
  ToolDistinctionItem,
} from './types';
import { parseRegex } from './regex-parser';
import { convertRegexToNFA } from './regex-to-nfa';
import { executeNFA } from './nfa-executor';
import { parseCFGText } from './cfg-parser';
import { buildSLRTable, parseSLR } from './slr-parser';

/**
 * ============================================================
 * MODULE 5 — TOPIC 8: TOOLS (JFLAP, REGEX, LEX, YACC)
 * ============================================================
 *
 * This module coordinates the educational comparison and workflow integration
 * of the four canonical tools studied in Models of Computation and Compiler Design:
 *
 * 1. JFLAP: Interactive educational environment for experimenting with FA, PDA, TM, and CFG.
 * 2. REGEX: Formal pattern specification for Regular Languages.
 * 3. LEX: Lexical analyzer generator converting regex rules to deterministic tokenizers via Maximal Munch.
 * 4. YACC: Parser generator constructing LR(0) items, SLR(1) ACTION/GOTO tables, and shift-reduce parse trees.
 *
 * Pedagogical Architecture & Pipeline:
 *
 *   Source Code (Chars)
 *          │
 *          ▼ (REGEX / LEX)
 *    Token Stream
 *          │
 *          ▼ (CFG / YACC)
 *      Parse Tree
 *
 * Parallel Simulation & Experimentation:
 *    JFLAP <───> FA, PDA, TM, CFG Workspaces
 */

/**
 * Exact metadata registry for the 4 canonical tools.
 */
export const TOOL_DEFINITIONS: ReadonlyArray<ToolDefinition> = [
  {
    id: 'jflap',
    name: 'JFLAP (Java Formal Languages and Automata Package)',
    category: 'ENVIRONMENT',
    formalConcept: 'Interactive simulation and experimentation across the Chomsky Hierarchy',
    inputFormat: 'Visual graphical state diagrams, transition tables, formal grammar text',
    outputArtifact: 'Step-by-step state execution traces, tape animations, conversion graphs',
    primaryFunction:
      'Provides an educational graphical interface for building and running finite automata, pushdown automata, Turing machines, and formal grammars.',
    projectZeroAnalogue:
      'Project Zero provides an integrated, browser-native educational analogue with interactive canvas editors for FA, PDA, TM, and CFG.',
    academicLimitations:
      'Does NOT clone legacy Java desktop JFLAP, execute Java applets, or parse proprietary .jff XML files.',
  },
  {
    id: 'regex',
    name: 'REGEX (Formal Regular Expressions)',
    category: 'SPECIFICATION',
    formalConcept: 'Algebraic specification of Regular Languages (Type-3 Grammars)',
    inputFormat: 'Formal regular expressions over alphabet Σ (concatenation, union |, Kleene star *)',
    outputArtifact: 'Abstract Syntax Tree (AST), Thompson ε-NFA graph, language acceptor',
    primaryFunction:
      'Defines the lexical patterns of a language compactly and mathematically without manually designing state transitions.',
    projectZeroAnalogue:
      'Project Zero houses a pure formal regex parser, Thompson ε-NFA synthesizer, and subset execution engine.',
    academicLimitations:
      'Does NOT support non-regular programming extensions such as lookaheads, backreferences, or arbitrary code execution.',
  },
  {
    id: 'lex',
    name: 'LEX (Lexical Analyzer Generator)',
    category: 'LEXER_GENERATOR',
    formalConcept: 'Deterministic tokenization of text using regular expressions and finite automata',
    inputFormat: 'Table of (pattern, token_type, action, priority) specification rules',
    outputArtifact: 'Stream of structured tokens (token_type, lexeme_value, line, column)',
    primaryFunction:
      'Transforms raw character streams into meaningful lexical tokens using Maximal Munch (longest-match) and priority resolution.',
    projectZeroAnalogue:
      'Project Zero houses a deterministic Maximal Munch tokenizer with priority tie-breaking, whitespace skip actions, and error recovery.',
    academicLimitations:
      'Does NOT emit historical C source files (lex.yy.c) or invoke external C compilers.',
  },
  {
    id: 'yacc',
    name: 'YACC (Yet Another Compiler-Compiler)',
    category: 'PARSER_GENERATOR',
    formalConcept: 'Context-free syntax analysis using deterministic bottom-up LR/SLR parsing',
    inputFormat: 'Context-Free Grammar (CFG) productions and terminal/non-terminal declarations',
    outputArtifact: 'Canonical LR(0) collection, SLR(1) ACTION/GOTO tables, shift-reduce parse tree',
    primaryFunction:
      'Constructs deterministic bottom-up parsers from context-free grammars, detecting shift-reduce and reduce-reduce conflicts.',
    projectZeroAnalogue:
      'Project Zero houses an SLR(1) parser generator that computes FIRST/FOLLOW sets, generates LR(0) items, and steps through shift-reduce parsing.',
    academicLimitations:
      'Does NOT emit y.tab.c C code, compile bison files, or resolve arbitrary semantic action side-effects.',
  },
];

/**
 * Cross-tool comparison matrix for educational review.
 */
export const TOOL_COMPARISON_MATRIX: ReadonlyArray<ToolComparisonMatrixEntry> = [
  {
    toolName: 'JFLAP',
    inputModel: 'Visual State Graph / CFG',
    internalEngine: 'Graph Step Simulation',
    outputArtifact: 'Execution Trace & Animated Tape',
    theoreticalClass: 'Chomsky Hierarchy (Types 0, 1, 2, 3)',
  },
  {
    toolName: 'REGEX',
    inputModel: 'Algebraic Expression',
    internalEngine: "Thompson's Construction",
    outputArtifact: 'ε-NFA / Deterministic State Graph',
    theoreticalClass: 'Regular Languages (Type 3)',
  },
  {
    toolName: 'LEX',
    inputModel: 'Regex Rules Table',
    internalEngine: 'Maximal Munch / Longest Match DFA',
    outputArtifact: 'Token Stream (Type, Value, Position)',
    theoreticalClass: 'Lexical Analysis (Regular Sets)',
  },
  {
    toolName: 'YACC',
    inputModel: 'Context-Free Grammar (P)',
    internalEngine: 'LR(0) Automaton & SLR Table',
    outputArtifact: 'Parse Tree / Derivation Sequence',
    theoreticalClass: 'Deterministic CFGs (Type 2 / PDA)',
  },
];

/**
 * Curated JFLAP-style presets across all 4 machine types.
 */
export const JFLAP_WORKFLOW_PRESETS: ReadonlyArray<JFLAPWorkflowPreset> = [
  {
    id: 'jflap-fa',
    name: 'Finite Automaton: Even Number of 0s',
    targetModel: 'FA',
    description: 'Constructs a 2-state DFA over Σ = {0, 1} accepting words with an even count of zeros.',
    learningObjective: 'Observe state transitions, delta functions, and immediate acceptance without auxiliary memory.',
  },
  {
    id: 'jflap-pda',
    name: 'Pushdown Automaton: Palindromes / a^n b^n',
    targetModel: 'PDA',
    description: 'Constructs a PDA utilizing a single stack to balance matching prefixes and suffixes.',
    learningObjective: 'Examine stack pushes, pops, and top-of-stack lookaheads for non-regular context-free languages.',
  },
  {
    id: 'jflap-tm',
    name: 'Turing Machine: a^n b^n c^n Acceptor',
    targetModel: 'TM',
    description: 'Constructs a deterministic Turing Machine verifying the non-context-free language a^n b^n c^n.',
    learningObjective: 'Observe two-way infinite tape movement, head rewrites, and tape blank space exploration.',
  },
  {
    id: 'jflap-cfg',
    name: 'Grammar: Balanced Parentheses (Dyck Language)',
    targetModel: 'CFG',
    description: 'Explores production rules S -> ( S ) | S S | ε to generate nested parentheses structures.',
    learningObjective: 'Derive strings using top-down left-to-right derivations and parse trees.',
  },
];

/**
 * Pedagogical distinction items guarding against common student misconceptions.
 */
export const TOOLS_DISTINCTION_ITEMS: ReadonlyArray<ToolDistinctionItem> = [
  {
    topic: 'Formal Regular Expressions vs Programming Language Regex',
    correctConcept:
      'Formal regexes are strictly equivalent to Regular Languages (Type 3) and describe only what finite automata can recognize.',
    misconception:
      'Believing regexes can match a^n b^n because modern Python/JavaScript regexes support backreferences or recursive patterns.',
    safetyWarning:
      'Backreferences make language recognition NP-complete and non-regular. Theoretical regexes do NOT contain backreferences.',
  },
  {
    topic: 'LEX Maximal Munch (Longest Match) Rule',
    correctConcept:
      'At each character position, the scanner matches the longest possible substring accepted by any rule. Equal lengths are resolved by rule priority.',
    misconception:
      'Assuming the first matching rule immediately consumes whatever prefix it finds.',
    safetyWarning:
      'Without Maximal Munch, the identifier "ifelse" would be incorrectly tokenized as KEYWORD_IF followed by "else".',
  },
  {
    topic: 'YACC/SLR Parser Generator vs Interpreter',
    correctConcept:
      'YACC analyzes the grammar at generation time to build an ACTION/GOTO table and verify determinism, discovering conflicts before runtime.',
    misconception:
      'Confusing a shift-reduce parser generator with a runtime interpreter.',
    safetyWarning:
      'Shift-reduce conflicts prove that the grammar is not SLR(1) and would cause ambiguous parsing decisions.',
  },
  {
    topic: 'JFLAP Analogue vs Industrial Compiler Suites',
    correctConcept:
      'JFLAP and Project Zero are educational tools designed to build intuition for theoretical models of computation.',
    misconception:
      'Expecting Project Zero to produce deployable native executable binaries or parse industrial C header files.',
    safetyWarning:
      'Educational clarity and formal correctness must always take priority over industrial compiler complexity.',
  },
];

/**
 * Evaluates a formal regular expression using Project Zero's authoritative regex parser and NFA engine.
 */
export function evaluateRegexTool(
  regexString: string,
  sampleInputs: ReadonlyArray<string>
): RegexToolEvaluation {
  const trimmed = regexString.trim();
  if (trimmed.length === 0) {
    return {
      regexString,
      isValid: false,
      error: 'Regular expression cannot be empty.',
      testResults: [],
    };
  }

  const parseResult = parseRegex(trimmed);
  if (!parseResult.success || !parseResult.ast) {
    return {
      regexString,
      isValid: false,
      error: parseResult.errorMessage || 'Invalid formal regular expression syntax.',
      testResults: [],
    };
  }

  const nfaResult = convertRegexToNFA(trimmed);
  if (!nfaResult.success) {
    return {
      regexString,
      isValid: false,
      error: nfaResult.errorMessage || 'Failed to synthesize Thompson NFA.',
      testResults: [],
    };
  }

  const testResults = sampleInputs.map((input) => {
    const exec = executeNFA(
      { nodes: [...nfaResult.nodes], edges: [...nfaResult.edges] },
      input
    );
    return {
      input,
      isAccepted: exec.isAccepted,
    };
  });

  return {
    regexString,
    isValid: true,
    astSummary: `AST Type: ${parseResult.ast.type}`,
    nfaStateCount: nfaResult.nodes.length,
    testResults,
  };
}

import { validateCFG } from './cfg-validator';

/**
 * Evaluates a context-free grammar through the YACC/SLR workflow.
 */
export function evaluateYaccWorkflow(
  grammarText: string,
  sampleInput: string
): YaccWorkflowEvaluation {
  const parsedGrammar = parseCFGText(grammarText);
  const validation = validateCFG(parsedGrammar);

  if (!validation.isValid || parsedGrammar.productions.length === 0) {
    const errorMsg =
      validation.errors.length > 0
        ? validation.errors.map((e) => e.message).join('; ')
        : 'Failed to parse valid context-free grammar productions.';
    return {
      grammarText,
      isValid: false,
      error: errorMsg,
      stateCount: 0,
      hasConflicts: false,
      conflictCount: 0,
    };
  }

  const { table } = buildSLRTable(parsedGrammar);
  let sampleParse:
    | {
        readonly input: string;
        readonly success: boolean;
        readonly stepsExecuted: number;
      }
    | undefined;

  if (sampleInput.trim().length > 0) {
    const parseRes = parseSLR(parsedGrammar, sampleInput.trim());
    sampleParse = {
      input: sampleInput.trim(),
      success: parseRes.isAccepted,
      stepsExecuted: parseRes.steps.length,
    };
  }

  return {
    grammarText,
    isValid: true,
    stateCount: table.states.length,
    hasConflicts: !table.isSLR,
    conflictCount: table.conflicts.length,
    sampleParse,
  };
}
