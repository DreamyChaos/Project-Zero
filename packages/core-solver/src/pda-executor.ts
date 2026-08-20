import {
  SolverGraphInput,
  PDAExecutionResult,
  PDAExecutionStep,
} from './types';
import { validatePDA, parsePDATransition } from './pda-validator';
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
}

/**
 * Executes a Pushdown Automaton (PDA) on a given input string using nondeterministic BFS exploration.
 *
 * Stack Operation Convention for δ(q, a, X) -> (p, γ):
 *  - X: top of stack (stack.pop())
 *  - γ: replacement string e.g. "AZ0".
 *    Symbols in γ are pushed right-to-left so that γ[0] becomes the NEW TOP OF STACK.
 *    Example: γ = "AZ0" => push 'Z0', then push 'A' => top is 'A'.
 */
export function executePDA(
  graph: SolverGraphInput,
  inputString: string,
  options: PDAExecutionOptions = {}
): PDAExecutionResult {
  const initialStackSymbol = options.initialStackSymbol || 'Z0';
  const maxConfigurations = options.maxConfigurations || 2000;
  const maxSteps = options.maxSteps || 250;

  const validation = validatePDA(graph, initialStackSymbol);
  if (!validation.isValid) {
    return {
      isAccepted: false,
      finalStates: [],
      acceptingStates: [],
      rejectionReason: 'INVALID_MACHINE',
      steps: [],
      inputString,
      validationResult: validation,
      initialStackSymbol,
    };
  }

  const initialNode = graph.nodes.find((n) => n.isInitial);
  if (!initialNode) {
    return {
      isAccepted: false,
      finalStates: [],
      acceptingStates: [],
      rejectionReason: 'INVALID_MACHINE',
      steps: [],
      inputString,
      validationResult: validation,
      initialStackSymbol,
    };
  }

  // Pre-parse edge transition rules
  const edgeRules = graph.edges.map((e) => ({
    edge: e,
    rule: parsePDATransition(e.label, e.inputSymbol, e.stackTop, e.stackReplacement),
  }));

  // Initial Configuration
  const startConfig: PDAConfiguration = {
    id: `c_0`,
    stateId: initialNode.id,
    inputIndex: 0,
    stack: [initialStackSymbol],
    historySteps: [
      {
        stepIndex: 0,
        currentStateId: initialNode.id,
        currentStateLabel: initialNode.label || initialNode.id,
        activeStates: [{ id: initialNode.id, label: initialNode.label || initialNode.id }],
        readSymbol: null,
        remainingInput: inputString.length > 0 ? inputString : 'ε',
        stackBefore: [initialStackSymbol],
        stackAfter: [initialStackSymbol],
        isHalted: false,
        isAccepting: Boolean(initialNode.isAccepting && inputString.length === 0),
      },
    ],
    depth: 0,
  };

  const queue: PDAConfiguration[] = [startConfig];

  // Build Branch Tree Structure for visualization
  const allNodesMap = new Map<string, {
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
  }>();

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
    status: 'EXPLORED',
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

  while (queue.length > 0) {
    if (exploredCount >= maxConfigurations) {
      return {
        isAccepted: false,
        isInconclusive: true,
        finalStates: [],
        acceptingStates: [],
        rejectionReason: 'INCONCLUSIVE_LIMIT',
        steps: queue[0]?.historySteps || [],
        inputString,
        validationResult: validation,
        initialStackSymbol,
        branchTree: buildBranchTree(),
      };
    }

    const curr = queue.shift()!;
    exploredCount++;

    const currNode = graph.nodes.find((n) => n.id === curr.stateId)!;
    const currLabel = currNode.label || currNode.id;
    const isAtInputEnd = curr.inputIndex === inputString.length;

    // Check Acceptance by Final State
    if (isAtInputEnd && currNode.isAccepting) {
      acceptingConfig = curr;
      break;
    }

    if (curr.depth >= maxSteps) {
      continue;
    }

    const currentInputSymbol = isAtInputEnd ? null : inputString[curr.inputIndex];
    const topStackSymbol = curr.stack.length > 0 ? curr.stack[curr.stack.length - 1] : null;

    // Find all matching PDA transitions
    for (const { edge, rule } of edgeRules) {
      if (edge.sourceNodeId !== curr.stateId) continue;

      const inputMatches =
        isEpsilonSymbol(rule.inputSymbol) ||
        (currentInputSymbol !== null && rule.inputSymbol === currentInputSymbol);

      if (!inputMatches) continue;

      const stackMatches =
        isEpsilonSymbol(rule.stackTop) ||
        (topStackSymbol !== null && rule.stackTop === topStackSymbol);

      if (!stackMatches) continue;

      // Construct New Stack
      const newStack = [...curr.stack];
      if (!isEpsilonSymbol(rule.stackTop) && newStack.length > 0) {
        newStack.pop(); // Pop matched top symbol
      }

      if (!isEpsilonSymbol(rule.stackReplacement)) {
        // Parse symbols e.g. "AZ0" => ["A", "Z0"] or "AA" => ["A", "A"]
        // Matches capital/lowercase letters followed by optional digits/subscripts
        let symbols: string[];
        if (rule.stackReplacement.includes(' ')) {
          symbols = rule.stackReplacement.trim().split(/\s+/).filter((s) => s.length > 0);
        } else if (rule.stackReplacement.startsWith('V_')) {
          symbols = [rule.stackReplacement];
        } else {
          symbols = rule.stackReplacement.match(/[A-Za-z][0-9_]*|[^A-Za-z0-9_]/g) || [rule.stackReplacement];
        }
        for (let i = symbols.length - 1; i >= 0; i--) {
          const s = symbols[i];
          if (s.trim().length > 0 && !isEpsilonSymbol(s)) {
            newStack.push(s);
          }
        }
      }

      const nextInputIdx = isEpsilonSymbol(rule.inputSymbol)
        ? curr.inputIndex
        : curr.inputIndex + 1;

      const targetNode = graph.nodes.find((n) => n.id === edge.targetNodeId);
      if (!targetNode) continue;

      const targetLabel = targetNode.label || targetNode.id;
      const isNextAtEnd = nextInputIdx === inputString.length;
      const isNextAccepting = Boolean(targetNode.isAccepting && isNextAtEnd);

      const nextStep: PDAExecutionStep = {
        stepIndex: curr.historySteps.length,
        currentStateId: curr.stateId,
        currentStateLabel: currLabel,
        activeStates: [{ id: targetNode.id, label: targetLabel }],
        readSymbol: isEpsilonSymbol(rule.inputSymbol) ? null : currentInputSymbol,
        remainingInput: inputString.slice(nextInputIdx) || 'ε',
        stackBefore: [...curr.stack],
        stackAfter: [...newStack],
        transitionId: edge.id,
        nextStateId: targetNode.id,
        nextStateLabel: targetLabel,
        isHalted: isNextAccepting || isNextAtEnd,
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

  if (acceptingConfig) {
    const finalNode = graph.nodes.find((n) => n.id === acceptingConfig!.stateId)!;
    return {
      isAccepted: true,
      finalStates: [{ id: finalNode.id, label: finalNode.label || finalNode.id }],
      acceptingStates: graph.nodes.filter((n) => n.isAccepting).map((n) => ({ id: n.id, label: n.label || n.id })),
      steps: acceptingConfig.historySteps,
      inputString,
      validationResult: validation,
      initialStackSymbol,
      branchTree: buildBranchTree(),
    };
  }

  return {
    isAccepted: false,
    finalStates: [],
    acceptingStates: graph.nodes.filter((n) => n.isAccepting).map((n) => ({ id: n.id, label: n.label || n.id })),
    rejectionReason: 'NON_ACCEPTING_FINAL_STATE',
    steps: startConfig.historySteps,
    inputString,
    validationResult: validation,
    initialStackSymbol,
    branchTree: buildBranchTree(),
  };
}
