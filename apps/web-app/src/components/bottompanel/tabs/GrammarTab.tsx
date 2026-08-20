import React, { useState, useMemo } from 'react';
import {
  ContextFreeGrammar,
  validateCFG,
  analyzeCFG,
  generateDerivation,
  evaluateCFGMembership,
  buildParseTreeFromDerivation,
  toChomskyNormalForm,
  validateCNF,
  cykParse,
  analyzeLL1,
  parseLL1,
  CFGParseTreeNode,
  transformToPredictiveGrammar,
  convertCFGToPDA,
} from '@project-zero/core-solver';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Layers,
  FileCode,
  Search,
  AlertTriangle,
} from 'lucide-react';

const PRESET_GRAMMARS: Array<{ name: string; description: string; grammar: ContextFreeGrammar }> = [
  {
    name: 'L = { aⁿ bⁿ | n ≥ 0 }',
    description: 'Classic context-free language generating balanced "a"s and "b"s.',
    grammar: {
      variables: ['S'],
      terminals: ['a', 'b'],
      startVariable: 'S',
      productions: [
        {
          id: 'p1',
          lhs: 'S',
          rhs: [
            { type: 'TERMINAL', value: 'a' },
            { type: 'NON_TERMINAL', value: 'S' },
            { type: 'TERMINAL', value: 'b' },
          ],
        },
        { id: 'p2', lhs: 'S', rhs: [{ type: 'EPSILON', value: 'ε' }] },
      ],
    },
  },
  {
    name: 'Even-Length Palindromes w wʳ',
    description: 'Generates all symmetric strings over {a, b} of even length.',
    grammar: {
      variables: ['P'],
      terminals: ['a', 'b'],
      startVariable: 'P',
      productions: [
        {
          id: 'p1',
          lhs: 'P',
          rhs: [
            { type: 'TERMINAL', value: 'a' },
            { type: 'NON_TERMINAL', value: 'P' },
            { type: 'TERMINAL', value: 'a' },
          ],
        },
        {
          id: 'p2',
          lhs: 'P',
          rhs: [
            { type: 'TERMINAL', value: 'b' },
            { type: 'NON_TERMINAL', value: 'P' },
            { type: 'TERMINAL', value: 'b' },
          ],
        },
        { id: 'p3', lhs: 'P', rhs: [{ type: 'EPSILON', value: 'ε' }] },
      ],
    },
  },
  {
    name: 'Simple Arithmetic Expressions',
    description: 'Grammar defining simple addition and multiplication expressions over {a, b}.',
    grammar: {
      variables: ['E', 'T'],
      terminals: ['a', 'b', '+', '*'],
      startVariable: 'E',
      productions: [
        {
          id: 'p1',
          lhs: 'E',
          rhs: [
            { type: 'NON_TERMINAL', value: 'E' },
            { type: 'TERMINAL', value: '+' },
            { type: 'NON_TERMINAL', value: 'T' },
          ],
        },
        { id: 'p2', lhs: 'E', rhs: [{ type: 'NON_TERMINAL', value: 'T' }] },
        { id: 'p3', lhs: 'T', rhs: [{ type: 'TERMINAL', value: 'a' }] },
        { id: 'p4', lhs: 'T', rhs: [{ type: 'TERMINAL', value: 'b' }] },
      ],
    },
  },
];

export const GrammarTab: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [testInput, setTestInput] = useState<string>('aabb');
  const [customGrammar, setCustomGrammar] = useState<ContextFreeGrammar | null>(null);
  const [activeSubView, setActiveSubView] = useState<'VALIDATE' | 'ANALYZE' | 'DERIVATION' | 'MEMBERSHIP' | 'CNF' | 'CYK' | 'FIRST_FOLLOW' | 'LL1_TABLE' | 'PREDICTIVE_PARSER' | 'TRANSFORM' | 'TRANSLATE'>('VALIDATE');
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  const currentPreset = PRESET_GRAMMARS[selectedPresetIdx];
  const grammar = customGrammar || currentPreset.grammar;

  // Pure Solver Computations
  const validationResult = useMemo(() => validateCFG(grammar), [grammar]);
  const analysisResult = useMemo(() => analyzeCFG(grammar), [grammar]);
  const derivationResult = useMemo(() => generateDerivation(grammar, testInput), [grammar, testInput]);
  const membershipResult = useMemo(() => evaluateCFGMembership(grammar, testInput), [grammar, testInput]);
  const parseTree = useMemo(() => buildParseTreeFromDerivation(derivationResult), [derivationResult]);

  // CNF + CYK Computations (transient — no mutations)
  const cnfResult = useMemo(() => toChomskyNormalForm(grammar), [grammar]);
  const cnfValidation = useMemo(() => cnfResult.success ? validateCNF(cnfResult.transformedGrammar) : null, [cnfResult]);
  const cykResult = useMemo(() => {
    if (!cnfResult.success) return null;
    return cykParse(cnfResult.transformedGrammar, testInput);
  }, [cnfResult, testInput]);

  // LL(1) Analysis & Predictive Parser Computations (transient — no mutations)
  const ll1Analysis = useMemo(() => analyzeLL1(grammar), [grammar]);
  const ll1ParseResult = useMemo(() => parseLL1(grammar, testInput), [grammar, testInput]);

  // Transformation Engine Computation (transient preview — no mutations)
  const transformResult = useMemo(() => transformToPredictiveGrammar(grammar), [grammar]);

  return (
    <div className="flex flex-col h-full bg-bg-base text-txt-primary font-mono text-xs overflow-hidden select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-bg-surface1 border-b border-border-subtle shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-accent-primary font-bold text-xs">
            <BookOpen className="w-4 h-4" />
            <span>Context-Free Grammar (CFG) Workbench</span>
          </div>

          <select
            value={selectedPresetIdx}
            onChange={(e) => setSelectedPresetIdx(Number(e.target.value))}
            className="bg-bg-surface2 border border-border-strong text-txt-primary font-semibold rounded px-2.5 py-1 text-xs focus:outline-none focus:border-accent-primary"
          >
            {PRESET_GRAMMARS.map((preset, idx) => (
              <option key={idx} value={idx}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subpanel View Switcher */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubView('VALIDATE')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'VALIDATE'
                ? 'bg-accent-primary text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            Validation
          </button>
          <button
            onClick={() => setActiveSubView('ANALYZE')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'ANALYZE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveSubView('DERIVATION')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'DERIVATION'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            Derivation
          </button>
          <button
            onClick={() => setActiveSubView('MEMBERSHIP')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'MEMBERSHIP'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            Membership
          </button>
          <button
            onClick={() => setActiveSubView('CNF')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'CNF'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            CNF Transform
          </button>
          <button
            onClick={() => setActiveSubView('CYK')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'CYK'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            CYK Parser
          </button>
          <button
            onClick={() => setActiveSubView('FIRST_FOLLOW')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'FIRST_FOLLOW'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            FIRST/FOLLOW
          </button>
          <button
            onClick={() => setActiveSubView('LL1_TABLE')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'LL1_TABLE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            LL(1) Table
          </button>
          <button
            onClick={() => setActiveSubView('PREDICTIVE_PARSER')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'PREDICTIVE_PARSER'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            Predictive Parser
          </button>
          <button
            onClick={() => setActiveSubView('TRANSFORM')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'TRANSFORM'
                ? 'bg-fuchsia-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            LL(1) Transform
          </button>
          <button
            onClick={() => setActiveSubView('TRANSLATE')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeSubView === 'TRANSLATE'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
            }`}
          >
            PDA ↔ CFG
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Left Column: Formal Grammar Specification G = (V, Σ, P, S) */}
        <div className="border-r border-slate-800 p-4 space-y-4 overflow-y-auto bg-slate-950/40">
          <div className="bg-slate-950/90 p-3.5 rounded border border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-teal-400" /> Formal Grammar Specification G
            </h3>
            <p className="text-3xs text-slate-400 font-sans">{currentPreset.description}</p>

            <div className="space-y-1.5 text-2xs pt-1">
              <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                <span className="text-slate-400">Variables V:</span>
                <span className="text-teal-300 font-bold">{`{ ${grammar.variables.join(', ')} }`}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                <span className="text-slate-400">Terminals Σ:</span>
                <span className="text-blue-300 font-bold">{`{ ${grammar.terminals.join(', ')} }`}</span>
              </div>
              <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                <span className="text-slate-400">Start Variable S:</span>
                <span className="text-amber-300 font-bold">{grammar.startVariable}</span>
              </div>
            </div>
          </div>

          {/* Productions List */}
          <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2">
            <span className="font-bold text-xs text-slate-300">Production Rules P ({grammar.productions.length})</span>
            <div className="space-y-1">
              {grammar.productions.map((p) => (
                <div key={p.id} className="bg-slate-900/90 p-2 rounded border border-slate-800 text-2xs font-mono flex items-center justify-between">
                  <span className="text-slate-400">{p.id}:</span>
                  <span className="text-slate-200 font-bold">
                    {p.lhs} → {p.rhs.map((r) => (r.type === 'EPSILON' ? 'ε' : r.value)).join(' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Dynamic Subpanel Views */}
        <div className="col-span-2 p-4 overflow-y-auto space-y-4">
          {activeSubView === 'VALIDATE' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded border flex items-center justify-between gap-4 ${
                  validationResult.isValid
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                    : 'bg-red-950/40 border-red-800/80 text-red-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {validationResult.isValid ? 'VALID CFG: Formal Structure Sound' : 'INVALID CFG: Structural Errors Found'}
                    </h3>
                    <p className="text-2xs text-slate-300 mt-0.5 font-sans">
                      {validationResult.isValid
                        ? 'Grammar G satisfies all formal Context-Free Grammar 4-tuple constraints.'
                        : 'Validation errors must be resolved.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnostics Detail */}
              <div className="bg-slate-950/80 p-4 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-xs text-slate-300">Validation Diagnostics ({validationResult.diagnostics.length})</span>
                {validationResult.diagnostics.length > 0 ? (
                  <div className="space-y-1.5">
                    {validationResult.diagnostics.map((d, idx) => (
                      <div key={idx} className="bg-slate-900 p-2.5 rounded border border-slate-800 text-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300">{d.code}</span>
                          <span className="text-3xs uppercase font-bold text-slate-500">{d.severity}</span>
                        </div>
                        <p className="text-slate-200">{d.message}</p>
                        <p className="text-3xs text-slate-400 font-sans">{d.mathematicalExplanation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-2xs italic">Zero structural errors or warnings detected!</p>
                )}
              </div>
            </div>
          )}

          {activeSubView === 'ANALYZE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-blue-400" /> Variable Properties
                </span>
                <div className="space-y-1.5 text-2xs">
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Nullable (A ⇒* ε):</span>
                    <span className="text-emerald-400 font-semibold">
                      {analysisResult.nullableVariables.length > 0 ? `{ ${analysisResult.nullableVariables.join(', ')} }` : '∅'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Generating (A ⇒* w):</span>
                    <span className="text-blue-400 font-semibold">{`{ ${analysisResult.generatingVariables.join(', ')} }`}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Reachable from S:</span>
                    <span className="text-purple-400 font-semibold">{`{ ${analysisResult.reachableVariables.join(', ')} }`}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Useless Variables:</span>
                    <span className={analysisResult.uselessVariables.length > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                      {analysisResult.uselessVariables.length > 0 ? `{ ${analysisResult.uselessVariables.join(', ')} }` : 'None (0)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-400" /> Language Decidability
                </span>
                <div className="space-y-1.5 text-2xs">
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Language Emptiness L(G):</span>
                    <span className={analysisResult.isLanguageEmpty ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {analysisResult.isLanguageEmpty ? 'EMPTY (L(G) = ∅)' : 'NON-EMPTY (L(G) ≠ ∅)'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Immediate Left Recursion:</span>
                    <span className={analysisResult.hasLeftRecursion ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                      {analysisResult.hasLeftRecursion ? 'Detected' : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeSubView === 'DERIVATION' || activeSubView === 'MEMBERSHIP') && (
            <div className="space-y-4">
              <div className="bg-slate-950/90 p-3 rounded border border-slate-800 flex items-center gap-3">
                <span className="text-slate-400 text-xs font-semibold">Test Input String w:</span>
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="e.g. aabb"
                  className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1 rounded text-xs focus:outline-none focus:border-teal-500 font-mono w-48"
                />
              </div>

              {/* Membership Result Card */}
              <div
                className={`p-4 rounded border flex items-center justify-between gap-4 ${
                  membershipResult.isAccepted
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {membershipResult.isAccepted ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {membershipResult.isAccepted
                        ? `ACCEPT: w = "${testInput}" ∈ L(G)`
                        : `REJECT: w = "${testInput}" ∉ L(G)`}
                    </h3>
                    <p className="text-2xs text-slate-300 mt-0.5 font-sans">{membershipResult.reason}</p>
                  </div>
                </div>
              </div>

              {/* Derivation Steps Table */}
              {derivationResult.success && (
                <div className="bg-slate-950/80 p-4 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300">
                      Leftmost Derivation Sequence ({derivationResult.steps.length - 1} steps)
                    </span>
                    {parseTree && (
                      <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-3xs font-semibold">
                        Parse Tree Generated (Root: {parseTree.symbol.value})
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto border border-slate-800 rounded">
                    <table className="w-full text-left border-collapse text-2xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">Step</th>
                          <th className="p-2">Production Applied</th>
                          <th className="p-2">Mathematical Derivation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {derivationResult.steps.map((st) => (
                          <tr key={st.stepIndex} className="hover:bg-slate-900/50 text-slate-300">
                            <td className="p-2 text-slate-500">{st.stepIndex}</td>
                            <td className="p-2 text-purple-400 font-bold">{st.productionNotation || 'Initial'}</td>
                            <td className="p-2 text-slate-200 font-semibold">{st.mathematicalNotation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CNF Transform View */}
          {activeSubView === 'CNF' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 p-3.5 rounded border border-amber-800/50 space-y-2">
                <h3 className="font-bold text-amber-300 text-xs">Chomsky Normal Form (CNF) Transformation</h3>
                {cnfResult.success ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold">
                        CNF VALID
                      </span>
                      <span className="text-slate-400 text-3xs">
                        {cnfResult.totalProductionsOriginal} → {cnfResult.totalProductionsTransformed} productions
                      </span>
                      {cnfResult.epsilonInOriginalLanguage && (
                        <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-3xs font-semibold">
                          ε ∈ L(G) preserved
                        </span>
                      )}
                    </div>

                    {/* Transformation Stages */}
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-amber-300">Transformation Pipeline</span>
                      {cnfResult.stages.map((stage, idx) => (
                        <div key={idx} className="bg-slate-950/80 p-3 rounded border border-slate-800">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded text-3xs font-bold">
                              Stage {idx + 1}: {stage.stage.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-slate-400 text-3xs">{stage.description}</p>
                          <p className="text-slate-500 text-3xs italic mt-1">{stage.mathematicalExplanation}</p>
                        </div>
                      ))}
                    </div>

                    {/* CNF Productions */}
                    <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                      <span className="font-bold text-xs text-amber-300">Final CNF Productions ({cnfResult.transformedGrammar.productions.length})</span>
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {cnfResult.transformedGrammar.productions.map((p) => (
                          <div key={p.id} className="text-slate-300 text-3xs font-mono">
                            <span className="text-amber-400 font-bold">{p.lhs}</span>
                            <span className="text-slate-500"> → </span>
                            <span className="text-slate-200">
                              {p.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CNF Validation */}
                    {cnfValidation && (
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-amber-300">CNF Validation</span>
                          {cnfValidation.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        {cnfValidation.errors.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {cnfValidation.errors.map((d, i) => (
                              <p key={i} className="text-red-400 text-3xs">{d.message}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-400 text-xs">
                    CNF transformation failed: {cnfResult.errorMessage || 'Unknown error'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CYK Parser View */}
          {activeSubView === 'CYK' && (
            <div className="space-y-4">
              <div className="bg-rose-950/30 p-3.5 rounded border border-rose-800/50 space-y-2">
                <h3 className="font-bold text-rose-300 text-xs">CYK Parser — Input: &quot;{testInput || 'ε'}&quot;</h3>

                {!cnfResult.success ? (
                  <div className="text-red-400 text-xs">CNF transformation failed. CYK requires CNF grammar.</div>
                ) : cykResult ? (
                  <div className="space-y-3">
                    {/* Result Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {cykResult.isAccepted ? (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ACCEPTED
                        </span>
                      ) : (
                        <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> REJECTED
                        </span>
                      )}
                      {cykResult.isEpsilonAcceptance && (
                        <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-3xs font-semibold">
                          ε-acceptance
                        </span>
                      )}
                      {cykResult.boundedByLimit && (
                        <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-3xs font-semibold">
                          Computation bounded by limit
                        </span>
                      )}
                      <span className="text-slate-500 text-3xs">
                        Tokens: [{cykResult.tokens.join(', ')}] | Cells explored: {cykResult.exploredCellCount}
                      </span>
                    </div>

                    {/* Rejection Explanation */}
                    {cykResult.rejectionExplanation && (
                      <div className="bg-red-950/30 p-2 rounded border border-red-900/50 text-red-300 text-3xs">
                        {cykResult.rejectionExplanation}
                      </div>
                    )}

                    {/* CYK Table */}
                    {cykResult.table.tokenCount > 0 && (
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                        <span className="font-bold text-xs text-rose-300">CYK Table ({cykResult.table.tokenCount} tokens)</span>
                        <div className="overflow-x-auto mt-2 border border-slate-800 rounded">
                          <table className="w-full text-left border-collapse text-3xs font-mono">
                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="p-1.5 border-r border-slate-800">i\j</th>
                                {cykResult.table.tokens.map((tok, j) => (
                                  <th key={j} className="p-1.5 text-center border-r border-slate-800">
                                    {j} <span className="text-slate-600">({tok})</span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {cykResult.table.cells.map((row, i) => (
                                <tr key={i}>
                                  <td className="p-1.5 text-slate-500 font-bold border-r border-slate-800">{i}</td>
                                  {row.map((cell, j) => (
                                    <td
                                      key={j}
                                      className={`p-1.5 text-center border-r border-slate-800 ${
                                        j < i ? 'bg-slate-950 text-slate-700' : ''
                                      } ${
                                        cell.variables.length > 0
                                          ? 'text-rose-300 font-semibold'
                                          : 'text-slate-600'
                                      }`}
                                    >
                                      {j >= i
                                        ? cell.variables.length > 0
                                          ? `{${cell.variables.join(',')}}`
                                          : '∅'
                                        : ''}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Parse Tree */}
                    {cykResult.parseTree && (
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                        <span className="font-bold text-xs text-rose-300">Parse Tree</span>
                        <div className="mt-2 text-3xs font-mono text-slate-300 whitespace-pre max-h-40 overflow-y-auto">
                          {renderParseTreeText(cykResult.parseTree, '', true)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs">No CYK result available.</div>
                )}
              </div>
            </div>
          )}

          {/* FIRST/FOLLOW View */}
          {activeSubView === 'FIRST_FOLLOW' && (
            <div className="space-y-4">
              <div className="bg-cyan-950/30 p-3.5 rounded border border-cyan-800/50 space-y-3">
                <h3 className="font-bold text-cyan-300 text-xs">FIRST & FOLLOW Sets</h3>

                {/* FIRST / FOLLOW Table */}
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left border-collapse text-3xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Variable (V)</th>
                        <th className="p-2">FIRST Set</th>
                        <th className="p-2">FOLLOW Set</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {grammar.variables.map((v) => (
                        <tr key={v} className="hover:bg-slate-900/50">
                          <td className="p-2 font-bold text-cyan-400">{v}</td>
                          <td className="p-2 text-slate-200">
                            {'{'}{(ll1Analysis.firstSets[v] || []).join(', ')}{'}'}
                          </td>
                          <td className="p-2 text-slate-200">
                            {'{'}{(ll1Analysis.followSets[v] || []).join(', ')}{'}'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SELECT Sets */}
                <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                  <span className="font-bold text-xs text-cyan-300">Production SELECT (Prediction) Sets</span>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {ll1Analysis.selectSets.map((s) => (
                      <div key={s.productionId} className="text-3xs font-mono flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">{s.lhs}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-200 w-24">{s.rhsNotation}</span>
                        <span className="text-slate-400">SELECT = {'{'}{s.selectSet.join(', ')}{'}'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LL(1) Table & Conflict View */}
          {activeSubView === 'LL1_TABLE' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 p-3.5 rounded border border-emerald-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-300 text-xs">LL(1) Parse Table & Conflict Analysis</h3>
                  {ll1Analysis.isLL1 ? (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> STRICTLY LL(1)
                    </span>
                  ) : (
                    <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> NOT LL(1) ({ll1Analysis.conflicts.length} CONFLICTS)
                    </span>
                  )}
                </div>

                {/* Conflicts Alert */}
                {ll1Analysis.conflicts.length > 0 && (
                  <div className="bg-red-950/40 p-3 rounded border border-red-900/60 space-y-2">
                    <span className="font-bold text-xs text-red-300">Parse Table Conflicts Detected</span>
                    {ll1Analysis.conflicts.map((c, i) => (
                      <div key={i} className="text-3xs text-red-200 space-y-0.5">
                        <p className="font-bold text-red-400">[{c.type}] Variable &apos;{c.variable}&apos;, Terminal &apos;{c.terminal}&apos;</p>
                        <p className="text-slate-400">{c.mathematicalExplanation}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Parse Table Grid */}
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left border-collapse text-3xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-1.5 border-r border-slate-800">V \ Σ</th>
                        {ll1Analysis.parseTable.terminals.map((t) => (
                          <th key={t} className="p-1.5 border-r border-slate-800 font-bold text-center text-emerald-400">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {ll1Analysis.parseTable.variables.map((v) => (
                        <tr key={v}>
                          <td className="p-1.5 font-bold text-slate-300 border-r border-slate-800">{v}</td>
                          {ll1Analysis.parseTable.terminals.map((t) => {
                            const cell = ll1Analysis.parseTable.grid[v]?.[t];
                            const hasConflict = cell?.hasConflict;
                            return (
                              <td
                                key={t}
                                className={`p-1.5 text-center border-r border-slate-800 ${
                                  hasConflict
                                    ? 'bg-red-950/80 text-red-300 font-bold'
                                    : cell && cell.productions.length > 0
                                    ? 'text-emerald-300 font-semibold'
                                    : 'text-slate-700'
                                }`}
                              >
                                {cell && cell.productions.length > 0
                                  ? cell.productions.map((p) => p.id).join(', ')
                                  : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Predictive Parser View */}
          {activeSubView === 'PREDICTIVE_PARSER' && (
            <div className="space-y-4">
              <div className="bg-violet-950/30 p-3.5 rounded border border-violet-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-violet-300 text-xs">LL(1) Predictive Parser — Input: &quot;{testInput}&quot;</h3>
                  {ll1ParseResult.isAccepted ? (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ACCEPTED
                    </span>
                  ) : (
                    <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> REJECTED
                    </span>
                  )}
                </div>

                {/* Rejection Reason */}
                {ll1ParseResult.rejectionReason && (
                  <div className="bg-red-950/30 p-2 rounded border border-red-900/50 text-red-300 text-3xs">
                    {ll1ParseResult.rejectionReason}
                  </div>
                )}

                {/* Parser Trace Table */}
                {ll1ParseResult.steps.length > 0 && (
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                    <span className="font-bold text-xs text-violet-300">Parser Step-by-Step Execution Trace</span>
                    <div className="overflow-x-auto mt-2 border border-slate-800 rounded max-h-64">
                      <table className="w-full text-left border-collapse text-3xs font-mono">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-1.5">Step</th>
                            <th className="p-1.5">Stack</th>
                            <th className="p-1.5">Remaining Input</th>
                            <th className="p-1.5">Lookahead</th>
                            <th className="p-1.5">Action / Applied Production</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {ll1ParseResult.steps.map((st) => (
                            <tr key={st.stepIndex} className="hover:bg-slate-900/50 text-slate-300">
                              <td className="p-1.5 text-slate-500">{st.stepIndex}</td>
                              <td className="p-1.5 text-violet-300 font-bold">[ {st.stack.join(', ')} ]</td>
                              <td className="p-1.5 text-slate-400">[ {st.remainingInput.join(', ')} ]</td>
                              <td className="p-1.5 text-amber-400 font-bold">{st.lookahead}</td>
                              <td className="p-1.5 text-emerald-400 font-semibold">{st.action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Parse Tree */}
                {ll1ParseResult.parseTree && (
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                    <span className="font-bold text-xs text-violet-300">Parse Tree</span>
                    <div className="mt-2 text-3xs font-mono text-slate-300 whitespace-pre max-h-40 overflow-y-auto">
                      {renderParseTreeText(ll1ParseResult.parseTree, '', true)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LL(1) Grammar Transformation View */}
          {activeSubView === 'TRANSFORM' && (
            <div className="space-y-4">
              <div className="bg-fuchsia-950/30 p-3.5 rounded border border-fuchsia-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-fuchsia-300 text-xs">Grammar Transformation Engine</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-3xs font-semibold">
                      Preservation: {transformResult.languagePreservationStatus}
                    </span>
                    {transformResult.afterLL1Analysis.isLL1 ? (
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> TRANSFORMED TO LL(1)
                      </span>
                    ) : (
                      <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {transformResult.afterLL1Analysis.conflicts.length} CONFLICT(S) REMAIN
                      </span>
                    )}
                  </div>
                </div>

                {/* Before vs After Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                    <span className="font-bold text-2xs text-red-400">Original Grammar G</span>
                    <p className="text-3xs text-slate-400">Productions: {transformResult.originalGrammar.productions.length}</p>
                    <p className="text-3xs text-slate-400">LL(1) Status: {transformResult.beforeLL1Analysis.isLL1 ? 'LL(1)' : 'NOT LL(1)'} ({transformResult.beforeLL1Analysis.conflicts.length} conflict(s))</p>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                    <span className="font-bold text-2xs text-emerald-400">Transformed Grammar G&apos;</span>
                    <p className="text-3xs text-slate-400">Productions: {transformResult.transformedGrammar.productions.length} ({transformResult.generatedSymbolNames.length} new variable(s))</p>
                    <p className="text-3xs text-slate-400">LL(1) Status: {transformResult.afterLL1Analysis.isLL1 ? 'LL(1)' : 'NOT LL(1)'} ({transformResult.afterLL1Analysis.conflicts.length} conflict(s))</p>
                  </div>
                </div>

                {/* Commit Action Button */}
                {transformResult.changed && (
                  <div className="flex items-center justify-between bg-fuchsia-950/40 p-2.5 rounded border border-fuchsia-800/60">
                    <span className="text-3xs text-fuchsia-200">
                      Previewing transformed LL(1) grammar. Click to set as active Workbench grammar.
                    </span>
                    <button
                      onClick={() => setCustomGrammar(transformResult.transformedGrammar)}
                      className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors shadow"
                    >
                      Commit Transformed Grammar
                    </button>
                  </div>
                )}

                {/* Interactive Step-by-Step Derivation Inspector */}
                {transformResult.steps.length > 0 && (
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-fuchsia-300">
                        Transformation Step {activeStepIdx + 1} of {transformResult.steps.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveStepIdx((prev) => Math.max(0, prev - 1))}
                          disabled={activeStepIdx === 0}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-2 py-0.5 rounded text-3xs font-semibold"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setActiveStepIdx((prev) => Math.min(transformResult.steps.length - 1, prev + 1))}
                          disabled={activeStepIdx === transformResult.steps.length - 1}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-2 py-0.5 rounded text-3xs font-semibold"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    {/* Step Detail */}
                    {(() => {
                      const st = transformResult.steps[Math.min(activeStepIdx, transformResult.steps.length - 1)];
                      if (!st) return null;
                      return (
                        <div className="bg-slate-900 p-3 rounded border border-slate-800 space-y-2 text-3xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-fuchsia-400 text-2xs">{st.title}</span>
                            <span className="bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800 px-1.5 py-0.5 rounded text-3xs">
                              {st.type}
                            </span>
                          </div>
                          <p className="text-slate-300 font-sans">{st.description}</p>
                          <div className="bg-slate-950 p-2 rounded text-amber-300 font-bold">
                            {st.mathematicalNotation}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SubView 11: TRANSLATE */}
          {activeSubView === 'TRANSLATE' && (
            <div className="space-y-4">
              <div className="bg-slate-900/90 p-4 rounded-lg border border-orange-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-400">PDA ↔ CFG Translation Engine</span>
                    <span className="bg-orange-950 text-orange-300 text-3xs px-2 py-0.5 rounded border border-orange-800 font-semibold">
                      Bidirectional
                    </span>
                  </div>
                  {(() => {
                    const res = convertCFGToPDA(grammar);
                    return (
                      <span
                        className={`text-3xs font-bold px-2 py-0.5 rounded ${
                          res.preservation.status === 'VERIFIED_BOUNDED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {res.preservation.status}
                      </span>
                    );
                  })()}
                </div>

                {(() => {
                  const res = convertCFGToPDA(grammar);
                  return (
                    <div className="space-y-3 text-3xs font-mono">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-2xs text-orange-400">Source CFG G</span>
                          <p className="text-3xs text-slate-400">Variables: {res.sourceCFG.variables.join(', ')}</p>
                          <p className="text-3xs text-slate-400">Productions: {res.sourceCFG.productions.length}</p>
                        </div>
                        <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-2xs text-amber-400">Target Top-Down PDA M</span>
                          <p className="text-3xs text-slate-400">States: {res.targetPDAGraph.nodes.length} (q0, q1, q2)</p>
                          <p className="text-3xs text-slate-400">Transitions: {res.targetPDAGraph.edges.length}</p>
                        </div>
                      </div>

                      {/* Bounded Preservation Result */}
                      <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 space-y-1">
                        <span className="font-bold text-2xs text-slate-300">Bounded Preservation Status</span>
                        <p className="text-slate-400 font-sans">{res.preservation.explanation}</p>
                      </div>

                      {/* Step Timeline */}
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2">
                        <span className="font-bold text-xs text-orange-300">Translation Steps ({res.steps.length})</span>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {res.steps.map((st, idx) => (
                            <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1 text-3xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-orange-400">{st.title}</span>
                                <span className="text-slate-500 font-sans">{st.type}</span>
                              </div>
                              <p className="text-slate-400 font-sans">{st.description}</p>
                              <div className="text-amber-300 font-bold">{st.mathematicalNotation}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Pure helper: render parse tree as text lines
function renderParseTreeText(node: CFGParseTreeNode, prefix = '', isLast = true): string {
  const connector = isLast ? '└── ' : '├── ';
  const label = node.symbol.type === 'EPSILON' ? 'ε' : node.symbol.value;
  let result = prefix + connector + label + '\n';
  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  node.children.forEach((child, i) => {
    result += renderParseTreeText(child, childPrefix, i === node.children.length - 1);
  });
  return result;
}

export default GrammarTab;
