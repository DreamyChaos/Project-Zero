import React, { useState, useMemo } from 'react';
import {
  PCP_DEFINITION,
  PCP_DISTINCTIONS,
  PCP_PRESETS,
  comparePCPSequence,
  solvePCPBounded,
  PCPDomino,
  PCPSearchResult,
} from '@project-zero/core-solver';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Split,
  Trash2,
  XCircle,
} from 'lucide-react';

export const PCPTab: React.FC = () => {
  // Active sub-section
  const [activeSection, setActiveSection] = useState<
    'domino-board' | 'bounded-solver' | 'formal-theory' | 'guardrails'
  >('domino-board');

  // Selected Preset ID
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PCP_PRESETS[0].id);

  // Active instance dominoes
  const activePreset = useMemo(() => {
    return PCP_PRESETS.find((p) => p.id === selectedPresetId) || PCP_PRESETS[0];
  }, [selectedPresetId]);

  // Current manual index sequence (1-based indices)
  const [manualSequence, setManualSequence] = useState<number[]>([1]);

  // Bounded solver controls
  const [solverMaxDepth, setSolverMaxDepth] = useState<number>(6);
  const [solverMaxNodes, setSolverMaxNodes] = useState<number>(5000);
  const [solverResult, setSolverResult] = useState<PCPSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Handle preset switch
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setManualSequence([]);
    setSolverResult(null);
  };

  // Add domino to manual sequence
  const handleAppendDomino = (dominoId: number) => {
    setManualSequence((prev) => [...prev, dominoId]);
  };

  // Remove last domino from manual sequence
  const handlePopDomino = () => {
    setManualSequence((prev) => prev.slice(0, -1));
  };

  // Clear manual sequence
  const handleClearSequence = () => {
    setManualSequence([]);
  };

  // Load known solution if available
  const handleLoadKnownSolution = () => {
    if (activePreset.knownSolution) {
      setManualSequence([...activePreset.knownSolution]);
    }
  };

  // Real-time manual sequence comparison
  const manualComparison = useMemo(() => {
    return comparePCPSequence(activePreset.dominoes, manualSequence);
  }, [activePreset.dominoes, manualSequence]);

  // Run bounded BFS solver
  const handleRunSolver = () => {
    setIsSearching(true);
    // Micro-delay so UI displays searching state if deep
    setTimeout(() => {
      const res = solvePCPBounded(activePreset.dominoes, {
        maxDepth: solverMaxDepth,
        maxNodes: solverMaxNodes,
      });
      setSolverResult(res);
      setIsSearching(false);
      if (res.status === 'SOLUTION_FOUND' && res.witness) {
        setManualSequence([...res.witness.sequence]);
      }
    }, 50);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs font-sans select-none space-y-3 bg-bg-surface1 text-txt-primary">
      {/* Top Banner & Syllabus Pathway */}
      <div className="p-3 bg-slate-950/90 border border-border-subtle rounded-lg space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-txt-primary font-bold">
            <Split size={16} className="text-emerald-400" />
            <span className="text-sm">Module 5 — Topic 7: Post Correspondence Problem (PCP)</span>
          </div>
          <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            PCP &bull; Classical Undecidability &bull; String Matching Invariant
          </span>
        </div>

        {/* Core PCP Invariant Banner */}
        <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded flex items-center justify-between flex-wrap gap-2 text-3xs">
          <div className="flex items-center space-x-2 font-mono text-slate-300">
            <span className="text-slate-400 font-bold">Matching Condition:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              u_&#123;i_1&#125; ... u_&#123;i_k&#125; == v_&#123;i_1&#125; ... v_&#123;i_k&#125;
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-semibold">
            Non-Negotiable Invariant: The exact same sequence of domino indices is applied to both rows!
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
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.6: Halting Problem</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
            M5.7: PCP (Undecidable)
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 border-b border-border-subtle pb-1">
        <button
          type="button"
          onClick={() => setActiveSection('domino-board')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'domino-board'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Layers size={12} />
          <span>Interactive Domino Board &amp; Builder</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('bounded-solver')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'bounded-solver'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Play size={12} />
          <span>Bounded BFS Automatic Solver</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('formal-theory')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'formal-theory'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <BookOpen size={12} />
          <span>Formal Theory &amp; Undecidability</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('guardrails')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'guardrails'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <ShieldAlert size={12} />
          <span>What Bounded Search Can/Cannot Prove</span>
        </button>
      </div>

      {/* SECTION 1: INTERACTIVE DOMINO BOARD & MANUAL BUILDER */}
      {activeSection === 'domino-board' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            {/* Presets Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                <span className="text-3xs text-txt-muted font-semibold">Instance Preset:</span>
                {PCP_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-2.5 py-1 rounded text-3xs font-semibold border transition-colors ${
                      selectedPresetId === preset.id
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-500'
                        : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {activePreset.knownSolution && (
                <button
                  type="button"
                  onClick={handleLoadKnownSolution}
                  className="px-2 py-0.5 rounded text-3xs bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
                >
                  Load Solution Sequence [{activePreset.knownSolution.join(', ')}]
                </button>
              )}
            </div>

            {/* Domino Cards Palette */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                Available Dominoes (Click to Append to Sequence &bull; Reuse Allowed):
              </span>
              <div className="flex items-center space-x-2.5 flex-wrap gap-2">
                {activePreset.dominoes.map((domino: PCPDomino) => (
                  <button
                    key={domino.id}
                    type="button"
                    onClick={() => handleAppendDomino(domino.id)}
                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-emerald-500 transition-all text-center flex flex-col items-center shadow-xs"
                    title={`Click to append Domino #${domino.id}`}
                  >
                    <div className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-emerald-400 mb-1">
                      #{domino.id}
                    </div>
                    {/* Visual Domino Block */}
                    <div className="w-14 border border-slate-600 rounded bg-black/60 font-mono text-xs overflow-hidden">
                      <div className="py-1 border-b border-slate-700 text-cyan-300 text-center font-bold">
                        {domino.top}
                      </div>
                      <div className="py-1 text-purple-300 text-center font-bold">
                        {domino.bottom}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sequence Builder Strip */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">
                    Current Sequence ({manualSequence.length} Dominoes):
                  </span>
                  <div className="flex items-center space-x-1">
                    {manualSequence.length === 0 ? (
                      <span className="text-3xs text-slate-500 italic">No dominoes selected yet</span>
                    ) : (
                      manualSequence.map((idx, seqPos) => (
                        <span
                          key={seqPos}
                          className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800"
                        >
                          [{idx}]
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    disabled={manualSequence.length === 0}
                    onClick={handlePopDomino}
                    className="px-2 py-0.5 rounded text-3xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={10} /> Backspace
                  </button>
                  <button
                    type="button"
                    disabled={manualSequence.length === 0}
                    onClick={handleClearSequence}
                    className="px-2 py-0.5 rounded text-3xs bg-rose-950/60 hover:bg-rose-900 disabled:opacity-40 text-rose-300 border border-rose-800 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                </div>
              </div>

              {/* Concatenation Visualizer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-3xs">
                <div className="p-2.5 bg-slate-900 rounded border border-cyan-900/50 space-y-1">
                  <span className="font-bold text-cyan-300 uppercase block">Top Concatenation (u):</span>
                  <div className="p-1.5 bg-black/60 rounded font-mono text-xs text-cyan-200 break-all min-h-6 flex items-center">
                    {manualComparison.topString || <span className="text-slate-600">&epsilon;</span>}
                  </div>
                  <div className="text-[10px] text-slate-400">Length: {manualComparison.topString.length} char(s)</div>
                </div>

                <div className="p-2.5 bg-slate-900 rounded border border-purple-900/50 space-y-1">
                  <span className="font-bold text-purple-300 uppercase block">Bottom Concatenation (v):</span>
                  <div className="p-1.5 bg-black/60 rounded font-mono text-xs text-purple-200 break-all min-h-6 flex items-center">
                    {manualComparison.bottomString || <span className="text-slate-600">&epsilon;</span>}
                  </div>
                  <div className="text-[10px] text-slate-400">Length: {manualComparison.bottomString.length} char(s)</div>
                </div>
              </div>

              {/* Real-time Status Card */}
              <div className="p-2.5 bg-slate-900 rounded border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-3xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-bold">State:</span>
                  {manualSequence.length === 0 ? (
                    <span className="text-slate-400 italic">Empty sequence (&epsilon;) &bull; Invariant requires k &ge; 1</span>
                  ) : manualComparison.status === 'MATCH' ? (
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={12} /> SOLUTION FOUND! TOP === BOTTOM
                    </span>
                  ) : manualComparison.canBeExtended ? (
                    <span className="px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                      <ChevronRight size={12} /> Valid In-Progress Prefix Match
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                      <XCircle size={12} /> Irrevocable Mismatch (Cannot be extended)
                    </span>
                  )}
                </div>

                {manualComparison.residualSuffix && (
                  <span className="font-mono text-slate-300">
                    Discrepancy: <span className="text-amber-400">{manualComparison.residualSuffix}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BOUNDED BFS AUTOMATIC SOLVER */}
      {activeSection === 'bounded-solver' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                  <Play size={14} className="text-emerald-400" />
                  Bounded Breadth-First Search (BFS) Solver
                </span>
                <p className="text-3xs text-txt-muted mt-0.5">
                  Explores non-empty domino sequences using mathematically proven prefix/residual branch pruning
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-3xs text-txt-muted">Max Depth:</span>
                <select
                  value={solverMaxDepth}
                  onChange={(e) => setSolverMaxDepth(Number(e.target.value))}
                  className="px-2 py-0.5 rounded text-3xs bg-bg-surface3 text-txt-primary border border-border-subtle"
                >
                  <option value={4}>4 dominoes</option>
                  <option value={6}>6 dominoes</option>
                  <option value={8}>8 dominoes</option>
                  <option value={10}>10 dominoes</option>
                </select>

                <span className="text-3xs text-txt-muted ml-1">Max Nodes:</span>
                <select
                  value={solverMaxNodes}
                  onChange={(e) => setSolverMaxNodes(Number(e.target.value))}
                  className="px-2 py-0.5 rounded text-3xs bg-bg-surface3 text-txt-primary border border-border-subtle"
                >
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                  <option value={10000}>10,000</option>
                </select>

                <button
                  type="button"
                  disabled={isSearching}
                  onClick={handleRunSolver}
                  className="px-3 py-1 rounded text-2xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 shadow-xs transition-colors flex items-center gap-1"
                >
                  <Play size={12} /> {isSearching ? 'Searching...' : 'Run Bounded BFS'}
                </button>
              </div>
            </div>

            {/* Telemetry / Result Card */}
            {solverResult && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Solver Execution Outcome
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-3xs font-bold ${
                      solverResult.status === 'SOLUTION_FOUND'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {solverResult.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-3xs">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <strong className="text-slate-400 block">Nodes Explored:</strong>
                    <span className="font-mono text-slate-200 text-sm">{solverResult.nodesExplored.toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <strong className="text-slate-400 block">Max Depth Reached:</strong>
                    <span className="font-mono text-slate-200 text-sm">{solverResult.maxDepthReached}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <strong className="text-slate-400 block">Execution Time:</strong>
                    <span className="font-mono text-slate-200 text-sm">{solverResult.executionTimeMs} ms</span>
                  </div>
                </div>

                {/* Solution Witness Card */}
                {solverResult.status === 'SOLUTION_FOUND' && solverResult.witness && (
                  <div className="p-3 bg-slate-900 rounded border border-emerald-900/60 space-y-2">
                    <span className="font-bold text-emerald-300 text-2xs block uppercase">
                      Complete Solution Witness Verified:
                    </span>
                    <div className="p-2 bg-black/60 rounded font-mono text-xs text-emerald-200 space-y-1">
                      <div>
                        <strong>Index Sequence:</strong> [{solverResult.witness.sequence.join(', ')}]
                      </div>
                      <div>
                        <strong>Top Concatenation:</strong> &quot;{solverResult.witness.topConcatenation}&quot;
                      </div>
                      <div>
                        <strong>Bottom Concatenation:</strong> &quot;{solverResult.witness.bottomConcatenation}&quot;
                      </div>
                    </div>
                  </div>
                )}

                {/* Epistemological Explanation */}
                <div className="p-2 bg-black/60 rounded border border-slate-900 text-[10px] text-amber-300/90 space-y-0.5">
                  <strong className="text-amber-200">Epistemological Invariant: </strong>
                  <span>{solverResult.epistemologicalNote}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: FORMAL THEORY & UNDECIDABILITY */}
      {activeSection === 'formal-theory' && (
        <div className="space-y-3">
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                <BookOpen size={14} /> Emil Post&apos;s Undecidability Theorem (1946)
              </span>
              <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                Undecidable Problem
              </span>
            </div>

            <div className="p-3 bg-black/50 rounded border border-slate-900 font-mono text-3xs text-slate-200 leading-relaxed">
              {PCP_DEFINITION.formalNotation}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Proof by Reduction from TM */}
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-cyan-300 text-3xs uppercase tracking-wider block">
                  1. Reduction via Valid Computation Histories
                </span>
                <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                  PCP&apos;s undecidability is established by reducing the <strong>Turing Machine Acceptance / Halting Problem (Topic 6)</strong> to PCP.
                  A Turing machine configuration sequence $C_1 \# C_2 \# \dots \# C_k$ is simulated by dominoes where the top row lags behind the bottom row by exactly one valid transition step.
                </p>
              </div>

              {/* Modified PCP vs Standard PCP */}
              <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-purple-300 text-3xs uppercase tracking-wider block">
                  2. Modified PCP (MPCP) Distinction
                </span>
                <p className="text-3xs text-slate-300 leading-relaxed font-sans">
                  In <strong>MPCP</strong>, the solution sequence must begin with the first domino $(u_1, v_1)$. MPCP directly encodes TM initial configurations. A standard reduction inserts interleaving marker symbols ($*$) to reduce MPCP back to standard unconstrained PCP!
                </p>
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
              <ShieldAlert size={14} className="text-emerald-400" />
              Epistemological Guardrails: What Bounded Search Can vs Cannot Prove
            </span>

            <div className="space-y-2.5">
              {PCP_DISTINCTIONS.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400 text-2xs block">
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
