import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import {
  RE_LANGUAGE_DEFINITIONS,
  RECURSIVE_VS_RE_COMPARISON,
  COMPLEMENT_THEOREMS,
  RE_LANGUAGE_PRESETS,
  demonstrateREExecution,
  simulateBoundedEnumerator,
  MachineHaltingType,
} from '@project-zero/core-solver';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Layers,
  ArrowRight,
  ShieldCheck,
  ListOrdered,
  BookOpen,
} from 'lucide-react';

export const RELanguagesTab: React.FC = () => {
  const { nodes, edges, blankSymbol, replaceMachine } = useGraph();
  const { inputString, setInputString } = useExecution();

  // Active section selector
  const [activeSection, setActiveSection] = useState<
    'definitions' | 'demonstrator' | 'comparison' | 'complements' | 'enumerator'
  >('definitions');

  // Selected language preset ID or 'custom_canvas'
  const [selectedPresetId, setSelectedPresetId] = useState<string>('decider-even-ones');

  // Effective halting assumption for execution: DECIDER vs RECOGNIZER
  const [selectedHaltingType, setSelectedHaltingType] = useState<MachineHaltingType>('DECIDER');

  // Active preset object
  const activePreset = useMemo(() => {
    return RE_LANGUAGE_PRESETS.find((p) => p.id === selectedPresetId) || RE_LANGUAGE_PRESETS[0];
  }, [selectedPresetId]);

  // Sync halting type when preset changes
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = RE_LANGUAGE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedHaltingType(preset.haltingType);
      if (preset.testCases.length > 0) {
        setInputString(preset.testCases[0].input);
      }
    }
  };

  // Load preset graph to canvas
  const handleLoadPresetToCanvas = (presetId: string) => {
    const preset = RE_LANGUAGE_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.graph) {
      replaceMachine([...preset.graph.nodes], [...preset.graph.edges], 'TM', undefined, preset.blankSymbol);
      if (preset.testCases.length > 0) {
        setInputString(preset.testCases[0].input);
      }
    }
  };

  // Live execution analysis using currently selected preset or active canvas
  const executionDemoResult = useMemo(() => {
    const targetGraph = selectedPresetId === 'custom_canvas' ? { nodes, edges } : activePreset.graph;
    if (targetGraph.nodes.length === 0) return null;
    return demonstrateREExecution(targetGraph, inputString, selectedHaltingType, { blankSymbol });
  }, [selectedPresetId, nodes, edges, activePreset, inputString, selectedHaltingType, blankSymbol]);

  // Bounded enumerator state
  const [enumeratorMaxWords, setEnumeratorMaxWords] = useState<number>(6);
  const enumeratorResult = useMemo(() => {
    const targetGraph = selectedPresetId === 'custom_canvas' ? { nodes, edges } : activePreset.graph;
    if (targetGraph.nodes.length === 0) return null;
    return simulateBoundedEnumerator(targetGraph, activePreset.alphabet, enumeratorMaxWords, 100, blankSymbol);
  }, [selectedPresetId, nodes, edges, activePreset, enumeratorMaxWords, blankSymbol]);

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs font-sans select-none space-y-3 bg-bg-surface1 text-txt-primary">
      {/* Header Banner & Syllabus Bridge */}
      <div className="p-3 bg-slate-950/90 border border-border-subtle rounded-lg space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-txt-primary font-bold">
            <GitBranch size={16} className="text-accent-primary" />
            <span className="text-sm">Module 5 — Topic 4: Recursive &amp; Recursively Enumerable Languages</span>
          </div>
          <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-accent-primary/10 text-accent-primary border border-accent-primary/30">
            Decidability &bull; Turing-Recognizability &bull; Non-Recursive Boundary
          </span>
        </div>

        {/* Set-Theoretic Containment Hierarchy Banner */}
        <div className="p-2 bg-slate-900/90 border border-slate-800 rounded flex items-center justify-between flex-wrap gap-2 text-3xs">
          <div className="flex items-center space-x-1 font-mono text-slate-300">
            <span className="text-slate-400 font-bold">Proper Hierarchy:</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Regular
            </span>
            <span>&sub;</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Context-Free
            </span>
            <span>&sub;</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
              Recursive (Decidable)
            </span>
            <span>&sub;</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
              RE (Turing-Recognizable)
            </span>
            <span>&sube;</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
              All Languages
            </span>
          </div>
          <span className="text-[10px] text-accent-primary font-semibold">
            Every Decidable Language is RE; The Containment is Proper.
          </span>
        </div>

        {/* Syllabus Bridge Pathway */}
        <div className="flex items-center space-x-1 text-3xs text-txt-muted overflow-x-auto pt-0.5">
          <span className="font-semibold text-txt-secondary">Syllabus Bridge:</span>
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M2: Regular</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M3/4: Context-Free</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.1: TM Model</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.2: UTM</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.3: Church–Turing</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-bold">
            M5.4: Recursive vs RE
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
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <BookOpen size={12} />
          <span>Definitions &amp; Containment</span>
        </button>
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
          <span>Decider vs Recognizer Lab</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('comparison')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'comparison'
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Layers size={12} />
          <span>Side-by-Side Comparison</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('complements')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'complements'
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <ShieldCheck size={12} />
          <span>Complement Theorems</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('enumerator')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'enumerator'
              ? 'bg-accent-primary text-white shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <ListOrdered size={12} />
          <span>Turing Enumerator</span>
        </button>
      </div>

      {/* SECTION 1: DEFINITIONS & CONTAINMENT */}
      {activeSection === 'definitions' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Decidable / Recursive */}
            <div className="p-3 bg-slate-950 rounded-lg border border-purple-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Recursive / Decidable
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  Total TM (Decider)
                </span>
              </div>
              <p className="text-3xs text-slate-300 font-mono bg-black/40 p-2 rounded border border-purple-950">
                {RE_LANGUAGE_DEFINITIONS.recursive.formalDefinition}
              </p>
              <div className="space-y-1 text-3xs text-slate-300 pt-1">
                <div>
                  <strong className="text-slate-400">Halting Contract:</strong>{' '}
                  <span>{RE_LANGUAGE_DEFINITIONS.recursive.haltingBehavior}</span>
                </div>
                <div>
                  <strong className="text-slate-400">Complementation:</strong>{' '}
                  <span>{RE_LANGUAGE_DEFINITIONS.recursive.complementProperty}</span>
                </div>
              </div>
            </div>

            {/* Recursively Enumerable (RE) */}
            <div className="p-3 bg-slate-950 rounded-lg border border-amber-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                  <AlertTriangle size={13} /> RE / Turing-Recognizable
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  Partial TM (Recognizer)
                </span>
              </div>
              <p className="text-3xs text-slate-300 font-mono bg-black/40 p-2 rounded border border-amber-950">
                {RE_LANGUAGE_DEFINITIONS.recursivelyEnumerable.formalDefinition}
              </p>
              <div className="space-y-1 text-3xs text-slate-300 pt-1">
                <div>
                  <strong className="text-slate-400">Halting Contract:</strong>{' '}
                  <span>{RE_LANGUAGE_DEFINITIONS.recursivelyEnumerable.haltingBehavior}</span>
                </div>
                <div>
                  <strong className="text-slate-400">Complementation:</strong>{' '}
                  <span>{RE_LANGUAGE_DEFINITIONS.recursivelyEnumerable.complementProperty}</span>
                </div>
              </div>
            </div>

            {/* Non-Recursive / Undecidable */}
            <div className="p-3 bg-slate-950 rounded-lg border border-rose-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                  <XCircle size={13} /> Non-Recursive Languages
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  No Decider Exists
                </span>
              </div>
              <p className="text-3xs text-slate-300 font-mono bg-black/40 p-2 rounded border border-rose-950">
                {RE_LANGUAGE_DEFINITIONS.nonRecursive.formalDefinition}
              </p>
              <div className="space-y-1 text-3xs text-slate-300 pt-1">
                <div>
                  <strong className="text-slate-400">Taxonomy:</strong>{' '}
                  <span>{RE_LANGUAGE_DEFINITIONS.nonRecursive.subclasses}</span>
                </div>
                <div className="text-[10px] text-rose-300/80 pt-1 leading-relaxed">
                  Notice that non-recursive languages divide into:
                  (1) RE languages that are not recursive (e.g. A_TM), and
                  (2) languages that are not even RE (e.g. complement of A_TM).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: DECIDER VS RECOGNIZER LAB */}
      {activeSection === 'demonstrator' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <Play size={14} className="text-accent-primary" />
                Interactive Decider vs Recognizer Execution Demonstrator
              </span>
              <span className="text-3xs text-txt-muted">
                Execute concrete Turing Machines and observe membership vs bounded halting
              </span>
            </div>

            {/* Preset Selector */}
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-3xs text-txt-muted font-semibold">Select Language Preset:</span>
              {RE_LANGUAGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-2.5 py-1 rounded text-3xs font-semibold border transition-colors ${
                    selectedPresetId === preset.id
                      ? 'bg-accent-primary text-white border-accent-primary'
                      : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedPresetId('custom_canvas')}
                className={`px-2.5 py-1 rounded text-3xs font-semibold border transition-colors ${
                  selectedPresetId === 'custom_canvas'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
              >
                Active Canvas TM ({nodes.length} states)
              </button>
            </div>

            {/* Preset Details & Controls */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <strong className="text-slate-200 text-xs">
                    {selectedPresetId === 'custom_canvas' ? 'Active Canvas Turing Machine' : activePreset.name}
                  </strong>
                  <p className="text-3xs text-slate-400 font-mono">
                    {selectedPresetId === 'custom_canvas' ? 'Custom user machine' : activePreset.formalDefinition}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-3xs font-bold ${
                      selectedHaltingType === 'DECIDER'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    Contract: {selectedHaltingType}
                  </span>
                  {selectedPresetId !== 'custom_canvas' && (
                    <button
                      type="button"
                      onClick={() => handleLoadPresetToCanvas(selectedPresetId)}
                      className="px-2 py-0.5 rounded text-3xs bg-bg-surface3 hover:bg-bg-surface2 text-cyan-300 border border-border-subtle transition-colors"
                      title="Replace current canvas graph with this preset machine"
                    >
                      Load into Canvas
                    </button>
                  )}
                </div>
              </div>

              {/* Sample Test Case Buttons */}
              {selectedPresetId !== 'custom_canvas' && activePreset.testCases.length > 0 && (
                <div className="flex items-center space-x-1.5 flex-wrap gap-1 pt-1 border-t border-slate-900">
                  <span className="text-3xs text-slate-400 font-semibold">Test Cases:</span>
                  {activePreset.testCases.map((tc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputString(tc.input)}
                      className={`px-1.5 py-0.5 rounded text-3xs font-mono border transition-colors ${
                        inputString === tc.input
                          ? 'bg-accent-primary text-white border-accent-primary'
                          : tc.isMember
                          ? 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800'
                      }`}
                      title={tc.notes}
                    >
                      &quot;{tc.input}&quot; ({tc.isMember ? 'member' : 'non-member'})
                    </button>
                  ))}
                </div>
              )}

              {/* Execution Results Display */}
              {executionDemoResult && (
                <div className="mt-2 p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-3xs text-slate-300 uppercase tracking-wider">
                      Execution Telemetry for Input &quot;{executionDemoResult.inputString}&quot;
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-3xs font-bold ${
                        executionDemoResult.membershipStatus === 'MEMBER'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : executionDemoResult.membershipStatus === 'NON_MEMBER'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {executionDemoResult.statusDisplayLabel}
                    </span>
                  </div>

                  <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                    {executionDemoResult.academicExplanation}
                  </p>

                  <div className="p-2 bg-black/40 rounded border border-slate-800 text-3xs space-y-1">
                    <div className="flex items-center space-x-1 text-accent-primary font-bold">
                      <ShieldCheck size={12} />
                      <span>Mathematical Invariant &amp; Bounded Safety Note:</span>
                    </div>
                    <p className="text-slate-300">{executionDemoResult.boundedSafetyNote}</p>
                  </div>

                  <div className="text-3xs text-slate-400 border-t border-slate-800 pt-1.5">
                    <strong className="text-slate-300">Complement Behavior: </strong>
                    {executionDemoResult.complementBehaviorNote}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: SIDE-BY-SIDE COMPARISON */}
      {activeSection === 'comparison' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
              <Layers size={14} className="text-accent-primary" />
              Decidable (Recursive) vs Turing-Recognizable (RE) Property Matrix
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-3xs border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-surface3/80 font-bold text-txt-secondary">
                    <th className="p-2">Property</th>
                    <th className="p-2 text-purple-400">Recursive (Decidable)</th>
                    <th className="p-2 text-amber-400">Recursively Enumerable (RE)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {RECURSIVE_VS_RE_COMPARISON.map((row, idx) => (
                    <tr key={idx} className="hover:bg-bg-surface2/50 transition-colors">
                      <td className="p-2 font-medium text-slate-200">{row.property}</td>
                      <td className="p-2 text-purple-300">{row.recursive}</td>
                      <td className="p-2 text-amber-300">{row.recursivelyEnumerable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: COMPLEMENT THEOREMS */}
      {activeSection === 'complements' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Complementation Theorems &amp; Algorithmic Constructions
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMPLEMENT_THEOREMS.map((thm, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400 text-2xs block">
                    Theorem {idx + 1}: {thm.theoremName}
                  </span>
                  <div className="p-2 bg-black/40 rounded border border-slate-900 font-mono text-3xs text-slate-200">
                    {thm.formalStatement}
                  </div>
                  <div className="space-y-1 text-3xs text-slate-300">
                    <strong className="text-slate-400 block font-semibold">Constructive Proof:</strong>
                    <p className="leading-relaxed font-sans">{thm.constructionProcedure}</p>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 text-3xs text-cyan-300">
                    <strong>Implication: </strong>
                    <span className="text-slate-300">{thm.mathematicalImplication}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: TURING ENUMERATOR */}
      {activeSection === 'enumerator' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <ListOrdered size={14} className="text-accent-primary" />
                Turing Enumerator Simulation: RE &harr; Enumerability
              </span>
              <span className="text-3xs text-txt-muted">
                Generates a finite prefix of strings accepted by the Turing Machine
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
              <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                A language is <strong>Recursively Enumerable</strong> if and only if there exists a Turing Enumerator that generates all strings belonging to the language in some sequential order. Below, Project Zero systematically explores candidate strings in length-lexicographical order (canonical order) and emits accepted words.
              </p>

              <div className="flex items-center space-x-3 pt-1">
                <span className="text-3xs text-slate-400 font-semibold">Max Strings to Emit:</span>
                {[4, 6, 8, 12].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setEnumeratorMaxWords(cnt)}
                    className={`px-2 py-0.5 rounded text-3xs font-mono font-bold border transition-colors ${
                      enumeratorMaxWords === cnt
                        ? 'bg-accent-primary text-white border-accent-primary'
                        : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>

              {/* Enumerated Strings Output */}
              {enumeratorResult && (
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-3xs">
                    <span className="font-bold text-cyan-300">
                      Enumerated Words for {selectedPresetId === 'custom_canvas' ? 'Canvas TM' : activePreset.name}:
                    </span>
                    <span className="text-slate-400 font-mono">
                      Tested {enumeratorResult.testedCandidateCount} candidates &bull; Emitted {enumeratorResult.emittedWords.length} words
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-2 pt-1">
                    {enumeratorResult.emittedWords.length === 0 ? (
                      <span className="text-3xs text-slate-500 italic">No strings accepted in bounded search window.</span>
                    ) : (
                      enumeratorResult.emittedWords.map((word, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-black/60 border border-cyan-800/60 font-mono text-xs font-bold text-cyan-200"
                        >
                          #{idx + 1}: {word}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="p-1.5 bg-amber-950/30 border border-amber-900/40 rounded text-[10px] text-amber-300 mt-2">
                    <strong className="block">Important Epistemological Disclaimer:</strong>
                    {enumeratorResult.academicDisclaimer} Failure of a candidate string to appear in this finite window does NOT imply that it is not in the language.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
