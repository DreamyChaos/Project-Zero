import React from 'react';
import { Layers } from 'lucide-react';

export interface PDAStackVisualizerProps {
  stack?: ReadonlyArray<string>;
  initialStackSymbol?: string;
}

export const PDAStackVisualizer: React.FC<PDAStackVisualizerProps> = ({
  stack = [],
  initialStackSymbol = 'Z0',
}) => {
  // Stack top is stack[stack.length - 1]
  const displayStack = [...stack].reverse();

  return (
    <div className="bg-bg-surface2/90 border border-border-subtle rounded-xl p-3 shadow-md flex flex-col space-y-2 select-none font-mono">
      <div className="flex items-center justify-between text-xs px-1 text-txt-secondary">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-accent-primary flex items-center space-x-1">
            <Layers size={13} />
            <span>PDA Memory Stack (Γ)</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-[11px]">
            Depth: <span className="font-bold text-txt-primary">{stack.length}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-[11px]">
            Initial (Z₀): <span className="font-bold text-txt-primary">{initialStackSymbol}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-2 bg-bg-surface1/60 rounded-lg border border-border-subtle min-h-24">
        {stack.length === 0 ? (
          <span className="text-xs text-txt-muted italic font-mono">Stack Empty (ε)</span>
        ) : (
          <div className="flex flex-col items-center space-y-1 w-48">
            <div className="text-[10px] text-accent-primary font-bold tracking-wider">▲ TOP OF STACK ▲</div>
            {displayStack.map((sym, idx) => {
              const isTop = idx === 0;
              const isInitial = sym === initialStackSymbol;
              return (
                <div
                  key={idx}
                  className={`w-full py-1 px-3 rounded text-center text-xs font-bold font-mono border transition-all ${
                    isTop
                      ? 'bg-accent-primary/20 border-accent-primary text-accent-primary shadow-sm ring-1 ring-accent-primary/50'
                      : isInitial
                      ? 'bg-semantic-info/15 border-semantic-info/30 text-txt-primary'
                      : 'bg-bg-surface3 border-border-subtle text-txt-secondary'
                  }`}
                >
                  {sym}
                </div>
              );
            })}
            <div className="text-[10px] text-txt-muted tracking-wider">▼ BOTTOM OF STACK ▼</div>
          </div>
        )}
      </div>
    </div>
  );
};
