import {
  SolverGraphInput,
  DFAValidationResult,
  DFAValidationError,
  PDADeterminismAnalysis,
  PDADeterminismConflict,
} from './types';
import { normalizeSymbol, isEpsilonSymbol } from './nfa-validator';

export interface ParsedPDATransition {
  inputSymbol: string; // 'a' or 'ε'
  stackTop: string; // 'X' or 'ε'
  stackReplacement: string; // 'γ' e.g. 'AZ0' or 'ε'
}

/**
 * Parses PDA transition label or structured properties.
 * Supported label formats:
 *  - "a, Z0 / A Z0"
 *  - "a, Z0 -> A Z0"
 *  - "a, Z0 ; A Z0"
 *  - "a, Z0" (pop Z0, push nothing => replacement ε)
 */
export function parsePDATransition(
  label: string,
  inputSymbolProp?: string,
  stackTopProp?: string,
  stackReplacementProp?: string
): ParsedPDATransition {
  if (inputSymbolProp !== undefined || stackTopProp !== undefined || stackReplacementProp !== undefined) {
    return {
      inputSymbol: normalizeSymbol(inputSymbolProp || 'ε'),
      stackTop: normalizeSymbol(stackTopProp || 'ε'),
      stackReplacement: normalizeSymbol(stackReplacementProp || 'ε'),
    };
  }

  const raw = label ? label.trim() : '';
  if (!raw) {
    return { inputSymbol: 'ε', stackTop: 'ε', stackReplacement: 'ε' };
  }

  // Split on delimiter '/', '->', ';'
  const mainParts = raw.split(/\/|->|;/).map((s) => s.trim());
  const leftPart = mainParts[0] || '';
  const replacementPart = mainParts.length > 1 ? mainParts[1] : 'ε';

  // Left part contains "inputSymbol, stackTop"
  const leftSub = leftPart.split(',').map((s) => s.trim());
  const inputSym = normalizeSymbol(leftSub[0] || 'ε');
  const stackTop = normalizeSymbol(leftSub.length > 1 ? leftSub[1] : 'ε');
  const stackRepl = normalizeSymbol(replacementPart.trim() || 'ε');

  return {
    inputSymbol: inputSym,
    stackTop: stackTop,
    stackReplacement: stackRepl,
  };
}

/**
 * Decomposes a replacement string γ into individual stack symbols.
 * Example:
 *  - "AZ0" => ["A", "Z0"]
 *  - "A Z0" => ["A", "Z0"]
 *  - "AA" => ["A", "A"]
 *  - "V_S" => ["V_S"]
 *  - "ε" => []
 */
export function parseStackSymbols(gamma: string): string[] {
  const norm = normalizeSymbol(gamma.trim());
  if (isEpsilonSymbol(norm) || norm === '') {
    return [];
  }
  if (norm.includes(' ')) {
    return norm.split(/\s+/).filter((s) => s.length > 0 && !isEpsilonSymbol(s));
  }
  if (norm.startsWith('V_')) {
    return [norm];
  }
  const matches = norm.match(/[A-Za-z][0-9_]*|[^A-Za-z0-9_]/g);
  if (matches && matches.length > 0) {
    return matches.filter((s) => s.length > 0 && !isEpsilonSymbol(s));
  }
  return [norm];
}

/**
 * Computes the input alphabet Σ and stack alphabet Γ from a PDA graph.
 */
export function computePDAAlphabets(
  graph: SolverGraphInput,
  initialStackSymbol: string = 'Z0'
): { inputAlphabet: string[]; stackAlphabet: string[] } {
  const inputSet = new Set<string>();
  const stackSet = new Set<string>();

  if (initialStackSymbol && !isEpsilonSymbol(initialStackSymbol)) {
    stackSet.add(initialStackSymbol);
  }

  for (const edge of graph.edges) {
    const parsed = parsePDATransition(
      edge.label,
      edge.inputSymbol,
      edge.stackTop,
      edge.stackReplacement
    );

    if (parsed.inputSymbol && !isEpsilonSymbol(parsed.inputSymbol)) {
      inputSet.add(parsed.inputSymbol);
    }
    if (parsed.stackTop && !isEpsilonSymbol(parsed.stackTop)) {
      stackSet.add(parsed.stackTop);
    }
    const replSymbols = parseStackSymbols(parsed.stackReplacement);
    for (const sym of replSymbols) {
      stackSet.add(sym);
    }
  }

  return {
    inputAlphabet: Array.from(inputSet).sort(),
    stackAlphabet: Array.from(stackSet).sort(),
  };
}

/**
 * Validates whether a graph qualifies as a mathematically sound Pushdown Automaton (PDA).
 */
export function validatePDA(
  graph: SolverGraphInput,
  initialStackSymbol: string = 'Z0'
): DFAValidationResult {
  const errors: DFAValidationError[] = [];
  const warnings: string[] = [];

  const initialNodes = graph.nodes.filter((n) => n.isInitial);
  if (initialNodes.length === 0) {
    errors.push({
      code: 'MISSING_INITIAL_STATE',
      message: 'Missing initial start state (q₀). Designate exactly one state as initial.',
    });
  } else if (initialNodes.length > 1) {
    errors.push({
      code: 'MULTIPLE_INITIAL_STATES',
      message: `Multiple initial states detected (${initialNodes.length}). A PDA must have exactly one initial state.`,
      affectedStateIds: initialNodes.map((n) => n.id),
    });
  }

  if (!initialStackSymbol || initialStackSymbol.trim().length === 0) {
    errors.push({
      code: 'MISSING_INITIAL_STACK_SYMBOL',
      message: 'Initial stack symbol (Z₀) is missing or blank.',
    });
  }

  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const danglingEdges = graph.edges.filter(
    (e) => !nodeIds.has(e.sourceNodeId) || !nodeIds.has(e.targetNodeId)
  );

  if (danglingEdges.length > 0) {
    errors.push({
      code: 'DANGLING_TRANSITION_ENDPOINT',
      message: `Dangling transition endpoints detected (${danglingEdges.length}). All transitions must connect existing states.`,
      affectedTransitionIds: danglingEdges.map((e) => e.id),
    });
  }

  // Validate PDA transition formats
  for (const edge of graph.edges) {
    const parsed = parsePDATransition(
      edge.label,
      edge.inputSymbol,
      edge.stackTop,
      edge.stackReplacement
    );

    if (!parsed.inputSymbol && !parsed.stackTop && !parsed.stackReplacement) {
      errors.push({
        code: 'MALFORMED_PDA_TRANSITION',
        message: `Malformed PDA transition on edge ${edge.id}. Expected format "a, X / γ".`,
        affectedTransitionIds: [edge.id],
      });
    }
  }

  const acceptingNodes = graph.nodes.filter((n) => n.isAccepting);
  if (acceptingNodes.length === 0) {
    warnings.push('No accepting states designated. All inputs will be rejected under final-state acceptance mode.');
  }

  return {
    isValid: errors.length === 0,
    machineType: 'PDA',
    errors,
    warnings,
  };
}

/**
 * Centralized evaluation of PDA transition applicability.
 * A transition δ(q, a, X) -> (p, γ) is applicable to a configuration iff:
 *  - sourceNodeId matches the current state id
 *  - input condition matches the current lookahead symbol, OR is ε
 *  - stack condition matches the current top of stack, OR is ε
 */
export function isPDATransitionApplicable(
  rule: ParsedPDATransition,
  sourceNodeId: string,
  currentStateId: string,
  lookaheadSymbol: string | null, // null when input is exhausted (lookahead is ε)
  topStackSymbol: string | null   // null when stack is empty
): boolean {
  if (sourceNodeId !== currentStateId) return false;

  const inputMatches =
    isEpsilonSymbol(rule.inputSymbol) ||
    (lookaheadSymbol !== null && rule.inputSymbol === lookaheadSymbol);

  if (!inputMatches) return false;

  const stackMatches =
    isEpsilonSymbol(rule.stackTop) ||
    (topStackSymbol !== null && rule.stackTop === topStackSymbol);

  return stackMatches;
}

/**
 * Mathematical Determinism Analyzer: DPDA vs NPDA
 *
 * Formal DPDA Determinism Conditions (Hopcroft & Ullman / Sipser):
 * 1. For every state q, lookahead a ∈ Σ ∪ {ε}, and stack top X ∈ Γ:
 *    |δ(q, a, X)| ≤ 1 (At most one applicable transition).
 * 2. Epsilon / Input Mutual Exclusion:
 *    For every state q and stack top X ∈ Γ:
 *    If δ(q, ε, X) ≠ ∅, then for all a ∈ Σ, δ(q, a, X) = ∅.
 *
 * Edge cases handled with mathematical rigor:
 *  - Distinct input symbols (a ≠ b, neither ε) do NOT conflict (lookahead selects uniquely).
 *  - Incompatible stack symbols (X ≠ Y, neither ε) do NOT conflict (stack top is unique).
 *  - Different source states do NOT conflict.
 *  - An ε-transition alone does NOT make a PDA nondeterministic.
 */
export function analyzePDADeterminism(
  graph: SolverGraphInput,
  _initialStackSymbol: string = 'Z0'
): PDADeterminismAnalysis {
  const conflicts: PDADeterminismConflict[] = [];
  const nondeterministicStatesSet = new Set<string>();

  // Pre-parse edge transition rules
  const edgeRules = graph.edges.map((e) => ({
    edge: e,
    rule: parsePDATransition(e.label, e.inputSymbol, e.stackTop, e.stackReplacement),
  }));

  // Group edges by source state
  const stateEdgesMap = new Map<string, typeof edgeRules>();
  for (const item of edgeRules) {
    const list = stateEdgesMap.get(item.edge.sourceNodeId) || [];
    list.push(item);
    stateEdgesMap.set(item.edge.sourceNodeId, list);
  }

  // Check determinism for each state
  for (const node of graph.nodes) {
    const stateRules = stateEdgesMap.get(node.id) || [];
    if (stateRules.length <= 1) continue;

    const stateLabel = node.label || node.id;

    // Pairwise comparison of transitions from this state
    for (let i = 0; i < stateRules.length; i++) {
      for (let j = i + 1; j < stateRules.length; j++) {
        const r1 = stateRules[i];
        const r2 = stateRules[j];

        // 1. Check stack-top condition compatibility:
        // Can both transitions match the same stack top?
        const r1StackEps = isEpsilonSymbol(r1.rule.stackTop);
        const r2StackEps = isEpsilonSymbol(r2.rule.stackTop);

        let stackCompatible = false;
        let overlappingStackSymbol = '';

        if (r1StackEps && r2StackEps) {
          stackCompatible = true;
          overlappingStackSymbol = 'ε (any stack top)';
        } else if (r1StackEps && !r2StackEps) {
          stackCompatible = true;
          overlappingStackSymbol = r2.rule.stackTop;
        } else if (!r1StackEps && r2StackEps) {
          stackCompatible = true;
          overlappingStackSymbol = r1.rule.stackTop;
        } else if (r1.rule.stackTop === r2.rule.stackTop) {
          stackCompatible = true;
          overlappingStackSymbol = r1.rule.stackTop;
        } else {
          // Incompatible non-epsilon stack tops (X ≠ Y)
          stackCompatible = false;
        }

        if (!stackCompatible) {
          continue; // Incompatible stack conditions cannot simultaneously apply
        }

        // 2. Check input condition compatibility:
        const r1InputEps = isEpsilonSymbol(r1.rule.inputSymbol);
        const r2InputEps = isEpsilonSymbol(r2.rule.inputSymbol);

        // Case A: Both are epsilon-transitions on compatible stack conditions
        if (r1InputEps && r2InputEps) {
          conflicts.push({
            stateId: node.id,
            stateLabel,
            conflictType: 'DIRECT_CONFLICT',
            transitionIds: [r1.edge.id, r2.edge.id],
            inputSymbol: 'ε',
            stackSymbol: overlappingStackSymbol,
            transitionLabels: [r1.edge.label, r2.edge.label],
            reason: `Multiple ε-transitions from state '${stateLabel}' on stack top '${overlappingStackSymbol}'.`,
            mathematicalExplanation: `Two distinct transitions (${r1.edge.label}) and (${r2.edge.label}) can both fire on empty input lookahead when the stack top matches '${overlappingStackSymbol}', introducing a non-deterministic branch.`,
          });
          nondeterministicStatesSet.add(node.id);
          continue;
        }

        // Case B: Same non-epsilon input symbol on compatible stack conditions
        if (!r1InputEps && !r2InputEps && r1.rule.inputSymbol === r2.rule.inputSymbol) {
          conflicts.push({
            stateId: node.id,
            stateLabel,
            conflictType: 'DIRECT_CONFLICT',
            transitionIds: [r1.edge.id, r2.edge.id],
            inputSymbol: r1.rule.inputSymbol,
            stackSymbol: overlappingStackSymbol,
            transitionLabels: [r1.edge.label, r2.edge.label],
            reason: `Multiple transitions from state '${stateLabel}' on input '${r1.rule.inputSymbol}' for stack top '${overlappingStackSymbol}'.`,
            mathematicalExplanation: `Two distinct transitions (${r1.edge.label}) and (${r2.edge.label}) are both applicable when reading '${r1.rule.inputSymbol}' with stack top '${overlappingStackSymbol}', violating DPDA move uniqueness |δ(q, a, X)| ≤ 1.`,
          });
          nondeterministicStatesSet.add(node.id);
          continue;
        }

        // Case C: Epsilon / Input Competition (one is ε, one is consuming symbol a ∈ Σ)
        if (r1InputEps !== r2InputEps) {
          const consumingRule = r1InputEps ? r2 : r1;
          const epsRule = r1InputEps ? r1 : r2;

          conflicts.push({
            stateId: node.id,
            stateLabel,
            conflictType: 'EPSILON_INPUT_CONFLICT',
            transitionIds: [epsRule.edge.id, consumingRule.edge.id],
            inputSymbol: consumingRule.rule.inputSymbol,
            stackSymbol: overlappingStackSymbol,
            transitionLabels: [epsRule.edge.label, consumingRule.edge.label],
            reason: `Competition between ε-transition and input-consuming transition '${consumingRule.rule.inputSymbol}' from state '${stateLabel}' on stack top '${overlappingStackSymbol}'.`,
            mathematicalExplanation: `An ε-transition (${epsRule.edge.label}) and an input-consuming transition (${consumingRule.edge.label}) are both applicable when lookahead is '${consumingRule.rule.inputSymbol}' and stack top is '${overlappingStackSymbol}'. In a DPDA, if δ(q, ε, X) is defined, then δ(q, a, X) must be empty for all a ∈ Σ.`,
          });
          nondeterministicStatesSet.add(node.id);
          continue;
        }

        // Case D: Stack condition wildcard conflict
        if ((r1StackEps !== r2StackEps) && (r1.rule.inputSymbol === r2.rule.inputSymbol)) {
          conflicts.push({
            stateId: node.id,
            stateLabel,
            conflictType: 'STACK_CONDITION_CONFLICT',
            transitionIds: [r1.edge.id, r2.edge.id],
            inputSymbol: r1.rule.inputSymbol,
            stackSymbol: overlappingStackSymbol,
            transitionLabels: [r1.edge.label, r2.edge.label],
            reason: `Stack condition wildcard conflict between ε-stack and '${overlappingStackSymbol}' from state '${stateLabel}'.`,
            mathematicalExplanation: `Transition with ε-stack condition matches any stack top, overlapping with transition restricted to '${overlappingStackSymbol}' on the same input symbol '${r1.rule.inputSymbol}'.`,
          });
          nondeterministicStatesSet.add(node.id);
          continue;
        }

        // Case E: Different non-epsilon input symbols (e.g. 'a' vs 'b') on compatible stack
        // On lookahead 'a', only r1 applies; on lookahead 'b', only r2 applies.
        // This is strictly deterministic!
      }
    }
  }

  const isDeterministic = conflicts.length === 0;
  const machineClassification = isDeterministic ? 'DPDA' : 'NPDA';

  const explanation = isDeterministic
    ? 'For every state, lookahead symbol, and stack top, at most one transition is applicable (|δ(q, a, X)| ≤ 1 and no ε/input competition). The PDA is strictly deterministic (DPDA).'
    : `Found ${conflicts.length} conflict(s) across ${nondeterministicStatesSet.size} state(s) where multiple transitions can simultaneously apply or an ε-move competes with an input lookahead. The PDA is nondeterministic (NPDA).`;

  return {
    isDeterministic,
    machineClassification,
    conflicts,
    deterministicTransitionsCount: graph.edges.length - conflicts.length,
    nondeterministicStates: Array.from(nondeterministicStatesSet),
    explanation,
  };
}
