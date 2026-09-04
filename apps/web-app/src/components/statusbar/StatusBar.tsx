import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCommandPalette } from '../../context/CommandPaletteContext';
import { useGraph } from '../../context/GraphContext';
import { useExecution } from '../../context/ExecutionContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StatusBarItem } from './StatusBarItem';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Hash,
  Binary,
  Layers,
  ZoomIn,
  MousePointer,
  Moon,
  Sun,
  Monitor,
  Command,
  Tag,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const DesktopStatusBar: React.FC = () => {
  const { theme } = useTheme();
  const { openPalette } = useCommandPalette();
  const { nodes, edges, setSelection, completenessResult, machineType } = useGraph();
  const { validationResult } = useExecution();
  const { focusMode, toggleFocusMode } = useWorkspace();

  const getThemeIcon = () => {
    if (theme === 'dark') return Moon;
    if (theme === 'light') return Sun;
    return Monitor;
  };

  const alphabetSymbols = completenessResult.alphabet;

  const alphabetLabel =
    alphabetSymbols.length > 0 ? `Σ = {${alphabetSymbols.join(', ')}}` : 'Σ = ∅';

  const getValidationItem = () => {
    if (nodes.length === 0) {
      return {
        label: `Empty ${machineType}`,
        icon: Cpu,
        variant: 'default' as const,
        tooltip: `Canvas is empty. Place a state node (S) to begin designing the ${machineType}.`,
        onClick: undefined,
      };
    }
    if (!validationResult.isValid) {
      const errorCount = validationResult.errors.length;
      const firstErr = validationResult.errors[0];

      return {
        label: `✕ ${machineType} Invalid — ${errorCount} issue${errorCount > 1 ? 's' : ''}`,
        icon: AlertCircle,
        variant: 'error' as const,
        tooltip: `${machineType} Validation Failed: ${firstErr ? firstErr.message : 'Automaton rules violated'}. Click to select offending items.`,
        onClick: () => {
          if (firstErr) {
            setSelection(firstErr.affectedStateIds || [], firstErr.affectedTransitionIds || []);
          }
        },
      };
    }
    return {
      label: `✓ ${machineType} Valid`,
      icon: CheckCircle2,
      variant: 'success' as const,
      tooltip: `Formal Specification: Valid ${machineType} active in workspace.`,
      onClick: undefined,
    };
  };

  const getCompletenessItem = () => {
    if (machineType === 'NFA' || machineType === 'PDA' || machineType === 'TM') {
      return {
        label: 'Completeness: N/A',
        icon: CheckCircle2,
        variant: 'default' as const,
        tooltip: `${machineType} machines do not require full DFA alphabet state completeness.`,
      };
    }

    if (nodes.length === 0 || alphabetSymbols.length === 0) {
      return null;
    }

    if (completenessResult.isComplete) {
      return {
        label: '✓ Complete',
        icon: CheckCircle2,
        variant: 'success' as const,
        tooltip: `All ${nodes.length} states have transitions defined for every symbol in Σ = {${alphabetSymbols.join(', ')}}.`,
      };
    }

    const missingCount = completenessResult.missingTransitions.length;
    const firstMissing = completenessResult.missingTransitions[0];

    return {
      label: `⚠ Incomplete — ${missingCount} transition${missingCount > 1 ? 's' : ''} missing`,
      icon: AlertCircle,
      variant: 'warning' as const,
      tooltip: `Incomplete DFA: Missing ${missingCount} transition(s). E.g. ${firstMissing.stateLabel} on symbol '${firstMissing.symbol}' is missing.`,
    };
  };

  const validation = getValidationItem();
  const completeness = getCompletenessItem();

  return (
    <footer
      role="contentinfo"
      aria-label="Application Telemetry Status Bar"
      className="h-6 bg-bg-surface1 border-t border-border-subtle flex items-center justify-between px-3 text-[11px] select-none z-30 w-full max-w-full overflow-hidden shrink-0"
    >
      {/* LEFT Section: Workspace Status, Active Mode, Save Indicator */}
      <div className="flex items-center space-x-2 shrink-0">
        <StatusBarItem
          label="Deterministic Solver Active"
          icon={Activity}
          variant="accent"
          tooltip="Theoretical engine is deterministically executing automata rules."
        />

        <div className="h-3 w-px bg-border-subtle" />

        <StatusBarItem
          label={`${machineType} Edit Mode`}
          icon={Cpu}
          tooltip={`Active Editing Mode: ${machineType === 'DFA' ? 'Deterministic Finite Automaton (DFA)' : 'Nondeterministic Finite Automaton (NFA)'}`}
        />
      </div>

      {/* CENTER Section: States, Transitions, Alphabet, Validation */}
      <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
        <StatusBarItem
          label={`States: ${nodes.length}`}
          icon={Hash}
          tooltip={`Total State Nodes in machine Q = {${nodes.map((n) => n.label).join(', ') || '∅'}}`}
        />

        <StatusBarItem
          label={`Transitions: ${edges.length}`}
          icon={Binary}
          tooltip={`Total Edge Transitions in delta function: ${edges.length}`}
        />

        <StatusBarItem
          label={alphabetLabel}
          icon={Layers}
          tooltip={`Active Input Alphabet Symbols: ${alphabetSymbols.join(', ') || 'None'}`}
        />

        <StatusBarItem
          label={validation.label}
          icon={validation.icon}
          variant={validation.variant}
          tooltip={validation.tooltip}
          onClick={validation.onClick}
        />

        {completeness && (
          <StatusBarItem
            label={completeness.label}
            icon={completeness.icon}
            variant={completeness.variant}
            tooltip={completeness.tooltip}
          />
        )}
      </div>

      {/* RIGHT Section: Zoom, Cursor Coordinates, Theme, Shortcuts, Version */}
      <div className="flex items-center space-x-2 shrink-0">
        <StatusBarItem
          label="100%"
          icon={ZoomIn}
          tooltip="Canvas Spatial Viewport Zoom Level"
        />

        <div className="h-3 w-px bg-border-subtle" />

        <StatusBarItem
          label="X: 240, Y: 180"
          icon={MousePointer}
          tooltip="Spatial Canvas Pointer Coordinates"
        />

        <div className="h-3 w-px bg-border-subtle" />

        <StatusBarItem
          label={theme.toUpperCase()}
          icon={getThemeIcon()}
          tooltip={`Current Active Color Theme: ${theme}`}
        />

        <div className="h-3 w-px bg-border-subtle" />

        <StatusBarItem
          label={focusMode ? 'Focus: ON' : 'Focus: OFF'}
          icon={focusMode ? Minimize2 : Maximize2}
          variant={focusMode ? 'accent' : 'default'}
          onClick={toggleFocusMode}
          tooltip="Click or press Ctrl+Shift+F to toggle Canvas Focus Mode"
        />

        <div className="h-3 w-px bg-border-subtle" />

        <StatusBarItem
          label="Ctrl+K"
          icon={Command}
          onClick={openPalette}
          tooltip="Click or press Ctrl+K to open Command Palette"
        />

        <div className="h-3 w-px bg-border-subtle" />

        <StatusBarItem
          label="v1.0.0-m2"
          icon={Tag}
          tooltip="Project Zero Core Infrastructure Build Version"
        />
      </div>
    </footer>
  );
};
