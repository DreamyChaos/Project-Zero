import {
  ContextFreeGrammar,
  CFGParseTreeNode,
  LL1AnalysisResult,
  LL1ParseTable,
  LL1ParseTableCell,
  LL1Conflict,
  LL1ParseResult,
  LL1ParseStep,
  LL1_END_MARKER,
  ProductionSelectSet,
} from './types';
import {
  computeFirstSets,
  computeFollowSets,
  computeProductionSelectSet,
  detectLeftRecursion,
  detectLeftFactoring,
} from './cfg-first-follow';
import { analyzeCFG } from './cfg-analyzer';
import { validateCFG } from './cfg-validator';
import { tokenizeForCYK } from './cyk-parser';

// ===================================================================
// 1. Build LL(1) Parse Table & Conflict Detection
// ===================================================================

export function analyzeLL1(grammar: ContextFreeGrammar): LL1AnalysisResult {
  const { variables, terminals, productions } = grammar;
  const cfgAnalysis = analyzeCFG(grammar);

  const firstSets = computeFirstSets(grammar);
  const followSets = computeFollowSets(grammar, firstSets);
  const nullableSet = new Set(cfgAnalysis.nullableVariables);

  // 1. Compute SELECT sets for all productions
  const selectSets: ProductionSelectSet[] = productions.map((p) =>
    computeProductionSelectSet(p, firstSets, followSets, nullableSet)
  );

  const selectMap = new Map<string, ProductionSelectSet>();
  for (const s of selectSets) {
    selectMap.set(s.productionId, s);
  }

  // 2. Build parse table M[A, a]
  // Terminals column set = terminals ∪ {'$'}
  const tableTerminals = Array.from(new Set([...terminals, LL1_END_MARKER])).sort((a, b) => {
    if (a === LL1_END_MARKER) return 1;
    if (b === LL1_END_MARKER) return -1;
    return a.localeCompare(b);
  });

  const grid: Record<string, Record<string, LL1ParseTableCell>> = {};
  const conflicts: LL1Conflict[] = [];

  for (const v of variables) {
    grid[v] = {};
    for (const t of tableTerminals) {
      grid[v][t] = {
        variable: v,
        terminal: t,
        productionIds: [],
        productions: [],
        hasConflict: false,
      };
    }
  }

  // Populate table cells
  for (const p of productions) {
    const sSet = selectMap.get(p.id);
    if (!sSet) continue;

    for (const term of sSet.selectSet) {
      if (grid[p.lhs] && grid[p.lhs][term]) {
        const cell = grid[p.lhs][term];
        const updatedIds = [...cell.productionIds, p.id];
        const updatedProds = [...cell.productions, p];

        grid[p.lhs][term] = {
          variable: p.lhs,
          terminal: term,
          productionIds: updatedIds,
          productions: updatedProds,
          hasConflict: updatedIds.length > 1,
        };
      }
    }
  }

  // 3. Conflict Detection
  let totalConflicts = 0;
  for (const v of variables) {
    for (const term of tableTerminals) {
      const cell = grid[v][term];
      if (cell.productionIds.length > 1) {
        totalConflicts++;

        // Determine conflict type
        const p1 = cell.productions[0];
        const p2 = cell.productions[1];
        const s1 = selectMap.get(p1.id)!;
        const s2 = selectMap.get(p2.id)!;

        let conflictType: LL1Conflict['type'] = 'FIRST_FIRST';
        let explanation = '';

        if (s1.isNullableRhs || s2.isNullableRhs) {
          conflictType = 'FIRST_FOLLOW';
          explanation = `FIRST/FOLLOW conflict on variable ${v} for terminal "${term}". Production ${p1.id} (${p1.lhs} → ${s1.rhsNotation}) and ${p2.id} (${p2.lhs} → ${s2.rhsNotation}) both select "${term}". One production is nullable, creating ambiguity with FOLLOW(${v}).`;
        } else {
          conflictType = 'FIRST_FIRST';
          explanation = `FIRST/FIRST conflict on variable ${v} for terminal "${term}". Productions ${p1.id} (${p1.lhs} → ${s1.rhsNotation}) and ${p2.id} (${p2.lhs} → ${s2.rhsNotation}) have intersecting SELECT sets containing "${term}".`;
        }

        conflicts.push({
          type: conflictType,
          variable: v,
          terminal: term,
          productionIds: cell.productionIds,
          productionNotations: cell.productions.map((p) => {
            const rhsNot = p.rhs.length === 0 ? 'ε' : p.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');
            return `${p.lhs} → ${rhsNot}`;
          }),
          selectSetA: s1.selectSet,
          selectSetB: s2.selectSet,
          mathematicalExplanation: explanation,
        });
      }
    }
  }

  const parseTable: LL1ParseTable = {
    variables,
    terminals: tableTerminals,
    grid,
    totalConflicts,
  };

  const isLL1 = totalConflicts === 0;

  // Diagnostics
  const leftRecursion = detectLeftRecursion(grammar);
  const leftFactoringSuggestions = detectLeftFactoring(grammar);
  const diagnostics: string[] = [];

  if (!isLL1) {
    diagnostics.push(`Grammar is NOT LL(1). Found ${totalConflicts} table conflict(s).`);
  } else {
    diagnostics.push('Grammar is strictly LL(1). No parse-table conflicts.');
  }

  if (leftRecursion.isLeftRecursive) {
    diagnostics.push(leftRecursion.explanation);
  }

  if (leftFactoringSuggestions.length > 0) {
    diagnostics.push(`Left factoring suggested for ${leftFactoringSuggestions.length} variable(s).`);
  }

  return {
    isLL1,
    firstSets,
    followSets,
    selectSets,
    parseTable,
    conflicts,
    nullableVariables: cfgAnalysis.nullableVariables,
    leftRecursion,
    leftFactoringSuggestions,
    diagnostics,
  };
}

// ===================================================================
// 2. Predictive Parser
// ===================================================================

export interface LL1ParseOptions {
  readonly maxSteps?: number;
  readonly maxTokens?: number;
}

export function parseLL1(
  grammar: ContextFreeGrammar,
  inputString: string,
  options: LL1ParseOptions = {}
): LL1ParseResult {
  const maxSteps = options.maxSteps ?? 1000;
  const maxTokens = options.maxTokens ?? 200;

  const analysisResult = analyzeLL1(grammar);
  const { startVariable, terminals } = grammar;

  // Validate grammar input first
  const val = validateCFG(grammar);
  if (!val.isValid && val.errors.length > 0) {
    return {
      isAccepted: false,
      inputString,
      tokens: [],
      steps: [],
      appliedProductionIds: [],
      rejectionReason: 'Input grammar has structural validation errors.',
      boundedByLimit: false,
      analysisResult,
    };
  }

  // Tokenize input string
  const rawTokens = tokenizeForCYK(inputString, terminals);
  if (rawTokens === null) {
    return {
      isAccepted: false,
      inputString,
      tokens: [],
      steps: [],
      appliedProductionIds: [],
      rejectionReason: `Input "${inputString}" cannot be tokenized using terminal vocabulary Σ = {${terminals.join(', ')}}.`,
      boundedByLimit: false,
      analysisResult,
    };
  }

  if (rawTokens.length > maxTokens) {
    return {
      isAccepted: false,
      inputString,
      tokens: rawTokens,
      steps: [],
      appliedProductionIds: [],
      rejectionReason: `Token count ${rawTokens.length} exceeds maxTokens limit ${maxTokens}.`,
      boundedByLimit: true,
      analysisResult,
    };
  }

  // Append '$' end-marker to token sequence
  const inputTokens = [...rawTokens, LL1_END_MARKER];

  // Initialize parser stack with [ '$', S ] (top of stack is rightmost array element)
  const stack: string[] = [LL1_END_MARKER, startVariable];
  let inputIdx = 0;

  const steps: LL1ParseStep[] = [];
  const appliedProdIds: string[] = [];

  // Parse tree construction helpers
  interface TreeWorkItem {
    node: CFGParseTreeNode;
    variable: string;
  }
  const treeStack: TreeWorkItem[] = [];

  const rootNode: CFGParseTreeNode = {
    id: 'node_0',
    symbol: { type: 'NON_TERMINAL', value: startVariable },
    children: [],
    depth: 0,
  };
  treeStack.push({ node: rootNode, variable: startVariable });

  let nodeCounter = 0;
  let stepIndex = 0;
  let boundedByLimit = false;

  while (stack.length > 0) {
    if (stepIndex >= maxSteps) {
      boundedByLimit = true;
      return {
        isAccepted: false,
        inputString,
        tokens: rawTokens,
        steps,
        appliedProductionIds: appliedProdIds,
        rejectionReason: `Parser execution exceeded maxSteps limit ${maxSteps}.`,
        boundedByLimit: true,
        analysisResult,
      };
    }

    const top = stack[stack.length - 1]; // Stack top
    const lookahead = inputTokens[inputIdx];
    const remainingInput = inputTokens.slice(inputIdx);

    // Case 1: Stack top is '$' and lookahead is '$' => ACCEPT
    if (top === LL1_END_MARKER && lookahead === LL1_END_MARKER) {
      steps.push({
        stepIndex,
        stack: [...stack],
        remainingInput,
        lookahead,
        action: 'Accept',
        mathematicalExplanation: 'Stack top is $ and lookahead is $. Parsing completed successfully.',
      });
      stack.pop();
      break;
    }

    // Case 2: Stack top is a terminal symbol
    if (terminals.includes(top) || top === LL1_END_MARKER) {
      if (top === lookahead) {
        steps.push({
          stepIndex,
          stack: [...stack],
          remainingInput,
          lookahead,
          action: `Match terminal "${top}"`,
          matchedTerminal: top,
          mathematicalExplanation: `Matched terminal "${top}" with lookahead. Consumed input token.`,
        });
        stack.pop();
        inputIdx++;
        stepIndex++;
        continue;
      } else {
        steps.push({
          stepIndex,
          stack: [...stack],
          remainingInput,
          lookahead,
          action: `Error: Expected "${top}", found "${lookahead}"`,
          mathematicalExplanation: `Terminal mismatch: Stack top expected "${top}" but lookahead is "${lookahead}".`,
        });
        return {
          isAccepted: false,
          inputString,
          tokens: rawTokens,
          steps,
          appliedProductionIds: appliedProdIds,
          rejectionReason: `Terminal mismatch at position ${inputIdx}: Expected "${top}", found "${lookahead}".`,
          boundedByLimit: false,
          analysisResult,
        };
      }
    }

    // Case 3: Stack top is a non-terminal variable A
    const cell = analysisResult.parseTable.grid[top]?.[lookahead];

    if (!cell || cell.productions.length === 0) {
      steps.push({
        stepIndex,
        stack: [...stack],
        remainingInput,
        lookahead,
        action: `Error: No parse table entry M[${top}, ${lookahead}]`,
        mathematicalExplanation: `Syntax Error: Parse table cell M[${top}, ${lookahead}] is empty (no production).`,
      });
      return {
        isAccepted: false,
        inputString,
        tokens: rawTokens,
        steps,
        appliedProductionIds: appliedProdIds,
        rejectionReason: `Syntax Error: No parse table entry for M[${top}, ${lookahead}].`,
        boundedByLimit: false,
        analysisResult,
      };
    }

    // If there is a conflict in the cell, pick the first production but log warning in step
    const selectedProd = cell.productions[0];
    const rhsNotation = selectedProd.rhs.length === 0
      ? 'ε'
      : selectedProd.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');

    const prodNotation = `${selectedProd.lhs} → ${rhsNotation}`;

    steps.push({
      stepIndex,
      stack: [...stack],
      remainingInput,
      lookahead,
      action: `Expand ${prodNotation}`,
      productionId: selectedProd.id,
      productionNotation: prodNotation,
      mathematicalExplanation: cell.hasConflict
        ? `Conflict Cell M[${top}, ${lookahead}]: Selected production ${selectedProd.id} (${prodNotation}) from ${cell.productionIds.length} candidate(s).`
        : `Selected production ${selectedProd.id} (${prodNotation}) from M[${top}, ${lookahead}].`,
    });

    appliedProdIds.push(selectedProd.id);
    stack.pop(); // Remove A

    // Parse tree update
    const currentTreeItem = treeStack.pop();

    // Push RHS onto stack in REVERSE order so leftmost symbol is on top
    // E.g. A → B C => push C then B so B is top
    const rhsChildren: CFGParseTreeNode[] = [];

    if (selectedProd.rhs.length === 0 || (selectedProd.rhs.length === 1 && selectedProd.rhs[0].type === 'EPSILON')) {
      // Epsilon expansion
      const epsNode: CFGParseTreeNode = {
        id: `node_${++nodeCounter}`,
        symbol: { type: 'EPSILON', value: 'ε' },
        children: [],
        depth: (currentTreeItem?.node.depth ?? 0) + 1,
      };
      rhsChildren.push(epsNode);
    } else {
      // Non-epsilon RHS: iterate right-to-left for stack, left-to-right for parse tree
      for (let i = selectedProd.rhs.length - 1; i >= 0; i--) {
        const sym = selectedProd.rhs[i];
        if (sym.type === 'NON_TERMINAL') {
          stack.push(sym.value);
        } else if (sym.type === 'TERMINAL') {
          stack.push(sym.value);
        }
      }

      // Build parse tree child nodes left-to-right
      for (let i = 0; i < selectedProd.rhs.length; i++) {
        const sym = selectedProd.rhs[i];
        const childNode: CFGParseTreeNode = {
          id: `node_${++nodeCounter}`,
          symbol: sym,
          productionId: selectedProd.id,
          children: [],
          depth: (currentTreeItem?.node.depth ?? 0) + 1,
        };
        rhsChildren.push(childNode);

        if (sym.type === 'NON_TERMINAL') {
          treeStack.push({ node: childNode, variable: sym.value });
        }
      }
    }

    if (currentTreeItem) {
      // Attach children to parent node (mutating tree construction buffer before freeze)
      (currentTreeItem.node as unknown as { children: CFGParseTreeNode[] }).children = rhsChildren;
      (currentTreeItem.node as unknown as { productionId: string }).productionId = selectedProd.id;
    }

    stepIndex++;
  }

  const isAccepted = stack.length === 0 && inputIdx === inputTokens.length - 1;

  return {
    isAccepted,
    inputString,
    tokens: rawTokens,
    steps,
    parseTree: rootNode,
    appliedProductionIds: appliedProdIds,
    rejectionReason: isAccepted ? undefined : 'Unconsumed input remaining or non-empty stack.',
    boundedByLimit,
    analysisResult,
  };
}
