import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import {
  HALT_TM_DEFINITION,
  HALTING_DISTINCTIONS,
  DIAGONAL_PROOF_STEPS,
  evaluateHypotheticalDecider,
  HALTING_PROBLEM_PRESETS,
  observeBoundedHalting,
} from '@project-zero/core-solver';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Play,
  Scale,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

export const HaltingProblemTab: React.FC = () => {
  const { blankSymbol, replaceMachine } = useGraph();
  const { inputString, setInputString } = useExecution();

  // Active sub-section
  const [activeSection, setActiveSection] = useState<
    'definition' | 'proof' | 'observation' | 'guardrails'
  >('definition');

  // Proof walkthrough step index (0 to 5)
  const [proofStepIndex, setProofStepIndex] = useState<number>(0);

  // Hypothetical Decider Toggle for Step 4/5 demonstration
  const [hypotheticalAnswer, setHypotheticalAnswer] = useState<'HALTS' | 'DOES_NOT_HALT'>('HALTS');

  // Selected Bounded Preset ID
  const [selectedPresetId, setSelectedPresetId] = useState<string>(HALTING_PROBLEM_PRESETS[0].id);

  // Execution Step Limit for bounded lab
  const [stepLimit, setStepLimit] = useState<number>(100);

  const activePreset = useMemo(() => {
    return (
      HALTING_PROBLEM_PRESETS.find((p) => p.id === selectedPresetId) ||
      HALTING_PROBLEM_PRESETS[0]
    );
  }, [selectedPresetId]);

  // Handle switching preset
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = HALTING_PROBLEM_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.sampleInputs.length > 0) {
      setInputString(preset.sampleInputs[0].input);
    }
  };

  // Load preset graph to canvas
  const handleLoadToCanvas = () => {
    if (activePreset.graph) {
      replaceMachine(
        [...activePreset.graph.nodes],
        [...activePreset.graph.edges],
        'TM',
        undefined,
        blankSymbol
      );
    }
  };

  // Run bounded observation on current input
  const observation = useMemo(() => {
    return observeBoundedHalting(activePreset.graph, inputString, {
      maxSteps: stepLimit,
      blankSymbol,
    });
  }, [activePreset, inputString, stepLimit, blankSymbol]);

  // Hypothetical decider contradiction evaluation
  const hypotheticalContradiction = useMemo(() => {
    return evaluateHypotheticalDecider(hypotheticalAnswer);
  }, [hypotheticalAnswer]);

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs font-sans select-none space-y-3 bg-bg-surface1 text-txt-primary">
      {/* Top Banner & Syllabus Pathway */}
      <div className="p-3 bg-slate-950/90 border border-border-subtle rounded-lg space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-txt-primary font-bold">
            <AlertTriangle size={16} className="text-rose-400" />
            <span className="text-sm">Module 5 — Topic 6: Undecidability: Halting Problem</span>
          </div>
          <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
            HALT_TM &bull; RE Recognizable &bull; Undecidable (Non-Recursive)
          </span>
        </div>

        {/* Core Halting Invariant Banner */}
        <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded flex items-center justify-between flex-wrap gap-2 text-3xs">
          <div className="flex items-center space-x-2 font-mono text-slate-300">
            <span className="text-slate-400 font-bold">Language:</span>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
              HALT_TM = &#123; &lang;M, w&rang; | M halts on w &#125;
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-semibold">
            Crucial Law: Halting &ne; Acceptance. Rejecting halts are confirmed YES instances of HALT_TM!
          </span>
        </div>

        {/* Syllabus Bridge Pathway */}
        <div className="flex items-center space-x-1 text-3xs text-txt-muted overflow-x-auto pt-0.5">
          <span className="font-semibold text-txt-secondary">Syllabus Bridge:</span>
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.1: TM Model</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.2: UTM &amp; Encoding</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.3: Church–Turing</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.4: Recursive / RE</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.5: Reducibility</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold">
            M5.6: Halting Problem (Undecidable)
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 border-b border-border-subtle pb-1">
        <button
          type="button"
          onClick={() => setActiveSection('definition')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'definition'
              ? 'bg-rose-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <BookOpen size={12} />
          <span>Language Specification &amp; Core Laws</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('proof')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'proof'
              ? 'bg-rose-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Scale size={12} />
          <span>Diagonal Proof of Undecidability</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('observation')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'observation'
              ? 'bg-rose-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Play size={12} />
          <span>Bounded Simulation Lab</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('guardrails')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'guardrails'
              ? 'bg-rose-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <ShieldAlert size={12} />
          <span>What Finite Simulation Can/Cannot Prove</span>
        </button>
      </div>

      {/* SECTION 1: FORMAL LANGUAGE SPECIFICATION */}
      {activeSection === 'definition' && (
        <div className="space-y-3">
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                <BookOpen size={14} /> Formal Specification of HALT_TM
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Recognizable (RE)
                </span>
                <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  Undecidable (Non-Recursive)
                </span>
              </div>
            </div>

            <div className="p-3 bg-black/50 rounded border border-slate-900 font-mono text-3xs text-slate-200 leading-relaxed">
              {HALT_TM_DEFINITION.formalNotation}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Halting vs Acceptance Box */}
              <div className="p-3 bg-slate-900/80 rounded border border-amber-900/40 space-y-2">
                <span className="font-bold text-amber-300 text-3xs uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle size={12} /> 1. Halting Is NOT the Same as Acceptance
                </span>
                <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                  A machine <strong>halts</strong> when its execution terminates — that is, when it reaches a state and tape symbol with no defined transition.
                </p>
                <div className="p-2 bg-black/50 rounded font-mono text-[11px] space-y-1">
                  <div className="text-emerald-300">&bull; Halts in Accepting State (q &isin; F) &rarr; HALTS (YES instance)</div>
                  <div className="text-cyan-300">&bull; Halts in Rejecting State (q &notin; F) &rarr; HALTS (YES instance)</div>
                  <div className="text-rose-400">&bull; Enters Infinite Loop (&perp;) &rarr; DOES NOT HALT (NO instance)</div>
                </div>
                <p className="text-[10px] text-amber-300/90 font-medium">
                  Notice: A rejecting halt is STILL a YES instance of HALT_TM, because the machine stopped!
                </p>
              </div>

              {/* Recognizability vs Decidability Box */}
              <div className="p-3 bg-slate-900/80 rounded border border-cyan-900/40 space-y-2">
                <span className="font-bold text-cyan-300 text-3xs uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} /> 2. Why HALT_TM Is Turing-Recognizable
                </span>
                <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                  A <strong>Universal Turing Machine (UTM)</strong> acts as a recognizer for HALT_TM:
                </p>
                <div className="p-2 bg-black/50 rounded font-mono text-[11px] text-cyan-200 space-y-1">
                  <div>On input &lang;M, w&rang;:</div>
                  <div className="pl-3">1. Simulate M on input w using UTM engine</div>
                  <div className="pl-3">2. If M ever stops (accepts or rejects) &rarr; ACCEPT</div>
                  <div className="pl-3">3. If M loops forever &rarr; UTM loops forever</div>
                </div>
                <p className="text-3xs text-slate-300 font-sans leading-relaxed">
                  Because it accepts whenever M halts and loops when M loops, HALT_TM is in <strong>RE</strong>. But by Alan Turing&apos;s 1936 proof, no decider exists!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: DIAGONAL CONTRADICTION PROOF */}
      {activeSection === 'proof' && (
        <div className="space-y-3">
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                <Scale size={14} /> The Diagonal Contradiction Proof (Turing, 1936)
              </span>
              <span className="text-3xs text-slate-400">
                Step {proofStepIndex + 1} of {DIAGONAL_PROOF_STEPS.length}
              </span>
            </div>

            {/* Stepper Buttons */}
            <div className="grid grid-cols-6 gap-1">
              {DIAGONAL_PROOF_STEPS.map((step, idx) => (
                <button
                  key={step.stepId}
                  type="button"
                  onClick={() => setProofStepIndex(idx)}
                  className={`py-1.5 px-2 rounded text-3xs font-semibold border transition-all text-center truncate ${
                    proofStepIndex === idx
                      ? 'bg-rose-500 text-slate-950 font-bold border-rose-500 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  {idx + 1}. {step.stepId.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Active Proof Step Display Card */}
            {(() => {
              const currentStep = DIAGONAL_PROOF_STEPS[proofStepIndex];
              return (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                      <ChevronRight size={14} className="text-rose-400" />
                      Step {currentStep.stepNumber}: {currentStep.title}
                    </span>
                    {currentStep.contradictionFlag && (
                      <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase bg-rose-950 text-rose-300 border border-rose-800">
                        Contradiction Derived
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 bg-black/50 rounded border border-slate-950 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Premise / Hypothesis</span>
                    <p className="text-3xs font-mono text-slate-300">{currentStep.premise}</p>
                  </div>

                  <div className="p-2.5 bg-black/60 rounded border border-slate-950 space-y-1">
                    <span className="text-[10px] text-rose-400 font-bold uppercase block">Mathematical Statement</span>
                    <p className="text-3xs font-mono text-rose-200">{currentStep.mathematicalStatement}</p>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase block">Deduction &amp; Invariant</span>
                    <p className="text-3xs text-slate-300 leading-relaxed">{currentStep.logicalDeduction}</p>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={proofStepIndex === 0}
                      onClick={() => setProofStepIndex((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-1 rounded text-3xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
                    >
                      &larr; Previous Step
                    </button>
                    <button
                      type="button"
                      disabled={proofStepIndex === DIAGONAL_PROOF_STEPS.length - 1}
                      onClick={() => setProofStepIndex((prev) => Math.min(DIAGONAL_PROOF_STEPS.length - 1, prev + 1))}
                      className="px-3 py-1 rounded text-3xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold transition-colors"
                    >
                      Next Step &rarr;
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Interactive Hypothetical Decider Contradiction Explorer */}
            <div className="p-3 bg-slate-900/90 rounded-lg border border-purple-900/50 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                    <HelpCircle size={14} /> Interactive Hypothetical Decider Simulator: H(&lang;D, D&rang;)
                  </span>
                  <p className="text-3xs text-slate-400 mt-0.5">
                    Test what happens when the hypothetical decider H is asked about the diagonal machine D on its own code &lang;D&rang;
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-3xs text-slate-400">Assumed Answer from H:</span>
                  <button
                    type="button"
                    onClick={() => setHypotheticalAnswer('HALTS')}
                    className={`px-2.5 py-1 rounded text-3xs font-bold border transition-colors ${
                      hypotheticalAnswer === 'HALTS'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    H says: HALTS
                  </button>
                  <button
                    type="button"
                    onClick={() => setHypotheticalAnswer('DOES_NOT_HALT')}
                    className={`px-2.5 py-1 rounded text-3xs font-bold border transition-colors ${
                      hypotheticalAnswer === 'DOES_NOT_HALT'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    H says: DOES NOT HALT
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-black/60 rounded border border-purple-900/30 text-3xs space-y-1.5">
                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-slate-400">1. H Output:</span>
                  <span className="font-bold text-purple-300">{hypotheticalContradiction.assumedDecision}</span>
                  <ArrowRight size={12} className="text-slate-500" />
                  <span className="text-slate-400">2. D(&lang;D&rang;) Programmed Action:</span>
                  <span className="font-bold text-amber-300">{hypotheticalContradiction.diagonalBehavior}</span>
                </div>
                <div className="p-2 bg-rose-950/40 border border-rose-900/50 rounded text-rose-300 font-sans leading-relaxed">
                  <strong>Resulting Logical Contradiction: </strong>
                  {hypotheticalContradiction.resultingContradiction}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: BOUNDED SIMULATION LAB */}
      {activeSection === 'observation' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                  <Play size={14} className="text-rose-400" />
                  Bounded Halting Observation Lab
                </span>
                <p className="text-3xs text-txt-muted mt-0.5">
                  Execute genuine Turing machines with explicit step bounds to observe termination vs timeouts
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-3xs text-txt-muted">Step Bound:</span>
                <select
                  value={stepLimit}
                  onChange={(e) => setStepLimit(Number(e.target.value))}
                  className="px-2 py-0.5 rounded text-3xs bg-bg-surface3 text-txt-primary border border-border-subtle"
                >
                  <option value={20}>20 steps</option>
                  <option value={100}>100 steps</option>
                  <option value={500}>500 steps</option>
                </select>
                <button
                  type="button"
                  onClick={handleLoadToCanvas}
                  className="px-2.5 py-0.5 rounded text-3xs bg-bg-surface3 hover:bg-bg-surface2 text-cyan-300 border border-border-subtle transition-colors"
                >
                  Load Machine to Canvas
                </button>
              </div>
            </div>

            {/* Presets Selector */}
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-3xs text-txt-muted font-semibold">Select Machine:</span>
              {HALTING_PROBLEM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-2.5 py-1 rounded text-3xs font-semibold border transition-colors ${
                    selectedPresetId === preset.id
                      ? 'bg-rose-500 text-slate-950 font-bold border-rose-500'
                      : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Machine Card & Sample Inputs */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <strong className="text-slate-200 text-xs">{activePreset.name}</strong>
                  <p className="text-3xs text-slate-400 mt-0.5">{activePreset.shortDescription}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-3xs font-bold ${
                    activePreset.isHaltingYESInstance
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {activePreset.expectedHaltingBehavior === 'HALTS' ? 'YES Instance of HALT_TM' : 'NO Instance (Loops)'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 flex-wrap gap-1 pt-1 border-t border-slate-900">
                <span className="text-3xs text-slate-400 font-semibold">Sample Input Words:</span>
                {activePreset.sampleInputs.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputString(sample.input)}
                    className={`px-2 py-0.5 rounded text-3xs font-mono border transition-colors ${
                      inputString === sample.input
                        ? 'bg-rose-500 text-slate-950 font-bold border-rose-500'
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                    }`}
                    title={sample.notes}
                  >
                    &quot;{sample.input}&quot; &rarr; {sample.expectedOutcome}
                  </button>
                ))}
              </div>
            </div>

            {/* Bounded Execution Telemetry & Outcome Card */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Simulation Observation Result
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-3xs font-bold ${
                    observation.outcome === 'HALTED_ACCEPT'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : observation.outcome === 'HALTED_REJECT'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {observation.outcome}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-3xs">
                <div className="p-2 bg-black/40 rounded border border-slate-800 space-y-1">
                  <div><strong className="text-slate-400">Input String w:</strong> <span className="font-mono text-slate-200">&quot;{observation.inputWord}&quot;</span></div>
                  <div><strong className="text-slate-400">Steps Executed:</strong> <span className="text-slate-200">{observation.stepsExecuted} / {stepLimit}</span></div>
                  <div><strong className="text-slate-400">Final State:</strong> <span className="text-slate-200">{observation.finalStateLabel || 'N/A'}</span></div>
                </div>

                <div className="p-2 bg-black/40 rounded border border-slate-800 space-y-1">
                  <div>
                    <strong className="text-slate-400">Halted Status:</strong>{' '}
                    <span className={observation.isHalted ? 'text-emerald-300' : 'text-amber-300'}>
                      {observation.isHalted ? 'YES (Terminated)' : 'NO (Bound Reached)'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Accepted Status:</strong>{' '}
                    <span className={observation.isAccepted ? 'text-emerald-300' : 'text-rose-300'}>
                      {observation.isAccepted ? 'YES (q in F)' : 'NO (q not in F)'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">HALT_TM Status:</strong>{' '}
                    <span className="text-cyan-300 font-bold">{observation.haltsMembershipClassification}</span>
                  </div>
                </div>

                <div className="p-2 bg-black/40 rounded border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pedagogical Lesson</span>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                    {observation.academicExplanation}
                  </p>
                </div>
              </div>

              <div className="p-2 bg-black/60 rounded border border-slate-900 text-[10px] text-amber-300/90 space-y-0.5">
                <strong className="text-amber-200">Epistemological Safety Invariant: </strong>
                <span>{observation.epistemologicalSafetyNote}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: EPISTEMOLOGICAL GUARDRAILS */}
      {activeSection === 'guardrails' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-rose-400" />
              Epistemological Guardrails: What Finite Simulation Can vs Cannot Prove
            </span>

            {/* The 4 Truths of Computability */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 text-2xs block">
                The Four Levels of Computability Truth:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-3xs">
                <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
                  <strong className="text-emerald-300 block font-semibold">Statement A: &quot;M halted during this simulation.&quot;</strong>
                  <p className="text-slate-300 font-sans">
                    <strong>Directly established by finite simulation.</strong> We observed the head step and halt configuration directly.
                  </p>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
                  <strong className="text-amber-300 block font-semibold">Statement B: &quot;M did not halt within N steps.&quot;</strong>
                  <p className="text-slate-300 font-sans">
                    <strong>Directly established by finite observation.</strong> But this is solely a statement about the resource bound N.
                  </p>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
                  <strong className="text-rose-400 block font-semibold">Statement C: &quot;M never halts.&quot;</strong>
                  <p className="text-slate-300 font-sans">
                    <strong>CANNOT generally be concluded from B.</strong> Statement B gives zero guarantee about step N+1.
                  </p>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
                  <strong className="text-purple-300 block font-semibold">Statement D: &quot;HALT_TM is undecidable.&quot;</strong>
                  <p className="text-slate-300 font-sans">
                    <strong>A deductive mathematical theorem.</strong> Proved independently via diagonal contradiction, never by software timeout.
                  </p>
                </div>
              </div>
            </div>

            {/* Curated Misconception Items */}
            <div className="space-y-2.5">
              {HALTING_DISTINCTIONS.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                  <span className="font-bold text-rose-400 text-2xs block">
                    {idx + 1}. {item.topic}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-3xs">
                    <div className="p-2 bg-emerald-950/30 rounded border border-emerald-900/40 space-y-1">
                      <strong className="text-emerald-300 block font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} /> Correct Mathematical Principle:
                      </strong>
                      <p className="text-slate-300 leading-relaxed font-sans">{item.correctConcept}</p>
                    </div>

                    <div className="p-2 bg-rose-950/30 rounded border border-rose-900/40 space-y-1">
                      <strong className="text-rose-300 block font-semibold flex items-center gap-1">
                        <XCircle size={11} /> Common Fallacy / Misconception:
                      </strong>
                      <p className="text-slate-300 leading-relaxed font-sans">{item.misconception}</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-300/90 font-medium pt-0.5">
                    <strong>Safety Rule: </strong>
                    {item.safetyWarning}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
