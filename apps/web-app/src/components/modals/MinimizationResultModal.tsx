import React from 'react';
import { DFAMinimizationResult } from '@project-zero/core-solver';
import { X, CheckCircle2, AlertTriangle, Cpu, Layers } from 'lucide-react';

interface MinimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DFAMinimizationResult | null;
}

export const MinimizationResultModal: React.FC<MinimizationModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-bg-surface1 border border-border-subtle rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-xs font-mono animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-surface2/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-accent-primary/15 text-accent-primary rounded-md">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="font-bold text-txt-primary text-sm">DFA Minimization Result</h3>
              <p className="text-[11px] text-txt-muted">Partition-refinement reduction & state equivalence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-txt-muted hover:text-txt-primary p-1 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Header */}
          <div
            className={`p-3 rounded-lg border flex items-center space-x-2 ${
              result.success
                ? 'bg-semantic-accept/10 border-semantic-accept/30 text-semantic-accept'
                : 'bg-semantic-error/10 border-semantic-error/30 text-semantic-error'
            }`}
          >
            {result.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <div className="font-bold text-xs">
              {result.success
                ? result.isAlreadyMinimal
                  ? '✓ DFA is already minimal! No further reduction possible.'
                  : `✓ Minimization Successful! Reduced from ${result.reachableStateCount} to ${result.minimizedStateCount} state(s).`
                : `✕ Minimization Failed: ${result.errorMessage}`}
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-bg-surface2/80 p-2.5 rounded-lg border border-border-subtle">
              <div className="text-txt-muted text-[10px]">ORIGINAL</div>
              <div className="font-bold text-txt-primary text-sm mt-0.5">{result.originalStateCount}</div>
            </div>
            <div className="bg-bg-surface2/80 p-2.5 rounded-lg border border-border-subtle">
              <div className="text-txt-muted text-[10px]">REACHABLE</div>
              <div className="font-bold text-txt-primary text-sm mt-0.5">{result.reachableStateCount}</div>
            </div>
            <div className="bg-bg-surface2/80 p-2.5 rounded-lg border border-border-subtle">
              <div className="text-txt-muted text-[10px]">UNREACHABLE</div>
              <div className="font-bold text-semantic-warning text-sm mt-0.5">{result.unreachableStateCount}</div>
            </div>
            <div className="bg-bg-surface2/80 p-2.5 rounded-lg border border-border-subtle">
              <div className="text-txt-muted text-[10px]">MINIMIZED</div>
              <div className="font-bold text-accent-primary text-sm mt-0.5">{result.minimizedStateCount}</div>
            </div>
          </div>

          {/* Equivalence Classes Section */}
          {result.equivalenceClasses.length > 0 && (
            <div className="bg-bg-surface2/60 p-3 rounded-lg border border-border-subtle space-y-2">
              <div className="font-bold text-txt-primary flex items-center space-x-1.5">
                <Layers size={14} className="text-accent-primary" />
                <span>Equivalence Classes (Partition Refinement Groups):</span>
              </div>
              <div className="space-y-1.5 text-txt-secondary text-[11px] max-h-48 overflow-y-auto pr-1">
                {result.equivalenceClasses.map((eq, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-bg-surface3 rounded border border-border-subtle flex items-center justify-between"
                  >
                    <div className="font-bold text-accent-primary">
                      State {eq.minimizedStateLabel} {eq.isInitial && '(Initial)'} {eq.isAccepting && '(Accepting)'}
                    </div>
                    <div className="text-txt-muted">
                      Original: &#123;{eq.originalStateLabels.join(', ')}&#125;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preservation Note */}
          <div className="p-2.5 bg-bg-surface2/40 rounded-lg border border-border-subtle text-[11px] text-txt-muted flex items-center justify-between">
            <span>Language Preservation: <b>✓ Strictly Equivalent</b></span>
            <span>Undo: <b>Ctrl+Z</b> to restore original</span>
          </div>
        </div>
      </div>
    </div>
  );
};
