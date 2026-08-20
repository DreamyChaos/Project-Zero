import {
  SolverGraphInput,
  AutomataEquivalenceResult,
  FormalProofDerivation,
  FormalProofStep,
  CounterexampleStep,
  TransformationPipelineResult,
  ProductAutomatonResult,
  NFAConversionResult,
  DFAMinimizationResult,
} from './types';
import { convertNfaToDfa } from './nfa-to-dfa';
import { AutomatonType } from '@project-zero/shared';

/**
 * Pure deterministic proof generator: Consumes authoritative solver output (AutomataEquivalenceResult)
 * and constructs a mathematically rigorous, step-by-step FormalProofDerivation.
 */
export function generateEquivalenceProof(
  eqResult: AutomataEquivalenceResult,
  nameA: string = 'Machine A',
  nameB: string = 'Machine B'
): FormalProofDerivation {
  const steps: FormalProofStep[] = [];
  let stepIndex = 1;

  if (eqResult.errorMessage) {
    steps.push({
      stepIndex: stepIndex++,
      type: 'TERMINATION',
      title: 'Equivalence Search Aborted',
      description: eqResult.errorMessage,
      mathematicalNotation: 'Validation / Conversion Error',
    });

    return {
      title: `Language Equivalence Derivation: ${nameA} vs ${nameB}`,
      category: 'EQUIVALENCE',
      isEquivalent: false,
      steps,
      conclusion: 'Equivalence check failed due to invalid machine input.',
      mathematicalJustification: 'Language equivalence requires valid deterministic or non-deterministic input specifications.',
    };
  }

  const trace = eqResult.trace;
  const initialPairLabel = trace?.initialPair || '(qA0, qB0)';

  // Step 1: Initial Configuration
  steps.push({
    stepIndex: stepIndex++,
    type: 'INITIAL_CONFIGURATION',
    title: 'Initial Product Automaton Pair',
    description: `Computation starts at product initial state ${initialPairLabel} ∈ Q_A × Q_B.`,
    mathematicalNotation: `q_{prod,0} = ${initialPairLabel}`,
  });

  if (eqResult.isEquivalent) {
    // Product Traversal Steps
    if (trace?.derivationSteps && trace.derivationSteps.length > 0) {
      trace.derivationSteps.forEach((s) => {
        steps.push({
          stepIndex: stepIndex++,
          type: 'PRODUCT_STATE_DISCOVERY',
          title: `Product Transition on Symbol '${s.symbol}'`,
          description: `From pair (${s.labelA}, ${s.labelB}) on symbol '${s.symbol}', transitions to next product pair (${s.nextLabelA}, ${s.nextLabelB}).`,
          mathematicalNotation: `δ_{prod}((${s.labelA}, ${s.labelB}), '${s.symbol}') = (${s.nextLabelA}, ${s.nextLabelB})`,
          symbol: s.symbol,
          isMismatch: false,
        });
      });
    }

    // Step: Termination
    steps.push({
      stepIndex: stepIndex++,
      type: 'TERMINATION',
      title: 'Exhaustive BFS Traversal Completed',
      description: `Explored all ${eqResult.productStatesExplored} reachable product states in M_A × M_B across unified alphabet. Zero distinguishing configurations found.`,
      mathematicalNotation: `\\forall (q_A, q_B) \\in Q_{reach}(M_A \\times M_B), acc_A(q_A) = acc_B(q_B)`,
    });

    // Step: Result
    steps.push({
      stepIndex: stepIndex++,
      type: 'RESULT',
      title: 'Formal Conclusion: Languages are Identical',
      description: `Both machines accept the exact same set of regular strings L(${nameA}) = L(${nameB}).`,
      mathematicalNotation: `L(${nameA}) = L(${nameB})`,
    });

    return {
      title: `Language Equivalence Proof: ${nameA} ≡ ${nameB}`,
      category: 'EQUIVALENCE',
      isEquivalent: true,
      steps,
      conclusion: `L(${nameA}) = L(${nameB})`,
      mathematicalJustification: `By product automaton BFS, no string w exists where w is accepted by one machine and rejected by the other. Thus L(${nameA}) ⊕ L(${nameB}) = ∅, proving language identity.`,
    };
  } else {
    // Non-equivalent case
    if (trace?.derivationSteps && trace.derivationSteps.length > 0) {
      trace.derivationSteps.forEach((s) => {
        if (s.isMismatch) {
          steps.push({
            stepIndex: stepIndex++,
            type: 'DISTINGUISHING_CONFIGURATION',
            title: `Distinguishing Configuration Found!`,
            description: `At pair (${s.labelA}, ${s.labelB}), acceptance states differ on symbol '${s.symbol}'.`,
            mathematicalNotation: `acc_A(${s.nextLabelA}) \\neq acc_B(${s.nextLabelB})`,
            symbol: s.symbol,
            isMismatch: true,
          });
        } else {
          steps.push({
            stepIndex: stepIndex++,
            type: 'PRODUCT_STATE_DISCOVERY',
            title: `Product Traversal Step`,
            description: `Navigating from (${s.labelA}, ${s.labelB}) to (${s.nextLabelA}, ${s.nextLabelB}) on '${s.symbol}'.`,
            mathematicalNotation: `δ_{prod}((${s.labelA}, ${s.labelB}), '${s.symbol}') = (${s.nextLabelA}, ${s.nextLabelB})`,
            symbol: s.symbol,
          });
        }
      });
    }

    const counterexample = eqResult.counterexample !== undefined ? eqResult.counterexample : '';
    const counterexampleDisplay = counterexample === '' ? 'ε (Empty String)' : `"${counterexample}"`;

    // Step: Shortest Counterexample
    steps.push({
      stepIndex: stepIndex++,
      type: 'ACCEPTANCE_EVALUATION',
      title: 'Shortest Distinguishing Counterexample Derivation',
      description: `Shortest string w = ${counterexampleDisplay} produces divergent acceptance outcomes: ${nameA} ${eqResult.acceptsA ? 'ACCEPT' : 'REJECT'} vs ${nameB} ${eqResult.acceptsB ? 'ACCEPT' : 'REJECT'}.`,
      mathematicalNotation: `w = ${counterexampleDisplay} \\in L(${nameA}) \\oplus L(${nameB})`,
    });

    // Step: Result
    steps.push({
      stepIndex: stepIndex++,
      type: 'RESULT',
      title: 'Formal Conclusion: Languages are Non-Equivalent',
      description: `Because counterexample string w differentiates acceptance, L(${nameA}) ≠ L(${nameB}).`,
      mathematicalNotation: `L(${nameA}) \\neq L(${nameB})`,
    });

    return {
      title: `Non-Equivalence Proof: ${nameA} ≢ ${nameB}`,
      category: 'COUNTEREXAMPLE',
      isEquivalent: false,
      counterexample: eqResult.counterexample,
      acceptsA: eqResult.acceptsA,
      acceptsB: eqResult.acceptsB,
      steps,
      conclusion: `L(${nameA}) ≠ L(${nameB}) (Counterexample: ${counterexampleDisplay})`,
      mathematicalJustification: `The shortest BFS path in the product automaton identifies w = ${counterexampleDisplay} such that w ∈ L(${nameA}) ⊕ L(${nameB}). Hence, the machines accept distinct languages.`,
    };
  }
}

/**
 * Pure deterministic trace reconstructor: Generates step-by-step product execution trace
 * for counterexample string w = a₁a₂...aₙ across Machine A and Machine B.
 */
export function generateCounterexampleTrace(
  graphA: SolverGraphInput,
  typeA: AutomatonType,
  graphB: SolverGraphInput,
  typeB: AutomatonType,
  counterexample: string
): CounterexampleStep[] {
  let targetGraphA = graphA;
  let targetGraphB = graphB;

  if (typeA === 'NFA') {
    const convA = convertNfaToDfa(graphA);
    if (convA.success) targetGraphA = { nodes: convA.nodes, edges: convA.edges };
  }

  if (typeB === 'NFA') {
    const convB = convertNfaToDfa(graphB);
    if (convB.success) targetGraphB = { nodes: convB.nodes, edges: convB.edges };
  }

  const nodeMapA = new Map(targetGraphA.nodes.map((n) => [n.id, n]));
  const nodeMapB = new Map(targetGraphB.nodes.map((n) => [n.id, n]));

  const initA = targetGraphA.nodes.find((n) => n.isInitial);
  const initB = targetGraphB.nodes.find((n) => n.isInitial);

  const getNextA = (currId: string, sym: string): string => {
    if (currId === '__implicit_trap__') return '__implicit_trap__';
    const edge = targetGraphA.edges.find((e) => e.sourceNodeId === currId && e.label === sym);
    return edge ? edge.targetNodeId : '__implicit_trap__';
  };

  const getNextB = (currId: string, sym: string): string => {
    if (currId === '__implicit_trap__') return '__implicit_trap__';
    const edge = targetGraphB.edges.find((e) => e.sourceNodeId === currId && e.label === sym);
    return edge ? edge.targetNodeId : '__implicit_trap__';
  };

  const getLabelA = (id: string) => (id === '__implicit_trap__' ? 'Ø' : nodeMapA.get(id)?.label || id);
  const getLabelB = (id: string) => (id === '__implicit_trap__' ? 'Ø' : nodeMapB.get(id)?.label || id);

  const isAccA = (id: string) => (id === '__implicit_trap__' ? false : Boolean(nodeMapA.get(id)?.isAccepting));
  const isAccB = (id: string) => (id === '__implicit_trap__' ? false : Boolean(nodeMapB.get(id)?.isAccepting));

  const steps: CounterexampleStep[] = [];
  let currA = initA ? initA.id : '__implicit_trap__';
  let currB = initB ? initB.id : '__implicit_trap__';

  // Step 0: Initial Configuration
  const initialAccA = isAccA(currA);
  const initialAccB = isAccB(currB);
  steps.push({
    stepIndex: 0,
    consumedPrefix: '',
    symbol: null,
    stateA: { id: currA, label: getLabelA(currA), isAccepting: initialAccA },
    stateB: { id: currB, label: getLabelB(currB), isAccepting: initialAccB },
    isAcceptingA: initialAccA,
    isAcceptingB: initialAccB,
    isDistinguishing: counterexample === '' && initialAccA !== initialAccB,
    productPairLabel: `(${getLabelA(currA)}, ${getLabelB(currB)})`,
  });

  if (counterexample.length === 0) {
    return steps;
  }

  // Iterate symbol by symbol
  let prefix = '';
  for (let i = 0; i < counterexample.length; i++) {
    const sym = counterexample[i];
    prefix += sym;

    currA = getNextA(currA, sym);
    currB = getNextB(currB, sym);

    const accA = isAccA(currA);
    const accB = isAccB(currB);
    const isFinalStep = i === counterexample.length - 1;
    const isDistinguishing = isFinalStep && accA !== accB;

    steps.push({
      stepIndex: i + 1,
      consumedPrefix: prefix,
      symbol: sym,
      stateA: { id: currA, label: getLabelA(currA), isAccepting: accA },
      stateB: { id: currB, label: getLabelB(currB), isAccepting: accB },
      isAcceptingA: accA,
      isAcceptingB: accB,
      isDistinguishing,
      productPairLabel: `(${getLabelA(currA)}, ${getLabelB(currB)})`,
    });
  }

  return steps;
}

/**
 * Pure deterministic proof generator for machine transformations:
 * Consumes existing trace objects from NFA conversion, minimization, or product operations.
 */
export function generateTransformationProof(
  res: TransformationPipelineResult | ProductAutomatonResult | NFAConversionResult | DFAMinimizationResult,
  title?: string
): FormalProofDerivation {
  const steps: FormalProofStep[] = [];
  let stepIndex = 1;

  // 1. NFA Conversion Result Trace
  if ('subsets' in res && 'alphabet' in res) {
    const nfaRes = res as NFAConversionResult;
    steps.push({
      stepIndex: stepIndex++,
      type: 'INITIAL_CONFIGURATION',
      title: 'Subset Construction Initial State',
      description: `Computes initial subset q0' = ε-closure({q0}).`,
      mathematicalNotation: `q_0' = \\epsilon\\text{-closure}(\\{q_0\\})`,
    });

    if (nfaRes.trace?.steps) {
      nfaRes.trace.steps.forEach((st) => {
        steps.push({
          stepIndex: stepIndex++,
          type: 'STATE_DISCOVERY',
          title: `Subset Transition on Symbol '${st.symbol}'`,
          description: `MOVE(${st.currentDfaStateLabel}, '${st.symbol}') → ε-closure → ${st.targetDfaStateLabel}.`,
          mathematicalNotation: `\\epsilon\\text{-closure}(\\text{MOVE}(${st.currentDfaStateLabel}, '${st.symbol}')) = ${st.targetDfaStateLabel}`,
          symbol: st.symbol,
        });
      });
    }

    steps.push({
      stepIndex: stepIndex++,
      type: 'RESULT',
      title: 'DFA Conversion Completed',
      description: `Generated ${nfaRes.nodes.length} deterministic states across alphabet { ${nfaRes.alphabet.join(', ')} }.`,
      mathematicalNotation: `NFA \\xrightarrow{\\text{Subset}} DFA`,
    });

    return {
      title: title || 'NFA to DFA Conversion Proof',
      category: 'TRANSFORMATION',
      steps,
      conclusion: `NFA successfully converted into equivalent DFA with ${nfaRes.nodes.length} states.`,
      mathematicalJustification: 'By powerset construction, every regular language accepted by an NFA is accepted by an equivalent DFA.',
    };
  }

  // 2. DFA Minimization Result Trace
  if ('equivalenceClasses' in res && 'minimizedStateCount' in res) {
    const minRes = res as DFAMinimizationResult;
    steps.push({
      stepIndex: stepIndex++,
      type: 'INITIAL_CONFIGURATION',
      title: 'Initial Partition Setup',
      description: `Initial partition P0 divides reachable states into accepting F and non-accepting Q \\ F.`,
      mathematicalNotation: `P_0 = \\{ F, Q \\setminus F \\}`,
    });

    if (minRes.trace?.steps) {
      minRes.trace.steps.forEach((st) => {
        steps.push({
          stepIndex: stepIndex++,
          type: 'STATE_DISCOVERY',
          title: `Partition Refinement Iteration ${st.iteration}`,
          description: st.description,
          mathematicalNotation: `P_{${st.iteration}} = \\{ ${st.currentPartitionLabels.map((g) => `{${g.join(',')}}`).join(', ')} \\}`,
        });
      });
    }

    steps.push({
      stepIndex: stepIndex++,
      type: 'RESULT',
      title: 'Minimization Completed',
      description: `Original ${minRes.originalStateCount} states reduced to ${minRes.minimizedStateCount} minimal canonical states.`,
      mathematicalNotation: `|Q_{min}| = ${minRes.minimizedStateCount}`,
    });

    return {
      title: title || 'DFA Minimization Proof (Hopcroft/Moore)',
      category: 'TRANSFORMATION',
      steps,
      conclusion: `DFA minimized from ${minRes.originalStateCount} to ${minRes.minimizedStateCount} states.`,
      mathematicalJustification: 'State equivalence classes merge indistinguishable states (q1 ≡ q2) according to Myhill-Nerode theorem.',
    };
  }

  // Generic fallback for pipeline or product operations
  steps.push({
    stepIndex: stepIndex++,
    type: 'RESULT',
    title: 'Transformation Derived',
    description: 'Transformation executed successfully.',
    mathematicalNotation: 'M \\to M\'',
  });

  return {
    title: title || 'Automata Transformation Proof',
    category: 'TRANSFORMATION',
    steps,
    conclusion: 'Transformation pipeline completed.',
    mathematicalJustification: 'Structural transformation preserves language equivalence.',
  };
}
