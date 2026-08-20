import { SolverGraphInput, DFAValidationResult, DFAValidationError } from './types';
import { normalizeSymbol } from './nfa-validator';

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
