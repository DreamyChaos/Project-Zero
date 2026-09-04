import {
  SolverGraphInput,
  TMMoveDirection,
  TMExecutionResult,
  TMExecutionStep,
  TMInstantaneousConfiguration,
  TMRejectionReason,
  TMExecutionOptions,
} from './types';
import { validateTM, parseTMEdgeMetadata, DEFAULT_BLANK_SYMBOL } from './tm-validator';

/**
 * Pure projection of a TMExecutionStep into an instantaneous configuration C = (q, tape, headPosition).
 */
export function getTMInstantaneousConfiguration(step: TMExecutionStep): TMInstantaneousConfiguration {
  return {
    stepIndex: step.stepIndex,
    stateId: step.currentStateId,
    stateLabel: step.currentStateLabel,
    headPosition: step.tapeHeadIndex,
    readSymbol: step.readSymbol,
    writeSymbol: step.writeSymbol,
    moveDirection: step.moveDirection,
    nextStateId: step.nextStateId,
    nextStateLabel: step.nextStateLabel,
    transitionId: step.transitionId,
    tapeContents: { ...step.tapeContents },
    tapeString: step.tapeString,
    isHalted: step.isHalted,
    isAccepting: step.isAccepting,
  };
}

export class TMTape {
  private cells = new Map<number, string>();
  public readonly blankSymbol: string;

  constructor(initialInput: string = '', blankSymbol: string = DEFAULT_BLANK_SYMBOL) {
    this.blankSymbol = blankSymbol || DEFAULT_BLANK_SYMBOL;
    for (let i = 0; i < initialInput.length; i++) {
      this.cells.set(i, initialInput[i]);
    }
  }

  public read(index: number): string {
    return this.cells.get(index) ?? this.blankSymbol;
  }

  public write(index: number, symbol: string): void {
    if (symbol === this.blankSymbol) {
      // Optional: keep map clean or store explicitly
      this.cells.set(index, symbol);
    } else {
      this.cells.set(index, symbol);
    }
  }

  public getMinIndex(): number {
    let min = 0;
    for (const key of this.cells.keys()) {
      if (key < min) min = key;
    }
    return min;
  }

  public getMaxIndex(): number {
    let max = 0;
    for (const key of this.cells.keys()) {
      if (key > max) max = key;
    }
    return max;
  }

  public toRecord(): Record<number, string> {
    const obj: Record<number, string> = {};
    for (const [pos, val] of this.cells.entries()) {
      obj[pos] = val;
    }
    return obj;
  }

  public toFormattedString(headIndex: number): string {
    const minPos = Math.min(this.getMinIndex(), headIndex - 2);
    const maxPos = Math.max(this.getMaxIndex(), headIndex + 2);
    const parts: string[] = [];

    for (let i = minPos; i <= maxPos; i++) {
      const val = this.read(i);
      if (i === headIndex) {
        parts.push(`[${val}]`);
      } else {
        parts.push(` ${val} `);
      }
    }
    return parts.join('');
  }

  public clone(): TMTape {
    const copy = new TMTape('', this.blankSymbol);
    for (const [pos, val] of this.cells.entries()) {
      copy.cells.set(pos, val);
    }
    return copy;
  }
}

/**
 * Pure deterministic Turing Machine execution engine.
 * Simulates M = (Q, Σ, Γ, δ, q₀, B, F).
 */
export function executeTM(
  graph: SolverGraphInput,
  inputString: string,
  options?: TMExecutionOptions
): TMExecutionResult {
  const blankSymbol = options?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;
  const maxSteps = options?.maxSteps ?? 1000;

  const validationResult = validateTM(graph, blankSymbol);
  if (!validationResult.isValid) {
    return {
      isAccepted: false,
      finalStateId: null,
      finalStateLabel: null,
      rejectionReason: 'INVALID_MACHINE',
      steps: [],
      inputString,
      validationResult,
      blankSymbol,
      finalTapeContents: {},
      finalTapeHeadIndex: 0,
    };
  }

  const { nodes, edges } = graph;
  const initialState = nodes.find((n) => n.isInitial)!;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Index transition mappings by sourceNodeId -> ParsedTMTransition[]
  const transitionTable = new Map<string, Array<{ edgeId: string; targetNodeId: string; readSymbol: string; writeSymbol: string; moveDirection: TMMoveDirection }>>();

  for (const edge of edges) {
    const parsed = parseTMEdgeMetadata(
      edge.id,
      edge.sourceNodeId,
      edge.targetNodeId,
      edge.label,
      edge.readSymbol,
      edge.writeSymbol,
      edge.moveDirection
    );

    if (!('error' in parsed)) {
      const list = transitionTable.get(parsed.sourceNodeId) ?? [];
      list.push(parsed);
      transitionTable.set(parsed.sourceNodeId, list);
    }
  }

  const tape = new TMTape(inputString, blankSymbol);
  let headIndex = 0;
  let currentStateId = initialState.id;
  const steps: TMExecutionStep[] = [];

  for (let stepIndex = 0; stepIndex <= maxSteps; stepIndex++) {
    const currentState = nodeMap.get(currentStateId)!;
    const currentReadSymbol = tape.read(headIndex);

    // Check if initial or current state is already an accepting state
    if (currentState.isAccepting) {
      steps.push({
        stepIndex,
        currentStateId: currentState.id,
        currentStateLabel: currentState.label,
        tapeHeadIndex: headIndex,
        tapeContents: tape.toRecord(),
        tapeString: tape.toFormattedString(headIndex),
        readSymbol: currentReadSymbol,
        writeSymbol: currentReadSymbol,
        moveDirection: 'S',
        isHalted: true,
        isAccepting: true,
      });

      return {
        isAccepted: true,
        finalStateId: currentState.id,
        finalStateLabel: currentState.label,
        steps,
        inputString,
        validationResult,
        blankSymbol,
        finalTapeContents: tape.toRecord(),
        finalTapeHeadIndex: headIndex,
      };
    }

    // Look up transition for (currentStateId, currentReadSymbol)
    const outgoing = transitionTable.get(currentStateId) ?? [];
    const matchedTransition = outgoing.find((t) => t.readSymbol === currentReadSymbol);

    if (!matchedTransition) {
      // No transition exists for symbol -> machine halts & rejects
      steps.push({
        stepIndex,
        currentStateId: currentState.id,
        currentStateLabel: currentState.label,
        tapeHeadIndex: headIndex,
        tapeContents: tape.toRecord(),
        tapeString: tape.toFormattedString(headIndex),
        readSymbol: currentReadSymbol,
        writeSymbol: currentReadSymbol,
        moveDirection: 'S',
        isHalted: true,
        isAccepting: false,
      });

      const rejectionReason: TMRejectionReason = 'NO_TRANSITION';

      return {
        isAccepted: false,
        finalStateId: currentState.id,
        finalStateLabel: currentState.label,
        rejectionReason,
        steps,
        inputString,
        validationResult,
        blankSymbol,
        finalTapeContents: tape.toRecord(),
        finalTapeHeadIndex: headIndex,
      };
    }

    // Check step limit bound safety
    if (stepIndex >= maxSteps) {
      return {
        isAccepted: false,
        isInconclusive: true,
        finalStateId: currentState.id,
        finalStateLabel: currentState.label,
        rejectionReason: 'INCONCLUSIVE_LIMIT',
        steps,
        inputString,
        validationResult,
        blankSymbol,
        finalTapeContents: tape.toRecord(),
        finalTapeHeadIndex: headIndex,
      };
    }

    const nextState = nodeMap.get(matchedTransition.targetNodeId)!;

    // Record step trace before mutating tape position
    steps.push({
      stepIndex,
      currentStateId: currentState.id,
      currentStateLabel: currentState.label,
      tapeHeadIndex: headIndex,
      tapeContents: tape.toRecord(),
      tapeString: tape.toFormattedString(headIndex),
      readSymbol: currentReadSymbol,
      writeSymbol: matchedTransition.writeSymbol,
      moveDirection: matchedTransition.moveDirection,
      transitionId: matchedTransition.edgeId,
      nextStateId: nextState.id,
      nextStateLabel: nextState.label,
      isHalted: false,
      isAccepting: false,
    });

    // Execute state update, write symbol to tape, move head
    tape.write(headIndex, matchedTransition.writeSymbol);

    if (matchedTransition.moveDirection === 'R') {
      headIndex += 1;
    } else if (matchedTransition.moveDirection === 'L') {
      headIndex -= 1;
    }

    currentStateId = nextState.id;
  }

  const finalState = nodeMap.get(currentStateId);
  return {
    isAccepted: false,
    isInconclusive: true,
    finalStateId: currentStateId,
    finalStateLabel: finalState ? finalState.label : null,
    rejectionReason: 'INCONCLUSIVE_LIMIT',
    steps,
    inputString,
    validationResult,
    blankSymbol,
    finalTapeContents: tape.toRecord(),
    finalTapeHeadIndex: headIndex,
  };
}
