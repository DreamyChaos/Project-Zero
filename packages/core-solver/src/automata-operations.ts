import {
  SolverGraphInput,
  ProductAutomatonResult,
  ProductAutomatonStepResult,
  LanguageOperationType,
  TransformationPipelineResult,
  TransformationPipelineStepResult,
  TransformationStepType,
} from './types';
import { validateDFA } from './dfa-validator';
import { validateNFA, normalizeSymbol, isEpsilonSymbol } from './nfa-validator';
import { convertNfaToDfa } from './nfa-to-dfa';
import { minimizeDFA } from './dfa-minimizer';
import { AutomatonType } from '@project-zero/shared';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

const IMPLICIT_TRAP = '__implicit_trap__';

/**
 * Pure deterministic function: Constructs the product automaton M_A × M_B
 * for binary boolean language operations (UNION, INTERSECTION, DIFFERENCE, SYMMETRIC_DIFFERENCE).
 *
 * Automatically converts NFA operands to DFAs via subset construction prior to product generation.
 */
export function constructProductAutomaton(
  graphA: SolverGraphInput,
  typeA: AutomatonType = 'DFA',
  graphB: SolverGraphInput,
  typeB: AutomatonType = 'DFA',
  operation: LanguageOperationType = 'UNION'
): ProductAutomatonResult {
  let targetGraphA = graphA;
  let targetGraphB = graphB;

  if (typeA === 'NFA') {
    const valNfaA = validateNFA(graphA);
    if (!valNfaA.isValid) {
      return {
        success: false,
        operation,
        nodes: [],
        edges: [],
        alphabet: [],
        reachableStateCount: 0,
        acceptingStateCount: 0,
        errorMessage: `Operand A NFA validation failed: ${valNfaA.errors[0]?.message || 'Invalid machine'}`,
      };
    }
    const convA = convertNfaToDfa(graphA);
    if (!convA.success) {
      return {
        success: false,
        operation,
        nodes: [],
        edges: [],
        alphabet: [],
        reachableStateCount: 0,
        acceptingStateCount: 0,
        errorMessage: `Operand A NFA to DFA conversion failed: ${convA.errorMessage || 'Conversion error'}`,
      };
    }
    targetGraphA = { nodes: convA.nodes, edges: convA.edges };
  }

  if (typeB === 'NFA') {
    const valNfaB = validateNFA(graphB);
    if (!valNfaB.isValid) {
      return {
        success: false,
        operation,
        nodes: [],
        edges: [],
        alphabet: [],
        reachableStateCount: 0,
        acceptingStateCount: 0,
        errorMessage: `Operand B NFA validation failed: ${valNfaB.errors[0]?.message || 'Invalid machine'}`,
      };
    }
    const convB = convertNfaToDfa(graphB);
    if (!convB.success) {
      return {
        success: false,
        operation,
        nodes: [],
        edges: [],
        alphabet: [],
        reachableStateCount: 0,
        acceptingStateCount: 0,
        errorMessage: `Operand B NFA to DFA conversion failed: ${convB.errorMessage || 'Conversion error'}`,
      };
    }
    targetGraphB = { nodes: convB.nodes, edges: convB.edges };
  }

  const valA = validateDFA(targetGraphA);
  if (!valA.isValid) {
    return {
      success: false,
      operation,
      nodes: [],
      edges: [],
      alphabet: [],
      reachableStateCount: 0,
      acceptingStateCount: 0,
      errorMessage: `Operand A DFA validation failed: ${valA.errors[0]?.message || 'Invalid machine'}`,
    };
  }

  const valB = validateDFA(targetGraphB);
  if (!valB.isValid) {
    return {
      success: false,
      operation,
      nodes: [],
      edges: [],
      alphabet: [],
      reachableStateCount: 0,
      acceptingStateCount: 0,
      errorMessage: `Operand B DFA validation failed: ${valB.errors[0]?.message || 'Invalid machine'}`,
    };
  }

  const initA = targetGraphA.nodes.find((n) => n.isInitial);
  const initB = targetGraphB.nodes.find((n) => n.isInitial);
  if (!initA || !initB) {
    return {
      success: false,
      operation,
      nodes: [],
      edges: [],
      alphabet: [],
      reachableStateCount: 0,
      acceptingStateCount: 0,
      errorMessage: 'Initial state missing in one of the operands.',
    };
  }

  // Extract unified alphabet Σ = Σ_A ∪ Σ_B
  const extractAlphabet = (g: SolverGraphInput) =>
    g.edges
      .map((e) => normalizeSymbol(e.label))
      .filter((l) => l.length > 0 && !isEpsilonSymbol(l));

  const alphabetSet = new Set<string>([...extractAlphabet(targetGraphA), ...extractAlphabet(targetGraphB)]);
  const alphabet = Array.from(alphabetSet).sort();

  const nodeMapA = new Map(targetGraphA.nodes.map((n) => [n.id, n]));
  const nodeMapB = new Map(targetGraphB.nodes.map((n) => [n.id, n]));

  const getLabelA = (id: string) => (id === IMPLICIT_TRAP ? 'Ø' : nodeMapA.get(id)?.label || id);
  const getLabelB = (id: string) => (id === IMPLICIT_TRAP ? 'Ø' : nodeMapB.get(id)?.label || id);

  const isAcceptingA = (id: string) => (id === IMPLICIT_TRAP ? false : Boolean(nodeMapA.get(id)?.isAccepting));
  const isAcceptingB = (id: string) => (id === IMPLICIT_TRAP ? false : Boolean(nodeMapB.get(id)?.isAccepting));

  const getNextStateA = (currId: string, sym: string): string => {
    if (currId === IMPLICIT_TRAP) return IMPLICIT_TRAP;
    const match = targetGraphA.edges.find((e) => e.sourceNodeId === currId && normalizeSymbol(e.label) === sym);
    return match ? match.targetNodeId : IMPLICIT_TRAP;
  };

  const getNextStateB = (currId: string, sym: string): string => {
    if (currId === IMPLICIT_TRAP) return IMPLICIT_TRAP;
    const match = targetGraphB.edges.find((e) => e.sourceNodeId === currId && normalizeSymbol(e.label) === sym);
    return match ? match.targetNodeId : IMPLICIT_TRAP;
  };

  const evaluateAcceptance = (accA: boolean, accB: boolean): boolean => {
    switch (operation) {
      case 'UNION':
        return accA || accB;
      case 'INTERSECTION':
        return accA && accB;
      case 'DIFFERENCE':
        return accA && !accB;
      case 'SYMMETRIC_DIFFERENCE':
        return (accA && !accB) || (!accA && accB);
      default:
        return accA || accB;
    }
  };

  // BFS Reachable State Traversal of M_A × M_B
  const productStateMap = new Map<
    string,
    {
      id: string;
      label: string;
      stateA: string;
      stateB: string;
      isInitial: boolean;
      isAccepting: boolean;
      index: number;
    }
  >();

  const workQueue: string[] = [];

  const createProductState = (stateA: string, stateB: string, isInitial: boolean): string => {
    const key = `${stateA}|${stateB}`;
    if (productStateMap.has(key)) {
      return productStateMap.get(key)!.id;
    }

    const index = productStateMap.size;
    const id = `p_q${index}`;
    const label = `(${getLabelA(stateA)}, ${getLabelB(stateB)})`;
    const accA = isAcceptingA(stateA);
    const accB = isAcceptingB(stateB);
    const isAccepting = evaluateAcceptance(accA, accB);

    productStateMap.set(key, {
      id,
      label,
      stateA,
      stateB,
      isInitial,
      isAccepting,
      index,
    });

    workQueue.push(key);
    return id;
  };

  createProductState(initA.id, initB.id, true);

  const generatedTransitions: { sourceId: string; targetId: string; symbol: string }[] = [];
  const steps: ProductAutomatonStepResult[] = [];
  let stepIndexCounter = 1;

  while (workQueue.length > 0) {
    const currKey = workQueue.shift()!;
    const currInfo = productStateMap.get(currKey)!;

    for (const sym of alphabet) {
      const nextA = getNextStateA(currInfo.stateA, sym);
      const nextB = getNextStateB(currInfo.stateB, sym);
      const nextKey = `${nextA}|${nextB}`;

      const targetId = createProductState(nextA, nextB, false);
      const targetInfo = productStateMap.get(nextKey)!;

      generatedTransitions.push({
        sourceId: currInfo.id,
        targetId,
        symbol: sym,
      });

      steps.push({
        stepIndex: stepIndexCounter++,
        productPairLabel: currInfo.label,
        symbol: sym,
        nextProductPairLabel: targetInfo.label,
        isAccepting: targetInfo.isAccepting,
      });
    }
  }

  // Position output nodes in grid
  const totalStates = productStateMap.size;
  const cols = Math.max(2, Math.ceil(Math.sqrt(totalStates)));

  const outNodes: StateNode[] = [];
  let acceptingCount = 0;

  for (const info of productStateMap.values()) {
    if (info.isAccepting) acceptingCount++;
    const col = info.index % cols;
    const row = Math.floor(info.index / cols);

    outNodes.push({
      id: info.id,
      label: info.label,
      x: 150 + col * 200,
      y: 150 + row * 180,
      isInitial: info.isInitial,
      isAccepting: info.isAccepting,
    });
  }

  const outEdges: TransitionEdge[] = generatedTransitions.map((tr, idx) => ({
    id: `p_e${idx + 1}`,
    sourceNodeId: tr.sourceId,
    targetNodeId: tr.targetId,
    label: tr.symbol,
  }));

  return {
    success: true,
    operation,
    nodes: outNodes,
    edges: outEdges,
    alphabet,
    reachableStateCount: outNodes.length,
    acceptingStateCount: acceptingCount,
    steps,
  };
}

/**
 * Pure deterministic function: Computes language complement L(M') = Σ* \ L(M) for a DFA.
 * Completes missing transitions via an explicit trap state before inverting final state flags F' = Q \ F.
 */
export function complementDFA(
  graph: SolverGraphInput,
  machineType: AutomatonType = 'DFA'
): ProductAutomatonResult {
  let targetGraph = graph;
  if (machineType === 'NFA') {
    const conv = convertNfaToDfa(graph);
    if (!conv.success) {
      return {
        success: false,
        operation: 'COMPLEMENT',
        nodes: [],
        edges: [],
        alphabet: [],
        reachableStateCount: 0,
        acceptingStateCount: 0,
        errorMessage: `NFA to DFA conversion failed: ${conv.errorMessage || 'Conversion error'}`,
      };
    }
    targetGraph = { nodes: conv.nodes, edges: conv.edges };
  }

  const val = validateDFA(targetGraph);
  if (!val.isValid) {
    return {
      success: false,
      operation: 'COMPLEMENT',
      nodes: [],
      edges: [],
      alphabet: [],
      reachableStateCount: 0,
      acceptingStateCount: 0,
      errorMessage: `DFA validation failed: ${val.errors[0]?.message || 'Invalid machine'}`,
    };
  }

  // Extract alphabet
  const rawSymbols = targetGraph.edges
    .map((e) => normalizeSymbol(e.label))
    .filter((l) => l.length > 0 && !isEpsilonSymbol(l));
  const alphabet = Array.from(new Set(rawSymbols)).sort();

  // Check if explicit trap state is required for complete transition function δ
  let needsTrap = false;
  for (const node of targetGraph.nodes) {
    for (const sym of alphabet) {
      const hasEdge = targetGraph.edges.some((e) => e.sourceNodeId === node.id && normalizeSymbol(e.label) === sym);
      if (!hasEdge) {
        needsTrap = true;
        break;
      }
    }
    if (needsTrap) break;
  }

  const trapId = `q_trap_${Date.now()}`;
  const outNodes: StateNode[] = targetGraph.nodes.map((n) => ({
    ...n,
    isAccepting: !n.isAccepting, // Invert accepting states
  }));

  const outEdges: TransitionEdge[] = targetGraph.edges.map((e) => ({ ...e }));

  if (needsTrap) {
    const trapNode: StateNode = {
      id: trapId,
      label: 'Ø',
      x: 350,
      y: 250,
      isInitial: false,
      isAccepting: true, // Trap state is non-accepting in original, so accepting in complement!
    };
    outNodes.push(trapNode);

    // Add missing transitions routing to trap state
    let edgeIdx = outEdges.length + 1;
    targetGraph.nodes.forEach((node) => {
      alphabet.forEach((sym) => {
        const hasEdge = targetGraph.edges.some((e) => e.sourceNodeId === node.id && normalizeSymbol(e.label) === sym);
        if (!hasEdge) {
          outEdges.push({
            id: `e_comp_${edgeIdx++}`,
            sourceNodeId: node.id,
            targetNodeId: trapId,
            label: sym,
          });
        }
      });
    });

    // Add trap self-loops for all symbols in Σ
    alphabet.forEach((sym) => {
      outEdges.push({
        id: `e_comp_${edgeIdx++}`,
        sourceNodeId: trapId,
        targetNodeId: trapId,
        label: sym,
      });
    });
  }

  const acceptingCount = outNodes.filter((n) => n.isAccepting).length;

  return {
    success: true,
    operation: 'COMPLEMENT',
    nodes: outNodes,
    edges: outEdges,
    alphabet,
    reachableStateCount: outNodes.length,
    acceptingStateCount: acceptingCount,
  };
}

/**
 * Pure deterministic function: Executes a sequence of chained transformations.
 */
export function executeTransformationPipeline(
  initialGraph: SolverGraphInput,
  initialType: AutomatonType,
  steps: TransformationStepType[]
): TransformationPipelineResult {
  let currGraph = initialGraph;
  let currType = initialType;
  const stepResults: TransformationPipelineStepResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step === 'NFA_TO_DFA') {
      const conv = convertNfaToDfa(currGraph);
      if (!conv.success) {
        return {
          success: false,
          nodes: [],
          edges: [],
          finalMachineType: currType,
          stepResults,
          errorMessage: `Pipeline step ${i + 1} (NFA → DFA) failed: ${conv.errorMessage}`,
        };
      }
      currGraph = { nodes: conv.nodes, edges: conv.edges };
      currType = 'DFA';
      stepResults.push({
        stepIndex: i + 1,
        stepName: 'Subset Construction (NFA → DFA)',
        inputMachineType: 'NFA',
        outputMachineType: 'DFA',
        nodeCount: conv.nodes.length,
        edgeCount: conv.edges.length,
      });
    } else if (step === 'DFA_MINIMIZE') {
      const min = minimizeDFA(currGraph);
      if (!min.success) {
        return {
          success: false,
          nodes: [],
          edges: [],
          finalMachineType: currType,
          stepResults,
          errorMessage: `Pipeline step ${i + 1} (DFA Minimization) failed: ${min.errorMessage}`,
        };
      }
      currGraph = { nodes: min.nodes, edges: min.edges };
      currType = 'DFA';
      stepResults.push({
        stepIndex: i + 1,
        stepName: 'Partition Refinement (DFA Minimization)',
        inputMachineType: 'DFA',
        outputMachineType: 'DFA',
        nodeCount: min.nodes.length,
        edgeCount: min.edges.length,
      });
    } else if (step === 'COMPLEMENT') {
      const comp = complementDFA(currGraph, currType);
      if (!comp.success) {
        return {
          success: false,
          nodes: [],
          edges: [],
          finalMachineType: currType,
          stepResults,
          errorMessage: `Pipeline step ${i + 1} (Complement) failed: ${comp.errorMessage}`,
        };
      }
      currGraph = { nodes: comp.nodes as StateNode[], edges: comp.edges as TransitionEdge[] };
      currType = 'DFA';
      stepResults.push({
        stepIndex: i + 1,
        stepName: 'Language Complement (L\' = Σ* \\ L)',
        inputMachineType: currType,
        outputMachineType: 'DFA',
        nodeCount: comp.nodes.length,
        edgeCount: comp.edges.length,
      });
    }
  }

  return {
    success: true,
    nodes: currGraph.nodes,
    edges: currGraph.edges,
    finalMachineType: currType,
    stepResults,
  };
}
