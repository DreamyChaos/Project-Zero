import React, { useState } from 'react';
import {
  Zap,
  Layers,
  Binary,
  CheckCircle2,
  Sparkles,
  ArrowRightLeft,
  Search,
} from 'lucide-react';
import { useGraph } from '../../context/GraphContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AutomatonType } from '@project-zero/shared';

export const SidebarExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'convert' | 'analyze' | 'templates'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const { nodes, machineType, replaceMachine, setMachineType } = useGraph();
  const { expandPanel, setActiveInspectorTab } = useWorkspace();

  // On initial mount, populate canvas with default DFA if canvas is empty
  React.useEffect(() => {
    if (nodes.length === 0) {
      replaceMachine(
        [
          { id: 'q0', label: 'q0', x: 200, y: 200, isInitial: true, isAccepting: true },
          { id: 'q1', label: 'q1', x: 400, y: 200, isInitial: false, isAccepting: false },
        ],
        [
          { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
          { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
          { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1' },
          { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
        ],
        'DFA'
      );
    }
  }, []);

  const handleStartBlank = (type: AutomatonType) => {
    setMachineType(type);
    replaceMachine([], [], type);
  };

  const handleLoadExample = (id: string) => {
    if (id === 'dfa-1') {
      replaceMachine(
        [
          { id: 'q0', label: 'q0', x: 200, y: 200, isInitial: true, isAccepting: true },
          { id: 'q1', label: 'q1', x: 400, y: 200, isInitial: false, isAccepting: false },
        ],
        [
          { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
          { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
          { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1' },
          { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
        ],
        'DFA'
      );
    } else if (id === 'nfa-1') {
      replaceMachine(
        [
          { id: 'q0', label: 'q0', x: 150, y: 200, isInitial: true, isAccepting: false },
          { id: 'q1', label: 'q1', x: 320, y: 200, isInitial: false, isAccepting: false },
          { id: 'q2', label: 'q2', x: 490, y: 200, isInitial: false, isAccepting: true },
        ],
        [
          { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0, 1' },
          { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
          { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q2', label: '1' },
        ],
        'NFA'
      );
    } else if (id === 'pda-1') {
      replaceMachine(
        [
          { id: 'q0', label: 'q0', x: 200, y: 200, isInitial: true, isAccepting: false },
          { id: 'q1', label: 'q1', x: 400, y: 200, isInitial: false, isAccepting: true },
        ],
        [
          { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 -> AZ0' },
          { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, A -> ε' },
          { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, A -> ε' },
        ],
        'PDA',
        'Z0'
      );
    } else if (id === 'tm-1') {
      replaceMachine(
        [
          { id: 'q0', label: 'q0', x: 200, y: 200, isInitial: true, isAccepting: false },
          { id: 'q1', label: 'q1', x: 400, y: 200, isInitial: false, isAccepting: true },
        ],
        [
          { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: '1 -> 1, R' },
          { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: '□ -> 1, R' },
        ],
        'TM',
        undefined,
        '□'
      );
    } else if (id.startsWith('cfg-')) {
      const cfgTab = document.getElementById('tab-grammar');
      if (cfgTab) cfgTab.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs select-none">
      {/* Search & Filter Header */}
      <div className="p-2 border-b border-border-subtle bg-bg-surface1/50 flex items-center space-x-1.5 shrink-0">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-2 text-txt-muted" />
          <input
            type="text"
            placeholder="Search laboratory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-surface2 border border-border-subtle rounded-md pl-8 pr-2 py-1 text-xs text-txt-primary placeholder-txt-muted focus:outline-none focus:border-border-focus"
          />
        </div>
      </div>

      {/* Directory Category Pills */}
      <div className="flex items-center space-x-1 p-2 border-b border-border-subtle bg-bg-surface2/30 shrink-0 font-mono text-[10px]">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-1 px-1.5 rounded text-center transition-colors ${
            activeTab === 'create'
              ? 'bg-accent-primary text-white font-bold'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface3'
          }`}
        >
          Build
        </button>
        <button
          onClick={() => setActiveTab('convert')}
          className={`flex-1 py-1 px-1.5 rounded text-center transition-colors ${
            activeTab === 'convert'
              ? 'bg-accent-primary text-white font-bold'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface3'
          }`}
        >
          Convert
        </button>
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex-1 py-1 px-1.5 rounded text-center transition-colors ${
            activeTab === 'analyze'
              ? 'bg-accent-primary text-white font-bold'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface3'
          }`}
        >
          Analyze
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-1 px-1.5 rounded text-center transition-colors ${
            activeTab === 'templates'
              ? 'bg-accent-primary text-white font-bold'
              : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface3'
          }`}
        >
          Library
        </button>
      </div>

      {/* Primary Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* BUILD TAB */}
        {activeTab === 'create' && (
          <div className="space-y-3">
            <div>
              <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-1.5 px-1">
                Construct Formal Model
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleStartBlank('DFA')}
                  className="p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-border-strong text-left transition-all flex flex-col space-y-0.5"
                >
                  <span className="font-semibold text-txt-primary text-xs">DFA</span>
                  <span className="text-[10px] text-txt-muted">Deterministic Finite</span>
                </button>
                <button
                  onClick={() => handleStartBlank('NFA')}
                  className="p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-border-strong text-left transition-all flex flex-col space-y-0.5"
                >
                  <span className="font-semibold text-txt-primary text-xs">NFA</span>
                  <span className="text-[10px] text-txt-muted">Non-Deterministic</span>
                </button>
                <button
                  onClick={() => handleStartBlank('PDA')}
                  className="p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-border-strong text-left transition-all flex flex-col space-y-0.5"
                >
                  <span className="font-semibold text-txt-primary text-xs">PDA</span>
                  <span className="text-[10px] text-txt-muted">Pushdown Automaton</span>
                </button>
                <button
                  onClick={() => handleStartBlank('TM')}
                  className="p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-border-strong text-left transition-all flex flex-col space-y-0.5"
                >
                  <span className="font-semibold text-txt-primary text-xs">Turing Machine</span>
                  <span className="text-[10px] text-txt-muted">Tape Computation</span>
                </button>
              </div>
            </div>

            <div>
              <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-1.5 px-1">
                Formal Grammar & Syntax
              </span>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    const cfgTab = document.getElementById('tab-grammar');
                    if (cfgTab) cfgTab.click();
                  }}
                  className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-border-strong text-left transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-txt-primary">Context-Free Grammar (CFG)</div>
                    <div className="text-[10px] text-txt-muted">Production rules S → aSb | ε</div>
                  </div>
                  <Sparkles size={14} className="text-accent-primary shrink-0" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONVERT TAB */}
        {activeTab === 'convert' && (
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-1 px-1">
              Active Context: {machineType}
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  expandPanel('inspector');
                  setActiveInspectorTab('analysis');
                }}
                className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-border-strong text-left transition-all flex items-center space-x-2"
              >
                <ArrowRightLeft size={14} className="text-accent-primary shrink-0" />
                <div>
                  <div className="font-medium text-txt-primary">NFA → DFA Subset Construction</div>
                  <div className="text-[10px] text-txt-muted">Powerset state transformation</div>
                </div>
              </button>

              <button
                onClick={() => {
                  expandPanel('inspector');
                  setActiveInspectorTab('analysis');
                }}
                className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-border-strong text-left transition-all flex items-center space-x-2"
              >
                <Zap size={14} className="text-semantic-warning shrink-0" />
                <div>
                  <div className="font-medium text-txt-primary">Hopcroft DFA Minimization</div>
                  <div className="text-[10px] text-txt-muted">State equivalence partition</div>
                </div>
              </button>

              <button
                onClick={() => {
                  expandPanel('inspector');
                  setActiveInspectorTab('analysis');
                }}
                className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-border-strong text-left transition-all flex items-center space-x-2"
              >
                <Binary size={14} className="text-semantic-accept shrink-0" />
                <div>
                  <div className="font-medium text-txt-primary">State Elimination → RegEx</div>
                  <div className="text-[10px] text-txt-muted">GNFA equation reduction</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ANALYZE TAB */}
        {activeTab === 'analyze' && (
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-1 px-1">
              Verification & Proofs
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  expandPanel('inspector');
                  setActiveInspectorTab('diagnostics');
                }}
                className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-left transition-all flex items-center space-x-2"
              >
                <CheckCircle2 size={14} className="text-semantic-accept shrink-0" />
                <div>
                  <div className="font-medium text-txt-primary">DFA Completeness & Reachability</div>
                  <div className="text-[10px] text-txt-muted">Inspect total delta function</div>
                </div>
              </button>

              <button
                onClick={() => {
                  expandPanel('inspector');
                  setActiveInspectorTab('analysis');
                }}
                className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-left transition-all flex items-center space-x-2"
              >
                <Layers size={14} className="text-accent-primary shrink-0" />
                <div>
                  <div className="font-medium text-txt-primary">Language Equivalence Check</div>
                  <div className="text-[10px] text-txt-muted">Compute minimal counterexample</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-1 px-1">
              Academic Example Workspaces
            </span>

            <button
              onClick={() => handleLoadExample('dfa-1')}
              className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-left transition-all flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-txt-primary">DFA: Even Count of Zeros</div>
                <div className="text-[10px] text-txt-muted">L = &#123; w | #₀(w) mod 2 = 0 &#125;</div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 font-mono rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                DFA
              </span>
            </button>

            <button
              onClick={() => handleLoadExample('nfa-1')}
              className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-left transition-all flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-txt-primary">NFA: Ends with "01"</div>
                <div className="text-[10px] text-txt-muted">L = &#123; w 01 | w ∈ &#123;0,1&#125;* &#125;</div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 font-mono rounded bg-semantic-warning/20 text-semantic-warning border border-semantic-warning/30">
                NFA
              </span>
            </button>

            <button
              onClick={() => handleLoadExample('pda-1')}
              className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-left transition-all flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-txt-primary">PDA: L = &#123; aⁿbⁿ &#125;</div>
                <div className="text-[10px] text-txt-muted">Pushdown stack matching</div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 font-mono rounded bg-semantic-accept/20 text-semantic-accept border border-semantic-accept/30">
                PDA
              </span>
            </button>

            <button
              onClick={() => handleLoadExample('tm-1')}
              className="w-full p-2 rounded-md bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-left transition-all flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-txt-primary">TM: Unary Increment</div>
                <div className="text-[10px] text-txt-muted">Turing Machine tape increment</div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 font-mono rounded bg-semantic-info/20 text-semantic-info border border-semantic-info/30">
                TM
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Selected Workspace Status Footer */}
      <div className="p-2.5 border-t border-border-subtle bg-bg-surface2/60 space-y-1">
        <div className="flex items-center justify-between font-medium text-txt-primary">
          <span>Active Workspace</span>
          <span className="text-[10px] px-1.5 py-0.2 font-mono rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
            {machineType}
          </span>
        </div>
        <p className="text-[11px] text-txt-muted">Unified Computational Laboratory Workspace Active.</p>
      </div>
    </div>
  );
};

