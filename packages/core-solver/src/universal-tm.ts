import {
  SolverGraphInput,
  TMExecutionOptions,
  TMTransducerStatus,
  UTMEquivalenceComparison,
  UTMExecutionResult,
  UTMSimulationStep,
} from './types';
import { decodePair } from './tm-encoding';
import { executeTM } from './tm-executor';
import { DEFAULT_BLANK_SYMBOL, parseTMEdgeMetadata, validateTM } from './tm-validator';

/**
 * Simulates an encoded Turing Machine on an encoded input word using the Universal TM architecture.
 *
 * CONCEPTUAL UNIVERSAL PIPELINE:
 *   <M, w>
 *     ↓
 *   decode / validate encoded machine
 *     ↓
 *   universal simulation configuration
 *     ↓
 *   simulated machine state / tape / head
 *     ↓
 *   transition table lookup
 *     ↓
 *   universal simulation step with dual telemetry
 *     ↓
 *   compare directly with executeTM(M, w) for formal equivalence
 */
export function simulateUTM(
  pairStringOrMachine: string | { graph: SolverGraphInput; inputString: string; blankSymbol?: string },
  options?: TMExecutionOptions
): UTMExecutionResult {
  let decodedMachine: SolverGraphInput;
  let inputString: string;
  let blankSymbol: string;

  if (typeof pairStringOrMachine === 'string') {
    const pairResult = decodePair(pairStringOrMachine);
    if (!pairResult.isValid || !pairResult.graph) {
      // Return invalid machine execution
      const emptyGraph: SolverGraphInput = { nodes: [], edges: [] };
      return {
        isAccepted: false,
        status: 'INVALID_MACHINE',
        steps: [],
        inputString: '',
        blankSymbol: DEFAULT_BLANK_SYMBOL,
        finalTapeContents: {},
        finalTapeHeadIndex: 0,
        decodedMachine: emptyGraph,
        directExecutionResult: executeTM(emptyGraph, '', options),
        isEquivalentToDirect: false,
        explanation: `Universal TM execution failed: ${pairResult.error || 'Failed to decode <M, w> pair.'}`,
      };
    }
    decodedMachine = pairResult.graph;
    inputString = pairResult.inputString ?? '';
    blankSymbol = pairResult.blankSymbol ?? options?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;
  } else {
    decodedMachine = pairStringOrMachine.graph;
    inputString = pairStringOrMachine.inputString;
    blankSymbol = pairStringOrMachine.blankSymbol ?? options?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;
  }

  const maxSteps = options?.maxSteps ?? 1000;
  const validation = validateTM(decodedMachine, blankSymbol);

  // Run direct execution as golden reference
  const directExecutionResult = executeTM(decodedMachine, inputString, {
    blankSymbol,
    maxSteps,
  });

  if (!validation.isValid) {
    return {
      isAccepted: false,
      status: 'INVALID_MACHINE',
      steps: [],
      inputString,
      blankSymbol,
      finalTapeContents: {},
      finalTapeHeadIndex: 0,
      decodedMachine,
      directExecutionResult,
      isEquivalentToDirect: true,
      explanation: `Decoded machine failed validation: ${validation.errors.join('; ')}`,
    };
  }

  // Build Universal Simulation Engine configuration
  const { nodes, edges } = decodedMachine;
  const initialNode = nodes.find((n) => n.isInitial)!;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Index transition lookup table by (sourceNodeId, readSymbol)
  const transitionLookup = new Map<string, {
    targetNodeId: string;
    targetStateLabel: string;
    writeSymbol: string;
    moveDirection: 'L' | 'R' | 'S';
    ruleCode: string;
  }>();

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
      const srcNode = nodeMap.get(parsed.sourceNodeId);
      const tgtNode = nodeMap.get(parsed.targetNodeId);
      const key = `${parsed.sourceNodeId}:${parsed.readSymbol}`;
      transitionLookup.set(key, {
        targetNodeId: parsed.targetNodeId,
        targetStateLabel: tgtNode?.label ?? parsed.targetNodeId,
        writeSymbol: parsed.writeSymbol,
        moveDirection: parsed.moveDirection,
        ruleCode: `δ(${srcNode?.label ?? parsed.sourceNodeId}, ${parsed.readSymbol}) → (${tgtNode?.label ?? parsed.targetNodeId}, ${parsed.writeSymbol}, ${parsed.moveDirection})`,
      });
    }
  }

  // Simulated infinite tape initialized with input string
  const simulatedTape: Record<number, string> = {};
  for (let i = 0; i < inputString.length; i++) {
    simulatedTape[i] = inputString[i];
  }

  let simulatedHeadIndex = 0;
  let currentSimulatedStateId = initialNode.id;
  const universalSteps: UTMSimulationStep[] = [];
  let isAccepted = false;
  let status: TMTransducerStatus = 'HALTED_REJECT';

  for (let stepIndex = 0; stepIndex <= maxSteps; stepIndex++) {
    const currentState = nodeMap.get(currentSimulatedStateId)!;
    const currentReadSymbol = simulatedTape[simulatedHeadIndex] !== undefined
      ? simulatedTape[simulatedHeadIndex]
      : blankSymbol;

    // Check accepting state halt
    if (currentState.isAccepting) {
      isAccepted = true;
      status = 'COMPUTED';

      universalSteps.push({
        stepIndex,
        simulatedStateLabel: currentState.label,
        simulatedStateIndex: stepIndex,
        simulatedTapeContents: { ...simulatedTape },
        simulatedTapeHeadIndex: simulatedHeadIndex,
        simulatedReadSymbol: currentReadSymbol,
        simulatedWriteSymbol: currentReadSymbol,
        simulatedMoveDirection: 'S',
        isHalted: true,
        isAccepting: true,
        isMissingTransition: false,
      });
      break;
    }

    // Lookup transition in simulated transition table
    const key = `${currentSimulatedStateId}:${currentReadSymbol}`;
    const matched = transitionLookup.get(key);

    if (!matched) {
      // Machine halts due to missing transition
      isAccepted = false;
      status = 'MISSING_TRANSITION';

      universalSteps.push({
        stepIndex,
        simulatedStateLabel: currentState.label,
        simulatedStateIndex: stepIndex,
        simulatedTapeContents: { ...simulatedTape },
        simulatedTapeHeadIndex: simulatedHeadIndex,
        simulatedReadSymbol: currentReadSymbol,
        simulatedWriteSymbol: currentReadSymbol,
        simulatedMoveDirection: 'S',
        isHalted: true,
        isAccepting: false,
        isMissingTransition: true,
      });
      break;
    }

    if (stepIndex >= maxSteps) {
      isAccepted = false;
      status = 'INCONCLUSIVE_LIMIT';
      break;
    }

    // Record pre-execution instantaneous configuration
    universalSteps.push({
      stepIndex,
      simulatedStateLabel: currentState.label,
      simulatedStateIndex: stepIndex,
      simulatedTapeContents: { ...simulatedTape },
      simulatedTapeHeadIndex: simulatedHeadIndex,
      simulatedReadSymbol: currentReadSymbol,
      simulatedWriteSymbol: matched.writeSymbol,
      simulatedMoveDirection: matched.moveDirection,
      matchedTransitionCode: matched.ruleCode,
      isHalted: false,
      isAccepting: false,
      isMissingTransition: false,
    });

    // Universal simulation cycle: write symbol, update head, transition state
    simulatedTape[simulatedHeadIndex] = matched.writeSymbol;
    if (matched.moveDirection === 'L') {
      simulatedHeadIndex -= 1;
    } else if (matched.moveDirection === 'R') {
      simulatedHeadIndex += 1;
    }
    currentSimulatedStateId = matched.targetNodeId;
  }

  // Formal equivalence verification: compare independent universal simulation with direct execution reference
  let tapeMatches = true;
  const directTape = directExecutionResult.finalTapeContents;
  const allTapePositions = new Set([...Object.keys(directTape), ...Object.keys(simulatedTape)]);
  for (const pos of allTapePositions) {
    const dVal = directTape[Number(pos)] ?? blankSymbol;
    const uVal = simulatedTape[Number(pos)] ?? blankSymbol;
    if (dVal !== uVal) {
      tapeMatches = false;
      break;
    }
  }

  const isEquivalentToDirect =
    isAccepted === directExecutionResult.isAccepted &&
    universalSteps.length === directExecutionResult.steps.length &&
    simulatedHeadIndex === directExecutionResult.finalTapeHeadIndex &&
    tapeMatches;

  return {
    isAccepted,
    status,
    steps: universalSteps,
    inputString,
    blankSymbol,
    finalTapeContents: { ...simulatedTape },
    finalTapeHeadIndex: simulatedHeadIndex,
    decodedMachine,
    directExecutionResult,
    isEquivalentToDirect,
    explanation: `Universal TM simulated ${universalSteps.length} steps. Machine ${isAccepted ? 'ACCEPTED' : 'HALTED_WITHOUT_ACCEPTANCE'} (Equivalence with Direct Execution: ${isEquivalentToDirect ? '100% MATCH' : 'MISMATCH'}).`,
  };
}

/**
 * Verifies that Universal TM Simulation U(<M, w>) and Direct Execution M(w)
 * produce identical computation traces and final configurations.
 */
export function verifyUniversalEquivalence(
  graph: SolverGraphInput,
  inputString: string,
  options?: TMExecutionOptions
): UTMEquivalenceComparison {
  const blankSymbol = options?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;
  const directResult = executeTM(graph, inputString, options);
  const utmResult = simulateUTM({ graph, inputString, blankSymbol }, options);

  const mismatches: string[] = [];

  const acceptanceMatch = directResult.isAccepted === utmResult.isAccepted;
  if (!acceptanceMatch) {
    mismatches.push(`Acceptance status mismatch: Direct=${directResult.isAccepted}, Universal=${utmResult.isAccepted}`);
  }

  const stepCountMatch = directResult.steps.length === utmResult.steps.length;
  if (!stepCountMatch) {
    mismatches.push(`Step count mismatch: Direct=${directResult.steps.length}, Universal=${utmResult.steps.length}`);
  }

  const haltingStateMatch = directResult.finalStateLabel === (utmResult.steps[utmResult.steps.length - 1]?.simulatedStateLabel ?? null);
  if (!haltingStateMatch) {
    mismatches.push(`Halting state label mismatch: Direct=${directResult.finalStateLabel}, Universal=${utmResult.steps[utmResult.steps.length - 1]?.simulatedStateLabel}`);
  }

  const headPositionMatch = directResult.finalTapeHeadIndex === utmResult.finalTapeHeadIndex;
  if (!headPositionMatch) {
    mismatches.push(`Final head position mismatch: Direct=${directResult.finalTapeHeadIndex}, Universal=${utmResult.finalTapeHeadIndex}`);
  }

  // Compare tape non-blank contents
  let tapeContentsMatch = true;
  const directTape = directResult.finalTapeContents;
  const utmTape = utmResult.finalTapeContents;
  const allPositions = new Set([...Object.keys(directTape), ...Object.keys(utmTape)]);

  for (const pos of allPositions) {
    const dVal = directTape[Number(pos)] ?? blankSymbol;
    const uVal = utmTape[Number(pos)] ?? blankSymbol;
    if (dVal !== uVal) {
      tapeContentsMatch = false;
      mismatches.push(`Tape cell ${pos} mismatch: Direct="${dVal}", Universal="${uVal}"`);
      break;
    }
  }

  const isEquivalent =
    acceptanceMatch &&
    stepCountMatch &&
    haltingStateMatch &&
    headPositionMatch &&
    tapeContentsMatch;

  return {
    isEquivalent,
    stepCountMatch,
    acceptanceMatch,
    haltingStateMatch,
    tapeContentsMatch,
    headPositionMatch,
    mismatches,
    directStepCount: directResult.steps.length,
    universalStepCount: utmResult.steps.length,
  };
}
