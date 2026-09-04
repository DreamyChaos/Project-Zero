import { ProgramConstructPreset, BatchTestResult, StateNode, TransitionEdge } from './types';
import { executeNFA } from './nfa-executor';

/**
 * Curated library of standard Programming Language Construct Presets defined
 * using formal Regular Expressions compatible with Thompson's Construction.
 */
export const PROGRAM_CONSTRUCT_PRESETS: ReadonlyArray<ProgramConstructPreset> = [
  {
    id: 'ident-simple',
    name: 'Identifier (Letter Prefix)',
    category: 'Identifiers',
    regex: '(a|b|c|d|x|y|z)(a|b|c|d|x|y|z|0|1|2|3|4|5|6|7|8|9|_)*',
    description: 'Variable or function name starting with an alphabetical letter, followed by letters, digits, or underscores.',
    grammarRule: 'Letter (Letter | Digit | "_")*',
    academicContext: 'Standard lexical rule for identifiers across C, Java, Python, and Pascal. Prevents ambiguous numeric token overlap by requiring a non-digit initial symbol.',
    sampleValid: ['a', 'abc', 'x1', 'z_0', 'd42'],
    sampleInvalid: ['0a', '1', '9z', '_a'],
  },
  {
    id: 'num-int',
    name: 'Unsigned Integer',
    category: 'Numbers',
    regex: '(0|1|2|3|4|5|6|7|8|9)+',
    description: 'One or more decimal digits representing a non-negative whole integer.',
    grammarRule: 'Digit+',
    academicContext: 'Core lexical specification for integral literals. Transformed into base-10 numerical values by the scanner phase of a compiler.',
    sampleValid: ['0', '1', '42', '1024', '99999'],
    sampleInvalid: ['abc', '1a', '3.14', '-5'],
  },
  {
    id: 'num-decimal',
    name: 'Decimal Floating-Point',
    category: 'Numbers',
    regex: '(0|1|2|3|4|5|6|7|8|9)+.(0|1|2|3|4|5|6|7|8|9)+',
    description: 'Fixed-point decimal number with integral digits, explicit decimal point, and fractional digits.',
    grammarRule: 'Digit+ "." Digit+',
    academicContext: 'Elementary IEEE-754 floating point representation without exponent notation.',
    sampleValid: ['3.14', '0.0', '12.345', '99.9'],
    sampleInvalid: ['3', '.14', '3.', 'abc', '1.2.3'],
  },
  {
    id: 'num-binary',
    name: 'Binary Integer Literal',
    category: 'Numbers',
    regex: '(0|1)+',
    description: 'Binary number consisting exclusively of base-2 bits (0 and 1).',
    grammarRule: '("0" | "1")+',
    academicContext: 'Base-2 machine-level bit sequence representation used for bitwise masks and low-level flags.',
    sampleValid: ['0', '1', '1010', '001', '11110000'],
    sampleInvalid: ['2', '10a', '1.0', 'abc'],
  },
  {
    id: 'num-hex',
    name: 'Hexadecimal Literal (0x Prefix)',
    category: 'Numbers',
    regex: '0x(0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f)+',
    description: 'Base-16 integer prefixed by "0x" followed by hexadecimal digits (0-9, a-f).',
    grammarRule: '"0x" (Digit | [a-f])+',
    academicContext: 'Standard C-family hexadecimal token representation.',
    sampleValid: ['0x0', '0x1f', '0x2a3', '0xff', '0x1234abcd'],
    sampleInvalid: ['0', '1f', '0xg', '0x', 'x1f'],
  },
  {
    id: 'num-sci',
    name: 'Scientific Exponential Notation',
    category: 'Numbers',
    regex: '(0|1|2|3|4|5|6|7|8|9)+(e|E)(0|1|2|3|4|5|6|7|8|9)+',
    description: 'Significant digits followed by exponent marker (e/E) and power digits.',
    grammarRule: 'Digit+ ("e" | "E") Digit+',
    academicContext: 'Scientific float notation used in high-precision scientific computing and mathematical tokenizers.',
    sampleValid: ['1e5', '2E10', '30e2', '6e23'],
    sampleInvalid: ['1e', 'e5', '1x5', 'abc', '1e-5'],
  },
  {
    id: 'kw-control',
    name: 'Control Flow Keywords',
    category: 'Keywords',
    regex: 'if|else|while|for|return',
    description: 'Reserved words controlling program execution branching and iteration.',
    grammarRule: '"if" | "else" | "while" | "for" | "return"',
    academicContext: 'Reserved language keywords that are prioritized over general identifiers in symbol-table lookup.',
    sampleValid: ['if', 'else', 'while', 'for', 'return'],
    sampleInvalid: ['iff', 'elif', 'whiles', 'fore', 'returns', 'var'],
  },
  {
    id: 'kw-boolean',
    name: 'Boolean Literals',
    category: 'Keywords',
    regex: 'true|false',
    description: 'Boolean truth values representing canonical boolean logic constants.',
    grammarRule: '"true" | "false"',
    academicContext: 'First-class boolean type constant tokens.',
    sampleValid: ['true', 'false'],
    sampleInvalid: ['True', 'FALSE', '0', '1', 'null'],
  },
  {
    id: 'kw-type',
    name: 'Primitive Type Specifiers',
    category: 'Keywords',
    regex: 'int|float|char|void',
    description: 'Primitive data type keywords in typed systems.',
    grammarRule: '"int" | "float" | "char" | "void"',
    academicContext: 'Type declarations scanned during type checking in early compiler frontends.',
    sampleValid: ['int', 'float', 'char', 'void'],
    sampleInvalid: ['integer', 'double', 'string', 'bool'],
  },
  {
    id: 'op-relational',
    name: 'Relational Comparison Operators',
    category: 'Operators',
    regex: '<|>|<=|>=|==|!=',
    description: 'Binary comparison operators producing boolean conditional outcomes.',
    grammarRule: '"<" | ">" | "<=" | ">=" | "==" | "!="',
    academicContext: 'Multi-character comparison operators. Demonstrates maximal-munch scanning behavior in lexers.',
    sampleValid: ['<', '>', '<=', '>=', '==', '!='],
    sampleInvalid: ['=', '!', '===', '<>', '><'],
  },
  {
    id: 'op-assign',
    name: 'Assignment Operators',
    category: 'Operators',
    regex: '(=|:=)',
    description: 'Standard simple assignment (=) and Pascal-style walrus assignment (:=).',
    grammarRule: '"=" | ":="',
    academicContext: 'Fundamental state mutation token distinguishing expressions from assignments.',
    sampleValid: ['=', ':='],
    sampleInvalid: ['==', ':', '+=', '::'],
  },
  {
    id: 'delims',
    name: 'Structural Delimiters & Punctuation',
    category: 'Delimiters',
    regex: '({|}|;|:|,)',
    description: 'Structural block delimiters and statement punctuation separators.',
    grammarRule: '"{" | "}" | ";" | ":" | ","',
    academicContext: 'Delimiters establish lexical boundaries and statement termination in C-style syntax.',
    sampleValid: ['{', '}', ';', ':', ','],
    sampleInvalid: ['(', ')', '[', ']', '.', 'a'],
  },
  {
    id: 'comment-line',
    name: 'Single-Line Comment Marker',
    category: 'Literals',
    regex: '//(a|b|c|0|1|2|3|4|5|6|7|8|9|_)*',
    description: 'Single-line source code comment starting with "//" followed by valid symbol characters.',
    grammarRule: '"//" (Letter | Digit | "_")*',
    academicContext: 'Lexical analysis ignores or tokens single-line comments before passing AST tokens to the parser.',
    sampleValid: ['//', '//abc', '//a01', '//c_9'],
    sampleInvalid: ['/', 'abc', '/* */'],
  },
];

/**
 * Returns the complete list of curated program construct presets.
 */
export function getProgramConstructPresets(): ReadonlyArray<ProgramConstructPreset> {
  return PROGRAM_CONSTRUCT_PRESETS;
}

/**
 * Finds a specific program construct preset by its unique ID.
 */
export function getProgramConstructById(id: string): ProgramConstructPreset | undefined {
  return PROGRAM_CONSTRUCT_PRESETS.find((p) => p.id === id);
}

/**
 * Evaluates a batch of test string cases against an active NFA state machine.
 */
export function evaluateConstructBatch(
  machine: { nodes: ReadonlyArray<StateNode>; edges: ReadonlyArray<TransitionEdge> },
  testCases: ReadonlyArray<{ input: string; expected?: boolean }>
): BatchTestResult[] {
  if (!machine || machine.nodes.length === 0) {
    return [];
  }

  return testCases.map((tc) => {
    const exec = executeNFA(
      { nodes: [...machine.nodes], edges: [...machine.edges] },
      tc.input
    );

    const isAccepted = exec.isAccepted;
    let status: 'PASS' | 'FAIL' = 'PASS';

    if (typeof tc.expected === 'boolean') {
      status = isAccepted === tc.expected ? 'PASS' : 'FAIL';
    }

    return {
      input: tc.input,
      isAccepted,
      expected: tc.expected,
      status,
      finalStateLabels: exec.finalStates.map((s) => s.label || s.id),
      stepsCount: exec.steps.length,
    };
  });
}
