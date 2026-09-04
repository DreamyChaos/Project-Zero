import {
  SolverGraphInput,
  LanguageFinitenessResult,
  LanguageMembershipResult,
  RegularLanguageAnalysis,
  RegularLanguageOperationResult,
  RegularLanguageClosureOp,
} from './types';
import { AutomatonType } from '@project-zero/shared';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import { executeDFA } from './dfa-executor';
import { executeNFA } from './nfa-executor';
import { validateDFA } from './dfa-validator';
import { validateNFA, normalizeSymbol, isEpsilonSymbol } from './nfa-validator';
import { convertAutomatonToRegex } from './fa-to-regex';
import { constructProductAutomaton, complementDFA } from './automata-operations';

/**
 * Extracts and sorts the unique terminal symbols Σ of an automaton graph.
 */
export function extractAlphabet(graph: SolverGraphInput): string[] {
  const symbols = new Set<string>();
  for (const edge of graph.edges) {
    const sym = normalizeSymbol(edge.label);
    if (sym.length > 0 && !isEpsilonSymbol(sym)) {
      symbols.add(sym);
    }
  }
  return Array.from(symbols).sort();
}

/**
 * Pure deterministic graph analysis: Determines whether a Regular Language L(M) is Finite or Infinite.
 *
 * Mathematical Invariant:
 * L(M) is infinite <=> there exists a directed cycle in the subgraph of states that are both
 * reachable from the initial state (q0 ~> q) AND co-accessible to an accepting state (q ~> F).
 */
export function analyzeLanguageFiniteness(
  graph: SolverGraphInput,
  _machineType: AutomatonType = 'DFA'
): LanguageFinitenessResult {
  if (graph.nodes.length === 0) {
    return {
      isFinite: true,
      reachableStates: [],
      coAccessibleStates: [],
      usefulStates: [],
      cyclesDetected: [],
      explanation: 'Language is empty (0 states). Empty language Ø is finite (|L| = 0).',
      maxStringLength: 0,
    };
  }

  const initialNode = graph.nodes.find((n) => n.isInitial);
  if (!initialNode) {
    return {
      isFinite: true,
      reachableStates: [],
      coAccessibleStates: [],
      usefulStates: [],
      cyclesDetected: [],
      explanation: 'No initial state found. Language is empty (finite).',
      maxStringLength: 0,
    };
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const acceptingIds = new Set(graph.nodes.filter((n) => n.isAccepting).map((n) => n.id));

  // 1. Forward reachability from initial state q0: R = { q | q0 ~> q }
  const reachable = new Set<string>();
  const forwardQueue: string[] = [initialNode.id];
  reachable.add(initialNode.id);

  while (forwardQueue.length > 0) {
    const curr = forwardQueue.shift()!;
    for (const edge of graph.edges) {
      if (edge.sourceNodeId === curr && !reachable.has(edge.targetNodeId)) {
        reachable.add(edge.targetNodeId);
        forwardQueue.push(edge.targetNodeId);
      }
    }
  }

  // 2. Backward co-accessibility to accepting states F: C = { q | q ~> F }
  const coAccessible = new Set<string>();
  const backwardQueue: string[] = Array.from(acceptingIds);
  acceptingIds.forEach((id) => coAccessible.add(id));

  while (backwardQueue.length > 0) {
    const curr = backwardQueue.shift()!;
    for (const edge of graph.edges) {
      if (edge.targetNodeId === curr && !coAccessible.has(edge.sourceNodeId)) {
        coAccessible.add(edge.sourceNodeId);
        backwardQueue.push(edge.sourceNodeId);
      }
    }
  }

  // 3. Useful (live) states: U = R ∩ C
  const usefulStateIds = new Set<string>();
  for (const id of reachable) {
    if (coAccessible.has(id)) {
      usefulStateIds.add(id);
    }
  }

  const getLabel = (id: string) => nodeMap.get(id)?.label || id;
  const usefulList = Array.from(usefulStateIds).map(getLabel);
  const reachableList = Array.from(reachable).map(getLabel);
  const coAccessibleList = Array.from(coAccessible).map(getLabel);

  if (usefulStateIds.size === 0) {
    return {
      isFinite: true,
      reachableStates: reachableList,
      coAccessibleStates: coAccessibleList,
      usefulStates: [],
      cyclesDetected: [],
      explanation: 'No path connects initial state to any accepting state. L = Ø (finite, 0 strings).',
      maxStringLength: 0,
    };
  }

  // 4. Cycle Detection in Useful Subgraph using 3-Color DFS (0: Unvisited, 1: Visiting/Gray, 2: Visited/Black)
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];

  for (const id of usefulStateIds) {
    color.set(id, 0);
  }

  const dfsVisit = (u: string, path: string[]) => {
    color.set(u, 1);
    path.push(u);

    for (const edge of graph.edges) {
      if (edge.sourceNodeId === u && usefulStateIds.has(edge.targetNodeId)) {
        const v = edge.targetNodeId;
        const vColor = color.get(v) ?? 0;

        if (vColor === 1) {
          // Back-edge found! Cycle exists
          const cycleStartIndex = path.indexOf(v);
          if (cycleStartIndex !== -1) {
            const cyclePath = path.slice(cycleStartIndex).map(getLabel);
            cyclePath.push(getLabel(v)); // close the cycle
            cycles.push(cyclePath);
          }
        } else if (vColor === 0) {
          parent.set(v, u);
          dfsVisit(v, path);
        }
      }
    }

    path.pop();
    color.set(u, 2);
  };

  for (const u of usefulStateIds) {
    if ((color.get(u) ?? 0) === 0) {
      dfsVisit(u, []);
    }
  }

  if (cycles.length > 0) {
    const cycleLabels = cycles.map((c) => c.join(' → ')).slice(0, 3).join(', ');
    return {
      isFinite: false,
      reachableStates: reachableList,
      coAccessibleStates: coAccessibleList,
      usefulStates: usefulList,
      cyclesDetected: cycles,
      explanation: `Language is INFINITE. Detected reachable directed cycle(s) in accepting paths: [${cycleLabels}]. A cycle in useful states allows unbounded pumpable paths.`,
    };
  }

  // 5. Acyclic useful subgraph: compute maximum string length (longest path in DAG)
  const memoDist = new Map<string, number>();
  const getLongestPath = (u: string): number => {
    if (memoDist.has(u)) return memoDist.get(u)!;
    let maxSub = 0;
    for (const edge of graph.edges) {
      if (edge.sourceNodeId === u && usefulStateIds.has(edge.targetNodeId)) {
        const sub = 1 + getLongestPath(edge.targetNodeId);
        if (sub > maxSub) maxSub = sub;
      }
    }
    memoDist.set(u, maxSub);
    return maxSub;
  };

  const maxLen = getLongestPath(initialNode.id);

  return {
    isFinite: true,
    reachableStates: reachableList,
    coAccessibleStates: coAccessibleList,
    usefulStates: usefulList,
    cyclesDetected: [],
    explanation: `Language is FINITE. All paths from initial state to accepting states are acyclic (maximum recognized string length: ${maxLen}).`,
    maxStringLength: maxLen,
  };
}

/**
 * Pure membership tester: verifies whether string w belongs to regular language L(M).
 */
export function testLanguageMembership(
  graph: SolverGraphInput,
  machineType: AutomatonType,
  inputString: string
): LanguageMembershipResult {
  if (machineType === 'NFA') {
    const valNfa = validateNFA(graph);
    if (!valNfa.isValid) {
      return {
        input: inputString,
        isMember: false,
        executionTrace: [`NFA Validation Error: ${valNfa.errors[0]?.message || 'Invalid machine'}`],
      };
    }
    const res = executeNFA(graph, inputString);
    const trace = res.steps.map(
      (p) =>
        `Step ${p.stepIndex}: symbol '${p.readSymbol || 'ε'}' -> states {${p.nextStates.map((s) => s.label).join(', ')}}`
    );
    return {
      input: inputString,
      isMember: res.isAccepted,
      executionTrace: trace,
      finalState: res.finalStates.length > 0 ? `{${res.finalStates.map((s) => s.label).join(', ')}}` : undefined,
    };
  }

  const valDfa = validateDFA(graph);
  if (!valDfa.isValid) {
    return {
      input: inputString,
      isMember: false,
      executionTrace: [`DFA Validation Error: ${valDfa.errors[0]?.message || 'Invalid machine'}`],
    };
  }

  const res = executeDFA(graph, inputString);
  const trace = res.steps.map(
    (p) =>
      `Step ${p.stepIndex}: state ${p.currentStateLabel} --${p.readSymbol || 'ε'}--> state ${p.nextStateLabel || 'halt'}`
  );
  return {
    input: inputString,
    isMember: res.isAccepted,
    executionTrace: trace,
    finalState: res.finalStateLabel || undefined,
  };
}

/**
 * Generates verified accepted and rejected example strings sorted by short-lex order.
 */
export function generateLanguageExamples(
  graph: SolverGraphInput,
  machineType: AutomatonType,
  maxPerCategory = 8,
  maxLen = 5
): { accepted: string[]; rejected: string[] } {
  const alphabet = extractAlphabet(graph);
  const effectiveAlphabet = alphabet.length > 0 ? alphabet : ['0', '1'];

  const accepted: string[] = [];
  const rejected: string[] = [];

  // Short-lex queue generation: '', 'a', 'b', 'aa', 'ab', ...
  const candidateQueue: string[] = [''];

  while (candidateQueue.length > 0 && (accepted.length < maxPerCategory || rejected.length < maxPerCategory)) {
    const candidate = candidateQueue.shift()!;
    const test = testLanguageMembership(graph, machineType, candidate);

    if (test.isMember) {
      if (accepted.length < maxPerCategory && !accepted.includes(candidate)) {
        accepted.push(candidate);
      }
    } else {
      if (rejected.length < maxPerCategory && !rejected.includes(candidate)) {
        rejected.push(candidate);
      }
    }

    if (candidate.length < maxLen) {
      for (const sym of effectiveAlphabet) {
        candidateQueue.push(candidate + sym);
      }
    }
  }

  return { accepted, rejected };
}

/**
 * Comprehensive analysis of a Regular Language.
 */
export function analyzeRegularLanguage(
  graph: SolverGraphInput,
  machineType: AutomatonType = 'DFA'
): RegularLanguageAnalysis {
  const alphabet = extractAlphabet(graph);
  const finiteness = analyzeLanguageFiniteness(graph, machineType);
  const examples = generateLanguageExamples(graph, machineType);
  const regexRes = convertAutomatonToRegex(graph);
  const epsTest = testLanguageMembership(graph, machineType, '');

  const hasAccepting = graph.nodes.some((n) => n.isAccepting);
  const isEmpty = !hasAccepting || finiteness.usefulStates.length === 0;

  return {
    alphabet,
    finiteness,
    acceptedExamples: examples.accepted,
    rejectedExamples: examples.rejected,
    synthesizedRegex: regexRes.simplifiedRegex || (isEmpty ? 'Ø' : 'ε'),
    isEmpty,
    containsEpsilon: epsTest.isMember,
  };
}

/**
 * Pure Automata Concatenation Construction: M_concat = M_A · M_B
 * Connects accepting states of M_A to the initial state of M_B via ε-transitions.
 */
export function concatenateAutomata(
  graphA: SolverGraphInput,
  graphB: SolverGraphInput
): SolverGraphInput {
  const initA = graphA.nodes.find((n) => n.isInitial);
  const initB = graphB.nodes.find((n) => n.isInitial);

  if (!initA || !initB) {
    return { nodes: [], edges: [] };
  }

  const nodesA: StateNode[] = graphA.nodes.map((n) => ({
    id: `A_${n.id}`,
    label: `A_${n.label}`,
    x: n.x,
    y: n.y,
    isInitial: n.isInitial,
    isAccepting: false, // Internal in concat
  }));

  const nodesB: StateNode[] = graphB.nodes.map((n) => ({
    id: `B_${n.id}`,
    label: `B_${n.label}`,
    x: n.x + 350,
    y: n.y,
    isInitial: false, // Initial only from A
    isAccepting: n.isAccepting,
  }));

  const edgesA: TransitionEdge[] = graphA.edges.map((e, idx) => ({
    id: `eA_${idx + 1}`,
    sourceNodeId: `A_${e.sourceNodeId}`,
    targetNodeId: `A_${e.targetNodeId}`,
    label: e.label,
  }));

  const edgesB: TransitionEdge[] = graphB.edges.map((e, idx) => ({
    id: `eB_${idx + 1}`,
    sourceNodeId: `B_${e.sourceNodeId}`,
    targetNodeId: `B_${e.targetNodeId}`,
    label: e.label,
  }));

  // ε-transitions from each accepting state in A to initial state of B
  const bridgeEdges: TransitionEdge[] = [];
  let bridgeIdx = 1;
  for (const n of graphA.nodes) {
    if (n.isAccepting) {
      bridgeEdges.push({
        id: `e_bridge_${bridgeIdx++}`,
        sourceNodeId: `A_${n.id}`,
        targetNodeId: `B_${initB.id}`,
        label: 'ε',
      });
    }
  }

  return {
    nodes: [...nodesA, ...nodesB],
    edges: [...edgesA, ...edgesB, ...bridgeEdges],
  };
}

/**
 * Pure Automata Kleene Star Construction: M_star = M*
 * Adds a new initial & accepting state q_start and feedback ε-transitions from all F to q0.
 */
export function kleeneStarAutomaton(graph: SolverGraphInput): SolverGraphInput {
  const initNode = graph.nodes.find((n) => n.isInitial);
  if (!initNode) {
    return { nodes: [], edges: [] };
  }

  const startId = `q_star_init_${Date.now()}`;
  const startNode: StateNode = {
    id: startId,
    label: 'q_s*',
    x: 80,
    y: 180,
    isInitial: true,
    isAccepting: true, // Kleene star always contains ε
  };

  const origNodes: StateNode[] = graph.nodes.map((n) => ({
    ...n,
    x: n.x + 150,
    isInitial: false,
    isAccepting: n.isAccepting,
  }));

  const origEdges: TransitionEdge[] = graph.edges.map((e) => ({ ...e }));

  // 1. ε-transition from new start node to original initial state
  const newEdges: TransitionEdge[] = [
    {
      id: `e_star_init`,
      sourceNodeId: startId,
      targetNodeId: initNode.id,
      label: 'ε',
    },
  ];

  // 2. Feedback ε-transitions from all accepting states back to original initial state
  let feedIdx = 1;
  for (const n of graph.nodes) {
    if (n.isAccepting) {
      newEdges.push({
        id: `e_star_loop_${feedIdx++}`,
        sourceNodeId: n.id,
        targetNodeId: initNode.id,
        label: 'ε',
      });
    }
  }

  return {
    nodes: [startNode, ...origNodes],
    edges: [...origEdges, ...newEdges],
  };
}

/**
 * Applies a closure operation on regular language representations.
 */
export function applyRegularLanguageOperation(
  op: RegularLanguageClosureOp,
  operandA: { graph: SolverGraphInput; type: AutomatonType },
  operandB?: { graph: SolverGraphInput; type: AutomatonType }
): RegularLanguageOperationResult {
  let resultGraph: SolverGraphInput;
  let resultType: AutomatonType = 'DFA';

  try {
    switch (op) {
      case 'UNION':
      case 'INTERSECTION':
      case 'DIFFERENCE': {
        if (!operandB) {
          return {
            success: false,
            operation: op,
            nodes: [],
            edges: [],
            machineType: 'DFA',
            alphabet: [],
            resultRegex: '',
            finiteness: {
              isFinite: true,
              reachableStates: [],
              coAccessibleStates: [],
              usefulStates: [],
              cyclesDetected: [],
              explanation: 'Second operand required for binary operation.',
            },
            acceptedExamples: [],
            rejectedExamples: [],
            errorMessage: `Second language operand is required for ${op}.`,
          };
        }
        const prod = constructProductAutomaton(
          operandA.graph,
          operandA.type,
          operandB.graph,
          operandB.type,
          op
        );
        if (!prod.success) {
          return {
            success: false,
            operation: op,
            nodes: [],
            edges: [],
            machineType: 'DFA',
            alphabet: [],
            resultRegex: '',
            finiteness: {
              isFinite: true,
              reachableStates: [],
              coAccessibleStates: [],
              usefulStates: [],
              cyclesDetected: [],
              explanation: prod.errorMessage || 'Operation failed',
            },
            acceptedExamples: [],
            rejectedExamples: [],
            errorMessage: prod.errorMessage,
          };
        }
        resultGraph = { nodes: prod.nodes as StateNode[], edges: prod.edges as TransitionEdge[] };
        resultType = 'DFA';
        break;
      }

      case 'COMPLEMENT': {
        const comp = complementDFA(operandA.graph, operandA.type);
        if (!comp.success) {
          return {
            success: false,
            operation: op,
            nodes: [],
            edges: [],
            machineType: 'DFA',
            alphabet: [],
            resultRegex: '',
            finiteness: {
              isFinite: true,
              reachableStates: [],
              coAccessibleStates: [],
              usefulStates: [],
              cyclesDetected: [],
              explanation: comp.errorMessage || 'Complement failed',
            },
            acceptedExamples: [],
            rejectedExamples: [],
            errorMessage: comp.errorMessage,
          };
        }
        resultGraph = { nodes: comp.nodes as StateNode[], edges: comp.edges as TransitionEdge[] };
        resultType = 'DFA';
        break;
      }

      case 'CONCATENATION': {
        if (!operandB) {
          return {
            success: false,
            operation: op,
            nodes: [],
            edges: [],
            machineType: 'NFA',
            alphabet: [],
            resultRegex: '',
            finiteness: {
              isFinite: true,
              reachableStates: [],
              coAccessibleStates: [],
              usefulStates: [],
              cyclesDetected: [],
              explanation: 'Second operand required for concatenation.',
            },
            acceptedExamples: [],
            rejectedExamples: [],
            errorMessage: 'Second language operand is required for Concatenation.',
          };
        }
        resultGraph = concatenateAutomata(operandA.graph, operandB.graph);
        resultType = 'NFA';
        break;
      }

      case 'KLEENE_STAR': {
        resultGraph = kleeneStarAutomaton(operandA.graph);
        resultType = 'NFA';
        break;
      }

      default:
        throw new Error(`Unsupported closure operation: ${op}`);
    }

    const alphabet = extractAlphabet(resultGraph);
    const finiteness = analyzeLanguageFiniteness(resultGraph, resultType);
    const examples = generateLanguageExamples(resultGraph, resultType);
    const regexRes = convertAutomatonToRegex(resultGraph);

    return {
      success: true,
      operation: op,
      nodes: resultGraph.nodes as StateNode[],
      edges: resultGraph.edges as TransitionEdge[],
      machineType: resultType,
      alphabet,
      resultRegex: regexRes.simplifiedRegex || 'Ø',
      finiteness,
      acceptedExamples: examples.accepted,
      rejectedExamples: examples.rejected,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      operation: op,
      nodes: [],
      edges: [],
      machineType: resultType,
      alphabet: [],
      resultRegex: '',
      finiteness: {
        isFinite: true,
        reachableStates: [],
        coAccessibleStates: [],
        usefulStates: [],
        cyclesDetected: [],
        explanation: errorMsg,
      },
      acceptedExamples: [],
      rejectedExamples: [],
      errorMessage: errorMsg,
    };
  }
}
