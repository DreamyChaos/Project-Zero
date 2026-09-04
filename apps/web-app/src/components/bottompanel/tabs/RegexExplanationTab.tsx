import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { executeNFA } from '@project-zero/core-solver';
import {
  Sparkles,
  Code,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  HelpCircle,
  Check,
  X as XIcon,
  ListOrdered,
  Activity,
} from 'lucide-react';

export const RegexExplanationTab: React.FC = () => {
  const { lastRegexResult, nodes, edges } = useGraph();
  const [testString, setTestString] = useState<string>('abb');

  const { inputRegex, result } = lastRegexResult || { inputRegex: '', result: null };

  // Run live NFA execution against candidate test string using active graph
  const execResult = useMemo(() => {
    if (!result || !result.success || nodes.length === 0) return null;
    return executeNFA({ nodes, edges }, testString);
  }, [result, nodes, edges, testString]);

  if (!lastRegexResult || !result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-bg-surface1 text-xs font-mono space-y-3">
        <div className="p-3 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
          <Sparkles size={28} />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="font-bold text-txt-primary text-sm">No Regex Conversion Performed Yet</h3>
          <p className="text-txt-muted text-[11px]">
            Convert a Regular Expression using Thompson's Construction in the Left Sidebar (Convert &rarr; RegEx) to inspect step-by-step fragment rules, state creation, and verify test strings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 bg-bg-surface1 text-xs font-mono select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-accent-primary/15 text-accent-primary rounded-md">
            <Code size={18} />
          </div>
          <div>
            <h3 className="font-bold text-txt-primary text-sm">Regex → Thompson ε-NFA Conversion</h3>
            <p className="text-[11px] text-txt-muted">Formal AST fragment composition, execution trace & string verification</p>
          </div>
        </div>
        <div className="px-2.5 py-1 bg-accent-primary/10 border border-accent-primary/20 text-accent-primary font-bold rounded text-[11px]">
          r = "{inputRegex}"
        </div>
      </div>

      {/* Status Header */}
      <div
        className={`p-3 rounded-lg border flex items-center space-x-2.5 ${
          result.success
            ? 'bg-semantic-accept/10 border-semantic-accept/30 text-semantic-accept'
            : 'bg-semantic-error/10 border-semantic-error/30 text-semantic-error'
        }`}
      >
        {result.success ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
        <div className="font-bold text-xs">
          {result.success
            ? `✓ Thompson Construction Successful! Generated ε-NFA with ${result.nodes.length} states and ${result.edges.length} transitions.`
            : `✕ Conversion Error: ${result.errorMessage}`}
        </div>
      </div>

      {/* Conversion Pipeline Diagram */}
      <div className="bg-bg-surface2/60 p-3 rounded-lg border border-border-subtle space-y-2">
        <div className="font-bold text-txt-primary flex items-center space-x-1.5 text-xs">
          <Layers size={14} className="text-accent-primary" />
          <span>Transformation Pipeline:</span>
        </div>
        <div className="flex items-center justify-around py-2 px-4 bg-bg-surface3 rounded border border-border-subtle font-bold text-[11px] text-txt-secondary">
          <span className="text-accent-primary font-mono">Regex ("{inputRegex}")</span>
          <ArrowRight size={14} className="text-txt-muted" />
          <span>AST Parse Tree</span>
          <ArrowRight size={14} className="text-txt-muted" />
          <span>Thompson Fragments</span>
          <ArrowRight size={14} className="text-txt-muted" />
          <span className="text-semantic-accept">ε-NFA (Active Canvas)</span>
        </div>
      </div>

      {/* Generated Automaton Metrics & Formal 5-Tuple */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-bg-surface2/80 p-2.5 rounded-lg border border-border-subtle">
          <div className="text-txt-muted text-[10px]">STATES |Q|</div>
          <div className="font-bold text-txt-primary text-sm mt-0.5">{result.nodes.length}</div>
        </div>
        <div className="bg-bg-surface2/80 p-2.5 rounded-lg border border-border-subtle">
          <div className="text-txt-muted text-[10px]">TRANSITIONS |δ|</div>
          <div className="font-bold text-txt-primary text-sm mt-0.5">{result.edges.length}</div>
        </div>
        <div className="bg-bg-surface2/80 p-2.5 rounded-lg border border-border-subtle">
          <div className="text-txt-muted text-[10px]">ALPHABET Σ</div>
          <div className="font-bold text-accent-primary text-sm mt-0.5">
            {result.alphabet.length > 0 ? `{${result.alphabet.join(', ')}}` : '∅'}
          </div>
        </div>
        <div className="bg-bg-surface2/80 p-2.5 rounded-lg border border-border-subtle">
          <div className="text-txt-muted text-[10px]">INITIAL STATE</div>
          <div className="font-bold text-semantic-accept text-sm mt-0.5">
            {result.nodes.find((n) => n.isInitial)?.label || 'q0'}
          </div>
        </div>
      </div>

      {/* Interactive Live String Verification Suite */}
      <div className="bg-bg-surface2/60 p-3.5 rounded-lg border border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-txt-primary flex items-center space-x-1.5 text-xs">
            <Activity size={14} className="text-accent-primary" />
            <span>Interactive String Verifier against L(r)</span>
          </div>
          <span className="text-[10px] text-txt-muted">Pure NFA Branch Evaluator</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex-1 flex items-center bg-bg-surface3 border border-border-subtle focus-within:border-accent-primary rounded-lg px-3 py-1.5 shadow-inner">
            <span className="text-txt-muted font-bold mr-2 select-none">w =</span>
            <input
              type="text"
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter candidate string (e.g. abb, ε)"
              className="w-full bg-transparent text-txt-primary placeholder-txt-muted font-mono font-bold text-xs outline-none"
            />
            {testString && (
              <button
                type="button"
                onClick={() => setTestString('')}
                className="text-txt-muted hover:text-txt-primary text-[10px] px-1.5 py-0.5 rounded bg-bg-surface2"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setTestString('')}
              className="px-2 py-1 bg-bg-surface3 hover:bg-bg-surface2 border border-border-subtle rounded text-[10px] text-txt-secondary"
              title="Test Empty String ε"
            >
              ε
            </button>
            {result.alphabet.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setTestString((prev) => prev + sym)}
                className="px-2 py-1 bg-bg-surface3 hover:bg-bg-surface2 border border-border-subtle rounded text-[10px] text-txt-secondary font-bold"
              >
                +{sym}
              </button>
            ))}
          </div>
        </div>

        {/* Evaluation Output Badge */}
        {execResult && (
          <div
            className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${
              execResult.isAccepted
                ? 'bg-semantic-accept/15 border-semantic-accept/40 text-semantic-accept'
                : 'bg-semantic-error/15 border-semantic-error/40 text-semantic-error'
            }`}
          >
            <div className="flex items-center space-x-2">
              {execResult.isAccepted ? <Check size={16} className="shrink-0" /> : <XIcon size={16} className="shrink-0" />}
              <span className="font-bold">
                {execResult.isAccepted ? `✓ ACCEPTED: "${testString || 'ε'}" ∈ L(r)` : `✕ REJECTED: "${testString || 'ε'}" ∉ L(r)`}
              </span>
            </div>
            <div className="text-[11px] text-txt-secondary flex items-center space-x-3">
              <span>
                Final States:{' '}
                <strong className="text-txt-primary">
                  {execResult.finalStates.length > 0
                    ? `{${execResult.finalStates.map((s) => s.label).join(', ')}}`
                    : '∅ (Halted)'}
                </strong>
              </span>
              <span>
                Steps: <strong className="text-txt-primary">{execResult.steps.length}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Thompson Construction Trace */}
      {result.trace && result.trace.length > 0 && (
        <div className="bg-bg-surface2/60 p-3.5 rounded-lg border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="font-bold text-txt-primary flex items-center space-x-1.5 text-xs">
              <ListOrdered size={14} className="text-accent-primary" />
              <span>Step-by-Step Thompson Construction Trace ({result.trace.length} Steps)</span>
            </div>
            <span className="text-[10px] text-txt-muted">Bottom-Up AST Fragment Synthesis</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {result.trace.map((step) => (
              <div
                key={step.stepIndex}
                className="p-2 bg-bg-surface3/80 rounded border border-border-subtle flex items-start justify-between text-[11px] hover:border-accent-primary/40 transition-colors"
              >
                <div className="flex items-start space-x-2">
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-accent-primary/15 text-accent-primary font-bold shrink-0 mt-0.5">
                    Step {step.stepIndex}
                  </span>
                  <div className="space-y-0.5">
                    <div className="text-txt-primary font-medium">{step.description}</div>
                    {step.createdTransitions.length > 0 && (
                      <div className="text-[10px] text-txt-muted flex flex-wrap gap-1">
                        <span>Transitions created:</span>
                        {step.createdTransitions.map((t, tidx) => (
                          <span key={tidx} className="font-mono px-1 rounded bg-bg-surface1 text-txt-secondary border border-border-subtle">
                            {t.sourceId} &rarr; {t.targetId} ({t.label || 'ε'})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-surface1 text-semantic-accept border border-semantic-accept/20 font-bold">
                    Frag: {step.fragment.startId} &rarr; {step.fragment.acceptId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transition Edge Matrix */}
      {result.edges.length > 0 && (
        <div className="bg-bg-surface2/60 p-3.5 rounded-lg border border-border-subtle space-y-2">
          <div className="font-bold text-txt-primary text-xs">Generated Transitions δ:</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {result.edges.map((e, idx) => {
              const srcNode = result.nodes.find((n) => n.id === e.sourceNodeId);
              const tgtNode = result.nodes.find((n) => n.id === e.targetNodeId);
              return (
                <div key={idx} className="p-1.5 bg-bg-surface3 rounded border border-border-subtle text-[11px] flex items-center justify-between">
                  <span className="font-bold text-txt-secondary">{srcNode?.label || e.sourceNodeId}</span>
                  <span className="text-accent-primary font-bold px-1.5 py-0.2 bg-accent-primary/10 rounded">-- {e.label || 'ε'} --&gt;</span>
                  <span className="font-bold text-txt-secondary">{tgtNode?.label || e.targetNodeId}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Theoretical Context */}
      <div className="bg-bg-surface2/40 p-3.5 rounded-lg border border-border-subtle space-y-2 text-[11px] text-txt-secondary">
        <div className="font-bold text-txt-primary flex items-center space-x-1.5">
          <HelpCircle size={14} className="text-accent-primary" />
          <span>Thompson Construction Invariants</span>
        </div>
        <p className="leading-relaxed text-txt-muted">
          Thompson's Construction converts any regular expression <i>r</i> into an equivalent ε-NFA in <i>O(|r|)</i> time. The generated machine has exactly one initial state with no incoming transitions, exactly one accepting state with no outgoing transitions, and at most 2 states per symbol/operator in <i>r</i>.
        </p>
      </div>
    </div>
  );
};
