import React, { useState } from 'react';
import {
  TOOL_DEFINITIONS,
  TOOL_COMPARISON_MATRIX,
  JFLAP_WORKFLOW_PRESETS,
  TOOLS_DISTINCTION_ITEMS,
  evaluateRegexTool,
  evaluateYaccWorkflow,
  tokenizeSource,
  LexicalRule,
  ComputationalToolId,
} from '@project-zero/core-solver';
import { useGraph } from '../../../context/GraphContext';
import {
  ArrowRight,
  BookOpen,
  Code2,
  Cpu,
  FileCode,
  Layers,
  Play,
  Sparkles,
  Terminal,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';

export const ToolsTab: React.FC = () => {
  const { setMachineType } = useGraph();

  // Active top-level sub-section
  const [activeSection, setActiveSection] = useState<
    'overview' | 'jflap' | 'regex' | 'lex' | 'yacc'
  >('overview');

  // Selected tool in Overview
  const [selectedToolId, setSelectedToolId] = useState<ComputationalToolId>('jflap');

  // --- REGEX Playground State ---
  const [regexInput, setRegexInput] = useState<string>('(a|b)*abb');
  const [regexTestWords, setRegexTestWords] = useState<string>('abb, aabb, babb, aba, b, a');
  const regexEvaluation = React.useMemo(() => {
    const words = regexTestWords
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    return evaluateRegexTool(regexInput, words);
  }, [regexInput, regexTestWords]);

  // --- LEX Playground State ---
  const [lexSource, setLexSource] = useState<string>('if count + 42');
  const [lexRules, setLexRules] = useState<LexicalRule[]>([
    {
      id: 'r-if',
      tokenType: 'KEYWORD_IF',
      regex: 'if',
      priority: 1,
      action: 'EMIT',
      enabled: true,
      description: 'Conditional keyword if',
    },
    {
      id: 'r-id',
      tokenType: 'IDENTIFIER',
      regex: '(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)+',
      priority: 2,
      action: 'EMIT',
      enabled: true,
      description: 'Variable identifier',
    },
    {
      id: 'r-plus',
      tokenType: 'PLUS',
      regex: '\\+',
      priority: 3,
      action: 'EMIT',
      enabled: true,
      description: 'Addition operator',
    },
    {
      id: 'r-num',
      tokenType: 'NUMBER',
      regex: '(0|1|2|3|4|5|6|7|8|9)+',
      priority: 4,
      action: 'EMIT',
      enabled: true,
      description: 'Numeric integer constant',
    },
    {
      id: 'r-ws',
      tokenType: 'WHITESPACE',
      regex: '(\\ |\\t)+',
      priority: 5,
      action: 'SKIP',
      enabled: true,
      description: 'Ignored whitespace',
    },
  ]);

  const lexResult = React.useMemo(() => {
    return tokenizeSource(lexSource, lexRules);
  }, [lexSource, lexRules]);

  // --- YACC Workflow State ---
  const [grammarInput, setGrammarInput] = useState<string>(
    'E -> E + T\nE -> T\nT -> a'
  );
  const [yaccTestWord, setYaccTestWord] = useState<string>('a+a');
  const yaccEvaluation = React.useMemo(() => {
    return evaluateYaccWorkflow(grammarInput, yaccTestWord);
  }, [grammarInput, yaccTestWord]);

  // Handle JFLAP preset workspace routing
  const handleLaunchJFLAPModel = (targetModel: 'FA' | 'PDA' | 'TM' | 'CFG') => {
    if (targetModel === 'FA') {
      setMachineType('DFA');
      window.dispatchEvent(
        new CustomEvent('navigate-to-tab', { detail: { categoryId: 'execution', tabId: 'trace' } })
      );
    } else if (targetModel === 'PDA') {
      setMachineType('PDA');
      window.dispatchEvent(
        new CustomEvent('navigate-to-tab', { detail: { categoryId: 'execution', tabId: 'trace' } })
      );
    } else if (targetModel === 'TM') {
      setMachineType('TM');
      window.dispatchEvent(
        new CustomEvent('navigate-to-tab', { detail: { categoryId: 'execution', tabId: 'trace' } })
      );
    } else if (targetModel === 'CFG') {
      window.dispatchEvent(
        new CustomEvent('navigate-to-tab', { detail: { categoryId: 'cfg', tabId: 'grammar' } })
      );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs font-sans select-none space-y-3 bg-bg-surface1 text-txt-primary">
      {/* Top Banner & Syllabus Pathway */}
      <div className="p-3 bg-slate-950/90 border border-border-subtle rounded-lg space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-txt-primary font-bold">
            <Wrench size={16} className="text-amber-400" />
            <span className="text-sm">Module 5 — Topic 8: Tools (JFLAP, REGEX, LEX, YACC)</span>
          </div>
          <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
            FINAL TOPIC OF MODULE 5 &bull; COMPUTATIONAL TOOLS &amp; COMPILER GENERATORS
          </span>
        </div>

        {/* Conceptual Tools Pipeline */}
        <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded flex items-center justify-between flex-wrap gap-2 text-3xs">
          <div className="flex items-center space-x-1.5 font-mono text-slate-300">
            <span className="text-slate-400 font-bold">Pipeline:</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">Source (Chars)</span>
            <ArrowRight size={10} className="text-slate-500" />
            <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">REGEX / LEX</span>
            <ArrowRight size={10} className="text-slate-500" />
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">Token Stream</span>
            <ArrowRight size={10} className="text-slate-500" />
            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">CFG / YACC</span>
            <ArrowRight size={10} className="text-slate-500" />
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">Parse Tree / AST</span>
          </div>
          <span className="text-[10px] text-slate-400 italic">
            Parallel Workspace: JFLAP &bull; Interactive Experimentation with FA, PDA, TM &amp; CFG
          </span>
        </div>

        {/* Syllabus Bridge Pathway */}
        <div className="flex items-center space-x-1 text-3xs text-txt-muted overflow-x-auto pt-0.5">
          <span className="font-semibold text-txt-secondary">Syllabus Bridge:</span>
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.1: TM</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.2: UTM</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.3: Church–Turing</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.4: Recursive/RE</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.5: Reducibility</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.6: Halting</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-bg-surface2 border border-border-subtle">M5.7: PCP</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
            M5.8: Tools (JFLAP, REGEX, LEX, YACC)
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 border-b border-border-subtle pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('overview')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'overview'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Layers size={12} />
          <span>Tool Ecosystem &amp; Comparison</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('jflap')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'jflap'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Cpu size={12} />
          <span>JFLAP-Style Workspace Navigator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('regex')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'regex'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Code2 size={12} />
          <span>Formal REGEX Playground</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('lex')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'lex'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <Terminal size={12} />
          <span>LEX Lexer Generator Playground</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('yacc')}
          className={`px-3 py-1 rounded text-2xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'yacc'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
          }`}
        >
          <FileCode size={12} />
          <span>YACC / SLR Parser Generator</span>
        </button>
      </div>

      {/* SECTION 1: OVERVIEW & COMPARISON MATRIX */}
      {activeSection === 'overview' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
              <BookOpen size={14} className="text-amber-400" />
              Theoretical Comparison Matrix: Computational Tools
            </span>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-border-subtle rounded-lg">
              <table className="w-full text-left text-3xs border-collapse">
                <thead className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-2 border-b border-border-subtle">Tool</th>
                    <th className="p-2 border-b border-border-subtle">Input Model</th>
                    <th className="p-2 border-b border-border-subtle">Underlying Engine</th>
                    <th className="p-2 border-b border-border-subtle">Generated Artifact</th>
                    <th className="p-2 border-b border-border-subtle">Theoretical Language Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-bg-surface1/60">
                  {TOOL_COMPARISON_MATRIX.map((row) => (
                    <tr key={row.toolName} className="hover:bg-bg-surface2/50 transition-colors">
                      <td className="p-2 font-bold text-amber-300 font-mono">{row.toolName}</td>
                      <td className="p-2 text-txt-primary">{row.inputModel}</td>
                      <td className="p-2 text-txt-secondary">{row.internalEngine}</td>
                      <td className="p-2 text-emerald-400 font-mono">{row.outputArtifact}</td>
                      <td className="p-2 text-purple-300 font-mono">{row.theoreticalClass}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tool Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1">
              {TOOL_DEFINITIONS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setSelectedToolId(tool.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    selectedToolId === tool.id
                      ? 'bg-slate-900 border-amber-500 shadow-xs'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-2xs text-slate-200 block">{tool.name}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-2">{tool.primaryFunction}</span>
                  </div>
                  <span className="text-[9px] text-amber-400 font-semibold uppercase tracking-wider pt-2 block">
                    {tool.category}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Tool Deep Dive & Academic Limitations */}
            {(() => {
              const tool = TOOL_DEFINITIONS.find((t) => t.id === selectedToolId) || TOOL_DEFINITIONS[0];
              return (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-3xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-2xs flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-400" />
                      {tool.name} &bull; Specifications &amp; Project Zero Integration
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                      {tool.formalConcept}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-3xs">
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
                      <strong className="text-cyan-300 block font-semibold">Project Zero Educational Analogue:</strong>
                      <p className="text-slate-300 leading-relaxed font-sans">{tool.projectZeroAnalogue}</p>
                    </div>

                    <div className="p-2 bg-rose-950/30 rounded border border-rose-900/40 space-y-1">
                      <strong className="text-rose-300 block font-semibold flex items-center gap-1">
                        <XCircle size={11} /> Explicit Non-Goals &amp; Limitations:
                      </strong>
                      <p className="text-slate-300 leading-relaxed font-sans">{tool.academicLimitations}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Pedagogical Guardrails */}
            <div className="space-y-2 pt-1">
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400" />
                Key Concept Distinctions &amp; Student Misconceptions
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {TOOLS_DISTINCTION_ITEMS.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1 text-3xs">
                    <span className="font-bold text-amber-300 block">{item.topic}</span>
                    <p className="text-slate-300 leading-relaxed font-sans">{item.correctConcept}</p>
                    <div className="text-[10px] text-amber-200/90 pt-0.5">
                      <strong>Guardrail: </strong>{item.safetyWarning}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: JFLAP WORKSPACE NAVIGATOR */}
      {activeSection === 'jflap' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div>
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <Cpu size={14} className="text-amber-400" />
                JFLAP-Style Interactive Model Navigator
              </span>
              <p className="text-3xs text-txt-muted mt-0.5">
                Project Zero provides an integrated browser-native educational analogue to JFLAP across all 4 machine tiers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {JFLAP_WORKFLOW_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-2xs text-slate-200">{preset.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        {preset.targetModel}
                      </span>
                    </div>
                    <p className="text-3xs text-slate-400">{preset.description}</p>
                    <div className="p-2 bg-slate-900 rounded text-[11px] text-slate-300">
                      <strong className="text-emerald-400">Objective: </strong>
                      {preset.learningObjective}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunchJFLAPModel(preset.targetModel)}
                    className="w-full mt-2 px-3 py-1 rounded text-2xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Play size={12} /> Open in Project Zero {preset.targetModel} Workspace
                  </button>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-black/50 border border-slate-900 rounded text-3xs text-slate-400 italic">
              <strong>Non-Negotiable Disclaimer:</strong> Project Zero does NOT claim desktop JFLAP interoperability or support for legacy .jff XML files. All models are executed using Project Zero&apos;s verified web-first engine.
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: FORMAL REGEX PLAYGROUND */}
      {activeSection === 'regex' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div>
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <Code2 size={14} className="text-amber-400" />
                Formal REGEX Playground &bull; Thompson &epsilon;-NFA Synthesis
              </span>
              <p className="text-3xs text-txt-muted mt-0.5">
                Evaluates pure theoretical regular expressions over alphabet &Sigma; (concatenation, |, *, +).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Inputs */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                    Formal Regular Expression:
                  </label>
                  <input
                    type="text"
                    value={regexInput}
                    onChange={(e) => setRegexInput(e.target.value)}
                    placeholder="(a|b)*abb"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 font-mono text-xs text-amber-300 border border-slate-800 focus:border-amber-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                    Test Strings (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={regexTestWords}
                    onChange={(e) => setRegexTestWords(e.target.value)}
                    placeholder="abb, aabb, aba"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 focus:border-amber-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Real-time Status Card */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-2xs text-slate-200">Formal Parser &amp; Synthesizer</span>
                    <span
                      className={`px-2 py-0.5 rounded text-3xs font-bold ${
                        regexEvaluation.isValid
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {regexEvaluation.isValid ? 'SYNTAX VALID' : 'SYNTAX ERROR'}
                    </span>
                  </div>

                  {regexEvaluation.isValid ? (
                    <div className="mt-2 space-y-1 text-3xs text-slate-300">
                      <div><strong>AST Summary:</strong> <span className="font-mono text-cyan-300">{regexEvaluation.astSummary}</span></div>
                      <div><strong>Synthesized Thompson NFA:</strong> <span className="font-mono text-emerald-400">{regexEvaluation.nfaStateCount} States</span></div>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 bg-rose-950/40 rounded border border-rose-900 text-3xs text-rose-300">
                      {regexEvaluation.error}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400">
                  Theoretical regex engines guarantee $O(n)$ time membership without backtracking vulnerabilities.
                </div>
              </div>
            </div>

            {/* Word Verification Results */}
            {regexEvaluation.isValid && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                  Candidate Words Acceptance Verification:
                </span>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {regexEvaluation.testResults.map((test, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border flex flex-col items-center justify-center text-center ${
                        test.isAccepted
                          ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold break-all">&quot;{test.input}&quot;</span>
                      <span className="text-[9px] font-semibold mt-0.5">
                        {test.isAccepted ? 'ACCEPT' : 'REJECT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: LEX LEXER GENERATOR PLAYGROUND */}
      {activeSection === 'lex' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div>
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <Terminal size={14} className="text-amber-400" />
                LEX Lexical Analyzer Generator &bull; Maximal Munch &amp; Rule Priority
              </span>
              <p className="text-3xs text-txt-muted mt-0.5">
                Scans input character-by-character choosing the longest accepted prefix; ties are resolved by rule priority.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Rules List */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                  Active Lexical Specification Rules:
                </span>
                <div className="space-y-1.5 overflow-y-auto max-h-48 pr-1">
                  {lexRules.map((rule) => (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => {
                        setLexRules((prev) =>
                          prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
                        );
                      }}
                      className={`w-full p-1.5 rounded border flex items-center justify-between text-3xs font-mono transition-colors text-left ${
                        rule.enabled
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-slate-950/40 border-slate-900 opacity-40'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[9px]">
                          P{rule.priority}
                        </span>
                        <span className="text-cyan-300 font-bold">{rule.tokenType}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="text-slate-200">{rule.regex}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          rule.action === 'EMIT'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {rule.enabled ? rule.action : 'DISABLED'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Code Input */}
              <div className="space-y-2">
                <label className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                  Input Source Code:
                </label>
                <textarea
                  rows={4}
                  value={lexSource}
                  onChange={(e) => setLexSource(e.target.value)}
                  placeholder="if count + 42"
                  className="w-full p-2 rounded bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 focus:border-amber-500 outline-hidden resize-none"
                />
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setLexSource('ifelse')}
                    className="px-2 py-0.5 rounded text-3xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Test Maximal Munch (&quot;ifelse&quot;)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLexSource('if')}
                    className="px-2 py-0.5 rounded text-3xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Test Priority (&quot;if&quot;)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLexSource('count @ 42')}
                    className="px-2 py-0.5 rounded text-3xs bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors"
                  >
                    Test Lexical Error
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Tokens Output */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">
                  Generated Token Stream ({lexResult.tokens.length} Tokens &bull; {lexResult.skippedCount} Skipped):
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-3xs font-bold ${
                    lexResult.success
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {lexResult.success ? 'TOKENIZATION SUCCESS' : 'LEXICAL ERROR'}
                </span>
              </div>

              {lexResult.success ? (
                <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                  {lexResult.tokens.map((token, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 bg-slate-900 rounded border border-cyan-900/60 font-mono text-3xs flex items-center space-x-1.5 shadow-xs"
                    >
                      <span className="text-cyan-300 font-bold">{token.tokenType}</span>
                      <span className="text-slate-400">(&quot;{token.lexeme}&quot;)</span>
                      <span className="text-[9px] text-slate-500">[{token.line}:{token.column}]</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2 bg-rose-950/40 rounded border border-rose-900 text-3xs text-rose-300">
                  {lexResult.errors.map((err, idx) => (
                    <div key={idx}>
                      Unexpected character &apos;{err.unexpectedChar}&apos; at line {err.line}, col {err.column}: {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: YACC PARSER GENERATOR WORKFLOW */}
      {activeSection === 'yacc' && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-3">
            <div>
              <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                <FileCode size={14} className="text-amber-400" />
                YACC-Style Parser Generator &bull; LR(0) States &amp; SLR(1) Action/Goto
              </span>
              <p className="text-3xs text-txt-muted mt-0.5">
                Analyzes grammar productions, generates LR(0) collection, checks for shift-reduce conflicts, and steps through SLR parsing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Grammar Productions Editor */}
              <div className="space-y-2">
                <label className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                  Grammar Productions:
                </label>
                <textarea
                  rows={4}
                  value={grammarInput}
                  onChange={(e) => setGrammarInput(e.target.value)}
                  placeholder="E -> E + T&#10;E -> T&#10;T -> a"
                  className="w-full p-2 rounded bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 focus:border-amber-500 outline-hidden resize-none"
                />
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setGrammarInput('E -> E + T\nE -> T\nT -> a');
                      setYaccTestWord('a+a');
                    }}
                    className="px-2 py-0.5 rounded text-3xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Load SLR(1) Unambiguous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGrammarInput('E -> E + E\nE -> a');
                      setYaccTestWord('a+a');
                    }}
                    className="px-2 py-0.5 rounded text-3xs bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-colors"
                  >
                    Load Ambiguous (Shift/Reduce Conflict)
                  </button>
                </div>
              </div>

              {/* Analysis & Conflicts Output */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-2xs text-slate-200">Grammar Properties</span>
                    <span
                      className={`px-2 py-0.5 rounded text-3xs font-bold ${
                        !yaccEvaluation.isValid
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : yaccEvaluation.hasConflicts
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {!yaccEvaluation.isValid
                        ? 'INVALID GRAMMAR'
                        : yaccEvaluation.hasConflicts
                        ? 'CONFLICT DETECTED'
                        : 'SLR(1) DETERMINISTIC'}
                    </span>
                  </div>

                  {yaccEvaluation.isValid ? (
                    <div className="mt-2 space-y-1 text-3xs text-slate-300">
                      <div><strong>Generated LR(0) States:</strong> <span className="font-mono text-cyan-300">{yaccEvaluation.stateCount} states</span></div>
                      <div><strong>Shift/Reduce &amp; Reduce/Reduce Conflicts:</strong> <span className="font-mono text-amber-400">{yaccEvaluation.conflictCount} conflict(s)</span></div>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 bg-rose-950/40 rounded border border-rose-900 text-3xs text-rose-300">
                      {yaccEvaluation.error}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400">
                  SLR(1) uses FOLLOW sets of the LHS variable to resolve reduction actions deterministically.
                </div>
              </div>
            </div>

            {/* Sample Input Parsing Verification */}
            {yaccEvaluation.isValid && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">
                    Test String Parsing:
                  </span>
                  <input
                    type="text"
                    value={yaccTestWord}
                    onChange={(e) => setYaccTestWord(e.target.value)}
                    placeholder="a+a"
                    className="px-2 py-0.5 rounded bg-slate-900 font-mono text-xs text-slate-200 border border-slate-800 focus:border-amber-500 outline-hidden"
                  />
                </div>

                {yaccEvaluation.sampleParse && (
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between text-3xs font-mono">
                    <div>
                      Input: <span className="text-amber-300 font-bold">&quot;{yaccEvaluation.sampleParse.input}&quot;</span> &bull; Steps: <span className="text-cyan-300">{yaccEvaluation.sampleParse.stepsExecuted}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        yaccEvaluation.sampleParse.success
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {yaccEvaluation.sampleParse.success ? 'PARSE SUCCESS (SHIFT-REDUCE COMPLETE)' : 'SYNTAX ERROR / REJECT'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
