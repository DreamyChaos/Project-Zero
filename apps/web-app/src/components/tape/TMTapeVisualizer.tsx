import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TMTapeVisualizerProps {
  tapeContents?: Record<number, string>;
  headIndex?: number;
  blankSymbol?: string;
  readSymbol?: string;
  writeSymbol?: string;
  moveDirection?: 'L' | 'R' | 'S';
  stepIndex?: number;
  isHalted?: boolean;
  isAccepting?: boolean;
  rejectionReason?: string;
}

export const TMTapeVisualizer: React.FC<TMTapeVisualizerProps> = ({
  tapeContents = {},
  headIndex = 0,
  blankSymbol = '□',
  readSymbol,
  writeSymbol,
  moveDirection,
  stepIndex = 0,
  isHalted = false,
  isAccepting = false,
  rejectionReason,
}) => {
  const [viewOffset, setViewOffset] = useState<number>(0);

  // Automatically center view on tape head whenever stepIndex changes (or headIndex changes)
  useEffect(() => {
    setViewOffset(0);
  }, [stepIndex, headIndex]);

  // Compute visible cell range around headIndex + viewOffset
  const windowRadius = 7;
  const centerPos = headIndex + viewOffset;
  const startPos = centerPos - windowRadius;
  const endPos = centerPos + windowRadius;

  const visibleCells: Array<{ index: number; symbol: string; isHead: boolean }> = [];
  for (let i = startPos; i <= endPos; i++) {
    const symbol = tapeContents[i] !== undefined ? tapeContents[i] : blankSymbol;
    visibleCells.push({
      index: i,
      symbol,
      isHead: i === headIndex,
    });
  }

  const handleShiftLeft = () => setViewOffset((prev) => prev - 3);
  const handleShiftRight = () => setViewOffset((prev) => prev + 3);
  const handleResetCenter = () => setViewOffset(0);

  return (
    <div className="bg-bg-surface2/90 border border-border-subtle rounded-xl p-3 shadow-md flex flex-col space-y-2 select-none font-mono">
      {/* Header telemetry */}
      <div className="flex items-center justify-between text-xs px-1 text-txt-secondary">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-accent-primary">Infinite Tape (Γ)</span>
          <span className="px-1.5 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-[11px]">
            Head Index: <span className="font-bold text-txt-primary">{headIndex}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-[11px]">
            Blank (B): <span className="font-bold text-txt-primary">{blankSymbol}</span>
          </span>
        </div>
        {isHalted ? (
          <div className="text-[11px] font-bold">
            {isAccepting ? (
              <span className="text-semantic-accept">ACCEPT — Terminal Configuration</span>
            ) : rejectionReason === 'INCONCLUSIVE_LIMIT' ? (
              <span className="text-semantic-warning">INCONCLUSIVE — Limit Reached</span>
            ) : (
              <span className="text-semantic-error">REJECT — No Transition Executed</span>
            )}
          </div>
        ) : moveDirection ? (
          <div className="text-[11px] font-bold text-accent-secondary">
            Action: {readSymbol ?? '?'} → {writeSymbol ?? '?'}, Move {moveDirection}
          </div>
        ) : null}
      </div>

      {/* Tape Tape Strip Container */}
      <div className="flex items-center space-x-1">
        <button
          onClick={handleShiftLeft}
          className="p-1 rounded bg-bg-surface3 hover:bg-bg-surface1 text-txt-muted hover:text-txt-primary transition-all shrink-0"
          title="Scroll Tape Left"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex-1 flex items-center justify-center space-x-1.5 overflow-x-auto py-2">
          {visibleCells.map(({ index, symbol, isHead }) => (
            <div
              key={index}
              className={`flex flex-col items-center shrink-0 transition-all duration-200 ${
                isHead ? 'scale-105' : 'opacity-85'
              }`}
            >
              {/* Position Label */}
              <span className={`text-[10px] mb-1 font-mono ${isHead ? 'text-accent-primary font-bold' : 'text-txt-muted'}`}>
                {index}
              </span>

              {/* Tape Cell Box */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border transition-all duration-200 shadow-sm ${
                  isHead
                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary shadow-accent-primary/20 ring-2 ring-accent-primary/50'
                    : symbol === blankSymbol
                    ? 'bg-bg-surface3/40 border-border-subtle text-txt-muted'
                    : 'bg-bg-surface3 border-border-subtle text-txt-primary'
                }`}
              >
                {symbol}
              </div>

              {/* Head Pointer Indicator */}
              <div className="h-4 flex items-center justify-center mt-1">
                {isHead && (
                  <span className="text-[10px] font-bold text-accent-primary animate-pulse">
                    ▲
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleShiftRight}
          className="p-1 rounded bg-bg-surface3 hover:bg-bg-surface1 text-txt-muted hover:text-txt-primary transition-all shrink-0"
          title="Scroll Tape Right"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {viewOffset !== 0 && (
        <div className="text-right px-1">
          <button
            onClick={handleResetCenter}
            className="text-[10px] text-accent-primary hover:underline"
          >
            Reset View to Tape Head
          </button>
        </div>
      )}
    </div>
  );
};
