import React, { useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useGraph } from '../context/GraphContext';
import { StateInspectorView } from './inspector/views/StateInspectorView';
import { TransitionInspectorView } from './inspector/views/TransitionInspectorView';
import { WorkspaceInspectorView } from './inspector/views/WorkspaceInspectorView';
import { MachineAnalysisView } from './inspector/views/MachineAnalysisView';
import { DiagnosticQuickFixView } from './inspector/views/DiagnosticQuickFixView';
import { MinimizationExplanationView } from './inspector/views/MinimizationExplanationView';
import { CircleDot, ArrowUpRight, Monitor, Sparkles, Activity, BookOpen } from 'lucide-react';

export const RightInspector: React.FC = () => {
  const {
    inspectorCollapsed,
    inspectorHidden,
    inspectorWidth,
    activeInspectorTab,
    setActiveInspectorTab,
  } = useWorkspace();
  const { selectedNodeIds, selectedEdgeIds } = useGraph();

  // Reactively sync inspector tab when selection changes on canvas
  useEffect(() => {
    if (selectedEdgeIds.length > 0) {
      setActiveInspectorTab('transition');
    } else if (selectedNodeIds.length > 0) {
      setActiveInspectorTab('state');
    }
  }, [selectedEdgeIds, selectedNodeIds, setActiveInspectorTab]);

  if (inspectorCollapsed || inspectorHidden) {
    return null;
  }

  const currentTab = activeInspectorTab || 'workspace';

  return (
    <aside
      aria-label="Property Inspector"
      id="inspector-panel"
      style={{ width: `${inspectorWidth}px` }}
      className="bg-bg-surface1 border-l border-border-subtle flex flex-col select-none z-10 shrink-0 transition-all duration-150"
    >
      {/* Inspector View Switcher Header Strip */}
      <div className="flex border-b border-border-subtle bg-bg-surface2/50 text-[11px] overflow-x-auto overflow-y-hidden shrink-0">
        <button
          title="Inspect State Node"
          onClick={() => setActiveInspectorTab('state')}
          className={`flex-1 py-1.5 px-1.5 flex items-center justify-center space-x-1 border-b-2 font-medium transition-all outline-none shrink-0 ${
            currentTab === 'state'
              ? 'border-accent-primary text-txt-primary bg-bg-surface1 font-bold'
              : 'border-transparent text-txt-muted hover:text-txt-secondary'
          }`}
        >
          <CircleDot size={12} className="shrink-0 text-accent-primary" />
          <span>State</span>
        </button>

        <button
          title="Inspect Transition Edge"
          onClick={() => setActiveInspectorTab('transition')}
          className={`flex-1 py-1.5 px-1.5 flex items-center justify-center space-x-1 border-b-2 font-medium transition-all outline-none shrink-0 ${
            currentTab === 'transition'
              ? 'border-accent-primary text-txt-primary bg-bg-surface1 font-bold'
              : 'border-transparent text-txt-muted hover:text-txt-secondary'
          }`}
        >
          <ArrowUpRight size={12} className="shrink-0 text-accent-primary" />
          <span>Edge</span>
        </button>

        <button
          title="Inspect Machine Structure"
          onClick={() => setActiveInspectorTab('workspace')}
          className={`flex-1 py-1.5 px-1.5 flex items-center justify-center space-x-1 border-b-2 font-medium transition-all outline-none shrink-0 ${
            currentTab === 'workspace'
              ? 'border-accent-primary text-txt-primary bg-bg-surface1 font-bold'
              : 'border-transparent text-txt-muted hover:text-txt-secondary'
          }`}
        >
          <Monitor size={12} className="shrink-0 text-accent-cyan" />
          <span>Machine</span>
        </button>

        <button
          title="Formal Machine Analysis"
          onClick={() => setActiveInspectorTab('analysis')}
          className={`flex-1 py-1.5 px-1.5 flex items-center justify-center space-x-1 border-b-2 font-medium transition-all outline-none shrink-0 ${
            currentTab === 'analysis'
              ? 'border-accent-primary text-txt-primary bg-bg-surface1 font-bold'
              : 'border-transparent text-txt-muted hover:text-txt-secondary'
          }`}
        >
          <Sparkles size={12} className="shrink-0 text-accent-purple" />
          <span>Analyze</span>
        </button>

        <button
          title="Formal Verification & Diagnostics"
          onClick={() => setActiveInspectorTab('diagnostics')}
          className={`flex-1 py-1.5 px-1.5 flex items-center justify-center space-x-1 border-b-2 font-medium transition-all outline-none shrink-0 ${
            currentTab === 'diagnostics'
              ? 'border-accent-primary text-txt-primary bg-bg-surface1 font-bold'
              : 'border-transparent text-txt-muted hover:text-txt-secondary'
          }`}
        >
          <Activity size={12} className="shrink-0 text-semantic-warning" />
          <span>Diag</span>
        </button>

        <button
          title="Hopcroft Minimization Explanation"
          onClick={() => setActiveInspectorTab('explanation')}
          className={`flex-1 py-1.5 px-1.5 flex items-center justify-center space-x-1 border-b-2 font-medium transition-all outline-none shrink-0 ${
            currentTab === 'explanation'
              ? 'border-accent-primary text-txt-primary bg-bg-surface1 font-bold'
              : 'border-transparent text-txt-muted hover:text-txt-secondary'
          }`}
        >
          <BookOpen size={12} className="shrink-0 text-accent-primary" />
          <span>Explanation</span>
        </button>
      </div>

      {/* Render Active Inspector View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentTab === 'state' && <StateInspectorView />}
        {currentTab === 'transition' && <TransitionInspectorView />}
        {currentTab === 'workspace' && <WorkspaceInspectorView />}
        {currentTab === 'analysis' && <MachineAnalysisView />}
        {currentTab === 'diagnostics' && <DiagnosticQuickFixView />}
        {currentTab === 'explanation' && <MinimizationExplanationView />}
      </div>
    </aside>
  );
};
