import React, { useState } from 'react';
import { useGraph } from '../../context/GraphContext';
import { useExecution } from '../../context/ExecutionContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { convertNfaToDfa, minimizeDFA } from '@project-zero/core-solver';
import { serializeMachine, deserializeMachine } from '../../utils/serialization';
import { RegexModal } from '../modals/RegexModal';
import { IToolbarItem } from './types';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarGroup } from './ToolbarGroup';
import {
  MousePointer,
  BoxSelect,
  CircleDot,
  ArrowUpRight,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RefreshCw,
  Zap,
  Code,
  Bot,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Save,
  FolderOpen,
  FilePlus,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { MachineAnalysisModal } from '../modals/MachineAnalysisModal';

export const DesktopToolbar: React.FC = () => {
  const [isRegexModalOpen, setIsRegexModalOpen] = useState<boolean>(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);

  const [isTransformMenuOpen, setIsTransformMenuOpen] = useState<boolean>(false);
  const [isAnalyzeMenuOpen, setIsAnalyzeMenuOpen] = useState<boolean>(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState<boolean>(false);

  const { setActiveBottomTab, setActiveInspectorTab, expandPanel } = useWorkspace();
  const {
    activeTool,
    setTool,
    undo,
    redo,
    canUndo,
    canRedo,
    clearCanvas,
    nodes,
    edges,
    machineType,
    initialStackSymbol,
    blankSymbol,
    replaceMachine,
    setLastMinimizationResult,
    setLastRegexResult,
  } = useGraph();

  const handleDfaMinimization = () => {
    if (machineType !== 'DFA') return;
    const res = minimizeDFA({ nodes, edges });
    setLastMinimizationResult(res);

    if (res.success && !res.isAlreadyMinimal && res.nodes.length > 0) {
      replaceMachine([...res.nodes], [...res.edges], 'DFA');
    }
    setActiveInspectorTab('explanation');
  };
  const { run, step, back, reset, canRun, canStep, canBack, canReset, isPlaying } = useExecution();
  const [gridSnap, setGridSnap] = useState<boolean>(true);

  // Map toolbar button IDs to CanvasTool values
  const handleToolSelect = (toolId: string): void => {
    switch (toolId) {
      case 'select':
      case 'box-select':
        setTool('select');
        break;
      case 'state':
        setTool('add-state');
        break;
      case 'edge':
        setTool('add-transition');
        break;
      case 'erase':
        setTool('erase');
        break;
      default:
        setTool('select');
    }
  };

  // Map CanvasTool back to button pressed state
  const isToolActive = (toolId: string): boolean => {
    switch (toolId) {
      case 'select':      return activeTool === 'select';
      case 'box-select':  return false; // marquee is engine-internal
      case 'state':       return activeTool === 'add-state';
      case 'edge':        return activeTool === 'add-transition';
      case 'erase':       return activeTool === 'erase';
      default:            return false;
    }
  };

  // 1. Selection Tools Pod
  const selectionTools: IToolbarItem[] = [
    {
      id: 'select',
      label: 'Select',
      category: 'selection',
      icon: MousePointer,
      shortcut: 'V',
      tooltip: 'Pointer Selection Tool',
      isActive: isToolActive('select'),
      onClick: () => handleToolSelect('select'),
    },
    {
      id: 'box-select',
      label: 'Box',
      category: 'selection',
      icon: BoxSelect,
      shortcut: 'Shift+V',
      tooltip: 'Box Marquee Multi-Select',
      isActive: isToolActive('box-select'),
      onClick: () => handleToolSelect('box-select'),
    },
  ];

  // 2. Creation Tools & History Pod
  const creationTools: IToolbarItem[] = [
    {
      id: 'state',
      label: 'State',
      category: 'creation',
      icon: CircleDot,
      shortcut: 'S',
      tooltip: 'Place State Node',
      isActive: isToolActive('state'),
      onClick: () => handleToolSelect('state'),
    },
    {
      id: 'edge',
      label: 'Edge',
      category: 'creation',
      icon: ArrowUpRight,
      shortcut: 'T',
      tooltip: 'Draw Transition Edge',
      isActive: isToolActive('edge'),
      onClick: () => handleToolSelect('edge'),
    },
    {
      id: 'undo',
      label: 'Undo',
      category: 'creation',
      icon: RotateCcw,
      shortcut: 'Ctrl+Z',
      tooltip: 'Undo Last Mutation (Ctrl+Z)',
      isDisabled: !canUndo,
      onClick: undo,
    },
    {
      id: 'redo',
      label: 'Redo',
      category: 'creation',
      icon: RefreshCw,
      shortcut: 'Ctrl+Shift+Z',
      tooltip: 'Redo Undone Mutation (Ctrl+Shift+Z)',
      isDisabled: !canRedo,
      onClick: redo,
    },
    {
      id: 'clear',
      label: 'New',
      category: 'creation',
      icon: FilePlus,
      shortcut: '',
      tooltip: 'New Machine / Clear Canvas',
      onClick: clearCanvas,
    },
    {
      id: 'save',
      label: 'Save',
      category: 'creation',
      icon: Save,
      shortcut: 'Ctrl+S',
      tooltip: 'Save Machine to File (.projectzero)',
      onClick: () => handleSaveMachine(),
    },
    {
      id: 'open',
      label: 'Open',
      category: 'creation',
      icon: FolderOpen,
      shortcut: 'Ctrl+O',
      tooltip: 'Open Machine File (.projectzero)',
      onClick: () => handleOpenMachine(),
    },
  ];

  // 3. Simulation Controls Pod
  const simulationControls: IToolbarItem[] = [
    {
      id: 'sim-play',
      label: isPlaying ? 'Pause' : 'Run',
      category: 'simulation',
      icon: isPlaying ? Pause : Play,
      shortcut: 'Space',
      tooltip: 'Simulate Automaton Execution (Space)',
      isDisabled: !canRun,
      onClick: () => {
        expandPanel('bottomPanel');
        setActiveBottomTab('trace');
        run();
      },
    },
    {
      id: 'sim-back',
      label: 'Back',
      category: 'simulation',
      icon: SkipBack,
      shortcut: '←',
      tooltip: 'Step Back 1 Character (Left Arrow)',
      isDisabled: !canBack,
      onClick: () => {
        expandPanel('bottomPanel');
        setActiveBottomTab('trace');
        back();
      },
    },
    {
      id: 'sim-forward',
      label: 'Step',
      category: 'simulation',
      icon: SkipForward,
      shortcut: '→',
      tooltip: 'Step Forward 1 Character (Right Arrow)',
      isDisabled: !canStep,
      onClick: () => {
        expandPanel('bottomPanel');
        setActiveBottomTab('trace');
        step();
      },
    },
    {
      id: 'sim-reset',
      label: 'Reset',
      category: 'simulation',
      icon: RotateCcw,
      shortcut: 'R',
      tooltip: 'Reset Execution Trace (R)',
      isDisabled: !canReset,
      onClick: () => {
        expandPanel('bottomPanel');
        setActiveBottomTab('trace');
        reset();
      },
    },
  ];

  const handleSaveMachine = () => {
    try {
      const jsonStr = serializeMachine(
        nodes,
        edges,
        machineType,
        {
          name: `Automaton_${machineType}`,
          updatedAt: new Date().toISOString(),
        },
        initialStackSymbol,
        blankSymbol
      );
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `automaton_${machineType.toLowerCase()}_${Date.now()}.projectzero`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to save machine file:', err);
    }
  };

  const handleOpenMachine = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.projectzero,.json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const restored = deserializeMachine(content);
          replaceMachine(restored.nodes, restored.edges, restored.machineType, restored.initialStackSymbol, restored.blankSymbol);
        } catch (err) {
          alert(`Failed to load machine file: ${err instanceof Error ? err.message : 'Invalid machine file'}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleNfaToDfaConversion = () => {
    if (machineType !== 'NFA') return;
    const res = convertNfaToDfa({ nodes, edges });
    if (res.success && res.nodes.length > 0) {
      replaceMachine([...res.nodes], [...res.edges], 'DFA');
    }
  };

  // 4. Conversion Controls Pod
  const conversionControls: IToolbarItem[] = [
    {
      id: 'conv-subset',
      label: 'NFA→DFA',
      category: 'conversion',
      icon: RefreshCw,
      shortcut: 'Alt+C',
      tooltip: machineType === 'NFA' ? 'Convert NFA to equivalent DFA via Subset Construction' : 'NFA to DFA Conversion (Active in NFA mode)',
      isDisabled: machineType !== 'NFA',
      onClick: handleNfaToDfaConversion,
    },
    {
      id: 'conv-hopcroft',
      label: 'Minimize',
      category: 'conversion',
      icon: Zap,
      shortcut: 'Alt+M',
      tooltip: machineType === 'DFA' ? 'Minimize DFA using Partition Refinement' : 'DFA minimization requires DFA mode.',
      isDisabled: machineType !== 'DFA',
      onClick: handleDfaMinimization,
    },
    {
      id: 'conv-regex',
      label: 'RegEx',
      category: 'conversion',
      icon: Code,
      shortcut: 'Alt+R',
      tooltip: 'Construct ε-NFA from Regular Expression',
      isDisabled: false,
      onClick: () => setIsRegexModalOpen(true),
    },
  ];



  // 5. AI Controls Pod
  const aiControls: IToolbarItem[] = [
    {
      id: 'ai-analyze',
      label: 'Analyze',
      category: 'ai',
      icon: Sparkles,
      shortcut: 'Alt+A',
      tooltip: 'Analyze Machine in Right Inspector Panel',
      isDisabled: false,
      onClick: () => {
        expandPanel('inspector');
        setActiveInspectorTab('analysis');
      },
    },
    {
      id: 'ai-ask',
      label: 'AI Tutor',
      category: 'ai',
      icon: Bot,
      shortcut: 'Ctrl+K',
      tooltip: 'Ask AI Automata Tutor in Right Inspector',
      isDisabled: false,
      onClick: () => {
        expandPanel('inspector');
        setActiveInspectorTab('analysis');
      },
    },
  ];

  // 6. View Controls Pod
  const viewControls: IToolbarItem[] = [
    {
      id: 'view-zoomin',
      label: 'Zoom In',
      category: 'view',
      icon: ZoomIn,
      shortcut: '+',
      tooltip: 'Zoom In Canvas',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('projectzero:zoom', { detail: { factor: 1.2 } }));
      },
    },
    {
      id: 'view-zoomout',
      label: 'Zoom Out',
      category: 'view',
      icon: ZoomOut,
      shortcut: '-',
      tooltip: 'Zoom Out Canvas',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('projectzero:zoom', { detail: { factor: 0.8 } }));
      },
    },
    {
      id: 'view-fit',
      label: 'Fit',
      category: 'view',
      icon: Maximize,
      shortcut: 'Shift+1',
      tooltip: 'Fit Canvas to Screen',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('projectzero:fitview'));
      },
    },
    {
      id: 'view-snap',
      label: 'Snap',
      category: 'view',
      icon: Grid,
      shortcut: 'Shift+G',
      tooltip: 'Toggle Grid Snap',
      isActive: gridSnap,
      onClick: () => setGridSnap((prev) => !prev),
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Canvas Workspace Toolbar"
      className="h-10 bg-bg-surface1/90 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-3 select-none z-20 space-x-2 w-full max-w-full overflow-x-auto overflow-y-hidden shrink-0"
    >
      {/* Primary Tools Pods (Selection, Creation, Execution) */}
      <div className="flex items-center space-x-1.5 shrink-0">
        <ToolbarGroup label="Selection Tools">
          {selectionTools.map((item) => (
            <ToolbarButton key={item.id} item={item} />
          ))}
        </ToolbarGroup>

        <ToolbarGroup label="Creation Tools">
          {creationTools.map((item) => (
            <ToolbarButton key={item.id} item={item} />
          ))}
        </ToolbarGroup>

        <ToolbarGroup label="Simulation Controls">
          {simulationControls.map((item) => (
            <ToolbarButton key={item.id} item={item} />
          ))}
        </ToolbarGroup>
      </div>

      {/* Secondary Tools Pods — Full on Desktop (>1600px), Adaptive Dropdowns on Laptop (1280px-1600px) */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Full Desktop Pods */}
        <div className="hidden 2xl:flex items-center space-x-1.5">
          <ToolbarGroup label="Automata Conversions">
            {conversionControls.map((item) => (
              <ToolbarButton key={item.id} item={item} />
            ))}
          </ToolbarGroup>

          <ToolbarGroup label="AI Tutor Controls">
            {aiControls.map((item) => (
              <ToolbarButton key={item.id} item={item} />
            ))}
          </ToolbarGroup>

          <ToolbarGroup label="Canvas View Controls">
            {viewControls.map((item) => (
              <ToolbarButton key={item.id} item={item} />
            ))}
          </ToolbarGroup>
        </div>

        {/* Adaptive Laptop Dropdown Menus (<1600px) */}
        <div className="flex 2xl:hidden items-center space-x-1">
          {/* Transform Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsTransformMenuOpen((prev) => !prev);
                setIsAnalyzeMenuOpen(false);
                setIsViewMenuOpen(false);
              }}
              className="h-7 px-2 bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle rounded text-xs font-medium text-text-primary flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Transform</span>
              <ChevronDown className="w-3 h-3 text-text-muted" />
            </button>
            {isTransformMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-bg-surface1 border border-border-subtle rounded shadow-xl py-1 z-30">
                {conversionControls.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.isDisabled}
                    onClick={() => {
                      item.onClick?.();
                      setIsTransformMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between text-text-primary hover:bg-bg-surface2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center space-x-2">
                      <item.icon className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && <span className="text-[10px] text-text-muted">{item.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Analyze Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsAnalyzeMenuOpen((prev) => !prev);
                setIsTransformMenuOpen(false);
                setIsViewMenuOpen(false);
              }}
              className="h-7 px-2 bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle rounded text-xs font-medium text-text-primary flex items-center space-x-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
              <span>Analyze</span>
              <ChevronDown className="w-3 h-3 text-text-muted" />
            </button>
            {isAnalyzeMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-bg-surface1 border border-border-subtle rounded shadow-xl py-1 z-30">
                {aiControls.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.isDisabled}
                    onClick={() => {
                      item.onClick?.();
                      setIsAnalyzeMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between text-text-primary hover:bg-bg-surface2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center space-x-2">
                      <item.icon className="w-3.5 h-3.5 text-accent-purple" />
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && <span className="text-[10px] text-text-muted">{item.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsViewMenuOpen((prev) => !prev);
                setIsTransformMenuOpen(false);
                setIsAnalyzeMenuOpen(false);
              }}
              className="h-7 px-2 bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle rounded text-xs font-medium text-text-primary flex items-center space-x-1 transition-colors"
            >
              <Maximize className="w-3.5 h-3.5 text-accent-blue" />
              <span>View</span>
              <ChevronDown className="w-3 h-3 text-text-muted" />
            </button>
            {isViewMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-bg-surface1 border border-border-subtle rounded shadow-xl py-1 z-30">
                {viewControls.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.isDisabled}
                    onClick={() => {
                      item.onClick?.();
                      setIsViewMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between text-text-primary hover:bg-bg-surface2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center space-x-2">
                      <item.icon className="w-3.5 h-3.5 text-accent-blue" />
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && <span className="text-[10px] text-text-muted">{item.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RegexModal
        isOpen={isRegexModalOpen}
        onClose={() => setIsRegexModalOpen(false)}
        onGenerate={(newNodes, newEdges, regexResult, inputRegex) => {
          replaceMachine(newNodes, newEdges, 'NFA');
          setLastRegexResult({ inputRegex, result: regexResult });
          setActiveInspectorTab('explanation');
        }}
      />

      <MachineAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
      />
    </div>
  );
};
