import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import {
  DFAExecutionStep,
  NFAExecutionStep,
  PDAExecutionStep,
  TMExecutionStep,
  executeTMTransducer,
  CANONICAL_TRANSDUCER_PRESETS,
  TMMode,
  encodeTM,
  encodePair,
  simulateUTM,
  verifyUniversalEquivalence,
} from '@project-zero/core-solver';
import { Play, ArrowRight, CheckCircle2, XCircle, AlertTriangle, Sparkles, Layers, BookOpen, ArrowRightLeft, Code2, Cpu, Copy } from 'lucide-react';
import { TMTapeVisualizer } from '../../tape/TMTapeVisualizer';
import { PDAStackVisualizer } from '../../stack/PDAStackVisualizer';

export const ExecutionTraceTab: React.FC = () => {
  const { setSelection, machineType, blankSymbol, initialStackSymbol, pdaAcceptanceMode, setPdaAcceptanceMode, replaceMachine } = useGraph();
  const {
    inputString,
    setInputString,
    currentStepIndex,
    setCurrentStepIndex,
    executionResult,
    validationResult,
    currentStep,
  } = useExecution();

  // Module 5 Topic 1: TM Transducer State
  const [tmMode, setTmMode] = useState<TMMode>('ACCEPTOR');
  const [showTmTheoryGuide, setShowTmTheoryGuide] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('unary-addition');

  // Module 5 Topic 2: Universal Turing Machine & Encoding State
  const [showUtmPanel, setShowUtmPanel] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const { nodes, edges } = useGraph();

  // Compute Transducer result when in TRANSDUCER mode
  const transducerResult = useMemo(() => {
    if (machineType !== 'TM' || tmMode !== 'TRANSDUCER') return null;
    return executeTMTransducer({ nodes, edges }, inputString, { blankSymbol });
  }, [machineType, tmMode, nodes, edges, inputString, blankSymbol]);

  // Compute Module 5 Topic 2 Encoding and UTM simulation
  const utmData = useMemo(() => {
    if (machineType !== 'TM') return null;
    const encoded = encodeTM({ nodes, edges }, blankSymbol);
    const pair = encodePair({ nodes, edges }, inputString, blankSymbol);
    const utmSimulation = simulateUTM(pair.fullPairString, { blankSymbol });
    const equivalence = verifyUniversalEquivalence({ nodes, edges }, inputString, { blankSymbol });
    return {
      encoded,
      pair,
      utmSimulation,
      equivalence,
    };
  }, [machineType, nodes, edges, inputString, blankSymbol]);

  const { isAccepted, rejectionReason, steps } = executionResult;

  const tmStep = machineType === 'TM' && currentStep && 'tapeHeadIndex' in currentStep ? (currentStep as TMExecutionStep) : null;
  const pdaStep = machineType === 'PDA' && currentStep && 'stackAfter' in currentStep ? (currentStep as PDAExecutionStep) : null;
  const nfaStep = machineType === 'NFA' && currentStep && 'nextStates' in currentStep ? (currentStep as NFAExecutionStep) : null;
  const dfaStep = machineType === 'DFA' && currentStep && 'currentStateLabel' in currentStep && !('stackAfter' in currentStep) ? (currentStep as DFAExecutionStep) : null;

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
      if (pdaStep.isHalted) {
        return pdaStep.isAccepting
          ? `PDA accepted input string '${inputString}' under ${pdaAcceptanceMode} mode in state '${pdaStep.currentStateLabel}' with stack [${pdaStep.stackAfter.join(', ')}]. Current ID: ${pdaStep.instantaneousDescription}.`
          : `PDA halted without meeting acceptance criteria under ${pdaAcceptanceMode} mode (${rejectionReason}). Current configuration ID: ${pdaStep.instantaneousDescription}.`;
      }
      const topSymbol = pdaStep.stackTopRead ? `'${pdaStep.stackTopRead}'` : 'ε';
      const replSymbol = pdaStep.stackReplacement ? `'${pdaStep.stackReplacement}'` : 'ε';
      const op = pdaStep.stackOperation ? `[${pdaStep.stackOperation}]` : '';
      return `Pushdown rule δ(${pdaStep.currentStateLabel}, '${pdaStep.readSymbol || 'ε'}', ${topSymbol}) → (${pdaStep.nextStateLabel}, ${replSymbol}) ${op} yielded configuration ${pdaStep.instantaneousDescription}. Stack before: [${pdaStep.stackBefore.join(', ')}] → stack after: [${pdaStep.stackAfter.join(', ')}].`;
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
        <div className="flex items-center space-x-2 flex-wrap gap-1.5">
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

          {/* TM Mode (Acceptor vs Transducer) Toggle in toolbar */}
          {machineType === 'TM' && (
            <div className="flex items-center space-x-1.5 ml-2 pl-2 border-l border-border-subtle">
              <span className="text-[11px] text-txt-muted">TM Mode:</span>
              <button
                type="button"
                onClick={() => setTmMode('ACCEPTOR')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  tmMode === 'ACCEPTOR'
                    ? 'bg-accent-primary text-txt-on-accent border-accent-primary'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
                title="L(M) Acceptor Mode: Evaluates whether input string belongs to L(M)"
              >
                Acceptor L(M)
              </button>
              <button
                type="button"
                onClick={() => setTmMode('TRANSDUCER')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  tmMode === 'TRANSDUCER'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
                title="f_M(w) Transducer Mode: Computes output string from tape upon halting in q ∈ F"
              >
                Transducer f(w)
              </button>

              {/* Transducer Presets Selector */}
              {tmMode === 'TRANSDUCER' && (
                <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-border-subtle">
                  <span className="text-[10px] text-txt-muted">Preset:</span>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedPresetId(id);
                      const found = CANONICAL_TRANSDUCER_PRESETS.find((p) => p.id === id);
                      if (found) {
                        replaceMachine(
                          [...found.graph.nodes],
                          [...found.graph.edges],
                          'TM',
                          undefined,
                          found.blankSymbol
                        );
                        setInputString(found.sampleInputs[0] || '');
                      }
                    }}
                    className="bg-bg-surface3 border border-border-subtle text-txt-primary rounded text-[10px] font-semibold px-1.5 py-0.5 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
                  >
                    {CANONICAL_TRANSDUCER_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowTmTheoryGuide((prev) => !prev)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-bg-surface3 hover:bg-bg-surface2 text-cyan-400 border border-border-subtle flex items-center gap-1 transition-colors"
                    title="Toggle Topic 1 Theory Guide"
                  >
                    <BookOpen size={11} />
                    <span>{showTmTheoryGuide ? 'Hide Guide' : 'Theory Guide'}</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowUtmPanel((prev) => !prev)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                  showUtmPanel
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
                title="Universal TM & Encoding: View canonical <M>, pair <M, w>, and Universal Simulation"
              >
                <Cpu size={10} />
                <span>UTM / Encoding</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent('navigate-to-tab', { detail: { categoryId: 'analysis', tabId: 'church-turing' } });
                  window.dispatchEvent(event);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-surface3 text-txt-secondary border border-border-subtle hover:bg-bg-surface2 hover:text-accent-primary transition-colors flex items-center gap-1"
                title="Church–Turing Thesis: Explore Model Equivalence & Effective Computability"
              >
                <span>Church–Turing</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent('navigate-to-tab', { detail: { categoryId: 'analysis', tabId: 're-languages' } });
                  window.dispatchEvent(event);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-surface3 text-txt-secondary border border-border-subtle hover:bg-bg-surface2 hover:text-purple-400 transition-colors flex items-center gap-1"
                title="Topic 4: Recursive (Decidable) vs Recursively Enumerable Languages"
              >
                <span>Recursive / RE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent('navigate-to-tab', { detail: { categoryId: 'analysis', tabId: 'reducibility' } });
                  window.dispatchEvent(event);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-surface3 text-txt-secondary border border-border-subtle hover:bg-bg-surface2 hover:text-amber-400 transition-colors flex items-center gap-1"
                title="Topic 5: Reducibility (Many-One Reductions A ≤m B)"
              >
                <span>Reducibility</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent('navigate-to-tab', { detail: { categoryId: 'analysis', tabId: 'halting-problem' } });
                  window.dispatchEvent(event);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-surface3 text-txt-secondary border border-border-subtle hover:bg-bg-surface2 hover:text-rose-400 transition-colors flex items-center gap-1"
                title="Topic 6: Undecidability: Halting Problem"
              >
                <span>Halting Problem</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent('navigate-to-tab', { detail: { categoryId: 'analysis', tabId: 'pcp' } });
                  window.dispatchEvent(event);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-surface3 text-txt-secondary border border-border-subtle hover:bg-bg-surface2 hover:text-emerald-400 transition-colors flex items-center gap-1"
                title="Topic 7: Post Correspondence Problem (PCP)"
              >
                <span>PCP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent('navigate-to-tab', { detail: { categoryId: 'analysis', tabId: 'tools' } });
                  window.dispatchEvent(event);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-surface3 text-txt-secondary border border-border-subtle hover:bg-bg-surface2 hover:text-amber-400 transition-colors flex items-center gap-1"
                title="Topic 8: Tools (JFLAP, REGEX, LEX, YACC)"
              >
                <span>Tools</span>
              </button>
            </div>
          )}

          {/* PDA Acceptance Mode Toggle in toolbar */}
          {machineType === 'PDA' && (
            <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-border-subtle">
              <span className="text-[11px] text-txt-muted">Mode:</span>
              <button
                type="button"
                onClick={() => setPdaAcceptanceMode('FINAL_STATE')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  pdaAcceptanceMode === 'FINAL_STATE'
                    ? 'bg-accent-primary text-txt-on-accent border-accent-primary'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
                title="Accept when input is consumed and state is in F"
              >
                L(M) Final State
              </button>
              <button
                type="button"
                onClick={() => setPdaAcceptanceMode('EMPTY_STACK')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  pdaAcceptanceMode === 'EMPTY_STACK'
                    ? 'bg-accent-primary text-txt-on-accent border-accent-primary'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
                title="Accept when input is consumed and stack is empty"
              >
                N(M) Empty Stack
              </button>
              <button
                type="button"
                onClick={() => setPdaAcceptanceMode('BOTH')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  pdaAcceptanceMode === 'BOTH'
                    ? 'bg-accent-primary text-txt-on-accent border-accent-primary'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
                title="Accept when input is consumed AND state is in F AND stack is empty"
              >
                Both
              </button>
            </div>
          )}

          {machineType === 'PDA' && 'determinismAnalysis' in executionResult && executionResult.determinismAnalysis && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${
                executionResult.determinismAnalysis.isDeterministic
                  ? 'bg-semantic-accept/15 text-semantic-accept border-semantic-accept/30'
                  : 'bg-semantic-warning/15 text-semantic-warning border-semantic-warning/30'
              }`}
            >
              <span>{executionResult.determinismAnalysis.machineClassification}</span>
              <span className="text-txt-muted font-normal">
                {executionResult.isExecutionLinear ? '(Linear Trace)' : '(Nondeterministic Branch)'}
              </span>
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

      {/* TM Transducer Theory Guide (Collapsible) */}
      {machineType === 'TM' && tmMode === 'TRANSDUCER' && showTmTheoryGuide && (
        <div className="p-3 bg-slate-950 border-b border-emerald-900/60 text-2xs space-y-2 shrink-0">
          <div className="flex items-center justify-between text-emerald-400 font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} /> Module 5 Topic 1: Turing Machine Acceptors vs Transducers
            </span>
            <button
              onClick={() => setShowTmTheoryGuide(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-3xs font-sans">
            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
              <strong className="text-accent-primary font-bold block">1. Acceptor vs Transducer</strong>
              <p className="text-slate-300">
                An <strong>Acceptor</strong> evaluates language membership: $w \in L(M)$ iff $M$ halts in $q \in F$.
                A <strong>Transducer</strong> computes a partial function $f_M: \Sigma^* \rightharpoonup \Gamma^*$ where the output string is extracted from the tape.
              </p>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
              <strong className="text-emerald-400 font-bold block">2. Output Extraction Convention</strong>
              <p className="text-slate-300">
                Project Zero extracts the trimmed non-blank segment [i_min, i_max] from the halting tape when M halts in an accepting state q in F.
                Non-accepting or non-halting computations yield undefined (&perp;).
              </p>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
              <strong className="text-amber-400 font-bold block">3. Halting vs Computation Contract</strong>
              <p className="text-slate-300">
                Missing transitions halt the machine immediately. If halted outside $F$, status is <span className="text-rose-400 font-mono">MISSING_TRANSITION</span> with no output fabricated.
                Reaching $maxSteps$ yields <span className="text-amber-400 font-mono">INCONCLUSIVE_LIMIT</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TM Transducer Result Summary Card */}
      {machineType === 'TM' && tmMode === 'TRANSDUCER' && transducerResult && (
        <div className="px-3 py-2 bg-slate-950/90 border-b border-border-subtle flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300 flex items-center gap-1">
              <ArrowRightLeft size={13} className="text-emerald-400" /> Transducer Output:
            </span>
            {transducerResult.status === 'COMPUTED' ? (
              <div className="flex items-center gap-2">
                <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700 font-bold font-mono text-xs">
                  f_M(&quot;{inputString}&quot;) = &quot;{transducerResult.outputString}&quot;
                </span>
                {transducerResult.outputRegion && (
                  <span className="text-3xs text-slate-400 font-mono">
                    Region: [{transducerResult.outputRegion.startIndex} ... {transducerResult.outputRegion.endIndex}] ({transducerResult.outputRegion.length} symbols)
                  </span>
                )}
              </div>
            ) : transducerResult.status === 'INCONCLUSIVE_LIMIT' ? (
              <span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-700 font-bold text-3xs">
                INCONCLUSIVE_LIMIT: Output Undefined (⊥)
              </span>
            ) : (
              <span className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-700 font-bold text-3xs">
                {transducerResult.status}: Output Undefined (⊥)
              </span>
            )}
          </div>
          <span className="text-3xs text-slate-400 font-sans">
            Halted in <strong className="text-slate-200">{transducerResult.finalStateLabel ?? 'none'}</strong> after {transducerResult.stepCount} steps
          </span>
        </div>
      )}

      {/* Module 5 Topic 2: Universal Turing Machine & Encoding Panel */}
      {machineType === 'TM' && showUtmPanel && utmData && (
        <div className="p-3 bg-slate-950 border-b border-purple-900/60 text-2xs space-y-3 shrink-0 font-sans">
          <div className="flex items-center justify-between text-purple-400 font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <Cpu size={14} /> Module 5 Topic 2: Universal Turing Machine & Canonical Encoding
            </span>
            <button
              onClick={() => setShowUtmPanel(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left Box: Canonical Machine Code <M> & Pair <M, w> */}
            <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300 text-3xs flex items-center gap-1">
                  <Code2 size={12} /> Canonical Binary Code &lang;M&rang;
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(utmData.encoded.binaryEncoding);
                    setCopiedNotification('Machine Code copied!');
                    setTimeout(() => setCopiedNotification(null), 2000);
                  }}
                  className="px-1.5 py-0.5 rounded text-3xs bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 flex items-center gap-1 transition-colors"
                >
                  <Copy size={10} />
                  <span>Copy &lang;M&rang;</span>
                </button>
              </div>
              <div className="p-1.5 bg-black/60 rounded border border-purple-950/60 font-mono text-3xs text-purple-200 break-all max-h-20 overflow-y-auto select-all">
                {utmData.encoded.binaryEncoding}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-cyan-300 text-3xs flex items-center gap-1">
                  <Code2 size={12} /> Pair Encoding &lang;M, w&rang;
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(utmData.pair.fullPairString);
                    setCopiedNotification('Pair Code copied!');
                    setTimeout(() => setCopiedNotification(null), 2000);
                  }}
                  className="px-1.5 py-0.5 rounded text-3xs bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center gap-1 transition-colors"
                >
                  <Copy size={10} />
                  <span>Copy &lang;M, w&rang;</span>
                </button>
              </div>
              <div className="p-1.5 bg-black/60 rounded border border-cyan-950/60 font-mono text-3xs text-cyan-200 break-all max-h-20 overflow-y-auto select-all">
                {utmData.pair.fullPairString}
              </div>
              {copiedNotification && (
                <span className="text-3xs text-emerald-400 font-bold block">{copiedNotification}</span>
              )}
            </div>

            {/* Right Box: Universal TM Simulation U(<M, w>) & Equivalence Proof */}
            <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 text-3xs flex items-center gap-1">
                <CheckCircle2 size={12} /> Universal Simulation Invariant U(&lang;M, w&rang;) &equiv; M(w)
              </span>
              <div className="space-y-1 text-3xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Direct TM Status:</span>
                  <strong className={isAccepted ? 'text-emerald-400' : 'text-rose-400'}>
                    {isAccepted ? 'ACCEPT' : `REJECT (${rejectionReason ?? 'NON_ACCEPTING'})`}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Universal TM Status:</span>
                  <strong className={utmData.utmSimulation.isAccepted ? 'text-emerald-400' : 'text-rose-400'}>
                    {utmData.utmSimulation.isAccepted ? 'ACCEPT' : utmData.utmSimulation.status}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Direct vs Universal Equivalence:</span>
                  <span className="px-1.5 py-0.2 rounded text-3xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                    {utmData.equivalence.isEquivalent ? '100% IDENTICAL' : 'MISMATCH'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Step Count Synchrony:</span>
                  <span className="font-mono text-slate-300">
                    Direct {utmData.equivalence.directStepCount} steps &bull; Universal {utmData.equivalence.universalStepCount} steps
                  </span>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-800 text-3xs text-slate-400">
                &bull; States: {utmData.encoded.statesCount} &bull; Symbols: {utmData.encoded.symbolsCount} &bull; Rules: {utmData.encoded.transitionsCount}
              </div>
            </div>
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
            tmMode={tmMode}
            outputRegion={tmMode === 'TRANSDUCER' ? transducerResult?.outputRegion : null}
            extractedOutput={tmMode === 'TRANSDUCER' ? transducerResult?.outputString : null}
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
          <span>{machineType === 'NFA' ? 'Reachable State Set' : machineType === 'PDA' ? 'State & Configuration ID' : 'Current State'}</span>
          <span>{machineType === 'TM' ? 'Read (Tape)' : 'Read Symbol'}</span>
          <span>{machineType === 'TM' ? 'Action (Write, Move)' : 'Remaining Input'}</span>
          <span>{machineType === 'PDA' ? 'Stack Action & Transition' : 'Transition Result'}</span>
        </div>

        {(steps as ReadonlyArray<DFAExecutionStep | NFAExecutionStep | PDAExecutionStep | TMExecutionStep>).map((s) => {
          const isActive = s.stepIndex === currentStepIndex;

          const tmStepItem = 'tapeHeadIndex' in s ? (s as TMExecutionStep) : null;
          const pdaStepItem = 'stackAfter' in s ? (s as PDAExecutionStep) : null;
          const nfaStepItem = 'nextStates' in s ? (s as NFAExecutionStep) : null;
          const dfaStepItem = !nfaStepItem && !tmStepItem && !pdaStepItem ? (s as DFAExecutionStep) : null;

          const stateLabelDisplay = tmStepItem
            ? tmStepItem.currentStateLabel
            : pdaStepItem
            ? pdaStepItem.currentStateLabel
            : nfaStepItem
            ? formatStateSet(nfaStepItem.currentStates)
            : dfaStepItem?.currentStateLabel || '';

          const nextLabelDisplay = tmStepItem
            ? tmStepItem.nextStateLabel || ''
            : pdaStepItem
            ? pdaStepItem.nextStateLabel || ''
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

              {/* State & Configuration ID */}
              <div className="flex flex-col space-y-0.5">
                <span className="font-bold text-accent-primary">{stateLabelDisplay}</span>
                {pdaStepItem && (
                  <span className="text-[10px] text-accent-secondary font-mono bg-bg-surface3 px-1 py-0.2 rounded border border-border-subtle w-fit">
                    {pdaStepItem.instantaneousDescription}
                  </span>
                )}
              </div>

              {/* Read Symbol */}
              <span className="text-semantic-info font-bold">{readSymbolDisplay}</span>

              {/* Remaining Input */}
              <span className="text-txt-muted font-mono">{actionDisplay}</span>

              {/* Transition Result & Stack */}
              <div className="flex items-center space-x-1 flex-wrap gap-1">
                <ArrowRight size={12} className="text-txt-muted shrink-0" />
                {s.isHalted ? (
                  s.isAccepting ? (
                    <span className="flex items-center space-x-1 text-semantic-accept font-bold">
                      <CheckCircle2 size={12} />
                      <span>Accepting ({stateLabelDisplay})</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-semantic-error font-bold">
                      <XCircle size={12} />
                      <span>Halted ({stateLabelDisplay})</span>
                    </span>
                  )
                ) : pdaStepItem ? (
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    <span>
                      δ({stateLabelDisplay}, {readSymbolDisplay}, {pdaStepItem.stackTopRead ?? 'ε'}) → <strong className="text-accent-primary">{nextLabelDisplay}</strong>
                    </span>
                    {pdaStepItem.stackOperation && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold border ${
                          pdaStepItem.stackOperation === 'PUSH'
                            ? 'bg-semantic-info/20 text-semantic-info border-semantic-info/30'
                            : pdaStepItem.stackOperation === 'POP'
                            ? 'bg-semantic-warning/20 text-semantic-warning border-semantic-warning/30'
                            : pdaStepItem.stackOperation === 'REPLACE'
                            ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/30'
                            : 'bg-bg-surface3 text-txt-muted border-border-subtle'
                        }`}
                      >
                        {pdaStepItem.stackOperation}
                      </span>
                    )}
                    <span className="text-[10px] text-txt-muted font-mono flex items-center space-x-0.5">
                      <Layers size={10} />
                      <span>[{pdaStepItem.stackAfter.join(',')}]</span>
                    </span>
                  </div>
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
