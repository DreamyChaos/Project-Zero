import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import {
  CHURCH_TURING_THESIS_STATEMENT,
  COMPUTATIONAL_FORMAL_MODELS,
  CHURCH_TURING_DISTINCTIONS,
  EFFECTIVE_PROCEDURE_EXAMPLES,
  classifyEffectiveProcedure,
  demonstrateChurchTuringEquivalence,
  EffectiveProcedureClassification,
} from '@project-zero/core-solver';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  Layers,
  Scale,
  Play,
  ArrowRight,
  ShieldAlert,
  History,
} from 'lucide-react';

export const ChurchTuringTab: React.FC = () => {
  const { nodes, edges, machineType, blankSymbol } = useGraph();
  const { inputString } = useExecution();

  // Active section view state
  const [activeSection, setActiveSection] = useState<
    'demonstrator' | 'distinctions' | 'models' | 'thought-experiment' | 'timeline'
  >('demonstrator');

  // Thought experiment interaction state
  const [selectedExampleId, setSelectedExampleId] = useState<string>(
    EFFECTIVE_PROCEDURE_EXAMPLES[0].id
  );
  const [userClassification, setUserClassification] = useState<
    EffectiveProcedureClassification | null
  >(null);
  const [classificationSubmitted, setClassificationSubmitted] = useState<boolean>(false);

  // Active procedure example object
  const activeExample = useMemo(() => {
    return (
      EFFECTIVE_PROCEDURE_EXAMPLES.find((e) => e.id === selectedExampleId) ||
      EFFECTIVE_PROCEDURE_EXAMPLES[0]
    );
  }, [selectedExampleId]);

  // Classification result computation
  const classificationResult = useMemo(() => {
    if (!classificationSubmitted || !userClassification) return null;
    return classifyEffectiveProcedure(activeExample.id, userClassification);
  }, [classificationSubmitted, userClassification, activeExample.id]);

  // Live demonstration execution on active canvas TM
  const demonstrationResult = useMemo(() => {
    if (machineType !== 'TM' || nodes.length === 0) return null;
    return demonstrateChurchTuringEquivalence({ nodes, edges }, inputString, { blankSymbol });
  }, [machineType, nodes, edges, inputString, blankSymbol]);

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs font-sans select-none space-y-3 bg-bg-surface1 text-txt-primary">
      {/* Header Banner & Thesis Core Statement */}
      <div className="p-3 bg-slate-950/90 border border-border-subtle rounded-lg space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-txt-primary font-bold">
            <Scale size={16} className="text-accent-primary" />
            <span className="text-sm">Module 5 — Topic 3: Church–Turing Thesis</span>
          </div>
          <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-accent-primary/10 text-accent-primary border border-accent-primary/30">
            Epistemological Thesis &bull; Not an Axiomatic Theorem
          </span>
        </div>

        <div className="p-2.5 bg-accent-primary/10 border border-accent-primary/30 rounded text-txt-primary space-y-1">
          <span className="font-mono text-3xs uppercase tracking-wider text-accent-primary font-bold block">
            The Fundamental Claim
          </span>
          <blockquote className="italic font-serif text-xs text-slate-200">
            &ldquo;{CHURCH_TURING_THESIS_STATEMENT}&rdquo;
          </blockquote>
          <p className="text-3xs text-txt-secondary pt-0.5 leading-relaxed">
            The Church–Turing Thesis bridges an <strong>informal intuitive concept</strong> (an <em>&quot;effectively calculable procedure&quot;</em> or algorithm)
            with a <strong>precise mathematical object</strong> (a <em>Turing-computable partial function</em>). Because the premise is informal, it cannot be deductively proven as a theorem, but is corroborated by the universal convergence of all independent formal computational models.
          </p>
        </div>

        {/* Prerequisite Bridge Pathway */}
        <div className="flex items-center space-x-1 text-3xs text-txt-muted overflow-x-auto pt-1">
          <span className="font-semibold text-txt-secondary">Syllabus Bridge:</span>
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M2: FA (Regular)</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M3/4: CFG &amp; PDA (Context-Free)</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.1: TM (General)</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.2: UTM (Universality)</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-bold">
            M5.3: Church–Turing (Effective Boundary)
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 border-b border-border-subtle pb-1">
        <button
          type="button"
          onClick={() => setActiveSection('demonstrator')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'demonstrator'
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Play size={12} />
          <span>Interactive Demonstrator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('distinctions')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'distinctions'
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <ShieldAlert size={12} />
          <span>What It Does / Does Not Say</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('models')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'models'
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Layers size={12} />
          <span>Equivalent Formal Models</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('thought-experiment')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'thought-experiment'
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <HelpCircle size={12} />
          <span>Effective Procedure Classifier</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('timeline')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'timeline'
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <History size={12} />
          <span>1936 Convergence Timeline</span>
        </button>
      </div>

      {/* SECTION 1: INTERACTIVE MODEL EQUIVALENCE DEMONSTRATOR */}
      {activeSection === 'demonstrator' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <Cpu size={14} className="text-emerald-400" />
                Live Computation Mapping: Turing Machine &rarr; Class of Computable Functions
              </span>
              <span className="text-3xs text-txt-muted font-mono">
                Model: {machineType} &bull; Input: &quot;{inputString}&quot;
              </span>
            </div>

            {machineType !== 'TM' ? (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 text-xs flex items-center space-x-2">
                <ShieldAlert size={16} className="shrink-0" />
                <div>
                  <strong>Active workspace is set to {machineType}.</strong> Switch to the <strong>TM</strong> workspace mode in the top navigation bar to execute concrete Turing machines against this demonstrator.
                </div>
              </div>
            ) : !demonstrationResult ? (
              <div className="p-2.5 bg-bg-surface3 rounded text-txt-muted text-xs">
                No states or transitions present on the TM canvas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left Card: Executed TM Result */}
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 text-3xs uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Concrete Executed Model
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Turing Machine
                    </span>
                  </div>

                  <div className="space-y-1 text-3xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Input String w:</span>
                      <span className="font-mono text-cyan-300">&quot;{demonstrationResult.inputString}&quot;</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Execution Status:</span>
                      <strong className={demonstrationResult.isAccepted ? 'text-emerald-400' : 'text-rose-400'}>
                        {demonstrationResult.statusLabel}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Steps Executed:</span>
                      <span className="font-mono text-slate-200">{demonstrationResult.stepCount} step(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Halting State:</span>
                      <span className="font-mono text-accent-primary">{demonstrationResult.haltingStateLabel ?? 'None'}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Partial Function f: &Sigma;* &rightharpoonup; &Gamma;*:</span>
                      <span className="font-mono text-emerald-300">{demonstrationResult.partialFunctionNotation}</span>
                    </div>
                  </div>

                  <p className="text-3xs text-slate-400 pt-1 leading-relaxed border-t border-slate-800">
                    This run represents a concrete mechanical trajectory in state space. If it halts in an accepting state, the input belongs to the domain of the partial computable function (w &isin; Dom(f)).
                  </p>
                </div>

                {/* Right Card: Conceptual Equivalent Models under Church-Turing */}
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 text-3xs uppercase tracking-wider flex items-center gap-1">
                      <Layers size={12} /> Equivalent Formal Models
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Class &fnof; &isin; &Rscr;
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {demonstrationResult.equivalentModelsSummary.map((m, idx) => (
                      <div key={idx} className="p-1.5 bg-slate-900/90 rounded border border-slate-800/80 text-3xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-200 font-semibold">{m.modelName}</strong>
                          <span
                            className={`px-1 py-0.1 rounded text-[9px] font-bold ${
                              m.equivalenceStatus === 'EXECUTED_DIRECTLY'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}
                          >
                            {m.equivalenceStatus === 'EXECUTED_DIRECTLY' ? 'Direct Platform Execution' : 'Conceptual Equivalent Model'}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[10px] leading-tight font-sans">
                          {m.theoreticalCorrespondence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {demonstrationResult && (
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded text-3xs text-slate-300 flex items-start space-x-2">
                <Sparkles size={14} className="text-accent-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-accent-primary block">Church–Turing Invariant Insight:</strong>
                  {demonstrationResult.educationalThesisInsight}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: WHAT THE THESIS DOES AND DOES NOT SAY */}
      {activeSection === 'distinctions' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-400" />
                Epistemological Boundaries: What the Thesis Says vs Does Not Say
              </span>
              <span className="text-3xs text-txt-muted">
                Critical distinction between computability and common misconceptions
              </span>
            </div>

            <div className="space-y-2">
              {CHURCH_TURING_DISTINCTIONS.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="font-bold text-accent-primary text-2xs">{item.topic}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-3xs">
                    {/* What it Says */}
                    <div className="p-2 bg-emerald-950/20 border border-emerald-800/40 rounded space-y-1">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={11} /> WHAT THE THESIS SAYS:
                      </span>
                      <p className="text-slate-300 leading-relaxed font-sans">{item.thesisDoesSay}</p>
                    </div>

                    {/* What it Does Not Say */}
                    <div className="p-2 bg-rose-950/20 border border-rose-800/40 rounded space-y-1">
                      <span className="font-bold text-rose-400 flex items-center gap-1">
                        <XCircle size={11} /> WHAT THE THESIS DOES NOT SAY:
                      </span>
                      <p className="text-slate-300 leading-relaxed font-sans">{item.thesisDoesNotSay}</p>
                    </div>
                  </div>

                  <div className="p-1.5 bg-amber-950/20 border border-amber-900/40 rounded text-[10px] text-amber-300 flex items-center gap-1.5">
                    <span className="font-bold shrink-0">Misconception Warning:</span>
                    <span className="text-slate-300">{item.misconceptionWarning}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Computability vs Complexity Box */}
          <div className="p-3 bg-slate-950 border border-border-subtle rounded-lg space-y-2">
            <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
              <Scale size={14} className="text-cyan-400" />
              Computability vs Computational Complexity Matrix
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-3xs">
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                <strong className="text-cyan-400 font-bold block text-2xs">Computability (Decidability)</strong>
                <span className="italic text-slate-400 block font-mono">&ldquo;Can it be computed at all?&rdquo;</span>
                <p className="text-slate-300 leading-relaxed pt-1">
                  Concerns the mathematical existence of a finite mechanical procedure that terminates on valid inputs. It is an absolute, qualitative boundary that separates decidable problems from undecidable problems (like the Halting Problem).
                </p>
              </div>

              <div className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                <strong className="text-purple-400 font-bold block text-2xs">Computational Complexity</strong>
                <span className="italic text-slate-400 block font-mono">&ldquo;How many resources are required?&rdquo;</span>
                <p className="text-slate-300 leading-relaxed pt-1">
                  Concerns the asymptotic growth of time (steps) and space (tape cells) required to solve a computable problem. Two models may be equivalent in computability while exhibiting different polynomial overheads.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: EQUIVALENT COMPUTATIONAL MODELS */}
      {activeSection === 'models' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <Layers size={14} className="text-accent-primary" />
                Canonical Formal Models of Effective Computation
              </span>
              <span className="text-3xs text-txt-muted">
                Each model has distinct mechanics but describes the exact same class of functions &Rscr;
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {COMPUTATIONAL_FORMAL_MODELS.map((model) => (
                <div key={model.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="font-bold text-slate-200 text-2xs">{model.name}</span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                        model.isExecutableInPlatform
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}
                    >
                      {model.isExecutableInPlatform ? 'Executable in IDE' : 'Conceptual Model'}
                    </span>
                  </div>

                  <div className="space-y-1 text-3xs text-slate-300">
                    <div>
                      <span className="text-slate-400">Founder &amp; Year:</span>{' '}
                      <strong className="text-slate-200">{model.founder} ({model.yearIntroduced})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Core Primitives:</span>{' '}
                      <span className="text-slate-300">{model.corePrimitive}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Execution Semantics:</span>{' '}
                      <span className="text-slate-300 font-mono text-[10px]">{model.executionSemantics}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Citation:</span>{' '}
                      <span className="italic text-slate-400">{model.formalEquivalenceCitation}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: THOUGHT EXPERIMENT / EFFECTIVE PROCEDURE CLASSIFIER */}
      {activeSection === 'thought-experiment' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <HelpCircle size={14} className="text-accent-primary" />
                Thought Experiment: Classifying &ldquo;Effective Procedures&rdquo;
              </span>
              <span className="text-3xs text-txt-muted">
                Pedagogical verification of what constitutes a valid algorithmic procedure
              </span>
            </div>

            {/* Selector of procedure candidates */}
            <div className="flex items-center space-x-2 flex-wrap gap-1.5">
              <span className="text-3xs text-txt-muted font-semibold">Select Procedure:</span>
              {EFFECTIVE_PROCEDURE_EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setSelectedExampleId(ex.id);
                    setUserClassification(null);
                    setClassificationSubmitted(false);
                  }}
                  className={`px-2 py-0.5 rounded text-3xs font-semibold border transition-colors ${
                    selectedExampleId === ex.id
                      ? 'bg-accent-primary text-white border-accent-primary'
                      : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                  }`}
                >
                  {ex.title}
                </button>
              ))}
            </div>

            {/* Active Procedure Description Box */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-2xs">{activeExample.title}</span>
                <span className="text-3xs text-slate-400 font-mono">ID: {activeExample.id}</span>
              </div>
              <p className="text-3xs text-slate-300 leading-relaxed font-mono bg-black/40 p-2 rounded border border-slate-900">
                &ldquo;{activeExample.procedureDescription}&rdquo;
              </p>

              {/* Classification Options */}
              <div className="pt-2 space-y-1.5">
                <span className="text-3xs text-slate-400 font-bold block">
                  How should this procedure be classified under the Church–Turing framework?
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserClassification('FINITE_ALGORITHMIC');
                      setClassificationSubmitted(true);
                    }}
                    className={`p-2 rounded text-left border text-3xs transition-all ${
                      userClassification === 'FINITE_ALGORITHMIC'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                    }`}
                  >
                    <strong className="block text-emerald-400 font-bold">1. Finite Algorithmic</strong>
                    <span className="text-[10px] text-slate-400">
                      Pure mechanical, deterministic steps on finite symbols without oracle aid.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserClassification('NON_EFFECTIVE_ORACLE');
                      setClassificationSubmitted(true);
                    }}
                    className={`p-2 rounded text-left border text-3xs transition-all ${
                      userClassification === 'NON_EFFECTIVE_ORACLE'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                    }`}
                  >
                    <strong className="block text-rose-400 font-bold">2. Non-Effective / Oracle</strong>
                    <span className="text-[10px] text-slate-400">
                      Demands infinite checks, uncomputable decision steps, or oracle knowledge.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserClassification('UNDERSPECIFIED');
                      setClassificationSubmitted(true);
                    }}
                    className={`p-2 rounded text-left border text-3xs transition-all ${
                      userClassification === 'UNDERSPECIFIED'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                    }`}
                  >
                    <strong className="block text-amber-400 font-bold">3. Underspecified</strong>
                    <span className="text-[10px] text-slate-400">
                      Relies on subjective human intuition, vague terminology, or undefined mechanics.
                    </span>
                  </button>
                </div>
              </div>

              {/* Immediate Pedagogical Feedback */}
              {classificationResult && (
                <div
                  className={`p-2.5 rounded border text-3xs mt-2 space-y-1 ${
                    classificationResult.isCorrect
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold">
                    {classificationResult.isCorrect ? (
                      <CheckCircle2 size={13} className="text-emerald-400" />
                    ) : (
                      <XCircle size={13} className="text-rose-400" />
                    )}
                    <span>{classificationResult.isCorrect ? 'Correct Classification!' : 'Classification Mismatch'}</span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs">{classificationResult.feedback}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: HISTORICAL CONVERGENCE TIMELINE */}
      {activeSection === 'timeline' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <History size={14} className="text-accent-primary" />
                Historical Convergence: From Entscheidungsproblem to Model Equivalence
              </span>
              <span className="text-3xs text-txt-muted font-mono">1928 &ndash; 1937</span>
            </div>

            <div className="space-y-2 text-3xs">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-cyan-400 font-bold">1928: Hilbert&apos;s Entscheidungsproblem</strong>
                  <span className="text-slate-500 font-mono">David Hilbert &amp; Wilhelm Ackermann</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Posited the foundational challenge: Does there exist an effective procedure (an algorithm) that, given any first-order logical statement, decides in finite steps whether it is valid? Answering this required formalizing what an &ldquo;effective procedure&rdquo; mathematically is.
                </p>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-purple-400 font-bold">1936 (April): Church&apos;s Lambda Calculus</strong>
                  <span className="text-slate-500 font-mono">Alonzo Church</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Proposed that effectively calculable functions are precisely the &lambda;-definable functions (functions expressible as pure &lambda;-terms under &beta;-reduction). Church used this to show the Entscheidungsproblem has no solution.
                </p>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-emerald-400 font-bold">1936 (May): Turing&apos;s Abstract Machine</strong>
                  <span className="text-slate-500 font-mono">Alan M. Turing</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Independently introduced the abstract machine with finite states and infinite paper tape, directly analyzing what a human computer does when following algorithmic rules. Proved that the Halting Problem is undecidable.
                </p>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-amber-400 font-bold">1937: Turing Proves &lambda;-Definability &equiv; Turing Computability</strong>
                  <span className="text-slate-500 font-mono">Alan M. Turing</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  In an appendix to his paper, Turing mathematically proved that every &lambda;-definable function is Turing-computable and vice versa. Soon after, Kleene proved equivalence with general recursive functions, establishing the universal consensus known as the <strong>Church–Turing Thesis</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
