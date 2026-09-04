import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import {
  MAPPING_REDUCTION_DEFINITION,
  REDUCIBILITY_DISTINCTIONS,
  REDUCTION_PRESETS,
  executeMappingReduction,
  composeReductions,
} from '@project-zero/core-solver';
import {
  ArrowRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Play,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Zap,
  BookOpen,
} from 'lucide-react';

export const ReducibilityTab: React.FC = () => {
  const { blankSymbol, replaceMachine } = useGraph();
  const { inputString, setInputString } = useExecution();

  // Active sub-section
  const [activeSection, setActiveSection] = useState<
    'definitions' | 'playground' | 'theorems' | 'composition' | 'distinctions'
  >('definitions');

  // Selected reduction preset ID
  const [selectedPresetId, setSelectedPresetId] = useState<string>(REDUCTION_PRESETS[0].id);

  const activePreset = useMemo(() => {
    return REDUCTION_PRESETS.find((p) => p.id === selectedPresetId) || REDUCTION_PRESETS[0];
  }, [selectedPresetId]);

  // Handle switching preset
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = REDUCTION_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.testCases.length > 0) {
      setInputString(preset.testCases[0].sourceInput);
    }
  };

  // Load target machine into canvas
  const handleLoadTargetToCanvas = () => {
    if (activePreset.targetGraph) {
      replaceMachine(
        [...activePreset.targetGraph.nodes],
        [...activePreset.targetGraph.edges],
        'TM',
        undefined,
        blankSymbol
      );
    }
  };

  // Execute mapping reduction on current inputString
  const certificate = useMemo(() => {
    return executeMappingReduction(activePreset, inputString, { blankSymbol });
  }, [activePreset, inputString, blankSymbol]);

  // Composition demonstration state
  const composedResult = useMemo(() => {
    const ab = REDUCTION_PRESETS.find((p) => p.id === 'prefix-embedding-reduction')!;
    const bc = REDUCTION_PRESETS.find((p) => p.id === 'prefix-to-wrapped-reduction')!;
    return composeReductions(ab, bc, inputString);
  }, [inputString]);

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs font-sans select-none space-y-3 bg-bg-surface1 text-txt-primary">
      {/* Top Banner & Syllabus Pathway */}
      <div className="p-3 bg-slate-950/90 border border-border-subtle rounded-lg space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-txt-primary font-bold">
            <Zap size={16} className="text-amber-400" />
            <span className="text-sm">Module 5 — Topic 5: Reducibility</span>
          </div>
          <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
            A &le;m B &bull; Many-One / Mapping Reductions &bull; Solvability Transfer
          </span>
        </div>

        {/* Directionality & Core Law Invariant */}
        <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded flex items-center justify-between flex-wrap gap-2 text-3xs">
          <div className="flex items-center space-x-2 font-mono text-slate-300">
            <span className="text-slate-400 font-bold">Core Reduction Flow:</span>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
              Problem A
            </span>
            <span className="text-amber-400 font-bold flex items-center">
              ─── f(x) ───&gt;
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              Problem B (Solver)
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-semibold">
            In computability: &quot;B is at least as hard as A&quot;. If B is decidable, A is decidable.
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
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
            M5.5: Reducibility
          </span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 text-txt-muted border border-border-subtle">
            M5.6: Undecidability (Upcoming)
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 border-b border-border-subtle pb-1">
        <button
          type="button"
          onClick={() => setActiveSection('definitions')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'definitions'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <BookOpen size={12} />
          <span>Mapping Reduction Definition</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('playground')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'playground'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Play size={12} />
          <span>Interactive Reduction Lab</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('theorems')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'theorems'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <ShieldCheck size={12} />
          <span>Transfer &amp; Contrapositive</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('composition')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'composition'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Layers size={12} />
          <span>Composition &amp; Reflexivity</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('distinctions')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'distinctions'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <ShieldAlert size={12} />
          <span>What It Does / Does Not Mean</span>
        </button>
      </div>

      {/* SECTION 1: DEFINITIONS */}
      {activeSection === 'definitions' && (
        <div className="space-y-3">
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                <BookOpen size={14} /> Many-One (Mapping) Reduction: A &le;m B
              </span>
              <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                f: &Sigma;* &rarr; &Gamma;*
              </span>
            </div>

            <div className="p-3 bg-black/50 rounded border border-slate-900 font-mono text-3xs text-slate-200 leading-relaxed">
              {MAPPING_REDUCTION_DEFINITION.formalStatement}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-cyan-300 text-3xs uppercase tracking-wider block">
                  1. The Transformation f Must Be Total and Computable
                </span>
                <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                  The reduction function <code>f(x)</code> must be an algorithmic process that <strong>halts on every input string</strong> <code>x &isin; &Sigma;*</code>. It cannot enter an infinite loop or fail to terminate.
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-300 text-3xs uppercase tracking-wider block">
                  2. Exact Membership Equivalence
                </span>
                <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                  The transformation must preserve the truth value of membership without inversion:
                  <code>x &isin; A &hArr; f(x) &isin; B</code>. If <code>x</code> is a member of A, <code>f(x)</code> MUST be a member of B. If <code>x</code> is not a member of A, <code>f(x)</code> MUST NOT be a member of B.
                </p>
              </div>
            </div>

            {/* Mapping vs Turing Reduction Card */}
            <div className="p-3 bg-purple-950/30 rounded border border-purple-900/40 space-y-1.5">
              <span className="font-bold text-purple-300 text-3xs uppercase tracking-wider block">
                Mapping Reduction vs Turing (Oracle) Reduction
              </span>
              <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                <strong>Mapping Reduction (A &le;m B):</strong> Transforms a single source instance into a single target instance <code>f(x)</code>, and submits it to the target solver once.
                <br />
                <strong>Turing Reduction (A &le;T B):</strong> An algorithm for A can make multiple arbitrary adaptive queries to an oracle for B, possibly inverting or combining answers. Mapping reductions are a special, highly constrained case of Turing reductions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: INTERACTIVE PLAYGROUND & CERTIFICATE */}
      {activeSection === 'playground' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <Play size={14} className="text-amber-400" />
                Live Reduction Playground &amp; Execution Certificate
              </span>
              <span className="text-3xs text-txt-muted">
                Execute concrete transformations and verify membership equivalence
              </span>
            </div>

            {/* Preset Selector */}
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-3xs text-txt-muted font-semibold">Select Reduction:</span>
              {REDUCTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-2.5 py-1 rounded text-3xs font-semibold border transition-colors ${
                    selectedPresetId === preset.id
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                      : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Reduction Meta Header */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <strong className="text-slate-200 text-xs">{activePreset.name}</strong>
                  <span className="text-3xs text-amber-400 font-mono ml-2">({activePreset.shortLabel})</span>
                  <p className="text-3xs text-slate-400 font-mono mt-0.5">
                    Source: {activePreset.sourceFormalDef} &bull; Target: {activePreset.targetFormalDef}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadTargetToCanvas}
                  className="px-2 py-0.5 rounded text-3xs bg-bg-surface3 hover:bg-bg-surface2 text-cyan-300 border border-border-subtle transition-colors"
                  title="Load the target machine into the workspace canvas"
                >
                  Load Target TM to Canvas
                </button>
              </div>

              {/* Sample Test Case Buttons */}
              <div className="flex items-center space-x-1.5 flex-wrap gap-1 pt-1.5 border-t border-slate-900">
                <span className="text-3xs text-slate-400 font-semibold">Curated Inputs:</span>
                {activePreset.testCases.map((tc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputString(tc.sourceInput)}
                    className={`px-1.5 py-0.5 rounded text-3xs font-mono border transition-colors ${
                      inputString === tc.sourceInput
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                        : tc.isSourceMember
                        ? 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                        : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800'
                    }`}
                    title={tc.notes}
                  >
                    &quot;{tc.sourceInput}&quot; ({tc.isSourceMember ? 'member' : 'non-member'})
                  </button>
                ))}
              </div>
            </div>

            {/* Transformation Step Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-2.5 bg-slate-950 rounded border border-purple-900/60 space-y-1">
                <span className="text-3xs font-bold text-purple-400 uppercase">1. Source Input x</span>
                <div className="p-1.5 bg-black/60 rounded font-mono text-xs text-purple-200 truncate">
                  &quot;{inputString}&quot;
                </div>
                <div className="text-[10px] text-slate-400">
                  Source Result: {certificate.isSourceAccepted ? 'ACCEPT (Member)' : 'REJECT (Non-Member)'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-amber-900/60 space-y-1">
                <span className="text-3xs font-bold text-amber-400 uppercase">2. Transformation f(x)</span>
                <div className="p-1.5 bg-black/60 rounded font-mono text-xs text-amber-200 truncate flex items-center justify-between">
                  <span>&quot;{certificate.transformedTargetInput}&quot;</span>
                  <ArrowDownRight size={14} className="text-amber-400" />
                </div>
                <div className="text-[10px] text-slate-400">
                  Formula: {activePreset.transformationFormula}
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-cyan-900/60 space-y-1">
                <span className="text-3xs font-bold text-cyan-400 uppercase">3. Target Solver Result</span>
                <div className="p-1.5 bg-black/60 rounded font-mono text-xs text-cyan-200 truncate">
                  {certificate.isTargetAccepted ? 'ACCEPT (Member)' : 'REJECT (Non-Member)'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Target Machine Executed: {certificate.targetExecution.steps.length} step(s)
                </div>
              </div>
            </div>

            {/* FORMAL REDUCTION CERTIFICATE CARD */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Formal Reduction Certificate ({activePreset.shortLabel})
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-3xs font-bold ${
                    certificate.isEquivalencePreserved
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {certificate.isEquivalencePreserved ? 'EQUIVALENCE PRESERVED' : 'EQUIVALENCE VIOLATION'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-3xs">
                <div className="p-2 bg-black/40 rounded border border-slate-800 space-y-1">
                  <div>
                    <strong className="text-slate-400">Source Evaluation:</strong>{' '}
                    <span className={certificate.isSourceAccepted ? 'text-emerald-300' : 'text-rose-300'}>
                      x &isin; A: {certificate.isSourceAccepted ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Target Evaluation:</strong>{' '}
                    <span className={certificate.isTargetAccepted ? 'text-emerald-300' : 'text-rose-300'}>
                      f(x) &isin; B: {certificate.isTargetAccepted ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Condition:</strong>{' '}
                    <span className="text-emerald-300">x &isin; A &hArr; f(x) &isin; B holds</span>
                  </div>
                </div>

                <div className="p-2 bg-black/40 rounded border border-slate-800 space-y-1">
                  <div>
                    <strong className="text-slate-400">Function Invariant:</strong>{' '}
                    <span className="text-cyan-300">{certificate.totalityClaim}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Model:</strong>{' '}
                    <span className="text-cyan-300">{certificate.computabilityClaim}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Solvability:</strong>{' '}
                    <span className="text-slate-300">{certificate.solvabilityTransferSummary}</span>
                  </div>
                </div>
              </div>

              <div className="p-1.5 bg-black/60 rounded border border-slate-900 text-[10px] text-slate-400">
                <strong className="text-slate-300">Epistemic Disclaimer: </strong>
                {certificate.boundedExecutionNote}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: THEOREMS */}
      {activeSection === 'theorems' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Solvability Transfer Theorem */}
            <div className="p-3.5 bg-slate-950 rounded-lg border border-emerald-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Solvability Transfer Theorem
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Decidability Transfer
                </span>
              </div>
              <p className="text-3xs font-mono text-slate-200 bg-black/40 p-2 rounded border border-slate-900">
                If A &le;m B and B is decidable, then A is decidable.
              </p>
              <div className="space-y-1.5 text-3xs text-slate-300">
                <strong className="text-slate-400 block font-semibold">Constructive Proof:</strong>
                <p className="leading-relaxed font-sans">
                  Let <code>D_B</code> be a decider for B, and let <code>f</code> be the total computable reduction function. We construct a decider <code>D_A</code> for A as follows:
                </p>
                <div className="p-2 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 space-y-0.5">
                  <div>D_A(x):</div>
                  <div className="pl-3">1. Compute y = f(x)</div>
                  <div className="pl-3">2. Run D_B(y)</div>
                  <div className="pl-3">3. If D_B accepts &rarr; ACCEPT</div>
                  <div className="pl-3">4. If D_B rejects &rarr; REJECT</div>
                </div>
                <p className="leading-relaxed font-sans pt-1">
                  Because <code>f</code> is total, step 1 terminates on every input. Because <code>D_B</code> is a decider, step 2 terminates on every input. Thus, <code>D_A</code> halts on every input and correctly decides A.
                </p>
              </div>
            </div>

            {/* Contrapositive / Undecidability Transfer Theorem */}
            <div className="p-3.5 bg-slate-950 rounded-lg border border-rose-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                  <XCircle size={14} /> Contrapositive: Hardness Transfer
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  Undecidability Transfer
                </span>
              </div>
              <p className="text-3xs font-mono text-slate-200 bg-black/40 p-2 rounded border border-slate-900">
                If A &le;m B and A is undecidable, then B is undecidable.
              </p>
              <div className="space-y-1.5 text-3xs text-slate-300">
                <strong className="text-slate-400 block font-semibold">Proof by Contradiction:</strong>
                <p className="leading-relaxed font-sans">
                  Suppose B were decidable. Then by the Solvability Transfer Theorem, A would also be decidable. But this directly contradicts the fact that A is known to be undecidable. Therefore, B cannot be decidable.
                </p>
                <div className="p-2 bg-slate-900 rounded font-sans text-3xs text-rose-300 space-y-1 border border-rose-900/40">
                  <strong>Crucial Pedagogical Warning:</strong>
                  <p>
                    To prove a new problem B is undecidable, you must reduce a <em>known undecidable problem A</em> to B (<code>A &le;m B</code>), NOT reduce B to A. Reducing B to A only shows that B is no harder than A, which proves nothing about B&apos;s undecidability!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: COMPOSITION & REFLEXIVITY */}
      {activeSection === 'composition' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
              <Layers size={14} className="text-amber-400" />
              Algebraic Properties: Reflexivity &amp; Transitive Composition
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Reflexivity */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="font-bold text-cyan-300 text-xs block">
                  1. Reflexivity: A &le;m A
                </span>
                <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                  Every language is trivially mapping reducible to itself via the identity mapping:
                  <code>f(x) = x</code>.
                  Since <code>f</code> is the identity function, it is total computable, and <code>x &isin; A &hArr; x &isin; A</code> holds identically.
                </p>
              </div>

              {/* Transitivity */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="font-bold text-amber-300 text-xs block">
                  2. Transitivity: A &le;m B &and; B &le;m C &rArr; A &le;m C
                </span>
                <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                  If <code>f</code> reduces A to B and <code>g</code> reduces B to C, their composition <code>h = g &comp; f</code> reduces A to C. The composition of two total computable functions is itself total and computable.
                </p>
              </div>
            </div>

            {/* Live Composition Chain Demo */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
              <span className="font-bold text-slate-200 text-xs block">
                Live Transitive Composition Demonstration: A &rarr; B &rarr; C
              </span>
              <p className="text-3xs text-slate-400 font-mono">
                {composedResult.compositionFormula}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-3xs">
                <div className="p-2 bg-slate-900 rounded border border-purple-900/50">
                  <span className="text-purple-300 font-bold block">Language A: L_0n1n</span>
                  <div className="font-mono text-slate-200 truncate mt-1">&quot;{composedResult.sourceInputX}&quot;</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Member: {composedResult.isMemberA ? 'YES' : 'NO'}
                  </div>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-amber-900/50">
                  <span className="text-amber-300 font-bold block">Language B: L_#0n1n</span>
                  <div className="font-mono text-slate-200 truncate mt-1">&quot;{composedResult.intermediateInputY}&quot;</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Member: {composedResult.isMemberB ? 'YES' : 'NO'}
                  </div>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-cyan-900/50">
                  <span className="text-cyan-300 font-bold block">Language C: L_#0n1n$</span>
                  <div className="font-mono text-slate-200 truncate mt-1">&quot;{composedResult.finalTargetInputZ}&quot;</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Member: {composedResult.isMemberC ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>

              <div className="p-1.5 bg-emerald-950/40 border border-emerald-900/50 rounded text-3xs text-emerald-300 flex items-center justify-between">
                <span>Transitivity Chain Equivalence (A &hArr; B &hArr; C):</span>
                <span className="font-bold font-mono">
                  {composedResult.isChainEquivalencePreserved ? 'VERIFIED PRESERVED' : 'FAILED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: DISTINCTIONS */}
      {activeSection === 'distinctions' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-400" />
              What Reducibility Does and Does NOT Mean
            </span>

            <div className="space-y-2.5">
              {REDUCIBILITY_DISTINCTIONS.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-400 text-2xs block">
                    {idx + 1}. {item.topic}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-3xs">
                    <div className="p-2 bg-emerald-950/30 rounded border border-emerald-900/40 space-y-1">
                      <strong className="text-emerald-300 block font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} /> Reducibility Means:
                      </strong>
                      <p className="text-slate-300 leading-relaxed font-sans">{item.reducibilityMeans}</p>
                    </div>

                    <div className="p-2 bg-rose-950/30 rounded border border-rose-900/40 space-y-1">
                      <strong className="text-rose-300 block font-semibold flex items-center gap-1">
                        <XCircle size={11} /> Does NOT Mean:
                      </strong>
                      <p className="text-slate-300 leading-relaxed font-sans">{item.doesNotMean}</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-300/90 font-medium pt-0.5">
                    <strong>Pedagogical Warning: </strong>
                    {item.pedagogicalWarning}
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
