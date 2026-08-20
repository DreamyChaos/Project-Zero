import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGParseTreeNode,
  CYKParseResult,
  CYKTable,
  CYKCell,
  CYKCellWitness,
} from './types';

// ===================================================================
// Tokenizer: split input according to grammar's terminal vocabulary
// ===================================================================

/**
 * Tokenize input string according to grammar terminal set.
 * Uses greedy longest-match from left to right.
 * Returns null if tokenization fails.
 */
export function tokenizeForCYK(
  input: string,
  terminals: ReadonlyArray<string>
): string[] | null {
  if (input.length === 0) return [];

  // Sort terminals by length descending for longest-match-first
  const sorted = [...terminals].sort((a, b) => b.length - a.length);

  const tokens: string[] = [];
  let pos = 0;

  while (pos < input.length) {
    let matched = false;
    for (const term of sorted) {
      if (term.length === 0) continue;
      if (input.startsWith(term, pos)) {
        tokens.push(term);
        pos += term.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      return null; // Untokenizable character/sequence
    }
  }

  return tokens;
}

// ===================================================================
// CYK Algorithm
// ===================================================================

export interface CYKOptions {
  readonly maxTokens?: number;
  readonly maxCells?: number;
}

/**
 * CYK dynamic programming parser for grammars in Chomsky Normal Form.
 *
 * Standard recurrence:
 *   Base case: For length 1, if A → a exists, then A ∈ table[i,i].
 *   Inductive: For length > 1, A ∈ table[i,j] if ∃ A → BC, ∃ split k
 *              s.t. B ∈ table[i,k] and C ∈ table[k+1,j].
 *
 * Input grammar MUST be in CNF. Use toChomskyNormalForm() first.
 */
export function cykParse(
  grammar: ContextFreeGrammar,
  inputString: string,
  options: CYKOptions = {}
): CYKParseResult {
  const maxTokens = options.maxTokens ?? 200;
  const maxCells = options.maxCells ?? 50000;
  const { startVariable, productions, terminals } = grammar;

  // Handle empty string explicitly
  if (inputString === '') {
    // Check if S → ε exists
    const hasEpsilonStart = productions.some(
      (p) =>
        p.lhs === startVariable &&
        p.rhs.length === 1 &&
        p.rhs[0].type === 'EPSILON'
    );

    const emptyTable: CYKTable = {
      cells: [],
      tokenCount: 0,
      tokens: [],
    };

    if (hasEpsilonStart) {
      // Build epsilon parse tree
      const epsilonTree: CFGParseTreeNode = {
        id: 'cyk_root',
        symbol: { type: 'NON_TERMINAL', value: startVariable },
        productionId: productions.find(
          (p) =>
            p.lhs === startVariable &&
            p.rhs.length === 1 &&
            p.rhs[0].type === 'EPSILON'
        )?.id,
        children: [
          {
            id: 'cyk_epsilon',
            symbol: { type: 'EPSILON', value: 'ε' },
            children: [],
            depth: 1,
          },
        ],
        depth: 0,
      };

      return {
        isAccepted: true,
        inputString,
        tokens: [],
        table: emptyTable,
        exploredCellCount: 0,
        parseTree: epsilonTree,
        boundedByLimit: false,
        isEpsilonAcceptance: true,
      };
    }

    return {
      isAccepted: false,
      inputString,
      tokens: [],
      table: emptyTable,
      exploredCellCount: 0,
      rejectionExplanation: `ε ∉ L(G). No production ${startVariable} → ε exists.`,
      boundedByLimit: false,
      isEpsilonAcceptance: false,
    };
  }

  // Tokenize input
  const tokens = tokenizeForCYK(inputString, terminals);
  if (tokens === null) {
    return {
      isAccepted: false,
      inputString,
      tokens: [],
      table: { cells: [], tokenCount: 0, tokens: [] },
      exploredCellCount: 0,
      rejectionExplanation: `Input "${inputString}" cannot be tokenized using terminal set Σ = {${terminals.join(', ')}}.`,
      boundedByLimit: false,
      isEpsilonAcceptance: false,
    };
  }

  const n = tokens.length;

  if (n > maxTokens) {
    return {
      isAccepted: false,
      inputString,
      tokens,
      table: { cells: [], tokenCount: n, tokens },
      exploredCellCount: 0,
      rejectionExplanation: `Token count ${n} exceeds limit ${maxTokens}.`,
      boundedByLimit: true,
      isEpsilonAcceptance: false,
    };
  }

  // Pre-index productions by type for fast lookup
  // Terminal productions: A → a  (rhs.length === 1, rhs[0] is TERMINAL)
  const termProductions = new Map<string, Array<{ lhs: string; prodId: string }>>();
  // Binary productions: A → BC  (rhs.length === 2, both NON_TERMINAL)
  const binProductions: Array<{
    lhs: string;
    left: string;
    right: string;
    prodId: string;
    rhs: ReadonlyArray<GrammarSymbol>;
  }> = [];

  for (const p of productions) {
    if (p.rhs.length === 1 && p.rhs[0].type === 'TERMINAL') {
      const termVal = p.rhs[0].value;
      if (!termProductions.has(termVal)) {
        termProductions.set(termVal, []);
      }
      termProductions.get(termVal)!.push({ lhs: p.lhs, prodId: p.id });
    } else if (
      p.rhs.length === 2 &&
      p.rhs[0].type === 'NON_TERMINAL' &&
      p.rhs[1].type === 'NON_TERMINAL'
    ) {
      binProductions.push({
        lhs: p.lhs,
        left: p.rhs[0].value,
        right: p.rhs[1].value,
        prodId: p.id,
        rhs: p.rhs,
      });
    }
    // Epsilon productions are handled by the empty-string case above
  }

  // Initialize CYK table: table[i][j] = set of variables deriving tokens[i..j]
  // Using a mutable structure during computation, freeze at the end
  const tableVars: Set<string>[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Set<string>())
  );
  const tableWitnesses: CYKCellWitness[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => [] as CYKCellWitness[])
  );

  let exploredCellCount = 0;

  // Base case: length-1 substrings
  for (let i = 0; i < n; i++) {
    exploredCellCount++;
    if (exploredCellCount > maxCells) {
      return {
        isAccepted: false,
        inputString,
        tokens,
        table: { cells: [], tokenCount: n, tokens },
        exploredCellCount,
        rejectionExplanation: `Cell exploration limit ${maxCells} exceeded.`,
        boundedByLimit: true,
        isEpsilonAcceptance: false,
      };
    }

    const token = tokens[i];
    const prods = termProductions.get(token);
    if (prods) {
      for (const { lhs, prodId } of prods) {
        tableVars[i][i].add(lhs);
        tableWitnesses[i][i].push({
          variable: lhs,
          productionId: prodId,
          productionLhs: lhs,
          productionRhs: [{ type: 'TERMINAL', value: token }],
          splitPosition: i,
        });
      }
    }
  }

  // Inductive step: length 2..n
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      exploredCellCount++;

      if (exploredCellCount > maxCells) {
        return {
          isAccepted: false,
          inputString,
          tokens,
          table: { cells: [], tokenCount: n, tokens },
          exploredCellCount,
          rejectionExplanation: `Cell exploration limit ${maxCells} exceeded at span [${i},${j}].`,
          boundedByLimit: true,
          isEpsilonAcceptance: false,
        };
      }

      // Try all splits k where i <= k < j
      for (let k = i; k < j; k++) {
        for (const bp of binProductions) {
          if (tableVars[i][k].has(bp.left) && tableVars[k + 1][j].has(bp.right)) {
            tableVars[i][j].add(bp.lhs);
            tableWitnesses[i][j].push({
              variable: bp.lhs,
              productionId: bp.prodId,
              productionLhs: bp.lhs,
              productionRhs: bp.rhs,
              splitPosition: k,
              leftVariable: bp.left,
              rightVariable: bp.right,
            });
          }
        }
      }
    }
  }

  // Build immutable CYK table
  const cells: CYKCell[][] = [];
  for (let i = 0; i < n; i++) {
    const row: CYKCell[] = [];
    for (let j = 0; j < n; j++) {
      row.push({
        spanStart: i,
        spanEnd: j,
        substring: tokens.slice(i, j + 1).join(''),
        variables: Array.from(tableVars[i][j]),
        witnesses: tableWitnesses[i][j],
      });
    }
    cells.push(row);
  }

  const immutableTable: CYKTable = {
    cells,
    tokenCount: n,
    tokens,
  };

  // Check acceptance: S ∈ table[0][n-1]
  const isAccepted = tableVars[0][n - 1].has(startVariable);

  if (!isAccepted) {
    return {
      isAccepted: false,
      inputString,
      tokens,
      table: immutableTable,
      exploredCellCount,
      rejectionExplanation: `${startVariable} ∉ table[0,${n - 1}]. Variables in table[0,${n - 1}]: {${Array.from(tableVars[0][n - 1]).join(', ') || '∅'}}.`,
      boundedByLimit: false,
      isEpsilonAcceptance: false,
    };
  }

  // Reconstruct parse tree from witnesses
  const parseTree = reconstructParseTree(
    startVariable,
    0,
    n - 1,
    tokens,
    tableWitnesses,
    tableVars,
    0
  );

  return {
    isAccepted: true,
    inputString,
    tokens,
    table: immutableTable,
    exploredCellCount,
    parseTree: parseTree ?? undefined,
    boundedByLimit: false,
    isEpsilonAcceptance: false,
  };
}

// ===================================================================
// Parse Tree Reconstruction
// ===================================================================

let _nodeIdCounter = 0;

function reconstructParseTree(
  variable: string,
  i: number,
  j: number,
  tokens: string[],
  witnesses: CYKCellWitness[][][],
  tableVars: Set<string>[][],
  depth: number,
): CFGParseTreeNode | null {
  const nodeId = `cyk_node_${_nodeIdCounter++}`;

  if (i === j) {
    // Base case: terminal production A → a
    const witness = witnesses[i][j].find((w) => w.variable === variable);
    if (!witness) return null;

    return {
      id: nodeId,
      symbol: { type: 'NON_TERMINAL', value: variable },
      productionId: witness.productionId,
      children: [
        {
          id: `cyk_node_${_nodeIdCounter++}`,
          symbol: { type: 'TERMINAL', value: tokens[i] },
          children: [],
          depth: depth + 1,
        },
      ],
      depth,
    };
  }

  // Find a witness for this variable in cell [i,j]
  const witness = witnesses[i][j].find((w) => w.variable === variable);
  if (!witness || !witness.leftVariable || !witness.rightVariable) return null;

  const leftChild = reconstructParseTree(
    witness.leftVariable,
    i,
    witness.splitPosition,
    tokens,
    witnesses,
    tableVars,
    depth + 1,
  );

  const rightChild = reconstructParseTree(
    witness.rightVariable,
    witness.splitPosition + 1,
    j,
    tokens,
    witnesses,
    tableVars,
    depth + 1,
  );

  if (!leftChild || !rightChild) return null;

  return {
    id: nodeId,
    symbol: { type: 'NON_TERMINAL', value: variable },
    productionId: witness.productionId,
    children: [leftChild, rightChild],
    depth,
  };
}
