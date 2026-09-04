import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCommandPalette } from '../../context/CommandPaletteContext';
import { useTheme } from '../../context/ThemeContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useGraph } from '../../context/GraphContext';
import { COMMAND_REGISTRY } from './commandRegistry';
import { ICommand } from './types';
import { CommandItem } from './CommandItem';
import { serializeMachine } from '../../utils/serialization';
import { Search, Command as CommandIcon, X, Clock } from 'lucide-react';

const RECENT_STORAGE_KEY = 'v1_recent_commands';

export const CommandPaletteModal: React.FC = () => {
  const { isOpen, closePalette } = useCommandPalette();
  const { setTheme } = useTheme();
  const {
    toggleSidebar,
    toggleInspector,
    toggleBottomPanel,
    expandPanel,
    resetLayout,
    setActiveSidebarTab,
    setActiveBottomTab,
    toggleFocusMode,
    openAIWorkspace,
  } = useWorkspace();

  const {
    nodes,
    edges,
    machineType,
    initialStackSymbol,
    blankSymbol,
    setTool,
    setSelection,
    clearSelection,
    deleteSelected,
    setMachineType,
    undo,
    redo,
    clearCanvas,
  } = useGraph();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['canvas-focus-toggle', 'machine-set-dfa'];
    } catch {
      return ['canvas-focus-toggle', 'machine-set-dfa'];
    }
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus trap & auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter commands by matching title, category, description, or keywords
  const filtered = useMemo((): ICommand[] => {
    if (!query.trim()) return COMMAND_REGISTRY;
    const lower = query.toLowerCase().trim();
    // Normalize query variants e.g. "ll(1)" -> "ll1", "e-nfa" -> "enfa"
    const normalizedLower = lower.replace(/[^a-z0-9]/g, '');

    return COMMAND_REGISTRY.filter((cmd) => {
      const titleLower = cmd.title.toLowerCase();
      const catLower = cmd.category.toLowerCase();
      const descLower = cmd.description ? cmd.description.toLowerCase() : '';
      const normalizedTitle = titleLower.replace(/[^a-z0-9]/g, '');

      return (
        titleLower.includes(lower) ||
        catLower.includes(lower) ||
        descLower.includes(lower) ||
        normalizedTitle.includes(normalizedLower) ||
        cmd.keywords?.some((k) => {
          const kLower = k.toLowerCase();
          const normalizedK = kLower.replace(/[^a-z0-9]/g, '');
          return kLower.includes(lower) || normalizedK.includes(normalizedLower);
        })
      );
    });
  }, [query]);

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

  const navigateToBottomTab = (categoryId: string, tabId: string) => {
    expandPanel('bottomPanel');
    setActiveBottomTab(tabId as any);
    window.dispatchEvent(
      new CustomEvent('navigate-to-tab', {
        detail: { categoryId, tabId },
      })
    );
  };

  // Execute selected command
  const executeCommand = (cmd: ICommand) => {
    if (cmd.isDisabled) return;

    // Record recent command ID
    const updatedRecents = [cmd.id, ...recentIds.filter((id) => id !== cmd.id)].slice(0, 5);
    setRecentIds(updatedRecents);
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updatedRecents));
    } catch {
      // Ignore storage errors
    }

    // Dynamic action dispatch
    switch (cmd.id) {
      // Canvas Commands
      case 'canvas-tool-select':
        setTool('select');
        break;
      case 'canvas-tool-box':
        setTool('box');
        break;
      case 'canvas-tool-state':
        setTool('add-state');
        break;
      case 'canvas-tool-transition':
        setTool('add-transition');
        break;
      case 'canvas-tool-erase':
        setTool('erase');
        break;
      case 'canvas-select-all':
        setSelection(
          nodes.map((n) => n.id),
          edges.map((e) => e.id)
        );
        break;
      case 'canvas-clear-selection':
        clearSelection();
        break;
      case 'canvas-delete-selected':
        deleteSelected();
        break;
      case 'canvas-focus-toggle':
        toggleFocusMode();
        break;

      // Machine Models
      case 'machine-set-dfa':
        setMachineType('DFA');
        break;
      case 'machine-set-nfa':
        setMachineType('NFA');
        break;
      case 'machine-set-pda':
        setMachineType('PDA');
        break;
      case 'machine-set-tm':
        setMachineType('TM');
        break;
      case 'machine-undo':
        undo();
        break;
      case 'machine-redo':
        redo();
        break;
      case 'machine-clear':
        clearCanvas();
        break;
      case 'machine-save':
        handleSaveMachine();
        break;

      // Navigation & Workbench
      case 'nav-trace':
        navigateToBottomTab('execution', 'trace');
        break;
      case 'nav-pda-branch':
        navigateToBottomTab('execution', 'pda-branch');
        break;
      case 'nav-batch-tester':
        navigateToBottomTab('execution', 'tester');
        break;
      case 'nav-console-logs':
        navigateToBottomTab('execution', 'logs');
        break;
      case 'nav-diagnostics':
        navigateToBottomTab('analysis', 'diagnostics');
        break;
      case 'nav-equivalence-repair':
        navigateToBottomTab('analysis', 'analysis');
        break;
      case 'nav-matrix':
        navigateToBottomTab('analysis', 'matrix');
        break;
      case 'nav-formal-math':
        navigateToBottomTab('analysis', 'math');
        break;
      case 'nav-algorithm-visualizer':
        navigateToBottomTab('analysis', 'algorithm');
        break;
      case 'nav-challenges':
        navigateToBottomTab('challenges', 'challenges');
        break;

      // Grammar Workbench
      case 'grammar-open-workbench':
      case 'grammar-editor':
      case 'grammar-validate':
      case 'grammar-analysis':
      case 'grammar-derivation':
      case 'grammar-membership':
      case 'grammar-ambiguity':
      case 'grammar-first-follow':
      case 'grammar-left-recursion':
      case 'grammar-left-factoring':
      case 'grammar-cnf':
      case 'grammar-gnf':
      case 'grammar-cyk':
      case 'grammar-ll1-table':
      case 'grammar-slr-parser':
      case 'grammar-pda-translate':
      case 'grammar-syntactic-pda':
        navigateToBottomTab('cfg', 'grammar');
        break;

      // Language Theory
      case 'lang-regular-languages':
        navigateToBottomTab('languages', 'regular-languages');
        break;
      case 'lang-pumping-lemma':
        navigateToBottomTab('languages', 'pumping-lemma');
        break;
      case 'lang-fa-regex-equiv':
        navigateToBottomTab('languages', 'fa-regex-equivalence');
        break;
      case 'lang-program-constructs':
        navigateToBottomTab('languages', 'program-constructs');
        break;
      case 'lang-lexical-analyzer':
        navigateToBottomTab('languages', 'lexical-analyzer');
        break;

      // Computability Theory
      case 'comp-church-turing':
        navigateToBottomTab('computability', 'church-turing');
        break;
      case 'comp-re-languages':
        navigateToBottomTab('computability', 're-languages');
        break;
      case 'comp-reducibility':
        navigateToBottomTab('computability', 'reducibility');
        break;
      case 'comp-halting-problem':
        navigateToBottomTab('computability', 'halting-problem');
        break;
      case 'comp-pcp':
        navigateToBottomTab('computability', 'pcp');
        break;

      // Tools
      case 'tools-interop':
        navigateToBottomTab('tools', 'tools');
        break;

      // UI View / Sidebar
      case 'nav-explorer':
        setActiveSidebarTab('explorer');
        expandPanel('sidebar');
        break;
      case 'nav-syllabus':
        setActiveSidebarTab('syllabus');
        expandPanel('sidebar');
        break;
      case 'nav-quizzes':
        setActiveSidebarTab('quizzes');
        expandPanel('sidebar');
        break;
      case 'view-toggle-sidebar':
        toggleSidebar();
        break;
      case 'view-toggle-inspector':
        toggleInspector();
        break;
      case 'view-toggle-bottom':
        toggleBottomPanel();
        break;
      case 'view-reset-layout':
        resetLayout();
        break;
      case 'ai-open-assistant':
        openAIWorkspace();
        break;

      // Themes
      case 'theme-dark':
        setTheme('dark');
        break;
      case 'theme-light':
        setTheme('light');
        break;
      case 'theme-contrast':
        setTheme('high-contrast');
        break;

      default:
        break;
    }

    closePalette();
  };

  // Keyboard navigation inside listbox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        executeCommand(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  };

  if (!isOpen) return null;

  const recentCommands = COMMAND_REGISTRY.filter((c) => recentIds.includes(c.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette Modal"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4 select-none"
      onClick={closePalette}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="bg-bg-surface1 border border-border-strong w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-border-subtle bg-bg-surface2/50">
          <Search size={18} className="text-txt-muted shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-txt-primary placeholder-txt-muted text-sm border-none outline-none font-sans"
          />
          <button
            type="button"
            onClick={closePalette}
            aria-label="Close Command Palette"
            className="p-1 text-txt-muted hover:text-txt-primary rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Command List Container */}
        <div role="listbox" aria-label="Commands List" className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Recent Commands Section (when search is empty) */}
          {!query.trim() && recentCommands.length > 0 && (
            <div>
              <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-1 px-2 flex items-center space-x-1">
                <Clock size={11} className="mr-1 inline" />
                Recent Commands
              </span>
              <div className="space-y-0.5">
                {recentCommands.map((cmd) => (
                  <CommandItem
                    key={`recent-${cmd.id}`}
                    command={cmd}
                    isSelected={false}
                    onSelect={executeCommand}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Filtered Commands */}
          <div>
            {!query.trim() && (
              <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-1 px-2">
                All Available Commands ({filtered.length})
              </span>
            )}

            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-txt-muted">
                No matching commands found for "{query}"
              </div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((cmd, idx) => (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    isSelected={idx === selectedIndex}
                    onSelect={executeCommand}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Command Footer */}
        <div className="h-8 border-t border-border-subtle bg-bg-surface2/40 px-4 flex items-center justify-between text-[11px] text-txt-muted font-mono">
          <span className="flex items-center space-x-1">
            <CommandIcon size={12} />
            <span>Command Discovery & Dispatch</span>
          </span>
          <div className="flex items-center space-x-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
