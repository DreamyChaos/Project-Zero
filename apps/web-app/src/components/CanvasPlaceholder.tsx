import React from 'react';
import { ZoomIn, ZoomOut, Home, Maximize2 } from 'lucide-react';

export const CanvasPlaceholder: React.FC = () => {
  return (
    <div className="flex-1 relative bg-bg-base overflow-hidden flex items-center justify-center select-none">
      {/* SVG Spatial Grid Pattern Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" width="100%" height="100%">
        <defs>
          <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" className="text-border-strong" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* Center Milestone 3 Canvas Engine Placeholder Card */}
      <div className="relative z-10 text-center p-8 bg-bg-surface1/80 backdrop-blur-md rounded-2xl border border-border-subtle shadow-2xl max-w-sm mx-auto">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary">
          <Maximize2 size={24} />
        </div>
        <h2 className="text-xl font-bold text-txt-primary tracking-tight mb-1">Canvas Engine</h2>
        <p className="text-sm font-mono text-accent-primary mb-3">Coming in Milestone 3</p>
        <p className="text-xs text-txt-muted leading-relaxed">
          The high-performance WebGL2 / Canvas2D dual renderer with spatial graph manipulation and ARIA screen reader overlay will be implemented in Milestone 3.
        </p>
      </div>

      {/* Spatial Zoom Widget Pod (Bottom Right Overlay) */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center space-x-1 bg-bg-surface1/90 backdrop-blur-md p-1 rounded-lg border border-border-subtle shadow-lg text-xs">
        <button title="Zoom In (+)" className="p-1.5 rounded text-txt-secondary hover:text-txt-primary hover:bg-bg-surface2">
          <ZoomIn size={15} />
        </button>
        <button title="Zoom Out (-)" className="p-1.5 rounded text-txt-secondary hover:text-txt-primary hover:bg-bg-surface2">
          <ZoomOut size={15} />
        </button>
        <button title="Reset View (Home)" className="p-1.5 rounded text-txt-secondary hover:text-txt-primary hover:bg-bg-surface2">
          <Home size={15} />
        </button>
        <div className="h-4 w-px bg-border-subtle mx-1" />
        <span className="font-mono text-txt-muted px-1.5">100%</span>
      </div>
    </div>
  );
};
