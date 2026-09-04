import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGParseTreeNode,
  CYKParseResult,
  CYKTable,
  CYKCell,
  CYKCellWitness,
  CYKProofStep,
  CYKStatistics,
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
  readonly maxMaterializedTrees?: number;
  readonly generateTrace?: boolean;
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
  const startTime = performance.now();
  const maxTokens = options.maxTokens ?? 200;
  const maxCells = options.maxCells ?? 50000;
  const maxMaterializedTrees = options.maxMaterializedTrees ?? 20;
  const generateTrace = options.generateTrace ?? true;
  const { startVariable, productions, terminals } = grammar;

  // Handle empty string explicitly
  if (inputString === '') {
    // Check if S → ε exists (in CNF only the startVariable may produce ε)
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

    const epsilonSteps: CYKProofStep[] = generateTrace
      ? [
          {
            stepIndex: 0,
            type: 'CYK_INITIALIZATION',
            title: 'Empty Input Evaluation (w = ε)',
            description: `Input is the empty string (ε). Under Chomsky Normal Form conventions, ε ∈ L(G) if and only if the start symbol has an explicit production ${startVariable} → ε.`,
            mathematicalNotation: `w = \\varepsilon \\implies (w \\in L(G) \\iff ${startVariable} \\to \\varepsilon \\in P)`,
          },
          hasEpsilonStart
            ? {
                stepIndex: 1,
                type: 'CYK_ACCEPTANCE',
                title: `Accepted: ${startVariable} → ε exists`,
                description: `The start variable ${startVariable} possesses an explicit epsilon production ${startVariable} → ε. Therefore, ε is accepted.`,
                mathematicalNotation: `${startVariable} \\to \\varepsilon \\in P \\implies \\varepsilon \\in L(G)`,
              }
            : {
                stepIndex: 1,
                type: 'CYK_REJECTION',
                title: `Rejected: No ${startVariable} → ε production`,
                description: `The grammar does not contain ${startVariable} → ε. Therefore, ε is rejected.`,
                mathematicalNotation: `${startVariable} \\to \\varepsilon \\notin P \\implies \\varepsilon \\notin L(G)`,
              },
        ]
      : [];

    const stats: CYKStatistics = {
      inputLength: 0,
      totalCells: 0,
      populatedCells: 0,
      productionsChecked: productions.length,
      successfulInsertions: hasEpsilonStart ? 1 : 0,
      executionSteps: epsilonSteps.length,
      parseAlternativesStored: hasEpsilonStart ? 1 : 0,
      executionTimeMs: Math.max(0.01, performance.now() - startTime),
    };

    if (hasEpsilonStart) {
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
        parseTrees: [epsilonTree],
        exactParseTreeCount: 1,
        isExactCountKnown: true,
        isAmbiguous: false,
        isParseTreeCapped: false,
        boundedByLimit: false,
        isEpsilonAcceptance: true,
        proofSteps: epsilonSteps,
        statistics: stats,
      };
    }

    return {
      isAccepted: false,
      inputString,
      tokens: [],
      table: emptyTable,
      exploredCellCount: 0,
      parseTrees: [],
      exactParseTreeCount: 0,
      isExactCountKnown: true,
      isAmbiguous: false,
      isParseTreeCapped: false,
      rejectionExplanation: `ε ∉ L(G). No production ${startVariable} → ε exists in the grammar.`,
      boundedByLimit: false,
      isEpsilonAcceptance: false,
      proofSteps: epsilonSteps,
      statistics: stats,
    };
  }

  // Tokenize input
  const tokens = tokenizeForCYK(inputString, terminals);
  if (tokens === null) {
    const stats: CYKStatistics = {
      inputLength: inputString.length,
      totalCells: 0,
      populatedCells: 0,
      productionsChecked: 0,
      successfulInsertions: 0,
      executionSteps: 0,
      parseAlternativesStored: 0,
      executionTimeMs: performance.now() - startTime,
    };

    return {
      isAccepted: false,
      inputString,
      tokens: [],
      table: { cells: [], tokenCount: 0, tokens: [] },
      exploredCellCount: 0,
      parseTrees: [],
      exactParseTreeCount: 0,
      isExactCountKnown: true,
      isAmbiguous: false,
      isParseTreeCapped: false,
      rejectionExplanation: `Input "${inputString}" cannot be tokenized using terminal set Σ = {${terminals.join(', ')}}.`,
      boundedByLimit: false,
      isEpsilonAcceptance: false,
      proofSteps: [],
      statistics: stats,
    };
  }

  const n = tokens.length;

  if (n > maxTokens) {
    const stats: CYKStatistics = {
      inputLength: n,
      totalCells: (n * (n + 1)) / 2,
      populatedCells: 0,
      productionsChecked: 0,
      successfulInsertions: 0,
      executionSteps: 0,
      parseAlternativesStored: 0,
      executionTimeMs: performance.now() - startTime,
    };

    return {
      isAccepted: false,
      inputString,
      tokens,
      table: { cells: [], tokenCount: n, tokens },
      exploredCellCount: 0,
      parseTrees: [],
      exactParseTreeCount: 0,
      isExactCountKnown: true,
      isAmbiguous: false,
      isParseTreeCapped: false,
      rejectionExplanation: `Token count ${n} exceeds safety limit ${maxTokens}.`,
      boundedByLimit: true,
      isEpsilonAcceptance: false,
      proofSteps: [],
      statistics: stats,
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
  }

  // Initialize CYK table: table[i][j] = set of variables deriving tokens[i..j]
  const tableVars: Set<string>[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Set<string>())
  );
  const tableWitnesses: CYKCellWitness[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => [] as CYKCellWitness[])
  );

  let exploredCellCount = 0;
  let productionsChecked = 0;
  let successfulInsertions = 0;

  const proofSteps: CYKProofStep[] = [];
  let stepIndexCounter = 0;

  if (generateTrace) {
    proofSteps.push({
      stepIndex: stepIndexCounter++,
      type: 'CYK_INITIALIZATION',
      title: 'Initialize CYK Triangular DP Chart',
      description: `Input string "${inputString}" tokenized into ${n} token(s): [${tokens.map((t) => `'${t}'`).join(', ')}]. Constructing an upper-triangular table of ${ (n * (n + 1)) / 2 } sub-spans.`,
      mathematicalNotation: `w = a_0 a_1 \\dots a_{${n - 1}}, \\quad V_{i,j} = \\emptyset \\quad (0 \\le i \\le j < ${n})`,
    });
  }

  // Helper to prevent duplicate witnesses in a cell
  function addWitnessIfUnique(i: number, j: number, w: CYKCellWitness): boolean {
    const list = tableWitnesses[i][j];
    const exists = list.some(
      (ex) =>
        ex.variable === w.variable &&
        ex.productionId === w.productionId &&
        ex.splitPosition === w.splitPosition &&
        ex.leftVariable === w.leftVariable &&
        ex.rightVariable === w.rightVariable
    );
    if (!exists) {
      list.push(w);
      successfulInsertions++;
      return true;
    }
    return false;
  }

  // Base case: length-1 substrings (cells [i, i])
  for (let i = 0; i < n; i++) {
    exploredCellCount++;
    if (exploredCellCount > maxCells) {
      return {
        isAccepted: false,
        inputString,
        tokens,
        table: { cells: [], tokenCount: n, tokens },
        exploredCellCount,
        parseTrees: [],
        exactParseTreeCount: 0,
        isExactCountKnown: false,
        isAmbiguous: false,
        isParseTreeCapped: false,
        rejectionExplanation: `Cell exploration limit ${maxCells} exceeded at position ${i}.`,
        boundedByLimit: true,
        isEpsilonAcceptance: false,
        proofSteps,
      };
    }

    const token = tokens[i];
    const prods = termProductions.get(token);
    const addedThisCell: string[] = [];

    if (prods) {
      productionsChecked += prods.length;
      for (const { lhs, prodId } of prods) {
        tableVars[i][i].add(lhs);
        addedThisCell.push(lhs);
        addWitnessIfUnique(i, i, {
          variable: lhs,
          productionId: prodId,
          productionLhs: lhs,
          productionRhs: [{ type: 'TERMINAL', value: token }],
          splitPosition: i,
        });
      }
    }

    if (generateTrace) {
      const addedUnique = Array.from(new Set(addedThisCell));
      proofSteps.push({
        stepIndex: stepIndexCounter++,
        type: 'CYK_CELL_EVALUATION',
        title: `Base Case: Token ${i} ("${token}")`,
        description:
          addedUnique.length > 0
            ? `Production(s) deriving token '${token}': ${addedUnique.join(', ')}. Populated cell [${i},${i}].`
            : `No unit terminal production A → '${token}' found in grammar for cell [${i},${i}].`,
        mathematicalNotation:
          addedUnique.length > 0
            ? addedUnique.map((v) => `${v} \\to '${token}' \\implies ${v} \\in V_{${i},${i}}`).join('; ')
            : `\\forall A \\in V, A \\to '${token}' \\notin P \\implies V_{${i},${i}} = \\emptyset`,
        spanStart: i,
        spanEnd: i,
        variable: addedUnique[0],
        addedVariables: addedUnique,
      });
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
          parseTrees: [],
          exactParseTreeCount: 0,
          isExactCountKnown: false,
          isAmbiguous: false,
          isParseTreeCapped: false,
          rejectionExplanation: `Cell exploration limit ${maxCells} exceeded at span [${i},${j}].`,
          boundedByLimit: true,
          isEpsilonAcceptance: false,
          proofSteps,
        };
      }

      const substring = tokens.slice(i, j + 1).join('');

      // Try all splits k where i <= k < j
      for (let k = i; k < j; k++) {
        const leftVars = tableVars[i][k];
        const rightVars = tableVars[k + 1][j];

        // Optimization: if either left or right cell is empty, no binary production can succeed
        if (leftVars.size === 0 || rightVars.size === 0) {
          continue;
        }

        const addedAtThisSplit: string[] = [];

        for (const bp of binProductions) {
          productionsChecked++;
          if (leftVars.has(bp.left) && rightVars.has(bp.right)) {
            tableVars[i][j].add(bp.lhs);
            addedAtThisSplit.push(bp.lhs);
            addWitnessIfUnique(i, j, {
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

        if (generateTrace && addedAtThisSplit.length > 0) {
          const addedUnique = Array.from(new Set(addedAtThisSplit));
          proofSteps.push({
            stepIndex: stepIndexCounter++,
            type: 'CYK_SPLIT_EVALUATION',
            title: `Span [${i},${j}] ("${substring}") at Split k=${k}`,
            description: `Split partition: left cell [${i},${k}] has {${Array.from(leftVars).join(',')}}, right cell [${k + 1},${j}] has {${Array.from(rightVars).join(',')}}. Successfully matched binary production(s) adding {${addedUnique.join(', ')}} to cell [${i},${j}].`,
            mathematicalNotation: `(${Array.from(leftVars).join(', ')}) \\times (${Array.from(rightVars).join(', ')}) \\implies \\{${addedUnique.join(', ')}\\} \\subseteq V_{${i},${j}}`,
            spanStart: i,
            spanEnd: j,
            splitPosition: k,
            leftCellSpan: { start: i, end: k },
            rightCellSpan: { start: k + 1, end: j },
            addedVariables: addedUnique,
          });
        }
      }
    }
  }

  // Check acceptance: startVariable ∈ table[0][n-1]
  const isAccepted = tableVars[0][n - 1].has(startVariable);

  // Compute exact parse tree count via dynamic programming over backpointers
  const parseCountMemo = new Map<string, number>();
  const overflowFlag = { overflow: false };
  const exactParseTreeCount = isAccepted
    ? computeExactParseTreeCount(startVariable, 0, n - 1, tableWitnesses, parseCountMemo, overflowFlag)
    : 0;
  const isExactCountKnown = !overflowFlag.overflow;
  const isAmbiguous = isAccepted && exactParseTreeCount > 1;

  // Compute reachability: which cells contribute to valid parse trees from root
  const contributingMatrix = isAccepted
    ? computeContributingCells(startVariable, n, tableWitnesses)
    : Array.from({ length: n }, () => Array(n).fill(false));

  // Build immutable CYK table
  let populatedCellCount = 0;
  const cells: CYKCell[][] = [];
  for (let i = 0; i < n; i++) {
    const row: CYKCell[] = [];
    for (let j = 0; j < n; j++) {
      const vars = Array.from(tableVars[i][j]);
      if (vars.length > 0) populatedCellCount++;
      row.push({
        spanStart: i,
        spanEnd: j,
        substring: tokens.slice(i, j + 1).join(''),
        variables: vars,
        witnesses: tableWitnesses[i][j],
        contributesToParse: contributingMatrix[i][j],
      });
    }
    cells.push(row);
  }

  const immutableTable: CYKTable = {
    cells,
    tokenCount: n,
    tokens,
  };

  // Materialize parse trees up to maxMaterializedTrees
  const nodeIdState = { counter: 0 };
  const materializedTrees = isAccepted
    ? reconstructAllParseTrees(
        startVariable,
        0,
        n - 1,
        tokens,
        tableWitnesses,
        0,
        maxMaterializedTrees,
        nodeIdState
      )
    : [];

  const isParseTreeCapped = isAccepted && exactParseTreeCount > materializedTrees.length;

  if (generateTrace) {
    if (isAccepted) {
      proofSteps.push({
        stepIndex: stepIndexCounter++,
        type: 'CYK_ACCEPTANCE',
        title: `Input ACCEPTED: ${startVariable} ∈ V_{0, ${n - 1}}`,
        description: `Start symbol '${startVariable}' is present in the full-input cell V_{0, ${n - 1}}. Exactly ${
          isExactCountKnown ? exactParseTreeCount : `>${Number.MAX_SAFE_INTEGER}`
        } parse tree(s) exist. Reconstructed ${materializedTrees.length} tree(s) from backpointers.`,
        mathematicalNotation: `${startVariable} \\in V_{0, ${n - 1}} \\implies "${inputString}" \\in L(G)`,
      });

      proofSteps.push({
        stepIndex: stepIndexCounter++,
        type: 'CYK_PARSE_RECONSTRUCTION',
        title: `Parse Tree Generation: ${materializedTrees.length} Reconstructed`,
        description: isAmbiguous
          ? `Ambiguity detected! Input has ${exactParseTreeCount} distinct parse trees. Showing ${materializedTrees.length} materialized derivation tree(s).`
          : `Unambiguous derivation. Exactly 1 canonical parse tree constructed from cell backpointers.`,
        mathematicalNotation: isAmbiguous
          ? `|\\mathcal{T}(w)| = ${exactParseTreeCount} > 1 \\implies \\text{Grammar is Ambiguous}`
          : `|\\mathcal{T}(w)| = 1 \\implies \\text{Unique Parse}`,
      });
    } else {
      const rootVars = Array.from(tableVars[0][n - 1]);
      proofSteps.push({
        stepIndex: stepIndexCounter++,
        type: 'CYK_REJECTION',
        title: `Input REJECTED: ${startVariable} ∉ V_{0, ${n - 1}}`,
        description: `Start symbol '${startVariable}' does not appear in root cell V_{0, ${n - 1}} (contains: {${rootVars.join(', ') || '∅'}}). Therefore, "${inputString}" cannot be derived by the grammar.`,
        mathematicalNotation: `${startVariable} \\notin V_{0, ${n - 1}} \\implies "${inputString}" \\notin L(G)`,
      });
    }
  }

  const executionTimeMs = Math.max(0.01, performance.now() - startTime);

  const stats: CYKStatistics = {
    inputLength: n,
    totalCells: (n * (n + 1)) / 2,
    populatedCells: populatedCellCount,
    productionsChecked,
    successfulInsertions,
    executionSteps: proofSteps.length,
    parseAlternativesStored: materializedTrees.length,
    executionTimeMs,
  };

  if (!isAccepted) {
    return {
      isAccepted: false,
      inputString,
      tokens,
      table: immutableTable,
      exploredCellCount,
      parseTrees: [],
      exactParseTreeCount: 0,
      isExactCountKnown: true,
      isAmbiguous: false,
      isParseTreeCapped: false,
      rejectionExplanation: `${startVariable} ∉ table[0,${n - 1}]. Variables in table[0,${n - 1}]: {${Array.from(tableVars[0][n - 1]).join(', ') || '∅'}}.`,
      boundedByLimit: false,
      isEpsilonAcceptance: false,
      proofSteps,
      statistics: stats,
    };
  }

  return {
    isAccepted: true,
    inputString,
    tokens,
    table: immutableTable,
    exploredCellCount,
    parseTree: materializedTrees[0],
    parseTrees: materializedTrees,
    exactParseTreeCount,
    isExactCountKnown,
    isAmbiguous,
    isParseTreeCapped,
    boundedByLimit: false,
    isEpsilonAcceptance: false,
    proofSteps,
    statistics: stats,
  };
}

// ===================================================================
// Parse Tree Reconstruction & Ambiguity Enumeration
// ===================================================================

/**
 * Compute the exact number of parse trees for variable in cell [i, j].
 * Uses dynamic programming with memoization over the witness graph.
 * Caps at Number.MAX_SAFE_INTEGER if numeric overflow occurs.
 */
function computeExactParseTreeCount(
  variable: string,
  i: number,
  j: number,
  witnesses: CYKCellWitness[][][],
  memo: Map<string, number>,
  overflowFlag: { overflow: boolean }
): number {
  const key = `${variable}:${i},${j}`;
  if (memo.has(key)) return memo.get(key)!;

  const cellWitnesses = witnesses[i][j].filter((w) => w.variable === variable);
  if (cellWitnesses.length === 0) {
    memo.set(key, 0);
    return 0;
  }

  if (i === j) {
    // Base case: count of terminal productions A → a_i
    const count = cellWitnesses.length;
    memo.set(key, count);
    return count;
  }

  let total = 0;
  for (const w of cellWitnesses) {
    if (!w.leftVariable || !w.rightVariable) continue;

    const leftCount = computeExactParseTreeCount(
      w.leftVariable,
      i,
      w.splitPosition,
      witnesses,
      memo,
      overflowFlag
    );

    const rightCount = computeExactParseTreeCount(
      w.rightVariable,
      w.splitPosition + 1,
      j,
      witnesses,
      memo,
      overflowFlag
    );

    const product = leftCount * rightCount;
    if (
      !Number.isSafeInteger(product) ||
      !Number.isSafeInteger(total + product)
    ) {
      overflowFlag.overflow = true;
      total = Number.MAX_SAFE_INTEGER;
      break;
    }
    total += product;
  }

  memo.set(key, total);
  return total;
}

/**
 * Reconstruct up to maxTrees distinct parse trees from CYK backpointers.
 */
function reconstructAllParseTrees(
  variable: string,
  i: number,
  j: number,
  tokens: string[],
  witnesses: CYKCellWitness[][][],
  depth: number,
  maxTrees: number,
  nodeIdState: { counter: number }
): CFGParseTreeNode[] {
  if (i === j) {
    // Base case: terminal productions A → a_i
    const cellWitnesses = witnesses[i][j].filter((w) => w.variable === variable);
    if (cellWitnesses.length === 0) return [];

    const trees: CFGParseTreeNode[] = [];
    for (const w of cellWitnesses) {
      if (trees.length >= maxTrees) break;
      trees.push({
        id: `cyk_node_${nodeIdState.counter++}`,
        symbol: { type: 'NON_TERMINAL', value: variable },
        productionId: w.productionId,
        children: [
          {
            id: `cyk_node_${nodeIdState.counter++}`,
            symbol: { type: 'TERMINAL', value: tokens[i] },
            children: [],
            depth: depth + 1,
          },
        ],
        depth,
      });
    }
    return trees;
  }

  const cellWitnesses = witnesses[i][j].filter(
    (w) => w.variable === variable && w.leftVariable && w.rightVariable
  );
  if (cellWitnesses.length === 0) return [];

  const trees: CFGParseTreeNode[] = [];

  for (const w of cellWitnesses) {
    if (trees.length >= maxTrees) break;
    const remaining = maxTrees - trees.length;

    const leftTrees = reconstructAllParseTrees(
      w.leftVariable!,
      i,
      w.splitPosition,
      tokens,
      witnesses,
      depth + 1,
      remaining,
      nodeIdState
    );

    for (const left of leftTrees) {
      if (trees.length >= maxTrees) break;
      const innerRemaining = maxTrees - trees.length;

      const rightTrees = reconstructAllParseTrees(
        w.rightVariable!,
        w.splitPosition + 1,
        j,
        tokens,
        witnesses,
        depth + 1,
        innerRemaining,
        nodeIdState
      );

      for (const right of rightTrees) {
        if (trees.length >= maxTrees) break;
        trees.push({
          id: `cyk_node_${nodeIdState.counter++}`,
          symbol: { type: 'NON_TERMINAL', value: variable },
          productionId: w.productionId,
          children: [left, right],
          depth,
        });
      }
    }
  }

  return trees;
}

/**
 * Traverse the backpointer DAG from startVariable down to identify
 * all cells [i, j] that participate in at least one valid parse tree.
 */
function computeContributingCells(
  startVar: string,
  n: number,
  witnesses: CYKCellWitness[][][]
): boolean[][] {
  const contributing = Array.from({ length: n }, () => Array(n).fill(false));
  const visited = new Set<string>();

  function dfs(v: string, i: number, j: number) {
    const key = `${v}:${i},${j}`;
    if (visited.has(key)) return;
    visited.add(key);

    contributing[i][j] = true;
    if (i === j) return;

    for (const w of witnesses[i][j]) {
      if (w.variable === v && w.leftVariable && w.rightVariable) {
        dfs(w.leftVariable, i, w.splitPosition);
        dfs(w.rightVariable, w.splitPosition + 1, j);
      }
    }
  }

  dfs(startVar, 0, n - 1);
  return contributing;
}
