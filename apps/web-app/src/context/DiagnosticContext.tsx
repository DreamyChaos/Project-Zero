import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useGraph } from './GraphContext';
import {
  generateDiagnostics,
  computeRepairPreview,
  applyRepairToGraph,
  AutomataDiagnosticReport,
  AutomataDiagnostic,
  AutomataRepairSuggestion,
  RepairPreviewResult,
} from '@project-zero/core-solver';

interface DiagnosticContextValue {
  report: AutomataDiagnosticReport;
  selectedDiagnostic: AutomataDiagnostic | null;
  highlightedStateIds: Set<string>;
  highlightedEdgeIds: Set<string>;
  activePreview: RepairPreviewResult | null;
  selectDiagnostic: (diagnosticId: string | null) => void;
  clearDiagnosticHighlight: () => void;
  previewRepair: (repair: AutomataRepairSuggestion) => void;
  cancelPreview: () => void;
  applyRepair: (repair: AutomataRepairSuggestion) => void;
}

const DiagnosticContext = createContext<DiagnosticContextValue | undefined>(undefined);

export const DiagnosticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { nodes, edges, machineType, initialStackSymbol, blankSymbol, replaceMachine } = useGraph();

  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<RepairPreviewResult | null>(null);

  // Auto-clear active preview whenever graph state or machine type changes
  useEffect(() => {
    setActivePreview(null);
  }, [nodes, edges, machineType]);

  // Recompute diagnostics reactively from canonical graph state
  const report = useMemo(() => {
    return generateDiagnostics({ nodes, edges }, machineType, initialStackSymbol, blankSymbol);
  }, [nodes, edges, machineType, initialStackSymbol, blankSymbol]);

  const selectedDiagnostic = useMemo(() => {
    if (!selectedDiagnosticId) return report.diagnostics[0] || null;
    return report.diagnostics.find((d) => d.id === selectedDiagnosticId) || report.diagnostics[0] || null;
  }, [selectedDiagnosticId, report]);

  // Transient Diagnostic Highlighting Overlay (Decoupled from GraphContext selection)
  const highlightedStateIds = useMemo(() => {
    if (!selectedDiagnostic) return new Set<string>();
    return new Set(selectedDiagnostic.affectedStateIds);
  }, [selectedDiagnostic]);

  const highlightedEdgeIds = useMemo(() => {
    if (!selectedDiagnostic) return new Set<string>();
    return new Set(selectedDiagnostic.affectedTransitionIds);
  }, [selectedDiagnostic]);

  const selectDiagnostic = useCallback((id: string | null) => {
    setSelectedDiagnosticId(id);
    setActivePreview(null);
  }, []);

  const clearDiagnosticHighlight = useCallback(() => {
    setSelectedDiagnosticId(null);
    setActivePreview(null);
  }, []);

  const previewRepair = useCallback(
    (repair: AutomataRepairSuggestion) => {
      if (!repair) return;
      const prev = computeRepairPreview({ nodes, edges }, repair, machineType, initialStackSymbol, blankSymbol);
      setActivePreview(prev);
    },
    [nodes, edges, machineType, initialStackSymbol, blankSymbol]
  );

  const cancelPreview = useCallback(() => {
    setActivePreview(null);
  }, []);

  // Atomic Repair Mutation via replaceMachine
  const applyRepair = useCallback(
    (repair: AutomataRepairSuggestion) => {
      if (!repair || typeof repair !== 'object' || !repair.actionType) {
        setActivePreview(null);
        return;
      }
      const mutated = applyRepairToGraph({ nodes, edges }, repair, machineType, initialStackSymbol, blankSymbol);
      replaceMachine(mutated.nodes, mutated.edges, machineType);
      setActivePreview(null);
    },
    [nodes, edges, machineType, initialStackSymbol, blankSymbol, replaceMachine]
  );

  const value = useMemo(
    () => ({
      report,
      selectedDiagnostic,
      highlightedStateIds,
      highlightedEdgeIds,
      activePreview,
      selectDiagnostic,
      clearDiagnosticHighlight,
      previewRepair,
      cancelPreview,
      applyRepair,
    }),
    [
      report,
      selectedDiagnostic,
      highlightedStateIds,
      highlightedEdgeIds,
      activePreview,
      selectDiagnostic,
      clearDiagnosticHighlight,
      previewRepair,
      cancelPreview,
      applyRepair,
    ]
  );

  return <DiagnosticContext.Provider value={value}>{children}</DiagnosticContext.Provider>;
};

export const useDiagnostics = (): DiagnosticContextValue => {
  const ctx = useContext(DiagnosticContext);
  if (!ctx) {
    throw new Error('useDiagnostics must be used within a DiagnosticProvider');
  }
  return ctx;
};
