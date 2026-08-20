import React, { useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import { IInspectorSchema } from '../types';
import { InspectorSchemaRenderer } from '../InspectorSchemaRenderer';
import { AutomatonType } from '@project-zero/shared';

export const WorkspaceInspectorView: React.FC = () => {
  const {
    nodes,
    edges,
    machineType,
    setMachineType,
    initialStackSymbol,
    setInitialStackSymbol,
    blankSymbol,
    setBlankSymbol,
    getInitialState,
    getAcceptingStates,
    getAlphabet,
    to5Tuple,
  } = useGraph();

  const { validationResult, currentStep, executionResult } = useExecution();

  const initialStateNode = getInitialState();
  const acceptingNodes = getAcceptingStates();
  const alphabet = getAlphabet();
  const tuple5 = to5Tuple();

  const tapeAlphabet = useMemo(() => {
    const set = new Set<string>();
    alphabet.forEach((s) => set.add(s));
    edges.forEach((e) => {
      if (e.readSymbol && e.readSymbol.trim()) set.add(e.readSymbol);
      if (e.writeSymbol && e.writeSymbol.trim()) set.add(e.writeSymbol);
    });
    if (blankSymbol) set.add(blankSymbol);
    return Array.from(set).sort();
  }, [alphabet, edges, blankSymbol]);

  const schema: IInspectorSchema = useMemo(() => {
    const metaFields = [
      { id: 'machine-name', label: 'Machine Name', type: 'text' as const, value: 'Automaton_Workspace.pz' },
      {
        id: 'machine-type',
        label: 'Formal Model Type',
        type: 'select' as const,
        value: machineType.toLowerCase(),
        options: [
          { label: 'Deterministic Finite Automaton (DFA)', value: 'dfa' },
          { label: 'Nondeterministic Finite Automaton (NFA)', value: 'nfa' },
          { label: 'Pushdown Automaton (PDA)', value: 'pda' },
          { label: 'Turing Machine (TM)', value: 'tm' },
        ],
      },
      {
        id: 'validation-status',
        label: `${machineType} Validation Status`,
        type: 'badge' as const,
        value: validationResult.isValid
          ? `✓ Valid ${machineType}`
          : `✕ Invalid ${machineType} (${validationResult.errors.length} issue${validationResult.errors.length > 1 ? 's' : ''})`,
      },
    ];

    if (machineType === 'PDA') {
      metaFields.push({
        id: 'initial-stack-symbol',
        label: 'Initial Stack Symbol (Z₀)',
        type: 'text',
        value: initialStackSymbol,
      });
    } else if (machineType === 'TM') {
      metaFields.push({
        id: 'blank-symbol',
        label: 'Blank Symbol (B)',
        type: 'text',
        value: blankSymbol,
      });
    }

    const tupleTitle =
      machineType === 'TM'
        ? 'Formal 7-Tuple Definition M = (Q, Σ, Γ, δ, q₀, B, F)'
        : machineType === 'PDA'
        ? 'Formal 7-Tuple Definition M = (Q, Σ, Γ, δ, q₀, Z₀, F)'
        : `Formal 5-Tuple Definition M = (Q, Σ, δ, q₀, F)${machineType === 'NFA' ? ' where δ: Q × (Σ ∪ {ε}) → P(Q)' : ''}`;

    const tupleFields = [
      {
        id: 'tuple-states',
        label: `States Q (${nodes.length})`,
        type: 'badge' as const,
        value: tuple5.states.length > 0 ? `{ ${tuple5.states.join(', ')} }` : '∅',
      },
      {
        id: 'tuple-alphabet',
        label: `Input Alphabet Σ (${alphabet.length})`,
        type: 'badge' as const,
        value: tuple5.alphabet.length > 0 ? `{ ${tuple5.alphabet.join(', ')} }` : '∅',
      },
    ];

    if (machineType === 'TM') {
      tupleFields.push({
        id: 'tuple-tape-alphabet',
        label: `Tape Alphabet Γ (${tapeAlphabet.length})`,
        type: 'badge' as const,
        value: tapeAlphabet.length > 0 ? `{ ${tapeAlphabet.join(', ')} }` : '∅',
      });
      tupleFields.push({
        id: 'tuple-blank-symbol',
        label: 'Blank Symbol B',
        type: 'badge' as const,
        value: blankSymbol || '□',
      });
    }

    tupleFields.push(
      {
        id: 'tuple-initial',
        label: 'Start State q₀',
        type: 'badge' as const,
        value: initialStateNode ? initialStateNode.label : 'Unassigned',
      },
      {
        id: 'tuple-accepting',
        label: `Accepting States F (${acceptingNodes.length})`,
        type: 'badge' as const,
        value: acceptingNodes.length > 0 ? `{ ${acceptingNodes.map((n) => n.label).join(', ')} }` : '∅',
      },
      {
        id: 'tuple-transitions',
        label: `Transitions δ (${edges.length})`,
        type: 'badge' as const,
        value: `${edges.length} delta mapping(s)`,
      }
    );

    const sections = [
      {
        id: 'sec-meta',
        title: 'Machine Metadata',
        isExpanded: true,
        fields: metaFields,
      },
      {
        id: 'sec-5tuple',
        title: tupleTitle,
        isExpanded: true,
        fields: tupleFields,
      },
    ];

    if (machineType === 'TM' && currentStep) {
      const tmStep = currentStep as import('@project-zero/core-solver').TMExecutionStep;
      const transFormula = tmStep.nextStateLabel
        ? `δ(${tmStep.currentStateLabel}, ${tmStep.readSymbol}) = (${tmStep.nextStateLabel}, ${tmStep.writeSymbol}, ${tmStep.moveDirection})`
        : `δ(${tmStep.currentStateLabel}, ${tmStep.readSymbol}) is undefined`;

      const statusDisplay = tmStep.isAccepting
        ? '✓ ACCEPT'
        : tmStep.isHalted
        ? `✕ REJECT (${executionResult.rejectionReason ?? 'HALTED'})`
        : ('isInconclusive' in executionResult && executionResult.isInconclusive)
        ? '⚠ INCONCLUSIVE_LIMIT'
        : '⚡ EXECUTING';

      sections.push({
        id: 'sec-tm-config',
        title: 'Instantaneous Debug Configuration C = (q, tape, head)',
        isExpanded: true,
        fields: [
          { id: 'dbg-step', label: 'Computation Step', type: 'badge' as const, value: `Step ${tmStep.stepIndex}` },
          { id: 'dbg-state', label: 'Current State (q)', type: 'badge' as const, value: tmStep.currentStateLabel },
          { id: 'dbg-head', label: 'Head Position Index', type: 'badge' as const, value: String(tmStep.tapeHeadIndex) },
          { id: 'dbg-read', label: 'Scanned Read Symbol', type: 'badge' as const, value: tmStep.readSymbol },
          { id: 'dbg-trans', label: 'Applied Transition', type: 'badge' as const, value: transFormula },
          { id: 'dbg-status', label: 'Configuration Status', type: 'badge' as const, value: statusDisplay },
        ],
      });
    }

    return {
      selectionType: 'workspace',
      title: 'Automaton Machine Inspector',
      subtitle: `${machineType} Automaton`,
      sections,
    };
  }, [machineType, initialStackSymbol, blankSymbol, nodes, edges, initialStateNode, acceptingNodes, alphabet, tapeAlphabet, tuple5, validationResult, currentStep, executionResult]);

  const handleFieldChange = (id: string, value: string | number | boolean) => {
    if (id === 'machine-type') {
      const val = String(value).toUpperCase() as AutomatonType;
      setMachineType(val);
    } else if (id === 'initial-stack-symbol') {
      setInitialStackSymbol(String(value).trim() || 'Z0');
    } else if (id === 'blank-symbol') {
      setBlankSymbol(String(value).trim() || '□');
    }
  };

  return <InspectorSchemaRenderer schema={schema} onFieldChange={handleFieldChange} />;
};

