import React from 'react';
import { useDiagnostics } from '../../../context/DiagnosticContext';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Wrench,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export const DiagnosticsTab: React.FC = () => {
  const {
    report,
    selectedDiagnostic,
    activePreview,
    selectDiagnostic,
    previewRepair,
    cancelPreview,
    applyRepair,
  } = useDiagnostics();

  return (
    <div className="flex flex-col h-full bg-bg-base text-txt-primary font-mono text-xs overflow-hidden select-none">
      {/* Status Bar Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-bg-surface1 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          {report.isValid ? (
            <span className="flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Valid {report.machineType}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-red-950 text-red-300 border border-red-800 px-2.5 py-1 rounded text-xs font-bold">
              <XCircle className="w-4 h-4 text-red-400" />
              Invalid {report.machineType}
            </span>
          )}

          <div className="flex items-center gap-2 text-2xs text-slate-400">
            <span className="bg-red-900/40 text-red-300 px-2 py-0.5 rounded border border-red-800/60 font-bold">
              {report.errorCount} Errors
            </span>
            <span className="bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60 font-bold">
              {report.warningCount} Warnings
            </span>
            <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/60 font-bold">
              {report.infoCount} Info
            </span>
          </div>
        </div>

        <span className="text-slate-500 text-3xs">
          Guided Construction & Repair Assistant
        </span>
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        {/* Left Column: Diagnostics List */}
        <div className="border-r border-slate-800 overflow-y-auto p-2 space-y-1.5 bg-slate-950/40">
          <span className="text-3xs uppercase font-bold tracking-wider text-slate-500 px-2 block mb-1">
            Diagnostic Issues ({report.diagnostics.length})
          </span>

          {report.diagnostics.length > 0 ? (
            report.diagnostics.map((diag) => {
              const isSelected = selectedDiagnostic?.id === diag.id;
              return (
                <button
                  key={diag.id}
                  onClick={() => selectDiagnostic(diag.id)}
                  className={`w-full text-left p-2.5 rounded border transition-colors flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-600 text-indigo-100 shadow'
                      : diag.severity === 'error'
                      ? 'bg-red-950/20 border-red-900/40 text-red-200 hover:bg-red-950/40'
                      : diag.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-900/40 text-amber-200 hover:bg-amber-950/40'
                      : 'bg-blue-950/20 border-blue-900/40 text-blue-200 hover:bg-blue-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      {diag.severity === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      {diag.severity === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {diag.severity === 'info' && <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      {diag.title}
                    </span>
                    <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                      {diag.code}
                    </span>
                  </div>
                  <p className="text-3xs text-slate-400 line-clamp-1">{diag.message}</p>
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-500 text-2xs italic">
              No diagnostic issues detected. Machine structure is valid!
            </div>
          )}
        </div>

        {/* Middle & Right Column: Selected Diagnostic Detail & Repair Suggestions */}
        <div className="col-span-2 overflow-y-auto p-4 space-y-4">
          {selectedDiagnostic ? (
            <>
              {/* Diagnostic Overview Card */}
              <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">{selectedDiagnostic.title}</span>
                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded text-3xs font-semibold">
                      {selectedDiagnostic.code}
                    </span>
                  </div>
                  {selectedDiagnostic.affectedStateIds.length > 0 && (
                    <span className="text-2xs text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                      Affected State(s): {selectedDiagnostic.affectedStateIds.join(', ')}
                    </span>
                  )}
                </div>

                {/* Mathematical Explanation */}
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800/80 space-y-1">
                  <span className="text-3xs uppercase font-bold text-indigo-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Mathematical Proof & Semantics
                  </span>
                  <p className="text-2xs text-slate-300 leading-relaxed font-sans">
                    {selectedDiagnostic.mathematicalExplanation}
                  </p>
                </div>
              </div>

              {/* Repair Suggestions Section */}
              <div className="space-y-2.5">
                <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-indigo-400" /> Actionable Repair Suggestions ({selectedDiagnostic.repairs.length})
                </span>

                {selectedDiagnostic.repairs.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDiagnostic.repairs.map((repair) => (
                      <div
                        key={repair.id}
                        className="bg-slate-950/80 p-3 rounded border border-slate-800 flex flex-wrap items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1 flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-200">{repair.title}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-3xs font-bold border ${
                                repair.category === 'SAFE'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : repair.category === 'POTENTIALLY_LANGUAGE_CHANGING'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-red-950 text-red-300 border-red-800'
                              }`}
                            >
                              {repair.category}
                            </span>
                          </div>
                          <p className="text-3xs text-slate-400">{repair.description}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => previewRepair(repair)}
                            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded text-xs transition-colors border border-slate-700 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" /> Preview Repair
                          </button>
                          <button
                            onClick={() => applyRepair(repair)}
                            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs transition-colors shadow font-semibold"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Apply Repair
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-slate-500 text-2xs italic">
                    No automated repair suggestions available for this info item.
                  </div>
                )}
              </div>

              {/* Repair Preview & Diff Panel (Feature 5 & 7) */}
              {activePreview && (
                <div className="bg-indigo-950/40 border border-indigo-800/80 p-3.5 rounded space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-900/80 pb-2">
                    <span className="font-bold text-xs text-indigo-200 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-indigo-400" /> Repair Preview & Machine Diff
                    </span>
                    <span className="text-3xs text-slate-400">
                      Resulting Status:{' '}
                      <strong className={activePreview.isAfterValid ? 'text-emerald-400' : 'text-red-400'}>
                        {activePreview.isAfterValid ? 'Valid Machine' : 'Has Diagnostics Remaining'}
                      </strong>
                    </span>
                  </div>

                  {/* Diff Details */}
                  <div className="grid grid-cols-2 gap-3 text-2xs">
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">State Modifications</span>
                      {activePreview.diff.addedNodes.length > 0 && (
                        <div className="text-emerald-400 font-semibold">
                          + Added State: {activePreview.diff.addedNodes.map((n) => `'${n.label || n.id}'`).join(', ')}
                        </div>
                      )}
                      {activePreview.diff.removedNodes.length > 0 && (
                        <div className="text-red-400 font-semibold">
                          - Removed State: {activePreview.diff.removedNodes.map((n) => `'${n.label || n.id}'`).join(', ')}
                        </div>
                      )}
                      {activePreview.diff.addedNodes.length === 0 && activePreview.diff.removedNodes.length === 0 && (
                        <span className="text-slate-500 italic">No states added/removed</span>
                      )}
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">Transition Modifications</span>
                      {activePreview.diff.addedEdges.length > 0 && (
                        <div className="text-emerald-400 font-semibold">
                          + Added Edge on symbol '{activePreview.diff.addedEdges[0].label}'
                        </div>
                      )}
                      {activePreview.diff.removedEdges.length > 0 && (
                        <div className="text-red-400 font-semibold">
                          - Removed {activePreview.diff.removedEdges.length} transition edge(s)
                        </div>
                      )}
                      {activePreview.diff.addedEdges.length === 0 && activePreview.diff.removedEdges.length === 0 && (
                        <span className="text-slate-500 italic">No edges added/removed</span>
                      )}
                    </div>
                  </div>

                  <p className="text-3xs text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800">
                    <strong className="text-indigo-400">Language Safety:</strong> {activePreview.mathematicalSafetyExplanation}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={cancelPreview}
                      className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 font-semibold"
                    >
                      Cancel Preview
                    </button>
                    <button
                      onClick={() => {
                        const rep = selectedDiagnostic?.repairs?.find((r) => r.id === activePreview.repairId);
                        if (rep) {
                          applyRepair(rep);
                        } else {
                          cancelPreview();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Apply Repair
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-2xs italic">
              Select a diagnostic issue from the left panel to inspect details and repair suggestions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsTab;
