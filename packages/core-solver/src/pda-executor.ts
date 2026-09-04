import {
  SolverGraphInput,
  PDAExecutionResult,
  PDAExecutionStep,
  PDAAcceptanceMode,
  PDAStackOperation,
  PDARejectionReason,
} from './types';
import {
  validatePDA,
  parsePDATransition,
  parseStackSymbols,
  computePDAAlphabets,
  isPDATransitionApplicable,
  analyzePDADeterminism,
} from './pda-validator';
import { isEpsilonSymbol } from './nfa-validator';

export interface PDAConfiguration {
  id: string;
  stateId: string;
  inputIndex: number;
  stack: string[]; // Top is at stack[stack.length - 1]
  historySteps: PDAExecutionStep[];
  depth: number;
}

export interface PDAExecutionOptions {
  initialStackSymbol?: string;
  maxConfigurations?: number;
  maxSteps?: number;
  acceptanceMode?: PDAAcceptanceMode;
}

/**
 * Formats a PDA instantaneous description: (q, w, α)
 * Following standard formal language conventions (Hopcroft & Ullman, Sipser):
 *  - q: current state
 *  - w: remaining unread input string (or 'ε' if exhausted)
 *  - α: stack string with the TOP symbol shown at the LEFT
 */
export function formatInstantaneousDescription(
  stateLabel: string,
  remainingInput: string,
  stack: ReadonlyArray<string>
): string {
  const inputStr = remainingInput.length === 0 || remainingInput === 'ε' ? 'ε' : remainingInput;
  const stackStr = stack.length === 0 ? 'ε' : stack.slice().reverse().join('');
  return `(${stateLabel}, ${inputStr}, ${stackStr})`;
}

/**
 * Executes a Pushdown Automaton (PDA) on a given input string using nondeterministic BFS exploration.
 *
 * Stack Operation Convention for δ(q, a, X) -> (p, γ):
 *  - X: top of stack (stack.pop())
 *  - γ: replacement string e.g. "AZ0".
 *    Symbols in γ are pushed right-to-left so that γ[0] becomes the NEW TOP OF STACK.
 *    Example: γ = "AZ0" => push 'Z0', then push 'A' => top is 'A'.
 *
 * Acceptance Modes:
 *  - 'FINAL_STATE' (standard L(M)): input exhausted AND state ∈ F.
 *  - 'EMPTY_STACK' (standard N(M)): input exhausted AND stack is empty (length === 0).
 *  - 'BOTH' (Project Zero combined): input exhausted AND state ∈ F AND stack is empty.
 */
export function executePDA(
  graph: SolverGraphInput,
  inputString: string,
  options: PDAExecutionOptions = {}
): PDAExecutionResult {
  const initialStackSymbol = options.initialStackSymbol || 'Z0';
  const maxConfigurations = options.maxConfigurations || 2000;
  const maxSteps = options.maxSteps || 250;
  const acceptanceMode: PDAAcceptanceMode = options.acceptanceMode || 'FINAL_STATE';

  const { inputAlphabet, stackAlphabet } = computePDAAlphabets(graph, initialStackSymbol);
  const determinismAnalysis = analyzePDADeterminism(graph, initialStackSymbol);

  const validation = validatePDA(graph, initialStackSymbol);
  if (!validation.isValid) {
    return {
      isAccepted: false,
      acceptanceMode,
      finalStates: [],
      acceptingStates: [],
      rejectionReason: 'INVALID_MACHINE',
      steps: [],
      inputString,
      validationResult: validation,
      initialStackSymbol,
      inputAlphabet,
      stackAlphabet,
      determinismAnalysis,
      isExecutionLinear: true,
      branchingPointsCount: 0,
    };
  }

  const initialNode = graph.nodes.find((n) => n.isInitial);
  if (!initialNode) {
    return {
      isAccepted: false,
      acceptanceMode,
      finalStates: [],
      acceptingStates: [],
      rejectionReason: 'INVALID_MACHINE',
      steps: [],
      inputString,
      validationResult: validation,
      initialStackSymbol,
      inputAlphabet,
      stackAlphabet,
      determinismAnalysis,
      isExecutionLinear: true,
      branchingPointsCount: 0,
    };
  }

  // Pre-parse edge transition rules
  const edgeRules = graph.edges.map((e) => ({
    edge: e,
    rule: parsePDATransition(e.label, e.inputSymbol, e.stackTop, e.stackReplacement),
  }));

  const initialRemainingInput = inputString.length > 0 ? inputString : 'ε';
  const initialStack = [initialStackSymbol];
  const initialID = formatInstantaneousDescription(
    initialNode.label || initialNode.id,
    initialRemainingInput,
    initialStack
  );

  const isInitialAccepted = Boolean(
    inputString.length === 0 &&
      (acceptanceMode === 'EMPTY_STACK'
        ? initialStack.length === 0
        : acceptanceMode === 'BOTH'
        ? initialNode.isAccepting && initialStack.length === 0
        : initialNode.isAccepting)
  );

  // Initial Configuration
  const startConfig: PDAConfiguration = {
    id: `c_0`,
    stateId: initialNode.id,
    inputIndex: 0,
    stack: initialStack,
    historySteps: [
      {
        stepIndex: 0,
        currentStateId: initialNode.id,
        currentStateLabel: initialNode.label || initialNode.id,
        activeStates: [{ id: initialNode.id, label: initialNode.label || initialNode.id }],
        readSymbol: null,
        remainingInput: initialRemainingInput,
        stackBefore: [...initialStack],
        stackAfter: [...initialStack],
        instantaneousDescription: initialID,
        stackOperation: 'NOOP',
        isHalted: false,
        isAccepting: isInitialAccepted,
      },
    ],
    depth: 0,
  };

  const queue: PDAConfiguration[] = [startConfig];

  // Build Branch Tree Structure for visualization
  const allNodesMap = new Map<
    string,
    {
      id: string;
      parentId: string | null;
      stateId: string;
      stateLabel: string;
      inputIndex: number;
      stack: string[];
      transitionId?: string;
      readSymbol: string | null;
      depth: number;
      status: 'ACTIVE' | 'EXPLORED' | 'ACCEPTING' | 'REJECTING' | 'PRUNED';
      historySteps: PDAExecutionStep[];
      childIds: string[];
    }
  >();

  // Initialize Root Node in Map
  const rootNodeId = startConfig.id;
  allNodesMap.set(rootNodeId, {
    id: rootNodeId,
    parentId: null,
    stateId: startConfig.stateId,
    stateLabel: initialNode.label || initialNode.id,
    inputIndex: startConfig.inputIndex,
    stack: [...startConfig.stack],
    readSymbol: null,
    depth: 0,
    status: isInitialAccepted ? 'ACCEPTING' : 'EXPLORED',
    historySteps: startConfig.historySteps,
    childIds: [],
  });

  let maxDepthEncountered = 0;

  // Track parent-child relations during BFS
  const buildBranchTree = (): import('./types').PDABranchTree => {
    const buildNode = (id: string): import('./types').PDABranchNode => {
      const raw = allNodesMap.get(id)!;
      return {
        id: raw.id,
        parentId: raw.parentId,
        stateId: raw.stateId,
        stateLabel: raw.stateLabel,
        inputIndex: raw.inputIndex,
        stack: raw.stack,
        transitionId: raw.transitionId,
        readSymbol: raw.readSymbol,
        depth: raw.depth,
        status: raw.status,
        historySteps: raw.historySteps,
        children: raw.childIds.map(buildNode),
      };
    };

    return {
      root: buildNode(rootNodeId),
      totalNodes: allNodesMap.size,
      maxDepth: maxDepthEncountered,
    };
  };

  const visitedConfigKeys = new Set<string>();

  const makeConfigKey = (stateId: string, inputIdx: number, stack: string[]) =>
    `${stateId}|${inputIdx}|${JSON.stringify(stack)}`;

  visitedConfigKeys.add(makeConfigKey(startConfig.stateId, startConfig.inputIndex, startConfig.stack));

  let exploredCount = 0;
  let acceptingConfig: PDAConfiguration | null = null;
  let seenInputExhausted = false;
  let seenFinalState = false;
  let seenStackEmpty = false;
  let branchingPointsCount = 0;

  while (queue.length > 0) {
    if (exploredCount >= maxConfigurations) {
      return {
        isAccepted: false,
        isInconclusive: true,
        acceptanceMode,
        finalStates: [],
        acceptingStates: graph.nodes.filter((n) => n.isAccepting).map((n) => ({ id: n.id, label: n.label || n.id })),
        rejectionReason: 'INCONCLUSIVE_LIMIT',
        steps: queue[0]?.historySteps || [],
        inputString,
        validationResult: validation,
        initialStackSymbol,
        inputAlphabet,
        stackAlphabet,
        determinismAnalysis,
        isExecutionLinear: branchingPointsCount === 0,
        branchingPointsCount,
        branchTree: buildBranchTree(),
      };
    }

    const curr = queue.shift()!;
    exploredCount++;

    const currNode = graph.nodes.find((n) => n.id === curr.stateId)!;
    const currLabel = currNode.label || currNode.id;
    const isAtInputEnd = curr.inputIndex === inputString.length;

    if (isAtInputEnd) {
      seenInputExhausted = true;
      if (currNode.isAccepting) seenFinalState = true;
      if (curr.stack.length === 0) seenStackEmpty = true;
    }

    // Check Acceptance Criterion
    const isAcceptedHere =
      isAtInputEnd &&
      (acceptanceMode === 'EMPTY_STACK'
        ? curr.stack.length === 0
        : acceptanceMode === 'BOTH'
        ? currNode.isAccepting && curr.stack.length === 0
        : currNode.isAccepting);

    if (isAcceptedHere) {
      acceptingConfig = curr;
      break;
    }

    if (curr.depth >= maxSteps) {
      continue;
    }

    const currentInputSymbol = isAtInputEnd ? null : inputString[curr.inputIndex];
    const topStackSymbol = curr.stack.length > 0 ? curr.stack[curr.stack.length - 1] : null;

    // Find all matching PDA transitions using centralized pure helper
    const matchingTransitions: typeof edgeRules = [];
    for (const item of edgeRules) {
      if (isPDATransitionApplicable(item.rule, item.edge.sourceNodeId, curr.stateId, currentInputSymbol, topStackSymbol)) {
        matchingTransitions.push(item);
      }
    }

    if (matchingTransitions.length > 1) {
      branchingPointsCount++;
    }

    // Explore all applicable transitions
    for (const { edge, rule } of matchingTransitions) {
      // Construct New Stack
      const newStack = [...curr.stack];
      const hasPop = !isEpsilonSymbol(rule.stackTop) && newStack.length > 0;
      if (hasPop) {
        newStack.pop(); // Pop matched top symbol
      }

      const pushedSymbols = parseStackSymbols(rule.stackReplacement);
      // Push right-to-left so symbols[0] is at the TOP of the stack
      for (let i = pushedSymbols.length - 1; i >= 0; i--) {
        const s = pushedSymbols[i];
        if (s.trim().length > 0 && !isEpsilonSymbol(s)) {
          newStack.push(s);
        }
      }

      // Classify stack operation
      let stackOperation: PDAStackOperation = 'NOOP';
      if (hasPop && pushedSymbols.length === 0) {
        stackOperation = 'POP';
      } else if (!hasPop && pushedSymbols.length > 0) {
        stackOperation = 'PUSH';
      } else if (hasPop && pushedSymbols.length === 1 && pushedSymbols[0] === rule.stackTop) {
        stackOperation = 'NOOP';
      } else if (hasPop && pushedSymbols.length > 0) {
        stackOperation = 'REPLACE';
      }

      const nextInputIdx = isEpsilonSymbol(rule.inputSymbol)
        ? curr.inputIndex
        : curr.inputIndex + 1;

      const targetNode = graph.nodes.find((n) => n.id === edge.targetNodeId);
      if (!targetNode) continue;

      const targetLabel = targetNode.label || targetNode.id;
      const isNextAtEnd = nextInputIdx === inputString.length;

      const isNextAccepting = Boolean(
        isNextAtEnd &&
          (acceptanceMode === 'EMPTY_STACK'
            ? newStack.length === 0
            : acceptanceMode === 'BOTH'
            ? targetNode.isAccepting && newStack.length === 0
            : targetNode.isAccepting)
      );

      const remainingInputStr = inputString.slice(nextInputIdx) || 'ε';
      const idStr = formatInstantaneousDescription(targetLabel, remainingInputStr, newStack);

      const nextStep: PDAExecutionStep = {
        stepIndex: curr.historySteps.length,
        currentStateId: curr.stateId,
        currentStateLabel: currLabel,
        activeStates: [{ id: targetNode.id, label: targetLabel }],
        readSymbol: isEpsilonSymbol(rule.inputSymbol) ? null : currentInputSymbol,
        remainingInput: remainingInputStr,
        stackBefore: [...curr.stack],
        stackAfter: [...newStack],
        instantaneousDescription: idStr,
        stackOperation,
        stackTopRead: isEpsilonSymbol(rule.stackTop) ? null : rule.stackTop,
        stackReplacement: rule.stackReplacement,
        transitionId: edge.id,
        nextStateId: targetNode.id,
        nextStateLabel: targetLabel,
        isHalted: isNextAccepting,
        isAccepting: isNextAccepting,
      };

      const nextConfig: PDAConfiguration = {
        id: `c_${exploredCount}_${nextInputIdx}_${targetNode.id}`,
        stateId: targetNode.id,
        inputIndex: nextInputIdx,
        stack: newStack,
        historySteps: [...curr.historySteps, nextStep],
        depth: curr.depth + 1,
      };

      if (nextConfig.depth > maxDepthEncountered) {
        maxDepthEncountered = nextConfig.depth;
      }

      // Record Branch Node in All Nodes Map
      allNodesMap.set(nextConfig.id, {
        id: nextConfig.id,
        parentId: curr.id,
        stateId: targetNode.id,
        stateLabel: targetLabel,
        inputIndex: nextInputIdx,
        stack: [...newStack],
        transitionId: edge.id,
        readSymbol: isEpsilonSymbol(rule.inputSymbol) ? null : currentInputSymbol,
        depth: nextConfig.depth,
        status: isNextAccepting ? 'ACCEPTING' : 'EXPLORED',
        historySteps: nextConfig.historySteps,
        childIds: [],
      });

      const parentNode = allNodesMap.get(curr.id);
      if (parentNode) {
        parentNode.childIds.push(nextConfig.id);
      }

      const key = makeConfigKey(nextConfig.stateId, nextConfig.inputIndex, nextConfig.stack);
      if (!visitedConfigKeys.has(key)) {
        visitedConfigKeys.add(key);
        queue.push(nextConfig);
      }
    }
  }

  const isExecutionLinear = branchingPointsCount === 0;

  if (acceptingConfig) {
    const finalNode = graph.nodes.find((n) => n.id === acceptingConfig!.stateId)!;
    return {
      isAccepted: true,
      acceptanceMode,
      finalStates: [{ id: finalNode.id, label: finalNode.label || finalNode.id }],
      acceptingStates: graph.nodes.filter((n) => n.isAccepting).map((n) => ({ id: n.id, label: n.label || n.id })),
      steps: acceptingConfig.historySteps,
      inputString,
      validationResult: validation,
      initialStackSymbol,
      inputAlphabet,
      stackAlphabet,
      determinismAnalysis,
      isExecutionLinear,
      branchingPointsCount,
      branchTree: buildBranchTree(),
    };
  }

  // Derive precise rejection reason
  let computedRejectionReason: PDARejectionReason = 'NON_ACCEPTING_FINAL_STATE';
  if (acceptanceMode === 'EMPTY_STACK') {
    if (seenInputExhausted && !seenStackEmpty) {
      computedRejectionReason = 'STACK_NOT_EMPTY';
    } else if (!seenInputExhausted) {
      computedRejectionReason = 'UNCONSUMED_INPUT';
    } else {
      computedRejectionReason = 'NO_TRANSITION';
    }
  } else if (acceptanceMode === 'BOTH') {
    if (seenInputExhausted && !seenStackEmpty) {
      computedRejectionReason = 'STACK_NOT_EMPTY';
    } else if (seenInputExhausted && !seenFinalState) {
      computedRejectionReason = 'NON_ACCEPTING_FINAL_STATE';
    } else {
      computedRejectionReason = 'UNCONSUMED_INPUT';
    }
  } else {
    // FINAL_STATE
    if (!seenInputExhausted) {
      computedRejectionReason = 'UNCONSUMED_INPUT';
    } else if (!seenFinalState) {
      computedRejectionReason = 'NON_ACCEPTING_FINAL_STATE';
    } else {
      computedRejectionReason = 'NO_TRANSITION';
    }
  }

  return {
    isAccepted: false,
    acceptanceMode,
    finalStates: [],
    acceptingStates: graph.nodes.filter((n) => n.isAccepting).map((n) => ({ id: n.id, label: n.label || n.id })),
    rejectionReason: computedRejectionReason,
    steps: startConfig.historySteps,
    inputString,
    validationResult: validation,
    initialStackSymbol,
    inputAlphabet,
    stackAlphabet,
    determinismAnalysis,
    isExecutionLinear,
    branchingPointsCount,
    branchTree: buildBranchTree(),
  };
}
