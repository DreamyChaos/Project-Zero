import React from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useDiagnostics } from '../../../context/DiagnosticContext';
import { Activity, Hash, Binary, Layers, CheckCircle2, AlertCircle, Wrench, ShieldCheck, XCircle } from 'lucide-react';

export const EmptySelectionView: React.FC = () => {
  const { nodes, edges, machineType, completenessResult } = useGraph();
  const { report, applyRepair } = useDiagnostics();

  const acceptingCount = nodes.filter((n) => n.isAccepting).length;
  const initialNode = nodes.find((n) => n.isInitial);
  const alphabetSymbols = completenessResult.alphabet;

  const firstError = report.diagnostics.find((d) => d.severity === 'error');
  const firstRepair = firstError?.repairs?.[0];

  return (
    <div className="flex-1 flex flex-col p-4 select-none overflow-y-auto space-y-4">
      {/* Header Summary */}
      <div className="border-b border-border-subtle pb-3">
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-primary font-mono">
            {machineType} Workspace Overview
          </h3>
        </div>
        <p className="text-[11px] text-txt-muted leading-snug">
          Select a state or edge on the canvas to inspect and edit properties.
        </p>
      </div>

      {/* Live Validation & Educational Diagnostic Card */}
      <div className="bg-bg-surface2/60 border border-border-subtle p-3 rounded-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono font-medium text-txt-primary text-xs flex items-center space-x-1.5">
            {report.isValid ? (
              <ShieldCheck size={14} className="text-semantic-accept" />
            ) : (
              <XCircle size={14} className="text-semantic-reject" />
            )}
            <span>Formal Verification</span>
          </span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
            report.isValid ? 'bg-semantic-accept/20 text-semantic-accept border border-semantic-accept/30' : 'bg-semantic-reject/20 text-semantic-reject border border-semantic-reject/30'
          }`}>
            {report.isValid ? 'VALID' : 'INVALID'}
          </span>
        </div>

        {firstError ? (
          <div className="space-y-1.5 text-[11px]">
            <div className="text-semantic-reject font-medium flex items-center space-x-1">
              <AlertCircle size={12} className="shrink-0" />
              <span>{firstError.title}</span>
            </div>
            <p className="text-[10px] text-txt-muted leading-tight">{firstError.message}</p>
            <div className="bg-bg-surface1 p-2 rounded border border-border-subtle text-[10px] text-txt-secondary font-mono leading-tight">
              <strong>Rule:</strong> {firstError.mathematicalExplanation}
            </div>
            {firstRepair && (
              <button
                onClick={() => applyRepair(firstRepair)}
                className="w-full mt-1 px-2.5 py-1 rounded bg-accent-primary hover:bg-accent-hover text-white text-[11px] font-medium flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
              >
                <Wrench size={12} />
                <span>Quick Fix: {firstRepair.title}</span>
              </button>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-semantic-accept font-mono">
            ✓ Model satisfies formal {machineType} specification rules.
          </p>
        )}
      </div>

      {/* Automaton Summary Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-bg-surface2/60 border border-border-subtle p-2.5 rounded-md flex flex-col">
          <span className="text-[10px] text-txt-muted uppercase font-mono flex items-center space-x-1">
            <Hash size={11} className="text-accent-primary" />
            <span>States</span>
          </span>
          <span className="text-base font-bold text-txt-primary mt-0.5">{nodes.length}</span>
          <span className="text-[10px] text-txt-muted mt-0.5 font-mono">
            {acceptingCount} accepting / {initialNode ? '1 initial' : '0 initial'}
          </span>
        </div>

        <div className="bg-bg-surface2/60 border border-border-subtle p-2.5 rounded-md flex flex-col">
          <span className="text-[10px] text-txt-muted uppercase font-mono flex items-center space-x-1">
            <Binary size={11} className="text-accent-primary" />
            <span>Transitions</span>
          </span>
          <span className="text-base font-bold text-txt-primary mt-0.5">{edges.length}</span>
          <span className="text-[10px] text-txt-muted mt-0.5 font-mono">
            delta functions
          </span>
        </div>
      </div>

      {/* Formal Alphabet Display */}
      <div className="bg-bg-surface2/40 border border-border-subtle p-3 rounded-md space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono font-medium text-txt-primary flex items-center space-x-1.5">
            <Layers size={12} className="text-accent-primary" />
            <span>Input Alphabet (Σ)</span>
          </span>
          <span className="font-mono text-[10px] text-txt-muted">
            {alphabetSymbols.length} symbol{alphabetSymbols.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="font-mono text-xs text-accent-primary bg-bg-surface1 px-2 py-1 rounded border border-border-subtle break-all">
          {alphabetSymbols.length > 0 ? `Σ = { ${alphabetSymbols.join(', ')} }` : 'Σ = ∅'}
        </div>
      </div>

      {/* Completeness Status */}
      {machineType === 'DFA' && (
        <div className="bg-bg-surface2/40 border border-border-subtle p-3 rounded-md space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="font-mono font-medium text-txt-primary flex items-center space-x-1.5">
              <Activity size={12} className="text-accent-primary" />
              <span>DFA Completeness</span>
            </span>
            {completenessResult.isComplete ? (
              <span className="flex items-center space-x-1 text-semantic-accept font-mono text-[10px]">
                <CheckCircle2 size={11} />
                <span>Complete</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-semantic-warning font-mono text-[10px]">
                <AlertCircle size={11} />
                <span>Incomplete</span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-txt-muted leading-tight">
            {completenessResult.isComplete
              ? 'Every state has defined transitions for all symbols in Σ.'
              : `${completenessResult.missingTransitions.length} transition(s) missing to complete delta function.`}
          </p>
        </div>
      )}

      {/* Shortcut hints */}
      <div className="text-[10px] text-txt-muted space-y-1 font-mono pt-1 border-t border-border-subtle/50">
        <div>• Click canvas background: Deselect</div>
        <div>• Double click: Place state (S)</div>
        <div>• Drag state to state: Add edge (T)</div>
        <div>• Left Drag background: Pan canvas</div>
      </div>
    </div>
  );
};

