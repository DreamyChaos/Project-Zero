import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import {
  analyzeRegularLanguage,
  testLanguageMembership,
  applyRegularLanguageOperation,
  RegularLanguageClosureOp,
  convertRegexToNFA,
} from '@project-zero/core-solver';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Code2,
  Cpu,
  Layers,
  Infinity as InfinityIcon,
  Hash,
  Play,
} from 'lucide-react';

const OPERAND_PRESETS = [
  { label: 'Language {b}', regex: 'b' },
  { label: 'Language a*', regex: 'a*' },
  { label: 'Language (a|b)*abb', regex: '(a|b)*abb' },
  { label: 'Language (0|1)*00', regex: '(0|1)*00' },
  { label: 'Language {ab}', regex: 'ab' },
];

export const RegularLanguagesTab: React.FC = () => {
  const { nodes, edges, machineType, replaceMachine, setLastRegexResult } = useGraph();

  // Test string input for membership
  const [testString, setTestString] = useState<string>('');

  // Selected closure operation
  const [selectedOp, setSelectedOp] = useState<RegularLanguageClosureOp>('UNION');

  // Operand B candidate regex for binary closure operations
  const [operandBRegex, setOperandBRegex] = useState<string>('b');

  // Live Analysis of Active Language L(Canvas)
  const languageAnalysis = useMemo(() => {
    if (nodes.length === 0) return null;
    return analyzeRegularLanguage({ nodes, edges }, machineType);
  }, [nodes, edges, machineType]);

  // Live Membership Test on L(Canvas)
  const membershipResult = useMemo(() => {
    if (nodes.length === 0) return null;
    return testLanguageMembership({ nodes, edges }, machineType, testString);
  }, [nodes, edges, machineType, testString]);

  // Operand B graph synthesized from regex
  const operandBGraph = useMemo(() => {
    if (!operandBRegex.trim()) return null;
    const nfaRes = convertRegexToNFA(operandBRegex.trim());
    if (!nfaRes.success) return null;
    return { graph: { nodes: [...nfaRes.nodes], edges: [...nfaRes.edges] }, type: 'NFA' as const };
  }, [operandBRegex]);

  // Live Closure Operation Result
  const closureResult = useMemo(() => {
    if (nodes.length === 0) return null;
    const isBinary = ['UNION', 'INTERSECTION', 'DIFFERENCE', 'CONCATENATION'].includes(selectedOp);
    if (isBinary && !operandBGraph) return null;

    return applyRegularLanguageOperation(
      selectedOp,
      { graph: { nodes, edges }, type: machineType },
      isBinary && operandBGraph ? operandBGraph : undefined
    );
  }, [nodes, edges, machineType, selectedOp, operandBGraph]);

  // Handler to load closure operation result to Canvas
  const handleLoadResultToCanvas = () => {
    if (!closureResult || !closureResult.success || closureResult.nodes.length === 0) return;
    replaceMachine([...closureResult.nodes], [...closureResult.edges], closureResult.machineType);
    setLastRegexResult(null);
  };

  const isBinaryOp = ['UNION', 'INTERSECTION', 'DIFFERENCE', 'CONCATENATION'].includes(selectedOp);

  return (
    <div className="flex flex-col h-full bg-bg-surface1 text-txt-primary overflow-y-auto p-4 space-y-4 font-sans text-xs select-text">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle pb-3 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            <h3 className="font-semibold text-sm text-txt-primary">
              Regular Languages Explorer &amp; Closure Properties
            </h3>
          </div>
          <p className="text-txt-muted text-[11px] mt-0.5">
            Theory of regular languages (L ↔ FA ↔ RegEx), finite vs. infinite language classification, verified example generation, and interactive closure operations.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {languageAnalysis && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center space-x-1 ${
                languageAnalysis.finiteness.isFinite
                  ? 'bg-accent-cyan/10 border-accent-cyan/20 text-accent-cyan'
                  : 'bg-accent-primary/10 border-accent-primary/20 text-accent-primary'
              }`}
            >
              {languageAnalysis.finiteness.isFinite ? (
                <>
                  <Hash className="w-3 h-3" />
                  <span>FINITE LANGUAGE (|L| &lt; ∞)</span>
                </>
              ) : (
                <>
                  <InfinityIcon className="w-3 h-3" />
                  <span>INFINITE LANGUAGE (|L| = ∞)</span>
                </>
              )}
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-txt-secondary text-[10px] font-mono">
            Topic 5: Regular Languages
          </span>
        </div>
      </div>

      {/* Main Grid: Language Properties & Membership */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Active Language Definition & Finiteness (6 Cols) */}
        <div className="lg:col-span-6 p-3.5 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-accent-secondary" />
              <h4 className="font-semibold text-xs text-txt-primary">Language Definition &amp; Properties</h4>
            </div>
            <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-accent-cyan font-mono text-[10px]">
              Σ = {'{'}{languageAnalysis?.alphabet.join(', ') || '∅'}{'}'}
            </span>
          </div>

          {/* Synthesized RegEx */}
          <div className="p-2.5 rounded bg-bg-surface1 border border-border-subtle space-y-1">
            <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider">
              Regular Expression Representation R(L):
            </span>
            <div className="bg-bg-surface2 px-2.5 py-1.5 rounded font-mono text-xs font-bold text-accent-primary border border-border-subtle break-all">
              {languageAnalysis ? languageAnalysis.synthesizedRegex : 'Canvas Empty'}
            </div>
          </div>

          {/* Finiteness Diagnostic Breakdown */}
          {languageAnalysis && (
            <div className="p-2.5 rounded bg-bg-surface1 border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider">
                  Finiteness Classification:
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    languageAnalysis.finiteness.isFinite ? 'text-accent-cyan' : 'text-accent-primary'
                  }`}
                >
                  {languageAnalysis.finiteness.isFinite ? 'Finite Regular Language' : 'Infinite Regular Language'}
                </span>
              </div>
              <p className="text-[11px] text-txt-muted leading-relaxed">
                {languageAnalysis.finiteness.explanation}
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono pt-1 border-t border-border-subtle">
                <div className="p-1 rounded bg-bg-surface2">
                  <span className="text-txt-muted block">REACHABLE</span>
                  <span className="font-bold text-txt-primary">
                    {languageAnalysis.finiteness.reachableStates.length} States
                  </span>
                </div>
                <div className="p-1 rounded bg-bg-surface2">
                  <span className="text-txt-muted block">CO-ACCESSIBLE</span>
                  <span className="font-bold text-txt-primary">
                    {languageAnalysis.finiteness.coAccessibleStates.length} States
                  </span>
                </div>
                <div className="p-1 rounded bg-bg-surface2">
                  <span className="text-txt-muted block">USEFUL (R ∩ C)</span>
                  <span className="font-bold text-semantic-accept">
                    {languageAnalysis.finiteness.usefulStates.length} States
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Membership Tester & Verified Examples (6 Cols) */}
        <div className="lg:col-span-6 p-3.5 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Code2 className="w-4 h-4 text-accent-primary" />
                <h4 className="font-semibold text-xs text-txt-primary">Language Membership Tester (w ∈ L)</h4>
              </div>
              {membershipResult && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    membershipResult.isMember
                      ? 'bg-semantic-accept/15 border-semantic-accept/30 text-semantic-accept'
                      : 'bg-semantic-error/15 border-semantic-error/30 text-semantic-error'
                  }`}
                >
                  {membershipResult.isMember ? 'ACCEPTED (w ∈ L)' : 'REJECTED (w ∉ L)'}
                </span>
              )}
            </div>

            {/* Input Tester */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                placeholder="Enter string w to test (leave blank for ε)"
                className="flex-1 bg-bg-surface1 border border-border-subtle focus:border-accent-primary rounded px-3 py-1.5 text-xs font-mono font-bold text-txt-primary focus:outline-none"
              />
              <button
                onClick={() => setTestString('')}
                className="px-2 py-1.5 rounded bg-bg-surface1 hover:bg-bg-surface3 border border-border-subtle text-txt-secondary hover:text-txt-primary text-[10px] font-mono cursor-pointer"
                title="Test empty string ε"
              >
                ε (Empty)
              </button>
            </div>

            {/* Verified Examples Breakdown */}
            {languageAnalysis && (
              <div className="space-y-2 pt-1">
                {/* Accepted Examples */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-semantic-accept uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Accepted Examples (w ∈ L):</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {languageAnalysis.acceptedExamples.length > 0 ? (
                      languageAnalysis.acceptedExamples.map((ex) => (
                        <button
                          key={ex}
                          onClick={() => setTestString(ex)}
                          className="px-2 py-0.5 rounded bg-semantic-accept/10 hover:bg-semantic-accept/20 border border-semantic-accept/30 text-semantic-accept font-mono text-[10px] cursor-pointer"
                        >
                          "{ex || 'ε'}"
                        </button>
                      ))
                    ) : (
                      <span className="text-[10px] text-txt-muted italic">∅ (No accepted strings)</span>
                    )}
                  </div>
                </div>

                {/* Rejected Examples */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-semantic-error uppercase tracking-wider flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Verified Rejected Examples (w ∉ L):</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {languageAnalysis.rejectedExamples.length > 0 ? (
                      languageAnalysis.rejectedExamples.map((ex) => (
                        <button
                          key={ex}
                          onClick={() => setTestString(ex)}
                          className="px-2 py-0.5 rounded bg-semantic-error/10 hover:bg-semantic-error/20 border border-semantic-error/30 text-semantic-error font-mono text-[10px] cursor-pointer"
                        >
                          "{ex || 'ε'}"
                        </button>
                      ))
                    ) : (
                      <span className="text-[10px] text-txt-muted italic">None (Universal language)</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {membershipResult?.executionTrace && membershipResult.executionTrace.length > 0 && (
            <div className="pt-2 border-t border-border-subtle">
              <span className="text-[10px] text-txt-muted">
                Execution: {membershipResult.executionTrace.slice(-1)[0]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Closure Operations Studio */}
      <div className="p-3.5 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3">
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-accent-primary" />
            <h4 className="font-semibold text-xs text-txt-primary">
              Regular Languages Closure Operations Studio
            </h4>
          </div>
          <span className="text-[10px] text-txt-muted">
            Regular languages are closed under union, intersection, complement, difference, concatenation, and Kleene star.
          </span>
        </div>

        {/* Operation Picker Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'UNION', label: 'Union (L₁ ∪ L₂)' },
              { id: 'INTERSECTION', label: 'Intersection (L₁ ∩ L₂)' },
              { id: 'COMPLEMENT', label: 'Complement (Σ* \\ L)' },
              { id: 'DIFFERENCE', label: 'Difference (L₁ \\ L₂)' },
              { id: 'CONCATENATION', label: 'Concatenation (L₁ · L₂)' },
              { id: 'KLEENE_STAR', label: 'Kleene Star (L*)' },
            ] as const
          ).map((op) => (
            <button
              key={op.id}
              onClick={() => setSelectedOp(op.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                selectedOp === op.id
                  ? 'bg-accent-primary text-white border-accent-primary shadow-sm'
                  : 'bg-bg-surface1 text-txt-secondary hover:bg-bg-surface3 border-border-subtle'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {/* Binary Operation: Second Language Operand (L2) Input */}
        {isBinaryOp && (
          <div className="p-2.5 bg-bg-surface1 rounded border border-border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider">
                Second Language Operand (L₂):
              </span>
              <span className="text-[10px] text-txt-muted font-mono">
                {operandBGraph ? 'Valid Operand' : 'Invalid Regex'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={operandBRegex}
                onChange={(e) => setOperandBRegex(e.target.value)}
                placeholder="Enter regex for L2 (e.g. b, a*, (0|1)*00)"
                className="flex-1 bg-bg-surface2 border border-border-subtle focus:border-accent-primary rounded px-3 py-1.5 text-xs font-mono font-bold text-txt-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1 overflow-x-auto pb-0.5">
              <span className="text-[10px] text-txt-muted mr-1">Presets:</span>
              {OPERAND_PRESETS.map((p) => (
                <button
                  key={p.regex}
                  onClick={() => setOperandBRegex(p.regex)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer shrink-0 ${
                    operandBRegex === p.regex
                      ? 'bg-accent-primary text-white border-accent-primary'
                      : 'bg-bg-surface2 text-txt-secondary hover:bg-bg-surface3 border-border-subtle'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Operation Execution & Result Preview */}
        {closureResult && closureResult.success && (
          <div className="p-3 bg-bg-surface1 rounded border border-accent-primary/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-accent-primary" />
                <span className="font-bold text-xs text-txt-primary">
                  Resulting Closed Machine ({closureResult.operation}):
                </span>
                <span className="px-2 py-0.5 rounded bg-bg-surface2 border border-border-subtle text-accent-cyan font-mono text-[10px]">
                  {closureResult.machineType} ({closureResult.nodes.length} States, {closureResult.edges.length} Transitions)
                </span>
              </div>
              <button
                onClick={handleLoadResultToCanvas}
                className="flex items-center space-x-1 px-3 py-1 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-medium text-[11px] transition-colors cursor-pointer"
                title="Load resulting machine into main interactive Canvas"
              >
                <Play className="w-3 h-3" />
                <span>Load Machine to Canvas</span>
              </button>
            </div>

            {/* Resulting RegEx & Examples */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
              <div className="p-2 rounded bg-bg-surface2 border border-border-subtle space-y-1">
                <span className="text-[10px] text-txt-muted font-mono uppercase block">
                  Synthesized RegEx of Result:
                </span>
                <span className="font-mono font-bold text-accent-primary break-all">
                  {closureResult.resultRegex}
                </span>
              </div>
              <div className="p-2 rounded bg-bg-surface2 border border-border-subtle space-y-1">
                <span className="text-[10px] text-txt-muted font-mono uppercase block">
                  Sample Accepted Strings:
                </span>
                <div className="flex flex-wrap gap-1">
                  {closureResult.acceptedExamples.length > 0 ? (
                    closureResult.acceptedExamples.slice(0, 6).map((ex) => (
                      <span
                        key={ex}
                        className="px-1.5 py-0.5 rounded bg-semantic-accept/15 text-semantic-accept font-mono text-[10px]"
                      >
                        "{ex || 'ε'}"
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-txt-muted italic">∅ (Empty language)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Educational Foundations Accordion */}
      <div className="p-3 bg-bg-surface2/60 rounded-lg border border-border-subtle space-y-2 text-[11px] text-txt-secondary">
        <div className="font-bold text-txt-primary flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-accent-primary" />
          <span>Properties and Closure of Regular Languages</span>
        </div>
        <p className="leading-relaxed text-txt-muted">
          A language <i>L</i> is <strong>Regular</strong> if and only if it can be accepted by a finite automaton (DFA / NFA) or generated by a regular expression.
          Regular languages are closed under boolean operations (Union, Intersection, Complement, Difference) and algebraic operations (Concatenation, Kleene Star).
          A regular language is <strong>Finite</strong> if its useful state subgraph (reachable from <i>q₀</i> and co-accessible to <i>F</i>) is acyclic; otherwise, any useful cycle enables generating infinitely many distinct strings.
        </p>
      </div>
    </div>
  );
};
