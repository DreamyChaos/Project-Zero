import React, { useState } from 'react';
import { convertRegexToNFA } from '@project-zero/core-solver';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import { X, Sparkles, ArrowRight } from 'lucide-react';

import { RegexToNFAResult } from '@project-zero/core-solver';

interface RegexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (nodes: StateNode[], edges: TransitionEdge[], result: RegexToNFAResult, inputRegex: string) => void;
}

export const RegexModal: React.FC<RegexModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [regex, setRegex] = useState<string>('(a|b)*abb');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-bg-surface1 border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-5 text-xs font-mono space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-accent-primary/15 text-accent-primary rounded-md">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-bold text-txt-primary text-sm">Regex → Thompson ε-NFA</h3>
              <p className="text-[11px] text-txt-muted">Convert regular expressions into state machines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-txt-muted hover:text-txt-primary p-1 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} className="space-y-3">
          <div>
            <label className="block text-txt-secondary font-medium mb-1 text-[11px]">
              Regular Expression Syntax (Symbols, |, *, +, ?, (), ε, λ):
            </label>
            <input
              type="text"
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              placeholder="e.g. (a|b)*abb, a+b?, ε"
              className="w-full bg-bg-surface3 border border-border-subtle focus:border-accent-primary px-3 py-2 rounded-lg text-txt-primary font-mono font-bold text-sm outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-border-subtle text-txt-secondary hover:bg-bg-surface2 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-accent-primary hover:bg-accent-hover text-white font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <span>Construct ε-NFA</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
