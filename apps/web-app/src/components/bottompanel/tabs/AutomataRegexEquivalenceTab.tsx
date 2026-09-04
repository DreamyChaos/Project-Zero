import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import {
  checkAutomatonRegexEquivalence,
  convertAutomatonToRegex,
  convertRegexToNFA,
  parseRegex,
} from '@project-zero/core-solver';
import {
  Scale,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Cpu,
  HelpCircle,
  ListOrdered,
} from 'lucide-react';

const REGEX_PRESETS = [
  { label: 'a*', regex: 'a*' },
  { label: '(a|b)*', regex: '(a|b)*' },
  { label: 'a*b*', regex: 'a*b*' },
  { label: '(a|b)*abb', regex: '(a|b)*abb' },
  { label: 'a(b|c)*', regex: 'a(b|c)*' },
  { label: '(0|1)*00', regex: '(0|1)*00' },
];

export const AutomataRegexEquivalenceTab: React.FC = () => {
  const { nodes, edges, machineType, replaceMachine, setLastRegexResult } = useGraph();

  // Candidate Regex Input
  const [candidateRegex, setCandidateRegex] = useState<string>('a*');

  // Active Tab View in Drawer
  const [showTrace, setShowTrace] = useState<boolean>(true);

  // Live GNFA State Elimination: FA -> Regex
  const faToRegexResult = useMemo(() => {
    if (nodes.length === 0) return null;
    return convertAutomatonToRegex({ nodes, edges });
  }, [nodes, edges]);

  // Live Semantic Equivalence Evaluation: L(FA) = L(Regex)
  const equivalenceResult = useMemo(() => {
    if (nodes.length === 0) return null;
    return checkAutomatonRegexEquivalence({ nodes, edges }, machineType, candidateRegex);
  }, [nodes, edges, machineType, candidateRegex]);

  // Parse check for input regex
  const regexParseCheck = useMemo(() => {
    return parseRegex(candidateRegex);
  }, [candidateRegex]);

  // Handler to load candidate regex as Thompson NFA to Canvas
  const handleLoadRegexToCanvas = () => {
    const res = convertRegexToNFA(candidateRegex.trim());
    if (res.success && res.nodes.length > 0) {
      replaceMachine([...res.nodes], [...res.edges], 'NFA');
      setLastRegexResult({ inputRegex: candidateRegex.trim(), result: res });
    }
  };

  // Handler to load GNFA-generated regex as Thompson NFA to Canvas
  const handleLoadGeneratedRegexToCanvas = () => {
    if (!faToRegexResult || !faToRegexResult.simplifiedRegex) return;
    const res = convertRegexToNFA(faToRegexResult.simplifiedRegex);
    if (res.success && res.nodes.length > 0) {
      replaceMachine([...res.nodes], [...res.edges], 'NFA');
      setLastRegexResult({ inputRegex: faToRegexResult.simplifiedRegex, result: res });
    }
  };

  const hasInitialState = nodes.some((n) => n.isInitial);
  const acceptingStates = nodes.filter((n) => n.isAccepting);

  return (
    <div className="flex flex-col h-full bg-bg-surface1 text-txt-primary overflow-y-auto p-4 space-y-4 font-sans text-xs select-text">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle pb-3 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-accent-primary" />
            <h3 className="font-semibold text-sm text-txt-primary">
              Finite Automata ↔ Regular Expression Equivalence
            </h3>
          </div>
          <p className="text-txt-muted text-[11px] mt-0.5">
            Test whether an Automaton and a Regular Expression define the same language (L(M) = L(R)), synthesize RegEx via GNFA state elimination, and inspect counterexamples.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-mono">
            Topic 4: FA ↔ RegEx Equivalence
          </span>
        </div>
      </div>

      {/* Main Two-Column Side-by-Side Representation Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Active Finite Automaton (M) (6 Cols) */}
        <div className="lg:col-span-6 p-3 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-accent-secondary" />
                <h4 className="font-semibold text-xs text-txt-primary">Canvas Finite Automaton (M)</h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-accent-cyan font-mono text-[10px]">
                {machineType} ({nodes.length} States)
              </span>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-bg-surface1 border border-border-subtle">
                <span className="text-[10px] text-txt-muted font-mono">INITIAL</span>
                <div className="font-bold text-txt-primary mt-0.5">
                  {nodes.find((n) => n.isInitial)?.label || (hasInitialState ? 'q0' : 'None')}
                </div>
              </div>
              <div className="p-2 rounded bg-bg-surface1 border border-border-subtle">
                <span className="text-[10px] text-txt-muted font-mono">ACCEPTING</span>
                <div className="font-bold text-semantic-accept mt-0.5">
                  {acceptingStates.length > 0 ? `{${acceptingStates.map((n) => n.label).join(', ')}}` : '∅'}
                </div>
              </div>
              <div className="p-2 rounded bg-bg-surface1 border border-border-subtle">
                <span className="text-[10px] text-txt-muted font-mono">TRANSITIONS</span>
                <div className="font-bold text-txt-primary mt-0.5">{edges.length}</div>
              </div>
            </div>

            {/* GNFA Synthesized RegEx from FA */}
            <div className="p-2.5 rounded bg-bg-surface1 border border-border-subtle space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider">
                  Synthesized RegEx via GNFA State Elimination:
                </span>
                {faToRegexResult?.simplifiedRegex && (
                  <span className="text-[10px] text-semantic-accept font-mono">
                    ✓ Preserves L(M)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-bg-surface2 px-2.5 py-1.5 rounded font-mono text-xs font-bold text-accent-primary border border-border-subtle break-all">
                  {faToRegexResult?.simplifiedRegex
                    ? faToRegexResult.simplifiedRegex
                    : nodes.length === 0
                    ? 'Canvas Empty'
                    : '∅ (Empty Language)'}
                </div>
                {faToRegexResult?.simplifiedRegex && (
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => setCandidateRegex(faToRegexResult.simplifiedRegex)}
                      className="px-2 py-1.5 rounded bg-bg-surface3 hover:bg-bg-surface2 border border-border-subtle text-txt-secondary hover:text-txt-primary text-[10px] cursor-pointer"
                      title="Copy synthesized regex to Candidate Regex input"
                    >
                      Use in Test
                    </button>
                    <button
                      onClick={handleLoadGeneratedRegexToCanvas}
                      className="px-2 py-1.5 rounded bg-accent-primary/15 hover:bg-accent-primary/25 border border-accent-primary/30 text-accent-primary text-[10px] font-semibold cursor-pointer"
                      title="Convert synthesized regex back into Thompson NFA and inspect on Canvas"
                    >
                      Inspect NFA
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
            <span className="text-[10px] text-txt-muted">
              {faToRegexResult?.trace.length || 0} State Elimination Steps
            </span>
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="text-[10px] text-accent-primary hover:underline cursor-pointer flex items-center space-x-1"
            >
              <ListOrdered className="w-3 h-3" />
              <span>{showTrace ? 'Hide GNFA Trace' : 'View GNFA Trace'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Candidate Regular Expression (R) (6 Cols) */}
        <div className="lg:col-span-6 p-3 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Code2 className="w-4 h-4 text-accent-primary" />
                <h4 className="font-semibold text-xs text-txt-primary">Candidate Regular Expression (R)</h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  regexParseCheck.success
                    ? 'bg-semantic-accept/10 border-semantic-accept/20 text-semantic-accept'
                    : 'bg-semantic-error/10 border-semantic-error/20 text-semantic-error'
                }`}
              >
                {regexParseCheck.success ? 'Valid Syntax' : 'Syntax Error'}
              </span>
            </div>

            {/* Input Form */}
            <div className="space-y-1.5">
              <input
                type="text"
                value={candidateRegex}
                onChange={(e) => setCandidateRegex(e.target.value)}
                placeholder="Enter candidate regex (e.g. a*, (a|b)*abb, a*b*)"
                className="w-full bg-bg-surface1 border border-border-subtle focus:border-accent-primary rounded px-3 py-1.5 text-xs font-mono font-bold text-txt-primary focus:outline-none"
              />
              {!regexParseCheck.success && (
                <div className="text-[10px] text-semantic-error font-mono">
                  {regexParseCheck.errorMessage}
                </div>
              )}
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1">
              <span className="text-[10px] text-txt-muted shrink-0 mr-1">Presets:</span>
              {REGEX_PRESETS.map((p) => (
                <button
                  key={p.regex}
                  onClick={() => setCandidateRegex(p.regex)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer shrink-0 transition-colors ${
                    candidateRegex === p.regex
                      ? 'bg-accent-primary text-white border-accent-primary'
                      : 'bg-bg-surface1 text-txt-secondary hover:bg-bg-surface3 border-border-subtle'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
            <span className="text-[10px] text-txt-muted">Thompson Construction Ready</span>
            <button
              onClick={handleLoadRegexToCanvas}
              disabled={!regexParseCheck.success}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-40 text-white font-medium text-[11px] transition-colors cursor-pointer"
              title="Convert input regex to Thompson ε-NFA on Canvas"
            >
              <Sparkles className="w-3 h-3" />
              <span>Load NFA to Canvas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Semantic Equivalence Evaluation Result Banner */}
      {equivalenceResult && (
        <div
          className={`p-3.5 rounded-lg border space-y-3 ${
            equivalenceResult.isEquivalent
              ? 'bg-semantic-accept/10 border-semantic-accept/30 text-txt-primary'
              : 'bg-semantic-error/10 border-semantic-error/30 text-txt-primary'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {equivalenceResult.isEquivalent ? (
                <CheckCircle2 className="w-5 h-5 text-semantic-accept shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-semantic-error shrink-0" />
              )}
              <div>
                <h4
                  className={`font-bold text-sm ${
                    equivalenceResult.isEquivalent ? 'text-semantic-accept' : 'text-semantic-error'
                  }`}
                >
                  {equivalenceResult.isEquivalent
                    ? '✓ SEMANTICALLY EQUIVALENT: L(M) = L(R)'
                    : '✕ NOT EQUIVALENT: L(M) ≠ L(R)'}
                </h4>
                <p className="text-[11px] text-txt-muted mt-0.5">
                  {equivalenceResult.isEquivalent
                    ? `Both representations accept the exact same formal language. Explored ${equivalenceResult.productStatesExplored} product-automaton states with 0 distinguishing mismatches.`
                    : `Language mismatch detected via Product-Automaton BFS. Found distinguishing counterexample string.`}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] text-txt-muted">
              Explored {equivalenceResult.productStatesExplored} States
            </div>
          </div>

          {/* Distinguishing Counterexample Breakdown (if not equivalent) */}
          {!equivalenceResult.isEquivalent && equivalenceResult.counterexample !== undefined && (
            <div className="p-3 bg-bg-surface1 rounded-md border border-border-subtle space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-semantic-error">
                  Distinguishing Counterexample: <code className="px-2 py-0.5 rounded bg-bg-surface2 text-txt-primary border border-border-subtle">"{equivalenceResult.counterexample || 'ε'}"</code>
                </span>
                <span className="text-[10px] text-txt-muted">w ∈ L(M) ⊕ L(R)</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center pt-1">
                <div
                  className={`p-2 rounded border ${
                    equivalenceResult.acceptsFA
                      ? 'bg-semantic-accept/15 border-semantic-accept/30 text-semantic-accept font-bold'
                      : 'bg-semantic-error/15 border-semantic-error/30 text-semantic-error font-bold'
                  }`}
                >
                  Canvas Automaton M: {equivalenceResult.acceptsFA ? 'ACCEPTS' : 'REJECTS'}
                </div>
                <div
                  className={`p-2 rounded border ${
                    equivalenceResult.acceptsRegex
                      ? 'bg-semantic-accept/15 border-semantic-accept/30 text-semantic-accept font-bold'
                      : 'bg-semantic-error/15 border-semantic-error/30 text-semantic-error font-bold'
                  }`}
                >
                  Regular Expression R: {equivalenceResult.acceptsRegex ? 'ACCEPTS' : 'REJECTS'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step-by-Step GNFA State Elimination Trace */}
      {showTrace && faToRegexResult && faToRegexResult.trace.length > 0 && (
        <div className="p-3.5 bg-bg-surface2 rounded-lg border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <ListOrdered className="w-4 h-4 text-accent-secondary" />
              <h4 className="font-semibold text-xs text-txt-primary">
                GNFA State Elimination Derivation Steps ({faToRegexResult.trace.length} Steps)
              </h4>
            </div>
            <span className="text-[10px] text-txt-muted font-mono">
              R'(u,v) = R(u,v) | R(u,rip)·R(rip,rip)*·R(rip,v)
            </span>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {faToRegexResult.trace.map((step) => (
              <div
                key={step.stepIndex}
                className="p-2.5 bg-bg-surface1 rounded border border-border-subtle space-y-1.5 text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-accent-primary/10 text-accent-primary font-bold">
                      Step {step.stepIndex}
                    </span>
                    <span className="font-semibold text-txt-primary">
                      Eliminated State: <code className="text-accent-secondary">{step.eliminatedStateLabel}</code>
                    </span>
                  </div>
                  <span className="text-[10px] text-txt-muted font-mono">
                    Remaining: [{step.remainingStateIds.join(', ')}]
                  </span>
                </div>

                {step.updatedTransitions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-mono text-[10px]">
                    {step.updatedTransitions.map((u, idx) => (
                      <div
                        key={idx}
                        className="p-1 rounded bg-bg-surface2 border border-border-subtle flex items-center justify-between"
                      >
                        <span className="text-txt-secondary">
                          {u.fromState} &rarr; {u.toState}:
                        </span>
                        <span className="font-bold text-accent-primary truncate max-w-[180px]">
                          {u.resultRegex}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-txt-muted italic">
                    No intermediate transit paths bypassed through this state.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educational Foundations Accordion */}
      <div className="p-3 bg-bg-surface2/60 rounded-lg border border-border-subtle space-y-2 text-[11px] text-txt-secondary">
        <div className="font-bold text-txt-primary flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-accent-primary" />
          <span>Equivalence of Finite Automata and Regular Expressions (Kleene's Theorem)</span>
        </div>
        <p className="leading-relaxed text-txt-muted">
          <strong>Kleene's Theorem:</strong> A formal language <i>L</i> is regular if and only if it is recognized by a finite automaton and described by a regular expression.
          Syntactic equality (e.g., comparing string literals <code>a|b</code> vs <code>b|a</code>) is insufficient to determine equivalence.
          Project Zero converts both representations into normalized deterministic finite automata and computes the <strong>Product Automaton BFS</strong> to test whether the symmetric difference <i>L(M) ⊕ L(R) = ∅</i>.
        </p>
      </div>
    </div>
  );
};
