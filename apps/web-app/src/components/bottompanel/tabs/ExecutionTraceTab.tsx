import React from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import { DFAExecutionStep, NFAExecutionStep, PDAExecutionStep, TMExecutionStep } from '@project-zero/core-solver';
import { Play, ArrowRight, CheckCircle2, XCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { TMTapeVisualizer } from '../../tape/TMTapeVisualizer';
import { PDAStackVisualizer } from '../../stack/PDAStackVisualizer';

export const ExecutionTraceTab: React.FC = () => {
  const { setSelection, machineType, blankSymbol, initialStackSymbol } = useGraph();
  const {
    inputString,
    setInputString,
    currentStepIndex,
    setCurrentStepIndex,
    executionResult,
    validationResult,
    currentStep,
  } = useExecution();

  const { isAccepted, rejectionReason, steps } = executionResult;

  const tmStep = machineType === 'TM' && currentStep && 'tapeHeadIndex' in currentStep ? (currentStep as TMExecutionStep) : null;
  const pdaStep = machineType === 'PDA' && currentStep && 'stackAfter' in currentStep ? (currentStep as PDAExecutionStep) : null;
  const nfaStep = machineType === 'NFA' && currentStep && 'nextStates' in currentStep ? (currentStep as NFAExecutionStep) : null;
  const dfaStep = machineType === 'DFA' && currentStep && 'currentStateLabel' in currentStep ? (currentStep as DFAExecutionStep) : null;

  const formatStateSet = (states: ReadonlyArray<{ id: string; label: string }>) => {
    if (states.length === 0) return '∅';
    return `{${states.map((s) => s.label).join(', ')}}`;
  };

  // Derive Dynamic Mathematical "Why?" Explanation based on current executed step
  const getEducationalWhyExplanation = (): string => {
    if (!currentStep) return 'No active step executed.';

    if (machineType === 'DFA' && dfaStep) {
      if (dfaStep.isHalted) {
        return dfaStep.isAccepting
          ? `Machine halted in accepting state '${dfaStep.currentStateLabel}' after consuming input string. Input accepted.`
          : `Machine halted in non-accepting state '${dfaStep.currentStateLabel}' or encountered a missing transition. Input rejected.`;
      }
      return `DFA transition rule δ(${dfaStep.currentStateLabel}, '${dfaStep.readSymbol}') = '${dfaStep.nextStateLabel}' was executed, moving state head to '${dfaStep.nextStateLabel}'.`;
    }

    if (machineType === 'NFA' && nfaStep) {
      if (nfaStep.isHalted) {
        return isAccepted
          ? `At least one non-deterministic execution branch terminated in an accepting state ${formatStateSet(nfaStep.currentStates)}. Input accepted by NFA language semantics.`
          : `No non-deterministic execution branch ended in an accepting state. Reached active state set ${formatStateSet(nfaStep.currentStates)}. Input rejected.`;
      }
      return `NFA multi-state transition δ(${formatStateSet(nfaStep.currentStates)}, '${nfaStep.readSymbol || 'ε'}') computed next active state set ${formatStateSet(nfaStep.nextStates)}.`;
    }

    if (machineType === 'PDA' && pdaStep) {
      const beforeStr = pdaStep.stackBefore.join('');
      const afterStr = pdaStep.stackAfter.join('');
      return `Pushdown rule δ(${pdaStep.currentStateLabel}, '${pdaStep.readSymbol || 'ε'}', stack: [${beforeStr}]) → (${pdaStep.nextStateLabel}, stack: [${afterStr}]) mutated stack configuration from [${beforeStr}] to [${afterStr}].`;
    }

    if (machineType === 'TM' && tmStep) {
      if (tmStep.isHalted) {
        return tmStep.isAccepting
          ? `Turing Machine entered accepting state '${tmStep.currentStateLabel}' and halted. Computation succeeded.`
          : `Turing Machine entered non-accepting state '${tmStep.currentStateLabel}' or reached limit without acceptance. Computation halted.`;
      }
      return `Turing Machine read '${tmStep.readSymbol}' at tape position ${tmStep.tapeHeadIndex}, wrote '${tmStep.writeSymbol}', moved head ${tmStep.moveDirection}, and transitioned to state '${tmStep.nextStateLabel}'.`;
    }

    return 'Transition executed according to formal machine definition.';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs font-mono select-none">
      {/* Step Controls Bar */}
      <div className="p-2 border-b border-border-subtle bg-bg-surface2/50 flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-txt-secondary font-medium">Input String:</span>
          <input
            type="text"
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            placeholder="e.g. 000, 101, 1"
            className="bg-bg-surface3 border border-border-subtle hover:border-border-strong focus:border-border-focus px-2 py-0.5 rounded text-txt-primary font-bold font-mono outline-none text-xs w-32 transition-colors"
          />

          {!validationResult.isValid ? (
            <span className="text-semantic-error text-[11px] bg-semantic-error/10 border border-semantic-error/30 px-2 py-0.5 rounded flex items-center space-x-1 font-semibold">
              <AlertTriangle size={12} />
              <span>Invalid {machineType}</span>
            </span>
          ) : isAccepted ? (
            <span className="text-semantic-accept text-[11px] bg-semantic-accept/10 border border-semantic-accept/30 px-2 py-0.5 rounded flex items-center space-x-1 font-bold">
              <CheckCircle2 size={12} />
              <span>ACCEPT</span>
            </span>
          ) : ('isInconclusive' in executionResult && executionResult.isInconclusive) || rejectionReason === 'INCONCLUSIVE_LIMIT' ? (
            <span className="text-semantic-warning text-[11px] bg-semantic-warning/10 border border-semantic-warning/30 px-2 py-0.5 rounded flex items-center space-x-1 font-bold">
              <AlertTriangle size={12} />
              <span>INCONCLUSIVE_LIMIT</span>
            </span>
          ) : (
            <span className="text-semantic-error text-[11px] bg-semantic-error/10 border border-semantic-error/30 px-2 py-0.5 rounded flex items-center space-x-1 font-bold">
              <XCircle size={12} />
              <span>REJECT ({rejectionReason ?? 'NON_ACCEPTING'})</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 text-txt-muted text-[11px]">
          <span>Step {steps.length > 0 ? currentStepIndex + 1 : 0} of {steps.length}</span>
          <span>•</span>
          <span>{validationResult.isValid ? (currentStepIndex === steps.length - 1 ? 'Execution Complete' : 'Step-by-Step Stepping') : 'Validation Halted'}</span>
        </div>
      </div>

      {/* Dynamic Educational "Why?" Explanation Panel */}
      {currentStep && (
        <div className="p-2.5 bg-bg-surface2/80 border-b border-border-subtle flex items-start space-x-2 text-[11px] shrink-0">
          <Sparkles size={14} className="text-accent-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-accent-primary flex items-center space-x-1">
              <span>Why? — Step {currentStepIndex} Mathematical Rationale</span>
            </span>
            <p className="text-txt-primary leading-tight font-sans text-xs">
              {getEducationalWhyExplanation()}
            </p>
          </div>
        </div>
      )}

      {/* TM Dedicated Tape Visualizer */}
      {machineType === 'TM' && (
        <div className="p-3 border-b border-border-subtle bg-bg-surface1/60 shrink-0">
          <TMTapeVisualizer
            tapeContents={tmStep?.tapeContents}
            headIndex={tmStep?.tapeHeadIndex ?? 0}
            blankSymbol={blankSymbol}
            readSymbol={tmStep?.readSymbol}
            writeSymbol={tmStep?.writeSymbol}
            moveDirection={tmStep?.moveDirection}
            stepIndex={currentStepIndex}
            isHalted={tmStep?.isHalted ?? false}
            isAccepting={tmStep?.isAccepting ?? false}
            rejectionReason={rejectionReason}
          />
        </div>
      )}

      {/* PDA Dedicated Stack Visualizer */}
      {machineType === 'PDA' && currentStep && 'stackAfter' in currentStep && (
        <div className="p-3 border-b border-border-subtle bg-bg-surface1/60 shrink-0">
          <PDAStackVisualizer
            stack={(currentStep as PDAExecutionStep).stackAfter}
            initialStackSymbol={initialStackSymbol}
          />
        </div>
      )}

      {/* Validation Errors Banner */}
      {!validationResult.isValid && validationResult.errors.length > 0 && (
        <div className="p-2.5 bg-semantic-error/10 border-b border-semantic-error/30 text-semantic-error text-xs space-y-1 shrink-0">
          <div className="font-bold flex items-center space-x-1">
            <AlertTriangle size={14} />
            <span>Execution Blocked — Fix {validationResult.errors.length} {machineType} Issue(s):</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            {validationResult.errors.map((err, idx) => (
              <li
                key={idx}
                onClick={() => setSelection(err.affectedStateIds || [], err.affectedTransitionIds || [])}
                className="cursor-pointer hover:underline hover:text-txt-primary transition-colors"
                title="Click to select offending items on canvas"
              >
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Execution Timeline Trace Table */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="grid grid-cols-5 text-txt-muted text-[11px] border-b border-border-subtle pb-1 px-2 font-semibold">
          <span>Step Index</span>
          <span>{machineType === 'NFA' ? 'Reachable State Set' : 'Current State'}</span>
          <span>{machineType === 'TM' ? 'Read (Tape)' : 'Read Symbol'}</span>
          <span>{machineType === 'TM' ? 'Action (Write, Move)' : 'Remaining Input'}</span>
          <span>Transition Result</span>
        </div>

        {(steps as ReadonlyArray<DFAExecutionStep | NFAExecutionStep | PDAExecutionStep | TMExecutionStep>).map((s) => {
          const isActive = s.stepIndex === currentStepIndex;

          const tmStepItem = 'tapeHeadIndex' in s ? (s as TMExecutionStep) : null;
          const nfaStepItem = 'nextStates' in s ? (s as NFAExecutionStep) : null;
          const dfaStepItem = !nfaStepItem && !tmStepItem ? (s as DFAExecutionStep) : null;

          const stateLabelDisplay = tmStepItem
            ? tmStepItem.currentStateLabel
            : nfaStepItem
            ? formatStateSet(nfaStepItem.currentStates)
            : dfaStepItem?.currentStateLabel || '';

          const nextLabelDisplay = tmStepItem
            ? tmStepItem.nextStateLabel || ''
            : nfaStepItem
            ? formatStateSet(nfaStepItem.nextStates)
            : dfaStepItem?.nextStateLabel || '';

          const readSymbolDisplay = tmStepItem
            ? tmStepItem.readSymbol
            : s.readSymbol ?? 'ε';

          const actionDisplay = tmStepItem
            ? tmStepItem.isHalted
              ? 'Halted'
              : `Write ${tmStepItem.writeSymbol}, Move ${tmStepItem.moveDirection}`
            : 'remainingInput' in s
            ? (s as { remainingInput?: string }).remainingInput ?? ''
            : '';

          return (
            <div
              key={s.stepIndex}
              onClick={() => setCurrentStepIndex(s.stepIndex)}
              className={`grid grid-cols-5 items-center p-2 rounded border text-xs cursor-pointer transition-all ${
                isActive
                  ? 'bg-accent-primary/15 border-accent-primary text-txt-primary font-bold shadow-sm'
                  : s.isHalted && isAccepted
                  ? 'bg-semantic-accept/10 border-semantic-accept/30 text-txt-primary'
                  : s.isHalted && !isAccepted
                  ? 'bg-semantic-error/10 border-semantic-error/30 text-txt-primary'
                  : 'bg-bg-surface2/60 border-border-subtle text-txt-secondary hover:bg-bg-surface2'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Play size={12} className={isActive ? 'text-accent-primary fill-accent-primary' : 'text-txt-muted'} />
                <span>Step {s.stepIndex}</span>
              </div>
              <span className="font-bold text-accent-primary">{stateLabelDisplay}</span>
              <span className="text-semantic-info font-bold">{readSymbolDisplay}</span>
              <span className="text-txt-muted font-mono">{actionDisplay}</span>
              <div className="flex items-center space-x-1">
                <ArrowRight size={12} className="text-txt-muted" />
                {s.isHalted ? (
                  s.isAccepting ? (
                    <span className="flex items-center space-x-1 text-semantic-accept font-bold">
                      <CheckCircle2 size={12} />
                      <span>Accepting ({stateLabelDisplay})</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-semantic-error font-bold">
                      <XCircle size={12} />
                      <span>Halted / Rejection ({stateLabelDisplay})</span>
                    </span>
                  )
                ) : (
                  <span>
                    δ({stateLabelDisplay}, {readSymbolDisplay}) → <strong className="text-accent-primary">{nextLabelDisplay}</strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};



