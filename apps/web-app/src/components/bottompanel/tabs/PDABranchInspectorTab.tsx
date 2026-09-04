import React, { useState } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import { PDABranchNode, PDAExecutionResult, PDADeterminismConflict } from '@project-zero/core-solver';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  CornerDownRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  AlertTriangle,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export const PDABranchInspectorTab: React.FC = () => {
  const { machineType, pdaAcceptanceMode, setSelection } = useGraph();
  const { executionResult, setCurrentStepIndex } = useExecution();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTheoryGuide, setShowTheoryGuide] = useState<boolean>(false);
  const [showDeterminismInspector, setShowDeterminismInspector] = useState<boolean>(false);

  if (machineType !== 'PDA') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-txt-muted font-mono text-xs">
        <GitBranch size={32} className="mb-2 text-border-strong" />
        <span>PDA Determinism & Branch Inspector is active for Pushdown Automata only.</span>
      </div>
    );
  }

  if (!executionResult || !('branchTree' in executionResult)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-txt-muted font-mono text-xs">
        <GitBranch size={32} className="mb-2 text-border-strong" />
        <span>No active PDA branch tree telemetry available. Run simulation to inspect branches.</span>
      </div>
    );
  }

  const pdaResult = executionResult as PDAExecutionResult;
  const branchTree = pdaResult?.branchTree;
  const determinism = pdaResult?.determinismAnalysis;

  if (!branchTree) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-txt-muted font-mono text-xs">
        <span>No branch tree telemetry available for current input.</span>
      </div>
    );
  }

  const handleSelectBranchNode = (node: PDABranchNode) => {
    setSelectedNodeId(node.id);
    if (node.historySteps.length > 0) {
      setCurrentStepIndex(node.historySteps.length - 1);
    }
  };

  const handleSelectConflict = (conflict: PDADeterminismConflict) => {
    if (conflict.transitionIds && conflict.transitionIds.length > 0) {
      setSelection([], [conflict.transitionIds[0]]);
    }
  };

  const renderTreeNode = (node: PDABranchNode, depth: number = 0) => {
    const isSelected = selectedNodeId === node.id;
    const isLeaf = node.children.length === 0;
    const stackTopStr = node.stack.length > 0 ? node.stack[node.stack.length - 1] : 'ε';
    const isBranchPoint = node.children.length > 1;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => handleSelectBranchNode(node)}
          className={`group flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-all border text-xs font-mono select-none ${
            isSelected
              ? 'bg-accent-primary/20 border-accent-primary text-txt-primary shadow-sm'
              : 'hover:bg-bg-surface2/60 border-transparent text-txt-secondary'
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {depth > 0 && <CornerDownRight size={12} className="text-border-strong shrink-0" />}

          {/* Status Icon */}
          {node.status === 'ACCEPTING' ? (
            <CheckCircle2 size={13} className="text-semantic-accept shrink-0" />
          ) : isLeaf ? (
            <XCircle size={13} className="text-semantic-error shrink-0" />
          ) : (
            <GitBranch size={13} className="text-accent-primary shrink-0" />
          )}

          {/* State Badge */}
          <span className="font-bold text-txt-primary bg-bg-surface3 px-1.5 py-0.5 rounded border border-border-subtle">
            {node.stateLabel}
          </span>

          {/* Branch Point Badge */}
          {isBranchPoint && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-semantic-warning/15 text-semantic-warning border border-semantic-warning/30">
              Branch Point ({node.children.length} paths)
            </span>
          )}

          {/* Step Metadata */}
          <span className="text-[11px] text-txt-muted">
            read:{' '}
            <code className="text-accent-primary font-bold">
              {node.readSymbol ? node.readSymbol : 'ε'}
            </code>
          </span>

          <span className="text-[11px] text-txt-muted">
            top: <code className="text-accent-secondary font-bold">{stackTopStr}</code>
          </span>

          <span className="text-[11px] text-txt-muted">
            stack: [
            <code className="text-txt-secondary font-bold">
              {node.stack.slice().reverse().join('') || 'ε'}
            </code>
            ]
          </span>

          {/* Status Pill */}
          <span
            className={`ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
              node.status === 'ACCEPTING'
                ? 'bg-semantic-accept/20 text-semantic-accept border border-semantic-accept/30'
                : isLeaf
                ? 'bg-semantic-error/20 text-semantic-error border border-semantic-error/30'
                : 'bg-bg-surface3 text-txt-muted'
            }`}
          >
            {node.status}
          </span>
        </div>

        {/* Child branches */}
        {node.children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-surface1/60 select-none">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between p-2.5 bg-bg-surface2/80 border-b border-border-subtle text-xs shrink-0 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1 font-bold text-txt-primary">
            <GitBranch size={14} className="text-accent-primary" />
            <span>PDA Execution Tree</span>
          </span>

          {/* Classification Badge */}
          {determinism && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${
                determinism.isDeterministic
                  ? 'bg-semantic-accept/15 text-semantic-accept border-semantic-accept/30'
                  : 'bg-semantic-warning/15 text-semantic-warning border-semantic-warning/30'
              }`}
            >
              {determinism.isDeterministic ? (
                <>
                  <ShieldCheck size={11} />
                  <span>DPDA (Deterministic)</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={11} />
                  <span>NPDA (Nondeterministic)</span>
                </>
              )}
            </span>
          )}

          {/* Execution Mode Badge */}
          <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-[11px]">
            Execution:{' '}
            <span className="font-bold text-txt-primary">
              {pdaResult.isExecutionLinear ? 'Linear (1 path)' : 'Branching'}
            </span>
          </span>

          <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-[11px]">
            Nodes: <span className="font-bold text-txt-primary">{branchTree.totalNodes}</span>
          </span>

          <span className="px-2 py-0.5 rounded bg-accent-primary/15 border border-accent-primary/30 text-accent-primary text-[10px] font-bold">
            Mode: {pdaAcceptanceMode}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {determinism && (
            <button
              type="button"
              onClick={() => setShowDeterminismInspector(!showDeterminismInspector)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded border text-[11px] font-bold transition-colors ${
                showDeterminismInspector
                  ? 'bg-accent-primary text-txt-on-accent border-accent-primary'
                  : 'bg-bg-surface3 hover:bg-bg-surface2 border-border-subtle text-txt-secondary'
              }`}
            >
              <Layers size={12} />
              <span>Determinism Inspector</span>
              {determinism.conflicts.length > 0 && (
                <span className="ml-1 px-1 py-0.2 rounded bg-semantic-warning/20 text-semantic-warning text-[10px]">
                  {determinism.conflicts.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTheoryGuide(!showTheoryGuide)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-bg-surface3 hover:bg-bg-surface2 border border-border-subtle text-txt-secondary text-[11px] transition-colors"
          >
            <BookOpen size={12} className="text-accent-primary" />
            <span>Topic 5 Guide</span>
            {showTheoryGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {pdaResult.isAccepted ? (
            <span className="text-semantic-accept text-[11px] bg-semantic-accept/10 border border-semantic-accept/30 px-2 py-0.5 rounded flex items-center space-x-1 font-bold">
              <CheckCircle2 size={12} />
              <span>Path Accepted</span>
            </span>
          ) : (
            <span className="text-semantic-error text-[11px] bg-semantic-error/10 border border-semantic-error/30 px-2 py-0.5 rounded flex items-center space-x-1 font-bold">
              <XCircle size={12} />
              <span>All Branches Rejected / Halted</span>
            </span>
          )}
        </div>
      </div>

      {/* Determinism Inspector Sub-Panel */}
      {showDeterminismInspector && determinism && (
        <div className="p-3 bg-bg-surface2/95 border-b border-border-subtle text-xs space-y-2 shrink-0 overflow-y-auto max-h-52">
          <div className="flex items-center justify-between">
            <span className="font-bold text-txt-primary flex items-center space-x-1.5">
              <ShieldCheck size={14} className="text-accent-primary" />
              <span>Formal DPDA Determinism Analysis: {determinism.machineClassification}</span>
            </span>
            <span className="text-[11px] text-txt-muted">{determinism.explanation}</span>
          </div>

          {determinism.conflicts.length === 0 ? (
            <div className="p-2.5 rounded bg-semantic-accept/10 border border-semantic-accept/30 text-semantic-accept text-[11px] flex items-center space-x-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>
                <strong>Strictly Deterministic (DPDA):</strong> For every state, lookahead symbol, and stack top, at most one transition applies. No ε/input competition exists.
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider block">
                Nondeterminism Conflict Evidence ({determinism.conflicts.length} conflict(s) detected):
              </span>
              {determinism.conflicts.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectConflict(c)}
                  className="p-2 rounded bg-bg-surface1 border border-semantic-warning/40 hover:border-semantic-warning cursor-pointer transition-colors text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-semantic-warning flex items-center space-x-1">
                      <AlertTriangle size={12} />
                      <span>{c.conflictType}</span>
                      <span className="text-txt-muted font-normal">at state</span>
                      <span className="text-txt-primary bg-bg-surface3 px-1 rounded">{c.stateLabel}</span>
                    </span>
                    <span className="text-txt-muted text-[10px]">
                      Lookahead: <code className="text-accent-primary font-bold">{c.inputSymbol}</code> | Stack Top: <code className="text-accent-secondary font-bold">{c.stackSymbol}</code>
                    </span>
                  </div>
                  <div className="text-txt-secondary">{c.mathematicalExplanation}</div>
                  <div className="flex items-center space-x-2 text-[10px] text-txt-muted pt-0.5">
                    <span>Transitions:</span>
                    {c.transitionLabels.map((lbl, lIdx) => (
                      <code key={lIdx} className="bg-bg-surface3 px-1 py-0.5 rounded text-accent-primary border border-border-subtle">
                        {lbl}
                      </code>
                    ))}
                    <span className="ml-auto text-accent-secondary italic">Click to highlight on canvas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Educational Guide: Module 4 Topic 5 DPDA vs NPDA */}
      {showTheoryGuide && (
        <div className="p-3 bg-bg-surface2/90 border-b border-border-subtle text-xs space-y-3 shrink-0 overflow-y-auto max-h-56">
          <div className="flex items-center space-x-2 text-accent-primary font-bold">
            <HelpCircle size={14} />
            <span>Module 4 Topic 5 — Deterministic (DPDA) vs Nondeterministic (NPDA) PDA</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div className="bg-bg-surface1/80 p-2.5 rounded border border-border-subtle space-y-1">
              <span className="font-bold text-accent-primary block">1. Formal DPDA Determinism Conditions</span>
              <p className="text-txt-secondary font-sans leading-relaxed">
                A PDA is deterministic (DPDA) iff for every configuration, at most one move can be chosen:
                <br />• <strong>Move Uniqueness:</strong> <code className="text-accent-primary">|δ(q, a, X)| ≤ 1</code> for all <code className="text-accent-primary">a ∈ Σ ∪ {'{ε}'}</code> and <code className="text-accent-primary">X ∈ Γ</code>.
                <br />• <strong>ε / Lookahead Exclusion:</strong> If <code className="text-accent-primary">δ(q, ε, X) ≠ ∅</code>, then <code className="text-accent-primary">δ(q, a, X) = ∅</code> for all <code className="text-accent-primary">a ∈ Σ</code>.
              </p>
            </div>

            <div className="bg-bg-surface1/80 p-2.5 rounded border border-border-subtle space-y-1">
              <span className="font-bold text-semantic-info block">2. Why Epsilon Alone Does NOT Mean NPDA</span>
              <p className="text-txt-secondary font-sans leading-relaxed">
                An ε-transition alone is <strong>strictly deterministic</strong> if it is the <em>only</em> move possible for that state and stack top.
                <br />It only becomes nondeterministic if it competes with another move (e.g. another ε-move or an input-reading move on the same stack top).
              </p>
            </div>

            <div className="bg-bg-surface1/80 p-2.5 rounded border border-border-subtle space-y-1">
              <span className="font-bold text-semantic-accept block">3. NPDA Existential Acceptance</span>
              <p className="text-txt-secondary font-sans leading-relaxed">
                In an NPDA, an input string is accepted iff <strong>at least one valid execution branch</strong> reaches an accepting configuration.
                <br />Dead-end or rejected branches do <em>not</em> force overall rejection as long as one accepting path exists.
              </p>
            </div>

            <div className="bg-bg-surface1/80 p-2.5 rounded border border-border-subtle space-y-1">
              <span className="font-bold text-accent-secondary block">4. Non-Conflicting Transitions & Roadmap</span>
              <p className="text-txt-secondary font-sans leading-relaxed">
                Transitions do <strong>NOT</strong> conflict if they have distinct non-ε input symbols (lookahead chooses), incompatible stack tops (stack chooses), or different states.
                <br /><strong>Syllabus Roadmap:</strong>
                <br />• <em>Topic 4 (Completed)</em>: Pushdown Automata foundations.
                <br />• <em>Topic 5 (Current)</em>: DPDA vs NPDA determinism.
                <br />• <em>Topic 6 (Upcoming)</em>: Interpretation of syntactic statements using PDA.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tree View */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {renderTreeNode(branchTree.root)}
      </div>
    </div>
  );
};
