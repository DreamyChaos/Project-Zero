import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { convertRegexToNFA, parseRegex, RegexToNFAResult } from '@project-zero/core-solver';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import { Sparkles, X, ArrowRight, Terminal, CheckCircle2, AlertCircle, Bookmark } from 'lucide-react';

interface RegexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (nodes: StateNode[], edges: TransitionEdge[], result: RegexToNFAResult, inputRegex: string) => void;
}

const REGEX_PRESETS = [
  { label: 'Ends with "abb"', expr: '(a|b)*abb', desc: 'Binary/symbol matching' },
  { label: 'Ends with "01"', expr: '(0|1)*01', desc: 'Standard binary pattern' },
  { label: 'Prefix a with (b|c)*', expr: 'a(b|c)*', desc: 'Concatenation & star' },
  { label: '1+ repetitions (ab)+', expr: '(ab)+', desc: 'Positive closure' },
  { label: 'Ordered a*b*', expr: 'a*b*', desc: 'Multi-symbol stars' },
  { label: 'Optional prefix a?b', expr: 'a?b', desc: 'Optional symbol match' },
];

export const RegexModal: React.FC<RegexModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [regex, setRegex] = useState<string>('(a|b)*abb');
  const inputRef = useRef<HTMLInputElement>(null);

  // Live syntax parsing & validation
  const validation = useMemo(() => {
    const trimmed = regex.trim();
    return parseRegex(trimmed);
  }, [regex]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = regex.trim();
    const res = convertRegexToNFA(trimmed);

    if (res.success && res.nodes.length > 0) {
      onGenerate([...res.nodes], [...res.edges], res, trimmed);
    } else {
      onGenerate([], [], res, trimmed);
    }
    onClose();
  };

  const insertSymbol = (sym: string) => {
    setRegex((prev) => prev + sym);
    inputRef.current?.focus();
  };

  const loadPreset = (expr: string) => {
    setRegex(expr);
    inputRef.current?.focus();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Regex to NFA Conversion Modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 px-4 select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-surface1 border border-border-strong w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 font-sans"
      >
        {/* Header Title Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-bg-surface2/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-accent-primary/15 text-accent-primary rounded-lg border border-accent-primary/20">
              <Terminal size={18} />
            </div>
            <div>
              <h2 className="font-bold text-txt-primary text-sm tracking-tight flex items-center space-x-2">
                <span>RegEx → Thompson ε-NFA Conversion</span>
              </h2>
              <p className="text-[11px] text-txt-muted">
                Construct a provably equivalent non-deterministic finite automaton using Thompson's Algorithm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close RegEx Modal"
            className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-bg-surface3 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Form Body */}
        <form onSubmit={handleGenerate} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="regex-input-field" className="block text-txt-secondary text-xs font-semibold">
                Regular Expression Input:
              </label>
              {validation.success ? (
                <span className="flex items-center space-x-1 text-[11px] font-mono text-semantic-accept font-semibold">
                  <CheckCircle2 size={13} />
                  <span>Valid Syntax {regex.trim() === '' ? '(Matches ε)' : ''}</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-[11px] font-mono text-semantic-error font-semibold">
                  <AlertCircle size={13} />
                  <span>Syntax Error</span>
                </span>
              )}
            </div>

            <div
              className={`flex items-center bg-bg-surface3 border rounded-xl px-3.5 py-2.5 transition-all shadow-inner ${
                validation.success
                  ? 'border-border-subtle focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary/50'
                  : 'border-semantic-error/60 focus-within:border-semantic-error focus-within:ring-1 focus-within:ring-semantic-error/40'
              }`}
            >
              <span className="font-mono text-accent-primary font-bold text-sm mr-2 select-none">r =</span>
              <input
                id="regex-input-field"
                ref={inputRef}
                type="text"
                value={regex}
                onChange={(e) => setRegex(e.target.value)}
                placeholder="e.g. (a|b)*abb, a+b?, ε"
                className="w-full bg-transparent text-txt-primary placeholder-txt-muted font-mono font-bold text-sm outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {regex && (
                <button
                  type="button"
                  onClick={() => setRegex('')}
                  className="text-txt-muted hover:text-txt-primary text-[11px] font-mono px-1.5 py-0.5 rounded bg-bg-surface2 hover:bg-bg-surface1 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Validation Diagnostic Message */}
            {!validation.success && (
              <div className="p-2.5 rounded-lg bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-[11px] font-mono flex items-start space-x-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">{validation.errorMessage}</div>
                  {typeof validation.errorPosition === 'number' && (
                    <div className="text-[10px] text-txt-muted">
                      Error near position index {validation.errorPosition} in expression.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Academic Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-txt-muted flex items-center space-x-1">
              <Bookmark size={11} className="text-accent-primary" />
              <span>Academic Presets:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {REGEX_PRESETS.map((p) => (
                <button
                  key={p.expr}
                  type="button"
                  onClick={() => loadPreset(p.expr)}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer ${
                    regex === p.expr
                      ? 'bg-accent-primary/15 border-accent-primary text-accent-primary font-bold'
                      : 'bg-bg-surface2 hover:bg-bg-surface3 border-border-subtle text-txt-secondary hover:text-txt-primary'
                  }`}
                  title={`${p.label}: ${p.desc}`}
                >
                  {p.expr}
                </button>
              ))}
            </div>
          </div>

          {/* Clickable Quick-Insert Syntax Operators */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-txt-muted">
              <span className="font-semibold text-txt-secondary flex items-center space-x-1 text-[11px]">
                <Sparkles size={12} className="text-accent-primary" />
                <span>Supported Syntax Operators</span>
              </span>
              <span className="text-[10px]">Click chip to append to input</span>
            </div>

            <div className="grid grid-cols-6 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => insertSymbol('|')}
                className="p-2 rounded-lg bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-center transition-all hover:border-accent-primary group cursor-pointer"
                title="Union / Alternation: r1 | r2"
              >
                <div className="font-bold text-accent-primary">|</div>
                <div className="text-[9px] text-txt-muted font-sans">Union</div>
              </button>

              <button
                type="button"
                onClick={() => insertSymbol('*')}
                className="p-2 rounded-lg bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-center transition-all hover:border-accent-primary group cursor-pointer"
                title="Kleene Star: 0 or more repetitions (r*)"
              >
                <div className="font-bold text-accent-primary">*</div>
                <div className="text-[9px] text-txt-muted font-sans">Star (0+)</div>
              </button>

              <button
                type="button"
                onClick={() => insertSymbol('+')}
                className="p-2 rounded-lg bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-center transition-all hover:border-accent-primary group cursor-pointer"
                title="Plus: 1 or more repetitions (r+)"
              >
                <div className="font-bold text-accent-primary">+</div>
                <div className="text-[9px] text-txt-muted font-sans">Plus (1+)</div>
              </button>

              <button
                type="button"
                onClick={() => insertSymbol('?')}
                className="p-2 rounded-lg bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-center transition-all hover:border-accent-primary group cursor-pointer"
                title="Optional: 0 or 1 occurrence (r?)"
              >
                <div className="font-bold text-accent-primary">?</div>
                <div className="text-[9px] text-txt-muted font-sans">Optional</div>
              </button>

              <button
                type="button"
                onClick={() => insertSymbol('()')}
                className="p-2 rounded-lg bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-center transition-all hover:border-accent-primary group cursor-pointer"
                title="Parentheses: Sub-expression grouping (r)"
              >
                <div className="font-bold text-accent-primary">( )</div>
                <div className="text-[9px] text-txt-muted font-sans">Group</div>
              </button>

              <button
                type="button"
                onClick={() => insertSymbol('ε')}
                className="p-2 rounded-lg bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-center transition-all hover:border-accent-primary group cursor-pointer"
                title="Epsilon / Empty String transition"
              >
                <div className="font-bold text-accent-primary">ε</div>
                <div className="text-[9px] text-txt-muted font-sans">Epsilon</div>
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3 text-txt-muted text-[11px] font-mono">
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-bg-surface3 border border-border-subtle rounded text-[10px]">Esc</kbd>
                <span>Cancel</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-bg-surface3 border border-border-subtle rounded text-[10px]">↵</kbd>
                <span>Construct</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border-subtle text-txt-secondary hover:text-txt-primary hover:bg-bg-surface2 transition-colors font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!validation.success}
                className={`px-5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-all shadow-md text-xs ${
                  validation.success
                    ? 'bg-accent-primary hover:bg-accent-hover text-white cursor-pointer shadow-accent-primary/20'
                    : 'bg-bg-surface3 text-txt-muted border border-border-subtle cursor-not-allowed opacity-60'
                }`}
              >
                <span>Construct ε-NFA Graph</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
