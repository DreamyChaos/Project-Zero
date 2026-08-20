import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, CornerDownLeft, X } from 'lucide-react';

interface TransitionSymbolModalProps {
  isOpen: boolean;
  sourceLabel: string;
  targetLabel: string;
  onConfirm: (symbol: string) => void;
  onCancel: () => void;
}

const PRESET_SYMBOLS = ['0', '1', 'a', 'b', 'ε', 'λ', 'x', 'y'];

export const TransitionSymbolModal: React.FC<TransitionSymbolModalProps> = ({
  isOpen,
  sourceLabel,
  targetLabel,
  onConfirm,
  onCancel,
}) => {
  const [symbol, setSymbol] = useState('0');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSymbol('0');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(symbol.trim() || 'ε');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-bg-surface1 border border-border-subtle rounded-xl shadow-2xl w-full max-w-sm overflow-hidden select-none animate-scaleUp">
        {/* Header */}
        <div className="p-4 border-b border-border-subtle bg-bg-surface2/50 flex items-center justify-between">
          <div>
            <h3 id="modal-title" className="text-sm font-semibold text-txt-primary flex items-center space-x-1.5">
              <span>Transition Input Symbol</span>
            </h3>
            <p className="text-[11px] text-txt-secondary mt-0.5 flex items-center space-x-1 font-mono">
              <span className="font-bold text-accent-primary">{sourceLabel}</span>
              <ArrowRight size={12} className="text-txt-muted" />
              <span className="font-bold text-accent-primary">{targetLabel}</span>
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-txt-muted hover:text-txt-primary hover:bg-bg-surface3 transition-colors"
            title="Cancel (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">
              Read Symbol / String (Σ)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. a, 0, ε, λ, 01"
              className="w-full px-3 py-2 text-sm font-mono bg-bg-surface2 border border-border-subtle rounded-lg text-txt-primary focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all"
            />
          </div>

          {/* Quick Preset Symbol Chips */}
          <div>
            <label className="block text-[11px] text-txt-muted mb-1.5">Quick Symbols</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SYMBOLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSymbol(s);
                    inputRef.current?.focus();
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
                    symbol === s
                      ? 'bg-accent-primary text-white border-accent-primary font-bold'
                      : 'bg-bg-surface2 border-border-subtle text-txt-secondary hover:bg-bg-surface3 hover:text-txt-primary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-bg-surface2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium bg-accent-primary text-white hover:bg-accent-hover rounded-lg shadow-sm flex items-center space-x-1 transition-all"
            >
              <span>Create Transition</span>
              <CornerDownLeft size={12} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
