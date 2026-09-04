import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import {
  ContextFreeGrammar,
  SolverGraphInput,
  CFGToPDAResult,
  PDAToCFGResult,
  PDACFGTranslationStep,
  PDACFGLanguagePreservationResult,
  LanguagePreservationCase,
  CFGProduction,
  GrammarSymbol,
} from './types';
import { validateCFG } from './cfg-validator';
import { evaluateCFGMembership } from './cfg-membership';
import { validatePDA } from './pda-validator';
import { executePDA } from './pda-executor';
import { analyzeCFG } from './cfg-analyzer';
import { EPSILON_SYM, makeProduction, nt, term } from './cfg-transformations';

/**
 * Pure deterministic conversion: Context-Free Grammar (CFG) -> Pushdown Automaton (PDA).
 * Uses top-down single-state PDA construction.
 *
 * State structure:
 *  - q0 (initial state): pushes start symbol S onto stack (z0 -> S z0 or z0 -> S)
 *  - q1 (working state):
 *      For production A -> X1 X2 ... Xk:
 *        transition: ε, A / X1 X2 ... Xk
 *      For each terminal a in Σ:
 *        transition: a, a / ε
 *  - q2 (accepting state):
 *      transition: ε, z0 / z0 (or ε, z0 / ε)
 */
export function convertCFGToPDA(
  grammar: ContextFreeGrammar,
  options: {
    initialStackSymbol?: string;
    testCorpus?: ReadonlyArray<string>;
  } = {}
): CFGToPDAResult {
  const steps: PDACFGTranslationStep[] = [];
  const warnings: string[] = [];
  const initialStackSymbol = options.initialStackSymbol || 'Z0';

  steps.push({
    stepIndex: steps.length,
    type: 'TRANSLATION_START',
    title: 'CFG to PDA Translation Started',
    description: 'Initializing top-down single-state Pushdown Automaton construction for grammar G = (V, Σ, P, S).',
    mathematicalNotation: `G = (V, Σ, P, ${grammar.startVariable}) \\implies M = (Q, Σ, Γ, δ, q_0, Z_0, F)`,
  });

  // 1. Validate CFG
  const cfgVal = validateCFG(grammar);
  if (!cfgVal.isValid) {
    warnings.push(`Input CFG is invalid: ${cfgVal.errors.map((e) => e.message).join('; ')}`);
    return {
      success: false,
      sourceCFG: grammar,
      targetPDAGraph: { nodes: [], edges: [] },
      targetInitialStackSymbol: initialStackSymbol,
      steps,
      generatedStates: [],
      generatedStackSymbols: [],
      warnings,
      preservation: {
        status: 'NOT_VERIFIED',
        totalTested: 0,
        totalMatches: 0,
        cases: [],
        mismatches: [],
        explanation: 'Translation aborted due to invalid CFG.',
      },
    };
  }

  // Define PDA states: q0 (start), q1 (main loop), q2 (accepting)
  const q0Id = 'q0';
  const q1Id = 'q1';
  const q2Id = 'q2';

  const nodes: StateNode[] = [
    { id: q0Id, label: 'q0', x: 50, y: 150, isInitial: true, isAccepting: false },
    { id: q1Id, label: 'q1', x: 250, y: 150, isInitial: false, isAccepting: false },
    { id: q2Id, label: 'q2', x: 450, y: 150, isInitial: false, isAccepting: true },
  ];

  const edges: TransitionEdge[] = [];
  let edgeCounter = 0;

  // Transition 1: Initialization q0 -> q1: ε, Z0 / S Z0
  const initLabel = `ε, ${initialStackSymbol} / ${grammar.startVariable} ${initialStackSymbol}`;
  edges.push({
    id: `e_${edgeCounter++}`,
    sourceNodeId: q0Id,
    targetNodeId: q1Id,
    label: initLabel,
    inputSymbol: 'ε',
    stackTop: initialStackSymbol,
    stackReplacement: `${grammar.startVariable} ${initialStackSymbol}`,
  });

  steps.push({
    stepIndex: steps.length,
    type: 'CFG_TO_PDA_START_VARIABLE_PUSH',
    title: 'Initialize Stack with Start Variable',
    description: `Created initial transition from ${q0Id} to ${q1Id} pushing start variable ${grammar.startVariable} above ${initialStackSymbol}.`,
    mathematicalNotation: `\\delta(q_0, \\epsilon, ${initialStackSymbol}) = \\{(q_1, ${grammar.startVariable}${initialStackSymbol})\\}`,
    affectedSymbols: [grammar.startVariable, initialStackSymbol],
  });

  // Transition 2: Variable Expansions q1 -> q1 for each production A -> γ
  for (const prod of grammar.productions) {
    const rhsString = prod.rhs
      .map((sym) => (sym.type === 'EPSILON' ? 'ε' : sym.value))
      .join(' ');
    
    // Replacement string for PDA stack: e.g. "A B" -> "A B" (space separated)
    const stackRepl = prod.rhs
      .filter((sym) => sym.type !== 'EPSILON')
      .map((sym) => sym.value)
      .join(' ');
    
    const replLabel = stackRepl.length === 0 ? 'ε' : stackRepl;
    const label = `ε, ${prod.lhs} / ${replLabel}`;

    edges.push({
      id: `e_${edgeCounter++}`,
      sourceNodeId: q1Id,
      targetNodeId: q1Id,
      label,
      inputSymbol: 'ε',
      stackTop: prod.lhs,
      stackReplacement: replLabel,
    });

    steps.push({
      stepIndex: steps.length,
      type: 'CFG_TO_PDA_PRODUCTION_EXPANSION',
      title: `Production Expansion: ${prod.lhs} → ${rhsString}`,
      description: `Mapped production ${prod.lhs} → ${rhsString} to stack expansion loop on state ${q1Id}.`,
      mathematicalNotation: `\\delta(q_1, \\epsilon, ${prod.lhs}) \\ni (q_1, ${replLabel})`,
      affectedSymbols: [prod.lhs, ...prod.rhs.map((s) => s.value)],
    });
  }

  // Transition 3: Terminal Matchings q1 -> q1 for each terminal a ∈ Σ
  for (const t of grammar.terminals) {
    const label = `${t}, ${t} / ε`;
    edges.push({
      id: `e_${edgeCounter++}`,
      sourceNodeId: q1Id,
      targetNodeId: q1Id,
      label,
      inputSymbol: t,
      stackTop: t,
      stackReplacement: 'ε',
    });

    steps.push({
      stepIndex: steps.length,
      type: 'CFG_TO_PDA_TERMINAL_MATCH',
      title: `Terminal Match: ${t}`,
      description: `Created stack pop transition for terminal symbol '${t}' upon matching input.`,
      mathematicalNotation: `\\delta(q_1, ${t}, ${t}) = \\{(q_1, \\epsilon)\\}`,
      affectedSymbols: [t],
    });
  }

  // Transition 4: Acceptance Transition q1 -> q2: ε, Z0 / Z0
  const acceptLabel = `ε, ${initialStackSymbol} / ${initialStackSymbol}`;
  edges.push({
    id: `e_${edgeCounter++}`,
    sourceNodeId: q1Id,
    targetNodeId: q2Id,
    label: acceptLabel,
    inputSymbol: 'ε',
    stackTop: initialStackSymbol,
    stackReplacement: initialStackSymbol,
  });

  const targetPDAGraph: SolverGraphInput = { nodes, edges };

  // Verification stage
  const corpus = options.testCorpus || generateBoundedCFGCorpus(grammar);
  const preservation = verifyCFGToPDAPreservation(grammar, targetPDAGraph, initialStackSymbol, corpus);

  steps.push({
    stepIndex: steps.length,
    type: 'TRANSLATION_COMPLETE',
    title: 'CFG to PDA Translation Complete',
    description: `Successfully constructed PDA with ${nodes.length} states and ${edges.length} transitions.`,
    mathematicalNotation: `L(G) = L(M) \\quad [${preservation.status}]`,
  });

  return {
    success: true,
    sourceCFG: grammar,
    targetPDAGraph,
    targetInitialStackSymbol: initialStackSymbol,
    steps,
    generatedStates: ['q0', 'q1', 'q2'],
    generatedStackSymbols: [initialStackSymbol, ...grammar.variables, ...grammar.terminals],
    warnings,
    preservation,
  };
}

/**
 * Normalizes a PDA so that it accepts by empty stack and has standard single initial/bottom-of-stack structure.
 */
export function normalizePDAForCFGConversion(
  pdaGraph: SolverGraphInput,
  initialStackSymbol: string
): {
  normalizedGraph: SolverGraphInput;
  newInitialStackSymbol: string;
  normalizationSteps: PDACFGTranslationStep[];
  states: string[];
} {
  const normalizationSteps: PDACFGTranslationStep[] = [];
  const nodes = pdaGraph.nodes.map((n) => ({ ...n }));
  const edges = pdaGraph.edges.map((e) => ({ ...e }));
  let edgeCounter = edges.length + 100;

  normalizationSteps.push({
    stepIndex: normalizationSteps.length,
    type: 'PDA_NORMALIZATION_START',
    title: 'PDA Normalization Started',
    description: 'Normalizing PDA structure for state-triplet CFG construction.',
    mathematicalNotation: 'M \\implies M_{norm}',
  });

  const origInitialNode = nodes.find((n) => n.isInitial);
  const origInitialId = origInitialNode ? origInitialNode.id : 'q0';

  // 1. Fresh Initial State (q_init) and fresh bottom-of-stack marker (Z_bottom)
  const qInitId = 'q_start';
  const zBottom = 'Z_bot';

  nodes.forEach((n) => (n.isInitial = false));
  nodes.unshift({
    id: qInitId,
    label: 'q_start',
    x: 0,
    y: 0,
    isInitial: true,
    isAccepting: false,
  });

  // Push original initial stack symbol over fresh bottom marker
  edges.push({
    id: `norm_e_${edgeCounter++}`,
    sourceNodeId: qInitId,
    targetNodeId: origInitialId,
    label: `ε, ${zBottom} / ${initialStackSymbol}${zBottom}`,
    inputSymbol: 'ε',
    stackTop: zBottom,
    stackReplacement: `${initialStackSymbol}${zBottom}`,
  });

  normalizationSteps.push({
    stepIndex: normalizationSteps.length,
    type: 'PDA_NORMALIZATION_FRESH_INITIAL_STATE',
    title: 'Added Fresh Start State & Bottom Marker',
    description: `Created start state ${qInitId} and bottom marker ${zBottom}.`,
    mathematicalNotation: `\\delta(${qInitId}, \\epsilon, ${zBottom}) = \\{(${origInitialId}, ${initialStackSymbol}${zBottom})\\}`,
  });

  // 2. Fresh Final Emptying State (q_erase)
  const qEraseId = 'q_erase';
  nodes.push({
    id: qEraseId,
    label: 'q_erase',
    x: 600,
    y: 0,
    isInitial: false,
    isAccepting: false,
  });

  // Move from all accepting states to q_erase on seeing any stack symbol
  const acceptingNodes = nodes.filter((n) => n.isAccepting);
  acceptingNodes.forEach((n) => {
    edges.push({
      id: `norm_e_${edgeCounter++}`,
      sourceNodeId: n.id,
      targetNodeId: qEraseId,
      label: `ε, ε / ε`,
      inputSymbol: 'ε',
      stackTop: 'ε',
      stackReplacement: 'ε',
    });
  });

  // Clear stack in q_erase for all stack symbols (including bottom marker)
  const allStackSyms = new Set<string>([zBottom, initialStackSymbol]);
  pdaGraph.edges.forEach((e) => {
    if (e.stackTop && e.stackTop !== 'ε') allStackSyms.add(e.stackTop);
    if (e.stackReplacement && e.stackReplacement !== 'ε') {
      const parts = e.stackReplacement.split(/\s+/);
      parts.forEach((p) => {
        if (p && p !== 'ε') allStackSyms.add(p);
      });
    }
  });

  allStackSyms.forEach((sym) => {
    edges.push({
      id: `norm_e_${edgeCounter++}`,
      sourceNodeId: qEraseId,
      targetNodeId: qEraseId,
      label: `ε, ${sym} / ε`,
      inputSymbol: 'ε',
      stackTop: sym,
      stackReplacement: 'ε',
    });
  });

  normalizationSteps.push({
    stepIndex: normalizationSteps.length,
    type: 'PDA_NORMALIZATION_ACCEPTANCE_TO_EMPTY_STACK',
    title: 'Empty-Stack Acceptance Normalization',
    description: `Added erasing state ${qEraseId} to ensure clean empty-stack acceptance.`,
    mathematicalNotation: `\\forall q_f \\in F, \\delta(q_f, \\epsilon, X) \\ni (${qEraseId}, \\epsilon)`,
  });

  const stateIds = nodes.map((n) => n.id);

  return {
    normalizedGraph: { nodes, edges },
    newInitialStackSymbol: zBottom,
    normalizationSteps,
    states: stateIds,
  };
}

/**
 * Pure deterministic conversion: Pushdown Automaton (PDA) -> Context-Free Grammar (CFG).
 * Implements standard state-triplet construction: A_{q, X, p}.
 */
export function convertPDAToCFG(
  pdaGraph: SolverGraphInput,
  initialStackSymbol: string = 'Z0',
  options: {
    testCorpus?: ReadonlyArray<string>;
    cleanUseless?: boolean;
  } = {}
): PDAToCFGResult {
  const steps: PDACFGTranslationStep[] = [];
  const warnings: string[] = [];

  steps.push({
    stepIndex: steps.length,
    type: 'TRANSLATION_START',
    title: 'PDA to CFG Translation Started',
    description: 'Initializing State-Triplet construction A_{q, X, p} for Pushdown Automaton to Context-Free Grammar conversion.',
    mathematicalNotation: 'M = (Q, Σ, Γ, δ, q_0, Z_0, F) \\implies G = (V, Σ, P, S)',
  });

  // 1. Validate PDA
  const pdaVal = validatePDA(pdaGraph, initialStackSymbol);
  if (!pdaVal.isValid) {
    warnings.push(`Input PDA is invalid: ${pdaVal.errors.map((e) => e.message).join('; ')}`);
    return {
      success: false,
      sourcePDAGraph: pdaGraph,
      sourceInitialStackSymbol: initialStackSymbol,
      targetCFG: { variables: ['S'], terminals: [], productions: [], startVariable: 'S' },
      steps,
      generatedVariables: ['S'],
      tripletMap: {},
      warnings,
      preservation: {
        status: 'NOT_VERIFIED',
        totalTested: 0,
        totalMatches: 0,
        cases: [],
        mismatches: [],
        explanation: 'Translation aborted due to invalid PDA.',
      },
    };
  }

  // Normalize PDA
  const { normalizedGraph, newInitialStackSymbol, normalizationSteps, states } =
    normalizePDAForCFGConversion(pdaGraph, initialStackSymbol);
  steps.push(...normalizationSteps);

  // Extract states & alphabet
  const stateList = states;
  const initialNode = pdaGraph.nodes.find((n) => n.isInitial);
  const q0 = initialNode ? initialNode.id : stateList[0];

  // Helper to format triplet variable name: V_q_X_p (clean alphanumeric identifier)
  const tripletVar = (q: string, X: string, p: string) =>
    `V_${q.replace(/[^A-Za-z0-9]/g, '')}_${X.replace(/[^A-Za-z0-9]/g, '')}_${p.replace(/[^A-Za-z0-9]/g, '')}`;

  const variablesSet = new Set<string>();
  const terminalsSet = new Set<string>();
  const productions: CFGProduction[] = [];
  const tripletMap: Record<string, { q: string; X: string; p: string }> = {};

  const startVar = 'S';
  variablesSet.add(startVar);

  // Collect all stack symbols appearing in transitions
  const stackSymbolsSet = new Set<string>();
  stackSymbolsSet.add(initialStackSymbol);
  stackSymbolsSet.add(newInitialStackSymbol);

  // Parse edge transitions
  const parsedTransitions: Array<{
    edgeId: string;
    source: string;
    target: string;
    a: string; // input symbol ('ε' or 'a')
    X: string; // stack top popped
    gamma: string[]; // stack replacement symbols pushed
  }> = [];

  normalizedGraph.edges.forEach((e) => {
    const rawLabel = e.label ? e.label.trim() : '';
    // Format: "input, stackTop / replacement"
    const parts = rawLabel.split(/\/|->|;/).map((s) => s.trim());
    const leftPart = parts[0] || '';
    const rightPart = parts.length > 1 ? parts[1] : 'ε';

    const leftSub = leftPart.split(',').map((s) => s.trim());
    const inputSym = e.inputSymbol ?? (leftSub[0] || 'ε');
    const stackTop = e.stackTop ?? (leftSub.length > 1 ? leftSub[1] : 'ε');
    const stackReplRaw = e.stackReplacement ?? rightPart;

    if (inputSym !== 'ε' && inputSym.trim().length > 0) {
      terminalsSet.add(inputSym);
    }

    if (stackTop !== 'ε' && stackTop.trim().length > 0) {
      stackSymbolsSet.add(stackTop);
    }

    // Parse replacement symbols
    const gamma: string[] = [];
    if (stackReplRaw !== 'ε' && stackReplRaw.trim().length > 0) {
      const matched = stackReplRaw.match(/[A-Za-z][0-9_]*|[^A-Za-z0-9_]/g) || [stackReplRaw];
      matched.forEach((s) => {
        if (s.trim().length > 0 && s !== 'ε') {
          gamma.push(s);
          stackSymbolsSet.add(s);
        }
      });
    }

    parsedTransitions.push({
      edgeId: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      a: inputSym,
      X: stackTop === 'ε' ? initialStackSymbol : stackTop,
      gamma,
    });
  });

  // 2. Create Start Variable Productions: S -> [q0, initialStackSymbol, p] for all p ∈ Q
  for (const p of stateList) {
    const vName = tripletVar(q0, initialStackSymbol, p);
    variablesSet.add(vName);
    tripletMap[vName] = { q: q0, X: initialStackSymbol, p };

    productions.push(makeProduction(startVar, [nt(vName)]));
  }

  steps.push({
    stepIndex: steps.length,
    type: 'PDA_TO_CFG_START_VARIABLE_PRODUCTIONS',
    title: 'Generated Start Variable Productions',
    description: `Created start productions S → [${q0}, ${initialStackSymbol}, p] for all ${stateList.length} states.`,
    mathematicalNotation: `S \\to [${q0}, ${initialStackSymbol}, p] \\quad \\forall p \\in Q`,
  });

  // 3. Process Transitions
  for (const trans of parsedTransitions) {
    const { source: q, target: r, a, X, gamma } = trans;

    if (gamma.length === 0) {
      // Pop transition: δ(q, a, X) ∋ (r, ε)
      // Production: [q, X, r] -> a
      const A_qXr = tripletVar(q, X, r);
      variablesSet.add(A_qXr);
      tripletMap[A_qXr] = { q, X, p: r };

      const rhs = a === 'ε' ? [EPSILON_SYM] : [term(a)];
      productions.push(makeProduction(A_qXr, rhs));

      steps.push({
        stepIndex: steps.length,
        type: 'PDA_TO_CFG_POP_TRANSITION_PRODUCTIONS',
        title: `Pop Transition Production for [${q}, ${X}, ${r}]`,
        description: `Mapped pop transition δ(${q}, ${a}, ${X}) ∋ (${r}, ε) to production [${q}, ${X}, ${r}] → ${a}.`,
        mathematicalNotation: `[${q}, ${X}, ${r}] \\to ${a}`,
      });
    } else {
      // Stack replacement transition: δ(q, a, X) ∋ (r, Y1 Y2 ... Yk)
      // Productions: [q, X, q_k] -> a [r, Y1, q_1] [q_1, Y2, q_2] ... [q_{k-1}, Yk, q_k]
      // For all choices of intermediate states q_1, q_2, ..., q_k in Q
      const k = gamma.length;
      
      // Enumerate all k-tuples of states (p1, p2, ..., pk) from stateList
      const generateStateTuples = (depth: number): string[][] => {
        if (depth === 0) return [[]];
        const prev = generateStateTuples(depth - 1);
        const result: string[][] = [];
        for (const tuple of prev) {
          for (const s of stateList) {
            result.push([...tuple, s]);
          }
        }
        return result;
      };

      const tuples = generateStateTuples(k);

      for (const tuple of tuples) {
        const pk = tuple[k - 1];
        const lhsVar = tripletVar(q, X, pk);
        variablesSet.add(lhsVar);
        tripletMap[lhsVar] = { q, X, p: pk };

        const rhsSymbols: GrammarSymbol[] = [];
        if (a !== 'ε') {
          rhsSymbols.push(term(a));
        }

        let currentPrevState = r;
        for (let idx = 0; idx < k; idx++) {
          const Yi = gamma[idx];
          const nextState = tuple[idx];
          const subVar = tripletVar(currentPrevState, Yi, nextState);
          variablesSet.add(subVar);
          tripletMap[subVar] = { q: currentPrevState, X: Yi, p: nextState };
          rhsSymbols.push(nt(subVar));
          currentPrevState = nextState;
        }

        if (rhsSymbols.length === 0) {
          rhsSymbols.push(EPSILON_SYM);
        }

        productions.push(makeProduction(lhsVar, rhsSymbols));
      }

      steps.push({
        stepIndex: steps.length,
        type: 'PDA_TO_CFG_REPLACEMENT_TRANSITION_PRODUCTIONS',
        title: `Replacement Transition Productions for δ(${q}, ${a}, ${X})`,
        description: `Generated ${tuples.length} state-triplet productions for replacement transition pushing ${gamma.join('')}.`,
        mathematicalNotation: `[${q}, ${X}, q_k] \\to ${a} [${r}, ${gamma[0]}, q_1] \\dots [q_{k-1}, ${gamma[k - 1]}, q_k]`,
      });
    }
  }

  let finalGrammar: ContextFreeGrammar = {
    variables: Array.from(variablesSet),
    terminals: Array.from(terminalsSet),
    productions,
    startVariable: startVar,
  };

  // 4. Optionally clean useless variables
  if (options.cleanUseless !== false) {
    const analysis = analyzeCFG(finalGrammar);
    const uselessSet = new Set(analysis.uselessVariables);
    const usefulVars = new Set(finalGrammar.variables.filter((v) => !uselessSet.has(v)));
    if (!usefulVars.has(startVar)) usefulVars.add(startVar);

    finalGrammar = {
      variables: finalGrammar.variables.filter((v) => usefulVars.has(v)),
      terminals: [...finalGrammar.terminals],
      productions: finalGrammar.productions.filter(
        (p) =>
          usefulVars.has(p.lhs) &&
          p.rhs.every((sym) => sym.type !== 'NON_TERMINAL' || usefulVars.has(sym.value))
      ),
      startVariable: finalGrammar.startVariable,
    };

    steps.push({
      stepIndex: steps.length,
      type: 'PDA_TO_CFG_USELESS_VARIABLE_CLEANUP',
      title: 'Cleaned Useless Triplet Variables',
      description: `Removed unreachable/non-generating state-triplet variables from grammar.`,
      mathematicalNotation: `V_{clean} \\subseteq V_{triplet}`,
    });
  }

  // 5. Preservation verification
  const corpus = options.testCorpus || generateBoundedPDACorpus(pdaGraph, initialStackSymbol);
  const preservation = verifyPDAToCFGPreservation(pdaGraph, initialStackSymbol, finalGrammar, corpus);

  steps.push({
    stepIndex: steps.length,
    type: 'TRANSLATION_COMPLETE',
    title: 'PDA to CFG Translation Complete',
    description: `Successfully derived CFG with ${finalGrammar.variables.length} variables and ${finalGrammar.productions.length} productions.`,
    mathematicalNotation: `L(M) = L(G) \\quad [${preservation.status}]`,
  });

  return {
    success: true,
    sourcePDAGraph: pdaGraph,
    sourceInitialStackSymbol: initialStackSymbol,
    normalizedPDAGraph: normalizedGraph,
    targetCFG: finalGrammar,
    steps,
    generatedVariables: finalGrammar.variables,
    tripletMap,
    warnings,
    preservation,
  };
}

/**
 * Generates a bounded test corpus of short strings over grammar terminals.
 */
export function generateBoundedCFGCorpus(
  grammar: ContextFreeGrammar,
  maxLen: number = 3
): string[] {
  const result: string[] = [''];
  const terms = grammar.terminals.filter((t) => t.length > 0 && t !== 'ε');
  if (terms.length === 0) return result;

  const queue = [''];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.length >= maxLen) continue;

    for (const t of terms) {
      const next = curr + t;
      if (!result.includes(next)) {
        result.push(next);
        queue.push(next);
      }
    }
  }

  return result;
}

/**
 * Generates a bounded test corpus of short strings for a PDA.
 */
export function generateBoundedPDACorpus(
  pdaGraph: SolverGraphInput,
  _initialStackSymbol?: string,
  maxLen: number = 3
): string[] {
  const termsSet = new Set<string>();
  pdaGraph.edges.forEach((e) => {
    if (e.inputSymbol && e.inputSymbol !== 'ε') {
      termsSet.add(e.inputSymbol);
    }
  });

  const terms = Array.from(termsSet);
  const result: string[] = [''];
  if (terms.length === 0) return result;

  const queue = [''];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.length >= maxLen) continue;

    for (const t of terms) {
      const next = curr + t;
      if (!result.includes(next)) {
        result.push(next);
        queue.push(next);
      }
    }
  }

  return result;
}

/**
 * Bounded language preservation verification for CFG -> PDA translation.
 */
export function verifyCFGToPDAPreservation(
  sourceCFG: ContextFreeGrammar,
  targetPDA: SolverGraphInput,
  initialStackSymbol: string,
  corpus: ReadonlyArray<string>
): PDACFGLanguagePreservationResult {
  const cases: LanguagePreservationCase[] = [];
  const mismatches: LanguagePreservationCase[] = [];

  for (const inputString of corpus) {
    const cfgEval = evaluateCFGMembership(sourceCFG, inputString, { maxDepth: 25 });
    const sourceAccepted = cfgEval.isAccepted;

    const pdaEval = executePDA(targetPDA, inputString, { initialStackSymbol, maxSteps: 200 });
    const targetAccepted = pdaEval.isAccepted;

    const match = sourceAccepted === targetAccepted;
    const cCase: LanguagePreservationCase = {
      inputString,
      sourceAccepted,
      targetAccepted,
      match,
    };

    cases.push(cCase);
    if (!match) {
      mismatches.push(cCase);
    }
  }

  const status = mismatches.length === 0 ? 'VERIFIED_BOUNDED' : 'MISMATCH_DETECTED';
  const explanation =
    mismatches.length === 0
      ? `All ${corpus.length} bounded test strings produced identical membership results between CFG and target PDA.`
      : `Detected ${mismatches.length} membership mismatch(es) on bounded corpus testing.`;

  return {
    status,
    totalTested: corpus.length,
    totalMatches: corpus.length - mismatches.length,
    cases,
    mismatches,
    explanation,
  };
}

/**
 * Bounded language preservation verification for PDA -> CFG translation.
 */
export function verifyPDAToCFGPreservation(
  sourcePDA: SolverGraphInput,
  initialStackSymbol: string,
  targetCFG: ContextFreeGrammar,
  corpus: ReadonlyArray<string>
): PDACFGLanguagePreservationResult {
  const cases: LanguagePreservationCase[] = [];
  const mismatches: LanguagePreservationCase[] = [];

  for (const inputString of corpus) {
    const pdaEval = executePDA(sourcePDA, inputString, { initialStackSymbol, maxSteps: 200 });
    const sourceAccepted = pdaEval.isAccepted;

    const cfgEval = evaluateCFGMembership(targetCFG, inputString, { maxDepth: 25 });
    const targetAccepted = cfgEval.isAccepted;

    const match = sourceAccepted === targetAccepted;
    const cCase: LanguagePreservationCase = {
      inputString,
      sourceAccepted,
      targetAccepted,
      match,
    };

    cases.push(cCase);
    if (!match) {
      mismatches.push(cCase);
    }
  }

  const status = mismatches.length === 0 ? 'VERIFIED_BOUNDED' : 'MISMATCH_DETECTED';
  const explanation =
    mismatches.length === 0
      ? `All ${corpus.length} bounded test strings produced identical membership results between source PDA and derived CFG.`
      : `Detected ${mismatches.length} membership mismatch(es) on bounded corpus testing.`;

  return {
    status,
    totalTested: corpus.length,
    totalMatches: corpus.length - mismatches.length,
    cases,
    mismatches,
    explanation,
  };
}

/**
 * Full round-trip verification: CFG -> PDA -> CFG' or PDA -> CFG -> PDA'.
 */
export function verifyTranslationRoundTrip(
  source: ContextFreeGrammar | SolverGraphInput,
  direction: 'CFG_TO_PDA' | 'PDA_TO_CFG',
  initialStackSymbol: string = 'Z0',
  corpus?: ReadonlyArray<string>
): {
  roundTripStatus: 'VERIFIED_BOUNDED' | 'MISMATCH_DETECTED';
  stage1Preservation: PDACFGLanguagePreservationResult;
  stage2Preservation: PDACFGLanguagePreservationResult;
  overallCases: ReadonlyArray<{
    inputString: string;
    sourceAccepted: boolean;
    intermediateAccepted: boolean;
    roundTripAccepted: boolean;
    match: boolean;
  }>;
} {
  if (direction === 'CFG_TO_PDA') {
    const originalCFG = source as ContextFreeGrammar;
    const testCorpus = corpus || generateBoundedCFGCorpus(originalCFG);

    // Stage 1: CFG -> PDA
    const res1 = convertCFGToPDA(originalCFG, { initialStackSymbol, testCorpus });
    // Stage 2: PDA -> CFG'
    const res2 = convertPDAToCFG(res1.targetPDAGraph, initialStackSymbol, { testCorpus });

    const overallCases = testCorpus.map((inputString) => {
      const sourceAccepted = evaluateCFGMembership(originalCFG, inputString, { maxDepth: 25 }).isAccepted;
      const intermediateAccepted = executePDA(res1.targetPDAGraph, inputString, { initialStackSymbol, maxSteps: 1000 }).isAccepted;
      const roundTripAccepted = evaluateCFGMembership(res2.targetCFG, inputString, { maxDepth: 25 }).isAccepted;
      const match = sourceAccepted === roundTripAccepted;

      return {
        inputString,
        sourceAccepted,
        intermediateAccepted,
        roundTripAccepted,
        match,
      };
    });

    const mismatches = overallCases.filter((c) => !c.match);

    return {
      roundTripStatus: mismatches.length === 0 ? 'VERIFIED_BOUNDED' : 'MISMATCH_DETECTED',
      stage1Preservation: res1.preservation,
      stage2Preservation: res2.preservation,
      overallCases,
    };
  } else {
    const originalPDA = source as SolverGraphInput;
    const testCorpus = corpus || generateBoundedPDACorpus(originalPDA, initialStackSymbol);

    // Stage 1: PDA -> CFG
    const res1 = convertPDAToCFG(originalPDA, initialStackSymbol, { testCorpus });
    // Stage 2: CFG -> PDA'
    const res2 = convertCFGToPDA(res1.targetCFG, { initialStackSymbol, testCorpus });

    const overallCases = testCorpus.map((inputString) => {
      const sourceAccepted = executePDA(originalPDA, inputString, { initialStackSymbol, maxSteps: 1000 }).isAccepted;
      const intermediateAccepted = evaluateCFGMembership(res1.targetCFG, inputString, { maxDepth: 25 }).isAccepted;
      const roundTripAccepted = executePDA(res2.targetPDAGraph, inputString, { initialStackSymbol, maxSteps: 1000 }).isAccepted;
      const match = sourceAccepted === roundTripAccepted;

      return {
        inputString,
        sourceAccepted,
        intermediateAccepted,
        roundTripAccepted,
        match,
      };
    });

    const mismatches = overallCases.filter((c) => !c.match);

    return {
      roundTripStatus: mismatches.length === 0 ? 'VERIFIED_BOUNDED' : 'MISMATCH_DETECTED',
      stage1Preservation: res1.preservation,
      stage2Preservation: res2.preservation,
      overallCases,
    };
  }
}
