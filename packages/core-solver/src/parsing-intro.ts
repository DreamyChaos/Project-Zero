import type {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGParseTreeNode,
  TopDownParseStep,
  TopDownParseResult,
  BottomUpParseStep,
  BottomUpParseResult,
  BottomUpActionChoice,
  ParsingApproachComparison,
} from './types';
import { tokenizeForCYK } from './cyk-parser';

// ===================================================================
// Helper Utilities
// ===================================================================

function formatSymbol(sym: GrammarSymbol): string {
  return sym.type === 'EPSILON' ? 'ε' : sym.value;
}

function formatSymbols(symbols: ReadonlyArray<GrammarSymbol>): string {
  if (symbols.length === 0) return 'ε';
  return symbols.map(formatSymbol).join(' ');
}

function areSymbolsEqual(a: GrammarSymbol, b: GrammarSymbol): boolean {
  return a.type === b.type && a.value === b.value;
}

function isEpsilon(sym: GrammarSymbol): boolean {
  return sym.type === 'EPSILON' || sym.value === 'ε' || sym.value === 'λ';
}

/**
 * Reconstruct text yield from a parse tree.
 */
export function getTreeYield(node: CFGParseTreeNode): string {
  if (node.symbol.type === 'TERMINAL') {
    return node.symbol.value;
  }
  if (node.symbol.type === 'EPSILON') {
    return '';
  }
  if (!node.children || node.children.length === 0) {
    return '';
  }
  return node.children.map(getTreeYield).join('');
}

// ===================================================================
// Top-Down Parsing Engine
// ===================================================================

export interface TopDownParseOptions {
  maxDepth?: number;
  maxStates?: number;
}

/**
 * Top-Down Parser:
 * Starts at the grammar's startVariable and derives the input string
 * by expanding nonterminals from left to right.
 *
 * Distinguishes ACCEPT, REJECT, and SEARCH_LIMIT_REACHED.
 */
export function parseTopDown(
  grammar: ContextFreeGrammar,
  inputString: string,
  options: TopDownParseOptions = {}
): TopDownParseResult {
  const maxDepth = options.maxDepth !== undefined ? options.maxDepth : 25;
  const maxStates = options.maxStates !== undefined ? options.maxStates : 1200;

  const { startVariable, terminals, productions } = grammar;

  // Validate start variable
  if (!startVariable || !grammar.variables.includes(startVariable)) {
    return {
      status: 'REJECT',
      isAccepted: false,
      isSearchLimitReached: false,
      inputString,
      tokens: [],
      steps: [],
      exploredStateCount: 0,
      explanation: `Invalid grammar start variable '${startVariable}'.`,
      startVariable: startVariable || 'S',
    };
  }

  // Tokenize input string against grammar terminals
  const tokens = tokenizeForCYK(inputString, terminals);
  if (tokens === null) {
    return {
      status: 'REJECT',
      isAccepted: false,
      isSearchLimitReached: false,
      inputString,
      tokens: [],
      steps: [],
      exploredStateCount: 0,
      explanation: `Input "${inputString}" cannot be tokenized using terminal set Σ = {${terminals.join(', ')}}.`,
      startVariable,
    };
  }

  // Handle empty input string
  if (tokens.length === 0) {
    const epsProd = productions.find(
      (p) => p.lhs === startVariable && (p.rhs.length === 0 || (p.rhs.length === 1 && isEpsilon(p.rhs[0])))
    );

    if (epsProd) {
      const tree: CFGParseTreeNode = {
        id: 'td_root_eps',
        symbol: { type: 'NON_TERMINAL', value: startVariable },
        productionId: epsProd.id,
        depth: 0,
        children: [
          {
            id: 'td_leaf_eps',
            symbol: { type: 'EPSILON', value: 'ε' },
            depth: 1,
            children: [],
          },
        ],
      };

      const step0: TopDownParseStep = {
        stepIndex: 0,
        sententialForm: [{ type: 'NON_TERMINAL', value: startVariable }],
        formattedSententialForm: startVariable,
        matchedPrefix: '',
        remainingInput: 'ε',
        explanation: `Initial sentential form begins with start symbol '${startVariable}'.`,
      };

      const step1: TopDownParseStep = {
        stepIndex: 1,
        sententialForm: [{ type: 'EPSILON', value: 'ε' }],
        formattedSententialForm: 'ε',
        expandedSymbol: startVariable,
        expandedIndex: 0,
        selectedProduction: epsProd,
        matchedPrefix: '',
        remainingInput: '',
        explanation: `Expanded '${startVariable}' using rule ${startVariable} → ε to match empty input string.`,
      };

      return {
        status: 'ACCEPT',
        isAccepted: true,
        isSearchLimitReached: false,
        inputString,
        tokens: [],
        steps: [step0, step1],
        parseTree: tree,
        exploredStateCount: 1,
        explanation: `Empty string ε successfully derived via ${startVariable} → ε.`,
        startVariable,
      };
    }
  }

  // Helper mutable tree node for search
  interface TDTreeNode {
    id: string;
    symbol: GrammarSymbol;
    productionId?: string;
    children: TDTreeNode[];
    depth: number;
  }

  interface TDState {
    form: GrammarSymbol[];
    matchedTokens: number;
    steps: TopDownParseStep[];
    forest: TDTreeNode[];
    depth: number;
  }

  let nodeCounter = 0;
  const nextNodeId = () => `td_node_${nodeCounter++}`;

  const rootNode: TDTreeNode = {
    id: nextNodeId(),
    symbol: { type: 'NON_TERMINAL', value: startVariable },
    children: [],
    depth: 0,
  };

  const initialStep: TopDownParseStep = {
    stepIndex: 0,
    sententialForm: [{ type: 'NON_TERMINAL', value: startVariable }],
    formattedSententialForm: startVariable,
    matchedPrefix: '',
    remainingInput: tokens.join(' '),
    explanation: `Start parsing from root start symbol '${startVariable}'.`,
  };

  const initialState: TDState = {
    form: [{ type: 'NON_TERMINAL', value: startVariable }],
    matchedTokens: 0,
    steps: [initialStep],
    forest: [rootNode],
    depth: 0,
  };

  const queue: TDState[] = [initialState];
  const visited = new Set<string>();
  visited.add(`${formatSymbols(initialState.form)}|0`);
  let exploredCount = 0;
  let searchLimitReached = false;

  function freezeTDTree(node: TDTreeNode): CFGParseTreeNode {
    return {
      id: node.id,
      symbol: node.symbol,
      productionId: node.productionId,
      depth: node.depth,
      children: node.children.map(freezeTDTree),
    };
  }

  while (queue.length > 0) {
    if (exploredCount >= maxStates) {
      searchLimitReached = true;
      break;
    }

    const current = queue.shift()!;
    exploredCount++;

    // Check if the current form is fully terminal and matches all input tokens
    const isAllTerminals = current.form.every((s) => s.type === 'TERMINAL' || s.type === 'EPSILON');
    if (isAllTerminals) {
      const formTerminals = current.form.filter((s) => s.type === 'TERMINAL').map((s) => s.value);
      if (
        formTerminals.length === tokens.length &&
        formTerminals.every((val, idx) => val === tokens[idx])
      ) {
        // Successful derivation found!
        const finalTree = current.forest.length > 0 ? freezeTDTree(current.forest[0]) : undefined;

        const completionStep: TopDownParseStep = {
          stepIndex: current.steps.length,
          sententialForm: current.form,
          formattedSententialForm: formatSymbols(current.form),
          matchedPrefix: tokens.join(' '),
          remainingInput: '',
          explanation: `Derivation complete: sentential form '${formatSymbols(current.form)}' consists entirely of terminals and strictly matches input "${inputString}".`,
        };

        return {
          status: 'ACCEPT',
          isAccepted: true,
          isSearchLimitReached: false,
          inputString,
          tokens,
          steps: [...current.steps, completionStep],
          parseTree: finalTree,
          exploredStateCount: exploredCount,
          explanation: `Successfully derived input "${inputString}" from start symbol '${startVariable}' in ${current.steps.length} derivation step(s).`,
          startVariable,
        };
      }
      // If all terminals but doesn't match target tokens, dead end
      continue;
    }

    // Depth check to prevent infinite left-recursion loops
    if (current.depth >= maxDepth) {
      continue;
    }

    // Find leftmost nonterminal
    let leftmostNtIdx = -1;
    for (let i = 0; i < current.form.length; i++) {
      if (current.form[i].type === 'NON_TERMINAL') {
        leftmostNtIdx = i;
        break;
      }
    }

    if (leftmostNtIdx === -1) continue;

    // Verify that terminals before the leftmost nonterminal match the corresponding prefix of tokens
    const prefixTerminals = current.form
      .slice(0, leftmostNtIdx)
      .filter((s) => s.type === 'TERMINAL')
      .map((s) => s.value);

    let prefixMatches = true;
    if (prefixTerminals.length > tokens.length) {
      prefixMatches = false;
    } else {
      for (let i = 0; i < prefixTerminals.length; i++) {
        if (prefixTerminals[i] !== tokens[i]) {
          prefixMatches = false;
          break;
        }
      }
    }

    if (!prefixMatches) {
      // Terminal mismatch; prune this branch
      continue;
    }

    const ntSymbol = current.form[leftmostNtIdx].value;
    const applicableProds = productions.filter((p) => p.lhs === ntSymbol);

    if (applicableProds.length === 0) {
      // Nonterminal cannot expand; prune this branch
      continue;
    }

    // Expand leftmost nonterminal using each applicable production
    for (const prod of applicableProds) {
      const newForm: GrammarSymbol[] = [
        ...current.form.slice(0, leftmostNtIdx),
        ...prod.rhs.filter((s) => !isEpsilon(s)),
        ...current.form.slice(leftmostNtIdx + 1),
      ];

      // Clone forest and update leftmost open nonterminal node
      function cloneNode(n: TDTreeNode): TDTreeNode {
        return {
          id: n.id,
          symbol: n.symbol,
          productionId: n.productionId,
          depth: n.depth,
          children: n.children.map(cloneNode),
        };
      }

      const newForest = current.forest.map(cloneNode);

      // Find leftmost open leaf node matching ntSymbol
      let targetNode: TDTreeNode | null = null;
      function findLeftmostOpen(n: TDTreeNode): boolean {
        if (n.symbol.type === 'NON_TERMINAL' && n.children.length === 0) {
          if (n.symbol.value === ntSymbol) {
            targetNode = n;
            return true;
          }
        }
        for (const child of n.children) {
          if (findLeftmostOpen(child)) return true;
        }
        return false;
      }

      if (newForest.length > 0) {
        findLeftmostOpen(newForest[0]);
      }

      if (targetNode) {
        (targetNode as TDTreeNode).productionId = prod.id;
        if (prod.rhs.length === 0 || (prod.rhs.length === 1 && isEpsilon(prod.rhs[0]))) {
          (targetNode as TDTreeNode).children = [
            {
              id: nextNodeId(),
              symbol: { type: 'EPSILON', value: 'ε' },
              depth: (targetNode as TDTreeNode).depth + 1,
              children: [],
            },
          ];
        } else {
          (targetNode as TDTreeNode).children = prod.rhs.map((s) => ({
            id: nextNodeId(),
            symbol: s,
            depth: (targetNode as TDTreeNode).depth + 1,
            children: [],
          }));
        }
      }

      const matchedCount = prefixTerminals.length;
      const matchedStr = tokens.slice(0, matchedCount).join(' ');
      const remainingStr = tokens.slice(matchedCount).join(' ');

      const newStep: TopDownParseStep = {
        stepIndex: current.steps.length,
        sententialForm: newForm,
        formattedSententialForm: formatSymbols(newForm),
        expandedSymbol: ntSymbol,
        expandedIndex: leftmostNtIdx,
        selectedProduction: prod,
        matchedPrefix: matchedStr,
        remainingInput: remainingStr,
        explanation: `Expanded nonterminal '${ntSymbol}' using rule ${prod.lhs} → ${formatSymbols(prod.rhs)}.`,
        availableAlternatives: applicableProds.length > 1 ? applicableProds : undefined,
      };

      const stateKey = `${formatSymbols(newForm)}|${matchedCount}`;
      if (visited.has(stateKey)) {
        continue;
      }
      visited.add(stateKey);

      queue.push({
        form: newForm,
        matchedTokens: matchedCount,
        steps: [...current.steps, newStep],
        forest: newForest,
        depth: current.depth + 1,
      });
    }
  }

  if (searchLimitReached) {
    return {
      status: 'SEARCH_LIMIT_REACHED',
      isAccepted: false,
      isSearchLimitReached: true,
      inputString,
      tokens,
      steps: initialState.steps,
      exploredStateCount: exploredCount,
      explanation: `Top-down derivation search bounded by safety limit (${maxStates} states explored). Did not discover derivation before cutoff.`,
      startVariable,
    };
  }

  return {
    status: 'REJECT',
    isAccepted: false,
    isSearchLimitReached: false,
    inputString,
    tokens,
    steps: initialState.steps,
    exploredStateCount: exploredCount,
    explanation: `Input "${inputString}" is rejected: exhaustive top-down search explored ${exploredCount} states with no valid derivation from '${startVariable}'.`,
    startVariable,
  };
}

// ===================================================================
// Bottom-Up (Shift-Reduce) Parsing Engine
// ===================================================================

export interface BottomUpParseOptions {
  maxSteps?: number;
  maxStates?: number;
}

/**
 * Bottom-Up Parser:
 * Starts with input tokens and attempts to reduce them step-by-step
 * to the grammar's startVariable using shift and reduce operations.
 *
 * Distinguishes ACCEPT, REJECT, and SEARCH_LIMIT_REACHED.
 * Detects and exposes Shift/Reduce and Reduce/Reduce choice points.
 */
export function parseBottomUp(
  grammar: ContextFreeGrammar,
  inputString: string,
  options: BottomUpParseOptions = {}
): BottomUpParseResult {
  const maxSteps = options.maxSteps !== undefined ? options.maxSteps : 40;
  const maxStates = options.maxStates !== undefined ? options.maxStates : 1500;

  const { startVariable, terminals, productions } = grammar;

  if (!startVariable || !grammar.variables.includes(startVariable)) {
    return {
      status: 'REJECT',
      isAccepted: false,
      isSearchLimitReached: false,
      inputString,
      tokens: [],
      steps: [],
      finalStack: [],
      exploredStateCount: 0,
      conflictsEncountered: 0,
      explanation: `Invalid grammar start variable '${startVariable}'.`,
      startVariable: startVariable || 'S',
    };
  }

  const tokens = tokenizeForCYK(inputString, terminals);
  if (tokens === null) {
    return {
      status: 'REJECT',
      isAccepted: false,
      isSearchLimitReached: false,
      inputString,
      tokens: [],
      steps: [],
      finalStack: [],
      exploredStateCount: 0,
      conflictsEncountered: 0,
      explanation: `Input "${inputString}" cannot be tokenized using terminal set Σ = {${terminals.join(', ')}}.`,
      startVariable,
    };
  }

  let nodeCounter = 0;
  const nextNodeId = () => `bu_node_${nodeCounter++}`;

  interface BUState {
    stack: GrammarSymbol[];
    remainingTokens: string[];
    forest: CFGParseTreeNode[];
    steps: BottomUpParseStep[];
    conflicts: number;
    depth: number;
    consecutiveEps: number;
  }

  const initialStep: BottomUpParseStep = {
    stepIndex: 0,
    stack: [],
    formattedStack: '$ (Empty Stack)',
    remainingTokens: tokens,
    formattedRemainingInput: tokens.length > 0 ? tokens.join(' ') : 'ε',
    action: 'SHIFT',
    explanation: 'Initial parser state: stack is empty; remaining input contains full token stream.',
  };

  const initialState: BUState = {
    stack: [],
    remainingTokens: [...tokens],
    forest: [],
    steps: [initialStep],
    conflicts: 0,
    depth: 0,
    consecutiveEps: 0,
  };

  // Check empty string acceptance immediately if startVariable -> eps exists
  if (tokens.length === 0) {
    const epsProd = productions.find(
      (p) => p.lhs === startVariable && (p.rhs.length === 0 || (p.rhs.length === 1 && isEpsilon(p.rhs[0])))
    );

    if (epsProd) {
      const epsTree: CFGParseTreeNode = {
        id: nextNodeId(),
        symbol: { type: 'NON_TERMINAL', value: startVariable },
        productionId: epsProd.id,
        depth: 0,
        children: [
          {
            id: nextNodeId(),
            symbol: { type: 'EPSILON', value: 'ε' },
            depth: 1,
            children: [],
          },
        ],
      };

      const reduceStep: BottomUpParseStep = {
        stepIndex: 1,
        stack: [{ type: 'NON_TERMINAL', value: startVariable }],
        formattedStack: `$ ${startVariable}`,
        remainingTokens: [],
        formattedRemainingInput: '$ (End of Input)',
        action: 'REDUCE',
        reducedProduction: epsProd,
        explanation: `Reduced ε to start symbol '${startVariable}' via ${epsProd.lhs} → ε.`,
      };

      const acceptStep: BottomUpParseStep = {
        stepIndex: 2,
        stack: [{ type: 'NON_TERMINAL', value: startVariable }],
        formattedStack: `$ ${startVariable}`,
        remainingTokens: [],
        formattedRemainingInput: '$ (End of Input)',
        action: 'ACCEPT',
        explanation: `Stack contains only start symbol '${startVariable}' and input is exhausted. Accepted!`,
      };

      return {
        status: 'ACCEPT',
        isAccepted: true,
        isSearchLimitReached: false,
        inputString,
        tokens: [],
        steps: [initialStep, reduceStep, acceptStep],
        parseTree: epsTree,
        finalStack: [{ type: 'NON_TERMINAL', value: startVariable }],
        exploredStateCount: 1,
        conflictsEncountered: 0,
        explanation: `Empty string successfully accepted by bottom-up reduction to '${startVariable}'.`,
        startVariable,
      };
    }
  }

  // BFS Search to discover bottom-up shift-reduce reduction path
  const queue: BUState[] = [initialState];
  let exploredCount = 0;
  let searchLimitReached = false;
  const visited = new Set<string>();

  function getStateKey(s: BUState): string {
    const stackKey = s.stack.map((sym) => `${sym.type}:${sym.value}`).join(';');
    const inputKey = s.remainingTokens.join(';');
    return `${stackKey}|${inputKey}`;
  }

  while (queue.length > 0) {
    if (exploredCount >= maxStates) {
      searchLimitReached = true;
      break;
    }

    const current = queue.shift()!;
    exploredCount++;

    const key = getStateKey(current);
    if (visited.has(key)) continue;
    visited.add(key);

    // 1. Acceptance condition:
    // Stack has exactly one element, which is the start symbol, and remainingTokens is empty
    if (
      current.remainingTokens.length === 0 &&
      current.stack.length === 1 &&
      current.stack[0].type === 'NON_TERMINAL' &&
      current.stack[0].value === startVariable
    ) {
      const acceptStep: BottomUpParseStep = {
        stepIndex: current.steps.length,
        stack: current.stack,
        formattedStack: `$ ${formatSymbols(current.stack)}`,
        remainingTokens: [],
        formattedRemainingInput: '$ (End of Input)',
        action: 'ACCEPT',
        explanation: `Acceptance achieved! Stack contains start symbol '${startVariable}' with zero remaining input.`,
      };

      return {
        status: 'ACCEPT',
        isAccepted: true,
        isSearchLimitReached: false,
        inputString,
        tokens,
        steps: [...current.steps, acceptStep],
        parseTree: current.forest.length > 0 ? current.forest[0] : undefined,
        finalStack: current.stack,
        exploredStateCount: exploredCount,
        conflictsEncountered: current.conflicts,
        explanation: `Input "${inputString}" successfully parsed bottom-up to start symbol '${startVariable}'.`,
        startVariable,
      };
    }

    if (current.depth >= maxSteps) {
      continue;
    }

    // 2. Identify all possible actions in the current configuration:
    const availableChoices: BottomUpActionChoice[] = [];

    // A. Potential SHIFT choice
    if (current.remainingTokens.length > 0) {
      availableChoices.push({
        type: 'SHIFT',
        description: `SHIFT token '${current.remainingTokens[0]}' onto stack.`,
      });
    }

    // B. Potential REDUCE choices
    for (const prod of productions) {
      const nonEpsRhs = prod.rhs.filter((s) => !isEpsilon(s));

      if (nonEpsRhs.length === 0) {
        // Epsilon reduction: only allow if consecutiveEps === 0 and stack size is within bound
        if (current.consecutiveEps === 0 && current.stack.length <= tokens.length + 2) {
          availableChoices.push({
            type: 'REDUCE',
            production: prod,
            matchedSuffix: [],
            description: `REDUCE empty suffix to '${prod.lhs}' via ${prod.lhs} → ε.`,
          });
        }
      } else if (current.stack.length >= nonEpsRhs.length) {
        // Check if top of stack matches RHS
        const stackSuffix = current.stack.slice(current.stack.length - nonEpsRhs.length);
        const matches = nonEpsRhs.every((rhsSym, idx) => areSymbolsEqual(rhsSym, stackSuffix[idx]));

        if (matches) {
          availableChoices.push({
            type: 'REDUCE',
            production: prod,
            matchedSuffix: stackSuffix,
            description: `REDUCE stack top [${formatSymbols(stackSuffix)}] to '${prod.lhs}' via ${prod.lhs} → ${formatSymbols(prod.rhs)}.`,
          });
        }
      }
    }

    // Detect conflicts
    const hasShift = availableChoices.some((c) => c.type === 'SHIFT');
    const reduceChoices = availableChoices.filter((c) => c.type === 'REDUCE');
    const isConflict = availableChoices.length > 1;
    let conflictType: 'SHIFT_REDUCE' | 'REDUCE_REDUCE' | undefined;
    if (hasShift && reduceChoices.length > 0) {
      conflictType = 'SHIFT_REDUCE';
    } else if (reduceChoices.length > 1) {
      conflictType = 'REDUCE_REDUCE';
    }

    const nextConflictCount = current.conflicts + (isConflict ? 1 : 0);

    // Expand each valid choice in the search
    for (const choice of availableChoices) {
      if (choice.type === 'SHIFT') {
        const shiftedToken = current.remainingTokens[0];
        const newStack: GrammarSymbol[] = [
          ...current.stack,
          { type: 'TERMINAL', value: shiftedToken },
        ];
        const newRemaining = current.remainingTokens.slice(1);

        const newLeaf: CFGParseTreeNode = {
          id: nextNodeId(),
          symbol: { type: 'TERMINAL', value: shiftedToken },
          depth: 1,
          children: [],
        };

        const newForest = [...current.forest, newLeaf];

        const step: BottomUpParseStep = {
          stepIndex: current.steps.length,
          stack: newStack,
          formattedStack: `$ ${formatSymbols(newStack)}`,
          remainingTokens: newRemaining,
          formattedRemainingInput: newRemaining.length > 0 ? newRemaining.join(' ') : '$',
          action: 'SHIFT',
          shiftedToken,
          explanation: isConflict
            ? `Shifted '${shiftedToken}' onto stack (Note: multiple choices existed at this state).`
            : `Shifted token '${shiftedToken}' onto stack.`,
          availableChoices,
          hasConflict: isConflict,
          conflictType,
        };

        queue.push({
          stack: newStack,
          remainingTokens: newRemaining,
          forest: newForest,
          steps: [...current.steps, step],
          conflicts: nextConflictCount,
          depth: current.depth + 1,
          consecutiveEps: 0,
        });
      } else if (choice.type === 'REDUCE' && choice.production) {
        const prod = choice.production;
        const nonEpsRhs = prod.rhs.filter((s) => !isEpsilon(s));
        const rhsLen = nonEpsRhs.length;

        const newStack = [
          ...current.stack.slice(0, current.stack.length - rhsLen),
          { type: 'NON_TERMINAL' as const, value: prod.lhs },
        ];

        // Combine top rhsLen trees from forest into new parent tree node
        const childrenTrees = current.forest.slice(current.forest.length - rhsLen);
        const remainingTrees = current.forest.slice(0, current.forest.length - rhsLen);

        const newParentTree: CFGParseTreeNode = {
          id: nextNodeId(),
          symbol: { type: 'NON_TERMINAL', value: prod.lhs },
          productionId: prod.id,
          depth: 0,
          children:
            childrenTrees.length > 0
              ? childrenTrees
              : [
                  {
                    id: nextNodeId(),
                    symbol: { type: 'EPSILON', value: 'ε' },
                    depth: 1,
                    children: [],
                  },
                ],
        };

        const newForest = [...remainingTrees, newParentTree];

        const step: BottomUpParseStep = {
          stepIndex: current.steps.length,
          stack: newStack,
          formattedStack: `$ ${formatSymbols(newStack)}`,
          remainingTokens: current.remainingTokens,
          formattedRemainingInput:
            current.remainingTokens.length > 0 ? current.remainingTokens.join(' ') : '$',
          action: 'REDUCE',
          reducedProduction: prod,
          reducedSymbols: choice.matchedSuffix,
          explanation: isConflict
            ? `Reduced [${formatSymbols(nonEpsRhs)}] to '${prod.lhs}' via ${prod.lhs} → ${formatSymbols(prod.rhs)} (Conflict resolved via exploration).`
            : `Reduced [${formatSymbols(nonEpsRhs)}] to '${prod.lhs}' via rule ${prod.lhs} → ${formatSymbols(prod.rhs)}.`,
          availableChoices,
          hasConflict: isConflict,
          conflictType,
        };

        queue.push({
          stack: newStack,
          remainingTokens: current.remainingTokens,
          forest: newForest,
          steps: [...current.steps, step],
          conflicts: nextConflictCount,
          depth: current.depth + 1,
          consecutiveEps: nonEpsRhs.length === 0 ? current.consecutiveEps + 1 : 0,
        });
      }
    }
  }

  if (searchLimitReached) {
    return {
      status: 'SEARCH_LIMIT_REACHED',
      isAccepted: false,
      isSearchLimitReached: true,
      inputString,
      tokens,
      steps: initialState.steps,
      finalStack: initialState.stack,
      exploredStateCount: exploredCount,
      conflictsEncountered: 0,
      explanation: `Bottom-up parsing search reached safety cutoff (${maxStates} configurations explored). Could not establish derivation within bound.`,
      startVariable,
    };
  }

  const finalRejectStep: BottomUpParseStep = {
    stepIndex: 1,
    stack: initialState.stack,
    formattedStack: '$ (Empty Stack)',
    remainingTokens: tokens,
    formattedRemainingInput: tokens.join(' '),
    action: 'ERROR',
    explanation: `No sequence of valid shift/reduce actions can reduce input "${inputString}" to start variable '${startVariable}'.`,
  };

  return {
    status: 'REJECT',
    isAccepted: false,
    isSearchLimitReached: false,
    inputString,
    tokens,
    steps: [initialStep, finalRejectStep],
    finalStack: initialState.stack,
    exploredStateCount: exploredCount,
    conflictsEncountered: 0,
    explanation: `Bottom-up parsing failed: input "${inputString}" cannot be reduced to start symbol '${startVariable}'.`,
    startVariable,
  };
}

// ===================================================================
// Paradigm Comparison
// ===================================================================

/**
 * Compare Top-Down and Bottom-Up parsing approaches on a given grammar and input.
 */
export function compareParsingApproaches(
  grammar: ContextFreeGrammar,
  inputString: string
): ParsingApproachComparison {
  const topDown = parseTopDown(grammar, inputString);
  const bottomUp = parseBottomUp(grammar, inputString);

  // Both complete and agree if both ACCEPT or both REJECT
  const agreement =
    (topDown.status === 'ACCEPT' && bottomUp.status === 'ACCEPT') ||
    (topDown.status === 'REJECT' && bottomUp.status === 'REJECT');

  const comparisonTable = [
    {
      dimension: 'Parsing Direction',
      topDown: `Start Symbol ('${grammar.startVariable}') ⇒* Input String (Root to Leaves)`,
      bottomUp: `Input Tokens ⇒* Start Symbol ('${grammar.startVariable}') (Leaves to Root)`,
    },
    {
      dimension: 'Primary Operation',
      topDown: 'Expand Nonterminals using production rules (LHS → RHS)',
      bottomUp: 'Shift input tokens onto stack; Reduce matched patterns (RHS ⇒ LHS)',
    },
    {
      dimension: 'Core Data Structure',
      topDown: 'Current Sentential Form & Derivation Tree expansion',
      bottomUp: 'Shift-Reduce Stack & Remaining Input token buffer',
    },
    {
      dimension: 'Parse Tree Construction',
      topDown: 'Constructed top-down from root nonterminal down to leaf terminals',
      bottomUp: 'Constructed bottom-up by assembling sub-trees upon each reduction',
    },
    {
      dimension: 'Decisions & Conflicts',
      topDown: 'Choosing which production rule to expand (Requires lookahead / FIRST sets)',
      bottomUp: 'Shift/Reduce and Reduce/Reduce conflicts (Requires LR item sets & GOTO tables)',
    },
    {
      dimension: 'Deterministic Extension',
      topDown: 'LL(1) Predictive Parsing (Covered in Module 4 Topic 2)',
      bottomUp: 'SLR / LR Parsing (Covered in Module 4 Topic 3)',
    },
    {
      dimension: 'Outcome on Given Input',
      topDown: `${topDown.status} (${topDown.steps.length - 1} expansion step(s))`,
      bottomUp: `${bottomUp.status} (${bottomUp.steps.length - 1} shift/reduce step(s))`,
    },
  ];

  return {
    grammar,
    inputString,
    tokens: topDown.tokens,
    topDown,
    bottomUp,
    agreement,
    comparisonTable,
  };
}
