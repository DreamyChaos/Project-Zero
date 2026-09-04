import {
  ContextFreeGrammar,
  CFGProduction,
  GrammarSymbol,
  CFGParseTreeNode,
  LR0Item,
  LR0Transition,
  LR0State,
  CanonicalLR0Collection,
  SLRAction,
  SLRConflict,
  SLRTable,
  SLRParseStep,
  SLRParseResult,
} from './types';
import { computeFirstSets, computeFollowSets } from './cfg-first-follow';
import { tokenizeForCYK } from './cyk-parser';

export const SLR_END_MARKER = '$';

// ===================================================================
// 1. Augmented Grammar Construction
// ===================================================================

/**
 * Creates an augmented grammar G' = (V ∪ {S'}, Σ, P ∪ {S' -> S}, S')
 * Dynamically handles non-S start variables.
 */
export function createAugmentedGrammar(grammar: ContextFreeGrammar): {
  augmentedGrammar: ContextFreeGrammar;
  augmentedStartSymbol: string;
  augmentedProduction: CFGProduction;
} {
  const originalStart = grammar.startVariable;
  let augmentedStart = `${originalStart}'`;
  while (
    grammar.variables.includes(augmentedStart) ||
    grammar.terminals.includes(augmentedStart)
  ) {
    augmentedStart += "'";
  }

  const augmentedProduction: CFGProduction = {
    id: `aug_${augmentedStart}`,
    lhs: augmentedStart,
    rhs: [{ type: 'NON_TERMINAL', value: originalStart }],
  };

  const augmentedGrammar: ContextFreeGrammar = {
    variables: [augmentedStart, ...grammar.variables],
    terminals: [...grammar.terminals],
    productions: [augmentedProduction, ...grammar.productions],
    startVariable: augmentedStart,
  };

  return { augmentedGrammar, augmentedStartSymbol: augmentedStart, augmentedProduction };
}

// ===================================================================
// 2. LR(0) Item Representation & Operations
// ===================================================================

/**
 * Checks if a production is an epsilon production (A -> ε or empty RHS).
 */
export function isEpsilonProduction(prod: CFGProduction): boolean {
  return (
    prod.rhs.length === 0 ||
    (prod.rhs.length === 1 && prod.rhs[0].type === 'EPSILON')
  );
}

/**
 * Creates an immutable LR(0) item A -> α · β.
 */
export function createLR0Item(
  production: CFGProduction,
  dotPosition: number,
  isKernel = false
): LR0Item {
  const isEps = isEpsilonProduction(production);
  // For epsilon production, effective length of RHS is 0
  const effectiveLen = isEps ? 0 : production.rhs.length;
  const clampedDot = Math.min(Math.max(0, dotPosition), effectiveLen);
  const isCompleted = clampedDot === effectiveLen;

  let nextSymbol: GrammarSymbol | null = null;
  if (!isCompleted && !isEps) {
    nextSymbol = production.rhs[clampedDot];
  }

  // Format representation
  let rhsFormatted: string;
  if (isEps) {
    rhsFormatted = '·';
  } else {
    const parts: string[] = [];
    for (let i = 0; i < production.rhs.length; i++) {
      if (i === clampedDot) parts.push('·');
      parts.push(production.rhs[i].value);
    }
    if (clampedDot === production.rhs.length) {
      parts.push('·');
    }
    rhsFormatted = parts.join(' ');
  }

  const id = `${production.id}:${clampedDot}`;
  const formatted = `${production.lhs} -> ${rhsFormatted}`;

  return {
    id,
    productionId: production.id,
    lhs: production.lhs,
    rhs: production.rhs,
    dotPosition: clampedDot,
    nextSymbol,
    isCompleted,
    isKernel,
    formatted,
  };
}

/**
 * Advances the dot of an LR(0) item by 1 position (returns null if already completed).
 */
export function advanceLR0Item(item: LR0Item): LR0Item | null {
  if (item.isCompleted) return null;
  return createLR0Item(
    { id: item.productionId, lhs: item.lhs, rhs: item.rhs },
    item.dotPosition + 1,
    true
  );
}

/**
 * Compares two LR(0) items for deterministic sorting.
 */
export function compareLR0Items(a: LR0Item, b: LR0Item): number {
  if (a.lhs !== b.lhs) return a.lhs.localeCompare(b.lhs);
  if (a.productionId !== b.productionId) return a.productionId.localeCompare(b.productionId);
  return a.dotPosition - b.dotPosition;
}

/**
 * Generates a unique canonical signature string for a set of LR(0) items.
 */
export function getItemSetSignature(items: ReadonlyArray<LR0Item>): string {
  const sorted = [...items].sort(compareLR0Items);
  return sorted.map((it) => it.id).join('|');
}

// ===================================================================
// 3. LR(0) Closure & GOTO Fixed-Point Algorithms
// ===================================================================

/**
 * Computes the canonical LR(0) closure of a set of items.
 * Guaranteed fixed-point termination and deduplication.
 */
export function lr0Closure(
  initialItems: ReadonlyArray<LR0Item>,
  grammar: ContextFreeGrammar
): ReadonlyArray<LR0Item> {
  const itemMap = new Map<string, LR0Item>();
  const queue: LR0Item[] = [];

  for (const it of initialItems) {
    if (!itemMap.has(it.id)) {
      itemMap.set(it.id, it);
      queue.push(it);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const nextSym = current.nextSymbol;

    if (nextSym && nextSym.type === 'NON_TERMINAL') {
      const variableName = nextSym.value;
      const matchingProds = grammar.productions.filter((p) => p.lhs === variableName);

      for (const prod of matchingProds) {
        const newItem = createLR0Item(prod, 0, false);
        if (!itemMap.has(newItem.id)) {
          itemMap.set(newItem.id, newItem);
          queue.push(newItem);
        }
      }
    }
  }

  return Array.from(itemMap.values()).sort(compareLR0Items);
}

/**
 * Computes GOTO(I, X) = CLOSURE({ A -> α X · β | A -> α · X β ∈ I })
 */
export function lr0Goto(
  items: ReadonlyArray<LR0Item>,
  symbol: string,
  grammar: ContextFreeGrammar
): ReadonlyArray<LR0Item> {
  const advancedKernels: LR0Item[] = [];

  for (const it of items) {
    if (it.nextSymbol && it.nextSymbol.value === symbol) {
      const advanced = advanceLR0Item(it);
      if (advanced) {
        advancedKernels.push(advanced);
      }
    }
  }

  if (advancedKernels.length === 0) {
    return [];
  }

  return lr0Closure(advancedKernels, grammar);
}

// ===================================================================
// 4. Canonical Collection of LR(0) Item Sets
// ===================================================================

/**
 * Builds the complete canonical collection of LR(0) item sets (the DFA states and transitions).
 */
export function buildCanonicalLR0Collection(
  grammar: ContextFreeGrammar
): CanonicalLR0Collection {
  const { augmentedGrammar, augmentedStartSymbol, augmentedProduction } =
    createAugmentedGrammar(grammar);

  // Initial state I0 = closure({ S' -> · S })
  const initialKernel = createLR0Item(augmentedProduction, 0, true);
  const i0Items = lr0Closure([initialKernel], augmentedGrammar);

  const states: LR0State[] = [];
  const stateMap = new Map<string, number>(); // signature -> stateId
  const rawTransitions: Array<{ fromStateId: number; symbol: string; toStateId: number }> = [];

  const i0Signature = getItemSetSignature(i0Items);
  stateMap.set(i0Signature, 0);

  const workQueue: Array<{ stateId: number; items: ReadonlyArray<LR0Item> }> = [
    { stateId: 0, items: i0Items },
  ];

  // All distinct symbols that could have transitions: variables and terminals
  const grammarSymbols = [
    ...augmentedGrammar.variables.filter((v) => v !== augmentedStartSymbol),
    ...augmentedGrammar.terminals,
  ];

  while (workQueue.length > 0) {
    const { stateId, items } = workQueue.shift()!;
    const stateTransitions: LR0Transition[] = [];

    for (const sym of grammarSymbols) {
      const gotoItems = lr0Goto(items, sym, augmentedGrammar);
      if (gotoItems.length > 0) {
        const signature = getItemSetSignature(gotoItems);
        let targetId: number;

        if (stateMap.has(signature)) {
          targetId = stateMap.get(signature)!;
        } else {
          targetId = stateMap.size;
          stateMap.set(signature, targetId);
          workQueue.push({ stateId: targetId, items: gotoItems });
        }

        const isTerminal = augmentedGrammar.terminals.includes(sym);
        stateTransitions.push({ symbol: sym, isTerminal, targetStateId: targetId });
        rawTransitions.push({ fromStateId: stateId, symbol: sym, toStateId: targetId });
      }
    }

    const kernelItems = items.filter((it) => it.isKernel);
    const closureItems = items.filter((it) => !it.isKernel);
    const completedItems = items.filter((it) => it.isCompleted);

    states.push({
      id: stateId,
      name: `I${stateId}`,
      items,
      kernelItems,
      closureItems,
      transitions: stateTransitions,
      completedItems,
    });
  }

  // Ensure states are ordered by stateId 0, 1, 2, ...
  states.sort((a, b) => a.id - b.id);

  return {
    augmentedGrammar,
    augmentedStartSymbol,
    states,
    initialStateId: 0,
    transitions: rawTransitions,
  };
}

// ===================================================================
// 5. SLR Action and GOTO Parse Table Construction
// ===================================================================

/**
 * Builds the SLR(1) parse table using the canonical LR(0) collection and Module 3 FOLLOW sets.
 * Rigorously classifies and documents all SHIFT/REDUCE and REDUCE/REDUCE conflicts.
 */
export function buildSLRTable(grammar: ContextFreeGrammar): {
  collection: CanonicalLR0Collection;
  table: SLRTable;
} {
  const collection = buildCanonicalLR0Collection(grammar);
  const { augmentedGrammar, augmentedStartSymbol, states } = collection;

  // Module 3 Topic 5 FOLLOW Set Reuse:
  const firstSets = computeFirstSets(augmentedGrammar);
  const followSets = computeFollowSets(augmentedGrammar, firstSets);

  const tableTerminals = Array.from(
    new Set([...grammar.terminals, SLR_END_MARKER])
  ).sort((a, b) => {
    if (a === SLR_END_MARKER) return 1;
    if (b === SLR_END_MARKER) return -1;
    return a.localeCompare(b);
  });

  const tableVariables = [...grammar.variables].sort();

  const actionGrid: Record<number, Record<string, SLRAction[]>> = {};
  const gotoGrid: Record<number, Record<string, number | null>> = {};
  const conflicts: SLRConflict[] = [];

  for (const st of states) {
    actionGrid[st.id] = {};
    gotoGrid[st.id] = {};

    for (const t of tableTerminals) {
      actionGrid[st.id][t] = [];
    }
    for (const v of tableVariables) {
      gotoGrid[st.id][v] = null;
    }
  }

  // 1. Fill GOTO table for nonterminals
  for (const trans of collection.transitions) {
    if (tableVariables.includes(trans.symbol)) {
      gotoGrid[trans.fromStateId][trans.symbol] = trans.toStateId;
    }
  }

  // 2. Fill ACTION table: SHIFT, REDUCE, ACCEPT
  for (const st of states) {
    // A. SHIFT actions: from outgoing transitions on terminals
    for (const trans of st.transitions) {
      if (trans.isTerminal && tableTerminals.includes(trans.symbol)) {
        const action: SLRAction = {
          type: 'SHIFT',
          targetStateId: trans.targetStateId,
          notation: `S${trans.targetStateId}`,
        };
        // Avoid duplicate shift if already added
        if (!actionGrid[st.id][trans.symbol].some((a) => a.type === 'SHIFT' && a.targetStateId === trans.targetStateId)) {
          actionGrid[st.id][trans.symbol].push(action);
        }
      }
    }

    // B. REDUCE and ACCEPT actions: from completed items
    for (const item of st.completedItems) {
      // ACCEPT: S' -> S · on '$'
      if (item.lhs === augmentedStartSymbol) {
        const acceptAction: SLRAction = {
          type: 'ACCEPT',
          notation: 'acc',
        };
        if (!actionGrid[st.id][SLR_END_MARKER].some((a) => a.type === 'ACCEPT')) {
          actionGrid[st.id][SLR_END_MARKER].push(acceptAction);
        }
      } else {
        // REDUCE: A -> α · for all a ∈ FOLLOW(A)
        const lhsFollow = followSets[item.lhs] || [];
        const originalProd = grammar.productions.find((p) => p.id === item.productionId) || {
          id: item.productionId,
          lhs: item.lhs,
          rhs: item.rhs,
        };

        const rhsNot = isEpsilonProduction(originalProd)
          ? 'ε'
          : originalProd.rhs.map((r) => r.value).join(' ');
        const notation = `R${originalProd.id} (${originalProd.lhs} -> ${rhsNot})`;

        const reduceAction: SLRAction = {
          type: 'REDUCE',
          production: originalProd,
          notation,
        };

        for (const lookahead of lhsFollow) {
          if (tableTerminals.includes(lookahead)) {
            // Avoid duplicate reduce
            if (
              !actionGrid[st.id][lookahead].some(
                (a) => a.type === 'REDUCE' && a.production?.id === originalProd.id
              )
            ) {
              actionGrid[st.id][lookahead].push(reduceAction);
            }
          }
        }
      }
    }

    // C. Detect Conflicts in state st
    for (const t of tableTerminals) {
      const cellActions = actionGrid[st.id][t];
      if (cellActions.length > 1) {
        const hasShift = cellActions.some((a) => a.type === 'SHIFT');
        const reduceActions = cellActions.filter((a) => a.type === 'REDUCE');

        let conflictType: 'SHIFT_REDUCE' | 'REDUCE_REDUCE';
        let explanation: string;

        if (hasShift && reduceActions.length > 0) {
          conflictType = 'SHIFT_REDUCE';
          const shiftAct = cellActions.find((a) => a.type === 'SHIFT')!;
          const reduceActs = reduceActions.map((r) => r.notation).join(', ');
          explanation = `Shift/Reduce conflict in state I${st.id} on lookahead '${t}': parser can either SHIFT to I${shiftAct.targetStateId} or REDUCE via ${reduceActs}.`;
        } else {
          conflictType = 'REDUCE_REDUCE';
          const redList = reduceActions.map((r) => r.notation).join(' vs ');
          explanation = `Reduce/Reduce conflict in state I${st.id} on lookahead '${t}': multiple completed productions compete (${redList}) because '${t}' is in their FOLLOW sets.`;
        }

        // Collect competing items
        const competingItems = st.items.filter((it) => {
          if (it.nextSymbol && it.nextSymbol.value === t) return true;
          if (it.isCompleted && (followSets[it.lhs] || []).includes(t)) return true;
          return false;
        });

        // Collect FOLLOW evidence
        const followEvidence = Array.from(
          new Set(competingItems.filter((i) => i.isCompleted).map((i) => i.lhs))
        ).map((v) => ({
          variable: v,
          followSet: followSets[v] || [],
        }));

        conflicts.push({
          stateId: st.id,
          symbol: t,
          conflictType,
          competingActions: [...cellActions],
          competingItems,
          followEvidence,
          explanation,
        });
      }
    }
  }

  const isSLR = conflicts.length === 0;

  const table: SLRTable = {
    states: states.map((s) => s.id),
    terminals: tableTerminals,
    variables: tableVariables,
    actionGrid,
    gotoGrid,
    conflicts,
    isSLR,
    followSets,
  };

  return { collection, table };
}

// ===================================================================
// 6. Actual Table-Driven SLR(1) Shift-Reduce Parser
// ===================================================================

export interface SLRParseOptions {
  maxSteps?: number;
}

/**
 * Executes genuine table-driven SLR shift-reduce parsing.
 * Construct parse tree directly from REDUCE actions, guaranteeing yield(tree) === input.
 */
export function parseSLR(
  grammar: ContextFreeGrammar,
  inputString: string,
  options?: SLRParseOptions
): SLRParseResult {
  const maxSteps = options?.maxSteps ?? 500;
  const { table } = buildSLRTable(grammar);
  const tokenized = tokenizeForCYK(inputString, grammar.terminals);
  const rawTokens: string[] = tokenized ?? (inputString.length === 0 ? [] : Array.from(inputString));

  const streamTokens = [...rawTokens, SLR_END_MARKER];
  let tokenIdx = 0;
  let nodeCounter = 0;

  const stateStack: number[] = [0];
  const symbolStack: string[] = [SLR_END_MARKER];
  const treeStack: CFGParseTreeNode[] = [];

  const steps: SLRParseStep[] = [];
  let isAccepted = false;
  let rejectionReason: string | undefined;
  let conflictEncountered: SLRConflict | undefined;

  let shiftCount = 0;
  let reduceCount = 0;

  while (steps.length < maxSteps) {
    const currentState = stateStack[stateStack.length - 1];
    const lookahead = streamTokens[tokenIdx] ?? SLR_END_MARKER;
    const remainingInput = streamTokens.slice(tokenIdx);

    const cellActions = table.actionGrid[currentState]?.[lookahead] || [];

    // Check for conflict
    if (cellActions.length > 1) {
      conflictEncountered = table.conflicts.find(
        (c) => c.stateId === currentState && c.symbol === lookahead
      );
      rejectionReason = `SLR(1) Conflict Error: State I${currentState} on lookahead '${lookahead}' has multiple competing actions (${cellActions.map((a) => a.notation).join(', ')}).`;

      steps.push({
        stepIndex: steps.length,
        stateStack: [...stateStack],
        symbolStack: [...symbolStack],
        remainingInput,
        lookahead,
        action: null,
        actionDescription: `CONFLICT: ${cellActions.map((a) => a.notation).join(' / ')}`,
        stateStackAfter: [...stateStack],
        symbolStackAfter: [...symbolStack],
        mathematicalExplanation: rejectionReason,
      });
      break;
    }

    // Check for missing action (Syntax error)
    if (cellActions.length === 0) {
      rejectionReason = `Syntax Error: No ACTION entry in state I${currentState} for lookahead '${lookahead}'. Expected valid terminal or reduction.`;

      steps.push({
        stepIndex: steps.length,
        stateStack: [...stateStack],
        symbolStack: [...symbolStack],
        remainingInput,
        lookahead,
        action: null,
        actionDescription: 'ERROR (No entry)',
        stateStackAfter: [...stateStack],
        symbolStackAfter: [...symbolStack],
        mathematicalExplanation: rejectionReason,
      });
      break;
    }

    const action = cellActions[0];

    // Handle ACCEPT
    if (action.type === 'ACCEPT') {
      if (lookahead === SLR_END_MARKER && tokenIdx >= rawTokens.length) {
        isAccepted = true;
        steps.push({
          stepIndex: steps.length,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          remainingInput,
          lookahead,
          action,
          actionDescription: 'ACCEPT (Parsing complete)',
          stateStackAfter: [...stateStack],
          symbolStackAfter: [...symbolStack],
          mathematicalExplanation: `Reached accept state on end-marker '$'. Augmented start symbol reduced. Input string "${inputString}" is formally accepted by SLR(1) parsing.`,
        });
        break;
      } else {
        rejectionReason = `Syntax Error: Accept action triggered prematurely with unconsumed input remaining: "${streamTokens.slice(tokenIdx).join(' ')}".`;
        steps.push({
          stepIndex: steps.length,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          remainingInput,
          lookahead,
          action,
          actionDescription: 'ERROR (Extra input at accept)',
          stateStackAfter: [...stateStack],
          symbolStackAfter: [...symbolStack],
          mathematicalExplanation: rejectionReason,
        });
        break;
      }
    }

    // Handle SHIFT
    if (action.type === 'SHIFT') {
      const nextState = action.targetStateId!;
      shiftCount++;

      // Create leaf node for terminal
      const leafNode: CFGParseTreeNode = {
        id: `slr_node_${++nodeCounter}`,
        symbol: { type: 'TERMINAL', value: lookahead },
        children: [],
        depth: 0,
      };
      treeStack.push(leafNode);

      const stateStackBefore = [...stateStack];
      const symbolStackBefore = [...symbolStack];

      stateStack.push(nextState);
      symbolStack.push(lookahead);
      tokenIdx++;

      steps.push({
        stepIndex: steps.length,
        stateStack: stateStackBefore,
        symbolStack: symbolStackBefore,
        remainingInput,
        lookahead,
        action,
        actionDescription: `SHIFT '${lookahead}' → State I${nextState}`,
        stateStackAfter: [...stateStack],
        symbolStackAfter: [...symbolStack],
        mathematicalExplanation: `Shifted lookahead token '${lookahead}' onto stack and transitioned to state I${nextState}. Input pointer advanced.`,
      });
      continue;
    }

    // Handle REDUCE
    if (action.type === 'REDUCE') {
      const prod = action.production!;
      reduceCount++;
      const isEps = isEpsilonProduction(prod);
      const popCount = isEps ? 0 : prod.rhs.length;

      if (stateStack.length - 1 < popCount) {
        rejectionReason = `Internal Stack Underflow: Cannot reduce production ${prod.lhs} -> ... requiring ${popCount} symbols, but stack has only ${stateStack.length - 1}.`;
        break;
      }

      // Collect children from treeStack
      let children: CFGParseTreeNode[] = [];
      if (isEps) {
        children = [
          {
            id: `slr_node_${++nodeCounter}`,
            symbol: { type: 'EPSILON', value: 'ε' },
            children: [],
            depth: 0,
          },
        ];
      } else {
        const poppedNodes: CFGParseTreeNode[] = [];
        for (let k = 0; k < popCount; k++) {
          poppedNodes.push(treeStack.pop()!);
        }
        // treeStack.pop() yields right-to-left, so reverse to restore left-to-right grammar order
        poppedNodes.reverse();
        children = poppedNodes;
      }

      const childDepth = children.length > 0 ? Math.max(...children.map((c) => c.depth)) : 0;
      const reducedNode: CFGParseTreeNode = {
        id: `slr_node_${++nodeCounter}`,
        symbol: { type: 'NON_TERMINAL', value: prod.lhs },
        productionId: prod.id,
        children,
        depth: childDepth + 1,
      };
      treeStack.push(reducedNode);

      const stateStackBefore = [...stateStack];
      const symbolStackBefore = [...symbolStack];

      // Pop stateStack and symbolStack
      for (let k = 0; k < popCount; k++) {
        stateStack.pop();
        symbolStack.pop();
      }

      // Check GOTO table
      const topState = stateStack[stateStack.length - 1];
      const gotoState = table.gotoGrid[topState]?.[prod.lhs];

      if (gotoState === null || gotoState === undefined) {
        rejectionReason = `GOTO Error: Undefined GOTO[I${topState}, '${prod.lhs}'] after reduction by production ${prod.lhs} -> ...`;
        steps.push({
          stepIndex: steps.length,
          stateStack: stateStackBefore,
          symbolStack: symbolStackBefore,
          remainingInput,
          lookahead,
          action,
          actionDescription: `REDUCE by ${prod.lhs} → ... (GOTO error)`,
          reducedProduction: prod,
          stateStackAfter: [...stateStack],
          symbolStackAfter: [...symbolStack],
          mathematicalExplanation: rejectionReason,
        });
        break;
      }

      stateStack.push(gotoState);
      symbolStack.push(prod.lhs);

      const rhsNot = isEps ? 'ε' : prod.rhs.map((r) => r.value).join(' ');
      steps.push({
        stepIndex: steps.length,
        stateStack: stateStackBefore,
        symbolStack: symbolStackBefore,
        remainingInput,
        lookahead,
        action,
        actionDescription: `REDUCE ${prod.lhs} → ${rhsNot}, GOTO I${gotoState}`,
        reducedProduction: prod,
        gotoState,
        stateStackAfter: [...stateStack],
        symbolStackAfter: [...symbolStack],
        mathematicalExplanation: `Popped ${popCount} symbol(s)/state(s) matching RHS "${rhsNot}". Exposed state I${topState}. Consulted GOTO[I${topState}, ${prod.lhs}] = I${gotoState}. Pushed nonterminal '${prod.lhs}' and state I${gotoState}.`,
      });
      continue;
    }
  }

  if (!isAccepted && !rejectionReason) {
    if (steps.length >= maxSteps) {
      rejectionReason = `Step Limit Exceeded: SLR parser exceeded ${maxSteps} steps without reaching accept state.`;
    } else {
      rejectionReason = 'Parsing failed without reaching accept state.';
    }
  }

  const finalTree = isAccepted && treeStack.length === 1 ? treeStack[0] : undefined;

  return {
    isAccepted,
    inputString,
    tokens: rawTokens,
    steps,
    parseTree: finalTree,
    rejectionReason,
    conflictEncountered,
    stats: {
      stepCount: steps.length,
      shiftCount,
      reduceCount,
      acceptReached: isAccepted,
    },
  };
}
