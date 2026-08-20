import React from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useDiagnostics } from '../../../context/DiagnosticContext';
import { ShieldCheck, XCircle, AlertCircle, Wrench, CheckCircle2 } from 'lucide-react';

export const DiagnosticQuickFixView: React.FC = () => {
  const { machineType } = useGraph();
  const { report, applyRepair } = useDiagnostics();

  return (
    <div className="flex-1 flex flex-col p-3 select-none overflow-y-auto space-y-3 text-xs font-mono">
      {/* Header */}
      <div className="border-b border-border-subtle pb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-accent-primary/15 text-accent-primary rounded">
            {report.isValid ? <ShieldCheck size={16} /> : <XCircle size={16} />}
          </div>
          <div>
            <h3 className="font-bold text-txt-primary text-xs uppercase tracking-wider">
              Diagnostics & Repair
            </h3>
            <p className="text-[10px] text-txt-muted">Formal Machine Verification</p>
          </div>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            report.isValid
              ? 'bg-semantic-accept/20 text-semantic-accept border border-semantic-accept/30'
              : 'bg-semantic-reject/20 text-semantic-reject border border-semantic-reject/30'
          }`}
        >
          {report.isValid ? 'VALID' : 'INVALID'}
        </span>
      </div>

      {/* Diagnostics Report List */}
      {report.diagnostics.length > 0 ? (
        <div className="space-y-2.5">
          {report.diagnostics.map((diag) => (
            <div
              key={diag.id}
              className="p-2.5 bg-bg-surface2/60 border border-border-subtle rounded-lg space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-txt-primary text-[11px] flex items-center space-x-1">
                  <AlertCircle
                    size={13}
                    className={diag.severity === 'error' ? 'text-semantic-reject' : 'text-semantic-warning'}
                  />
                  <span>{diag.title}</span>
                </span>
                <span
                  className={`text-[9px] px-1 py-0.1 rounded font-bold uppercase ${
                    diag.severity === 'error'
                      ? 'bg-semantic-reject/20 text-semantic-reject'
                      : 'bg-semantic-warning/20 text-semantic-warning'
                  }`}
                >
                  {diag.severity}
                </span>
              </div>

              <p className="text-[10px] text-txt-muted leading-tight">{diag.message}</p>

              {diag.mathematicalExplanation && (
                <div className="p-2 bg-bg-surface1 rounded border border-border-subtle text-[10px] text-txt-secondary leading-tight">
                  <strong>Formal Rule:</strong> {diag.mathematicalExplanation}
                </div>
              )}

              {diag.repairs && diag.repairs.length > 0 && (
                <div className="pt-1 space-y-1">
                  {diag.repairs.map((repair) => (
                    <button
                      key={repair.id}
                      onClick={() => applyRepair(repair)}
                      className="w-full px-2 py-1 rounded bg-accent-primary hover:bg-accent-hover text-white text-[10px] font-medium flex items-center justify-center space-x-1 transition-colors shadow-xs"
                    >
                      <Wrench size={11} />
                      <span>Fix: {repair.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 bg-semantic-accept/10 border border-semantic-accept/30 rounded-lg text-center space-y-1">
          <CheckCircle2 size={20} className="text-semantic-accept mx-auto" />
          <div className="font-bold text-semantic-accept text-[11px]">No Diagnostic Errors</div>
          <p className="text-[10px] text-txt-muted">
            The active {machineType} satisfies all formal structural correctness criteria.
          </p>
        </div>
      )}
    </div>
  );
};
