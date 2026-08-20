import { DFAValidationError, DFAValidationResult, SolverGraphInput, TMMoveDirection } from './types';

export const DEFAULT_BLANK_SYMBOL = '□';

export interface ParsedTMTransition {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  readSymbol: string;
  writeSymbol: string;
  moveDirection: TMMoveDirection;
}

/**
 * Parses raw TM transition metadata from a TransitionEdge.
 * Supports explicit fields (readSymbol, writeSymbol, moveDirection) or
 * string label formats like "0 → 1, R" or "0, 1, R" or "0 / 1, R".
 */
export function parseTMEdgeMetadata(
  edgeId: string,
  sourceNodeId: string,
  targetNodeId: string,
  label: string,
  rawRead?: string,
  rawWrite?: string,
  rawMove?: string
): ParsedTMTransition | { error: string } {
  // 1. Prefer explicit properties if fully specified
  let readSymbol = rawRead;
  let writeSymbol = rawWrite;
  let moveDirection: TMMoveDirection | undefined =
    rawMove === 'L' || rawMove === 'R' || rawMove === 'S' ? rawMove : undefined;

  // 2. Parse string label fallback if properties missing
  const cleanLabel = label.trim();
  if ((!readSymbol || !writeSymbol || !moveDirection) && cleanLabel) {
    // Format A: "0 -> 1, R" or "0 → 1, R" or "0 -> 1 R"
    const arrowMatch = cleanLabel.match(/^([^→\->]+)(?:→|->)\s*([^,\s]+)[,\s]+([LRS])$/i);
    if (arrowMatch) {
      if (!readSymbol) readSymbol = arrowMatch[1].trim();
      if (!writeSymbol) writeSymbol = arrowMatch[2].trim();
      if (!moveDirection) {
        const dir = arrowMatch[3].toUpperCase();
        if (dir === 'L' || dir === 'R' || dir === 'S') moveDirection = dir;
      }
    } else {
      // Format B: "0, 1, R" or "0 / 1 / R" or "0 1 R"
      const parts = cleanLabel.split(/[,/]/).map((p) => p.trim());
      if (parts.length >= 3) {
        if (!readSymbol) readSymbol = parts[0];
        if (!writeSymbol) writeSymbol = parts[1];
        if (!moveDirection) {
          const dir = parts[2].toUpperCase();
          if (dir === 'L' || dir === 'R' || dir === 'S') moveDirection = dir as TMMoveDirection;
        }
      } else if (parts.length === 1 && cleanLabel.length > 0) {
        // Fallback for simple single character read/write/stay
        if (!readSymbol) readSymbol = cleanLabel;
        if (!writeSymbol) writeSymbol = cleanLabel;
        if (!moveDirection) moveDirection = 'R';
      }
    }
  }

  if (readSymbol === undefined || readSymbol === '') {
    return { error: 'Missing or empty read symbol' };
  }
  if (writeSymbol === undefined || writeSymbol === '') {
    return { error: 'Missing or empty write symbol' };
  }
  if (!moveDirection) {
    return { error: 'Invalid or missing move direction (must be L, R, or S)' };
  }

  return {
    edgeId,
    sourceNodeId,
    targetNodeId,
    readSymbol,
    writeSymbol,
    moveDirection,
  };
}

/**
 * Validates a Turing Machine graph structure according to deterministic TM 7-tuple rules.
 */
export function validateTM(
  graph: SolverGraphInput,
  blankSymbol: string = DEFAULT_BLANK_SYMBOL
): DFAValidationResult {
  const errors: DFAValidationError[] = [];
  const warnings: string[] = [];

  const { nodes, edges } = graph;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 1. Initial State Validation
  const initialNodes = nodes.filter((n) => n.isInitial);
  if (initialNodes.length === 0) {
    errors.push({
      code: 'MISSING_INITIAL_STATE',
      message: 'Turing Machine must have exactly one initial state q₀.',
    });
  } else if (initialNodes.length > 1) {
    errors.push({
      code: 'MULTIPLE_INITIAL_STATES',
      message: `Turing Machine has ${initialNodes.length} initial states. Exactly one initial state is allowed.`,
      affectedStateIds: initialNodes.map((n) => n.id),
    });
  }

  // 2. Blank Symbol Validation
  if (!blankSymbol || blankSymbol.trim() === '') {
    errors.push({
      code: 'INVALID_BLANK_SYMBOL',
      message: 'Turing Machine blank symbol B cannot be empty.',
    });
  }

  // 3. Transition Validation & Determinism Map
  // Track (sourceNodeId, readSymbol) -> edgeId
  const transitionMap = new Map<string, string>();

  for (const edge of edges) {
    const srcNode = nodeMap.get(edge.sourceNodeId);
    const tgtNode = nodeMap.get(edge.targetNodeId);

    if (!srcNode || !tgtNode) {
      errors.push({
        code: 'DANGLING_TRANSITION_ENDPOINT',
        message: `Transition "${edge.label || edge.id}" connects to a non-existent state.`,
        affectedTransitionIds: [edge.id],
      });
      continue;
    }

    const parsed = parseTMEdgeMetadata(
      edge.id,
      edge.sourceNodeId,
      edge.targetNodeId,
      edge.label,
      edge.readSymbol,
      edge.writeSymbol,
      edge.moveDirection
    );

    if ('error' in parsed) {
      errors.push({
        code:
          parsed.error.includes('move')
            ? 'INVALID_MOVE_DIRECTION'
            : parsed.error.includes('write')
            ? 'MISSING_WRITE_SYMBOL'
            : 'EMPTY_TRANSITION_SYMBOL',
        message: `Transition "${edge.label || edge.id}": ${parsed.error}`,
        affectedTransitionIds: [edge.id],
      });
      continue;
    }

    const key = `${parsed.sourceNodeId}:${parsed.readSymbol}`;
    if (transitionMap.has(key)) {
      const existingEdgeId = transitionMap.get(key)!;
      errors.push({
        code: 'DUPLICATE_TM_TRANSITION',
        message: `Deterministic TM ambiguity: State "${srcNode.label}" already has a transition for symbol "${parsed.readSymbol}".`,
        affectedStateIds: [srcNode.id],
        affectedTransitionIds: [existingEdgeId, edge.id],
      });
    } else {
      transitionMap.set(key, edge.id);
    }
  }

  // Check for accepting states warning
  const acceptingCount = nodes.filter((n) => n.isAccepting).length;
  if (acceptingCount === 0) {
    warnings.push('Turing Machine has no accepting/final states (F = ∅).');
  }

  return {
    isValid: errors.length === 0,
    machineType: 'TM',
    errors,
    warnings,
  };
}
