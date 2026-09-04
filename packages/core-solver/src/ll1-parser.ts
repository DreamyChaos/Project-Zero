import {
  ContextFreeGrammar,
  CFGParseTreeNode,
  LL1AnalysisResult,
  LL1ParseTable,
  LL1ParseTableCell,
  LL1Conflict,
  LL1ConflictEvidence,
  LL1ParseResult,
  LL1ParseStep,
  LL1_END_MARKER,
  ProductionSelectSet,
  LeftFactoringSuggestion,
} from './types';
import {
  computeFirstSets,
  computeFollowSets,
  computeFirstOfSequence,
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

        // Determine why each competing production entered this cell
        const competingEvidence: LL1ConflictEvidence[] = cell.productions.map((p) => {
          const rhsFirst = computeFirstOfSequence(p.rhs, firstSets, nullableSet);
          const inFirst = rhsFirst.includes(term);
          const reason: 'FIRST_SET' | 'FOLLOW_SET' = inFirst ? 'FIRST_SET' : 'FOLLOW_SET';
          const rhsNot = p.rhs.length === 0
            ? 'ε'
            : p.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');
          const prodNotation = `${p.lhs} → ${rhsNot}`;
          const explanation = inFirst
            ? `Production ${p.id} (${prodNotation}) selected lookahead "${term}" via FIRST(${rhsNot}).`
            : `Production ${p.id} (${prodNotation}) is nullable (${rhsNot} ⇒* ε), selected lookahead "${term}" via FOLLOW(${p.lhs}).`;

          return {
            productionId: p.id,
            productionNotation: prodNotation,
            reason,
            triggerSymbol: term,
            explanation,
          };
        });

        const hasFirstReason = competingEvidence.some((e) => e.reason === 'FIRST_SET');
        const hasFollowReason = competingEvidence.some((e) => e.reason === 'FOLLOW_SET');

        let conflictType: LL1Conflict['type'] = 'OTHER';
        if (hasFirstReason && !hasFollowReason) {
          conflictType = 'FIRST_FIRST';
        } else if (hasFollowReason) {
          conflictType = 'FIRST_FOLLOW';
        }

        const p1 = cell.productions[0];
        const p2 = cell.productions[1];
        const s1 = selectMap.get(p1.id)!;
        const s2 = selectMap.get(p2.id)!;

        const summaryExplanation = conflictType === 'FIRST_FIRST'
          ? `FIRST/FIRST conflict on variable ${v} for lookahead "${term}": Multiple productions (${cell.productionIds.join(', ')}) simultaneously generate terminals starting with "${term}".`
          : conflictType === 'FIRST_FOLLOW'
          ? `FIRST/FOLLOW conflict on variable ${v} for lookahead "${term}": One or more productions can derive ε and select "${term}" via FOLLOW(${v}), colliding with another production for "${term}".`
          : `Parse table conflict on variable ${v} for lookahead "${term}" involving ${cell.productionIds.length} productions.`;

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
          competingProductionEvidence: competingEvidence,
          mathematicalExplanation: summaryExplanation,
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
  const leftFactoring = detectLeftFactoring(grammar);
  const leftFactoringSuggestions: LeftFactoringSuggestion[] = leftFactoring.groups.map((g) => ({
    variable: g.variable,
    commonPrefix: g.commonPrefix,
    commonPrefixNotation: g.commonPrefixNotation,
    productionIds: g.matchedProductions.map((p) => p.id),
    explanation: `Variable ${g.variable} has productions with common prefix "${g.commonPrefixNotation}". Left factoring required to achieve LL(1).`,
  }));
  const diagnostics: string[] = [];

  if (!isLL1) {
    diagnostics.push(`Grammar is NOT LL(1). Found ${totalConflicts} table conflict(s).`);
  } else {
    diagnostics.push('Grammar is strictly LL(1). No parse-table conflicts.');
  }

  if (leftRecursion.isLeftRecursive) {
    diagnostics.push(leftRecursion.explanation);
  }

  if (leftFactoring.requiresFactoring) {
    diagnostics.push(`Left factoring suggested for ${leftFactoring.factorableVariables.length} variable(s).`);
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
    leftFactoring,
    diagnostics,
  };
}


// ===================================================================
// 2. Predictive Parser
// ===================================================================

export interface LL1ParseOptions {
  readonly maxSteps?: number;
  readonly maxTokens?: number;
  readonly allowConflictExploration?: boolean;
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
      stats: { stepCount: 0, matchCount: 0, expansionCount: 0, epsilonCount: 0 },
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
      stats: { stepCount: 0, matchCount: 0, expansionCount: 0, epsilonCount: 0 },
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
      stats: { stepCount: 0, matchCount: 0, expansionCount: 0, epsilonCount: 0 },
    };
  }

  // Append '$' end-marker to token sequence
  const inputTokens = [...rawTokens, LL1_END_MARKER];

  // Initialize parser stack with [ '$', S ] (top of stack is rightmost array element)
  const stack: string[] = [LL1_END_MARKER, startVariable];
  let inputIdx = 0;

  const steps: LL1ParseStep[] = [];
  const appliedProdIds: string[] = [];

  let matchCount = 0;
  let expansionCount = 0;
  let epsilonCount = 0;

  // Helper to compute current leftmost sentential form
  const getSententialForm = (): { sententialForm: string[]; formattedSententialForm: string } => {
    const matched = rawTokens.slice(0, inputIdx);
    const stackSymbols = stack.slice(1).reverse();
    const sf = [...matched, ...stackSymbols];
    return {
      sententialForm: sf,
      formattedSententialForm: sf.length > 0 ? sf.join(' ') : 'ε',
    };
  };

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
        stats: { stepCount: steps.length, matchCount, expansionCount, epsilonCount },
      };
    }

    const top = stack[stack.length - 1]; // Stack top
    const lookahead = inputTokens[inputIdx];
    const remainingInput = inputTokens.slice(inputIdx);

    // Case 1: Stack top is '$' and lookahead is '$' => ACCEPT
    if (top === LL1_END_MARKER && lookahead === LL1_END_MARKER) {
      const { sententialForm, formattedSententialForm } = getSententialForm();
      steps.push({
        stepIndex,
        stack: [...stack],
        remainingInput,
        lookahead,
        action: 'Accept',
        sententialForm,
        formattedSententialForm,
        mathematicalExplanation: 'Stack top is $ and lookahead is $. All input tokens consumed. Parsing completed successfully.',
      });
      stack.pop();
      break;
    }

    // Case 2: Stack top is a terminal symbol
    if (terminals.includes(top) || top === LL1_END_MARKER) {
      if (top === lookahead) {
        const { sententialForm, formattedSententialForm } = getSententialForm();
        steps.push({
          stepIndex,
          stack: [...stack],
          remainingInput,
          lookahead,
          action: `Match terminal "${top}"`,
          matchedTerminal: top,
          sententialForm,
          formattedSententialForm,
          mathematicalExplanation: `Matched terminal "${top}" with lookahead. Consumed input token.`,
        });
        stack.pop();
        inputIdx++;
        stepIndex++;
        matchCount++;
        continue;
      } else {
        const { sententialForm, formattedSententialForm } = getSententialForm();
        steps.push({
          stepIndex,
          stack: [...stack],
          remainingInput,
          lookahead,
          action: `Error: Expected "${top}", found "${lookahead}"`,
          sententialForm,
          formattedSententialForm,
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
          stats: { stepCount: steps.length, matchCount, expansionCount, epsilonCount },
        };
      }
    }

    // Case 3: Stack top is a non-terminal variable A
    const cell = analysisResult.parseTable.grid[top]?.[lookahead];

    if (!cell || cell.productions.length === 0) {
      const { sententialForm, formattedSententialForm } = getSententialForm();
      steps.push({
        stepIndex,
        stack: [...stack],
        remainingInput,
        lookahead,
        action: `Error: No parse table entry M[${top}, ${lookahead}]`,
        sententialForm,
        formattedSententialForm,
        mathematicalExplanation: `Syntax Error: Parse table cell M[${top}, ${lookahead}] is empty (no valid production for lookahead).`,
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
        stats: { stepCount: steps.length, matchCount, expansionCount, epsilonCount },
      };
    }

    // Check for LL(1) conflict
    if (cell.hasConflict && !options.allowConflictExploration) {
      const { sententialForm, formattedSententialForm } = getSententialForm();
      steps.push({
        stepIndex,
        stack: [...stack],
        remainingInput,
        lookahead,
        action: `LL(1) Conflict: M[${top}, ${lookahead}] has ${cell.productionIds.length} candidate productions`,
        sententialForm,
        formattedSententialForm,
        mathematicalExplanation: `Non-deterministic choice: Table cell M[${top}, ${lookahead}] contains multiple productions (${cell.productionIds.join(', ')}). A deterministic LL(1) predictive parser cannot choose a production without ambiguity.`,
      });
      return {
        isAccepted: false,
        inputString,
        tokens: rawTokens,
        steps,
        appliedProductionIds: appliedProdIds,
        rejectionReason: `LL(1) Conflict Error: Cell M[${top}, ${lookahead}] contains multiple competing productions (${cell.productionIds.join(', ')}). Grammar is not LL(1).`,
        boundedByLimit: false,
        analysisResult,
        stats: { stepCount: steps.length, matchCount, expansionCount, epsilonCount },
      };
    }

    const selectedProd = cell.productions[0];
    const rhsNotation = selectedProd.rhs.length === 0
      ? 'ε'
      : selectedProd.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');

    const prodNotation = `${selectedProd.lhs} → ${rhsNotation}`;

    const { sententialForm, formattedSententialForm } = getSententialForm();
    steps.push({
      stepIndex,
      stack: [...stack],
      remainingInput,
      lookahead,
      action: `Expand ${prodNotation}`,
      productionId: selectedProd.id,
      productionNotation: prodNotation,
      sententialForm,
      formattedSententialForm,
      mathematicalExplanation: cell.hasConflict
        ? `Conflict Cell M[${top}, ${lookahead}]: Selected production ${selectedProd.id} (${prodNotation}) from ${cell.productionIds.length} candidate(s).`
        : `Selected production ${selectedProd.id} (${prodNotation}) from M[${top}, ${lookahead}].`,
    });

    appliedProdIds.push(selectedProd.id);
    expansionCount++;
    stack.pop(); // Remove A

    // Parse tree update
    const currentTreeItem = treeStack.pop();
    const rhsChildren: CFGParseTreeNode[] = [];

    const isEps = selectedProd.rhs.length === 0 || (selectedProd.rhs.length === 1 && selectedProd.rhs[0].type === 'EPSILON');
    if (isEps) {
      epsilonCount++;
      const epsNode: CFGParseTreeNode = {
        id: `node_${++nodeCounter}`,
        symbol: { type: 'EPSILON', value: 'ε' },
        children: [],
        depth: (currentTreeItem?.node.depth ?? 0) + 1,
      };
      rhsChildren.push(epsNode);
    } else {
      // Non-epsilon RHS: iterate right-to-left for stack
      for (let i = selectedProd.rhs.length - 1; i >= 0; i--) {
        const sym = selectedProd.rhs[i];
        if (sym.type === 'NON_TERMINAL' || sym.type === 'TERMINAL') {
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
      }

      // Nonterminal children must be pushed onto treeStack in REVERSE order
      // so that the leftmost nonterminal is on top of treeStack, strictly matching stack!
      for (let i = rhsChildren.length - 1; i >= 0; i--) {
        const child = rhsChildren[i];
        if (child.symbol.type === 'NON_TERMINAL') {
          treeStack.push({ node: child, variable: child.symbol.value });
        }
      }
    }

    if (currentTreeItem) {
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
    parseTree: isAccepted ? rootNode : undefined,
    appliedProductionIds: appliedProdIds,
    rejectionReason: isAccepted ? undefined : 'Unconsumed input remaining or non-empty stack.',
    boundedByLimit,
    analysisResult,
    stats: {
      stepCount: steps.length,
      matchCount,
      expansionCount,
      epsilonCount,
    },
  };
}
