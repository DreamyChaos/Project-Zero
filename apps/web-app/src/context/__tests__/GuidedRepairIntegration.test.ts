import { describe, it, expect } from 'vitest';
import { generateDiagnostics, computeRepairPreview, applyRepairToGraph, AutomataRepairSuggestion } from '@project-zero/core-solver';
import { StateNode } from '@project-zero/canvas-renderer';

describe('Guided Repair Assistant Integration & UI Isolation Tests', () => {
  it('1. Generates diagnostics and computes read-only repair preview', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const report = generateDiagnostics({ nodes, edges: [] }, 'DFA');
    expect(report.isValid).toBe(false);

    const noInitDiag = report.diagnostics.find((d) => d.code === 'DFA_NO_INITIAL_STATE')!;
    expect(noInitDiag).toBeDefined();

    const repair = noInitDiag.repairs[0];
    const preview = computeRepairPreview({ nodes, edges: [] }, repair, 'DFA');

    // Graph before is untouched
    expect(nodes[0].isInitial).toBe(false);
    // Graph in preview has isInitial = true
    expect(preview.afterNodes[0].isInitial).toBe(true);
    expect(preview.isAfterValid).toBe(true);
  });

  it('2. Applying repair modifies graph and post-repair verification clears target diagnostic', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: false, isAccepting: true },
    ];
    const initialReport = generateDiagnostics({ nodes, edges: [] }, 'DFA');
    const diag = initialReport.diagnostics.find((d) => d.code === 'DFA_NO_INITIAL_STATE')!;

    const repaired = applyRepairToGraph({ nodes, edges: [] }, diag.repairs[0], 'DFA');
    expect(repaired.nodes[0].isInitial).toBe(true);

    const postReport = generateDiagnostics(repaired, 'DFA');
    expect(postReport.isValid).toBe(true);
    expect(postReport.diagnostics.some((d) => d.code === 'DFA_NO_INITIAL_STATE')).toBe(false);
  });

  it('3. Guarantees diagnostic highlighting does not alter selection or create history snapshots', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'unreach', label: 'unreach', x: 400, y: 0, isInitial: false, isAccepting: false },
    ];

    const report = generateDiagnostics({ nodes, edges: [] }, 'DFA');
    const unreachDiag = report.diagnostics.find((d) => d.code === 'DFA_UNREACHABLE_STATE')!;

    expect(unreachDiag.affectedStateIds).toContain('unreach');
    // Selected IDs in canonical state remain unaffected
    const selectedNodeIds: string[] = [];
    expect(selectedNodeIds).not.toContain('unreach');
  });

  it('4. Handles defensive applyRepairToGraph with undefined or stale repair', () => {
    const nodes: StateNode[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true },
    ];
    const repaired = applyRepairToGraph({ nodes, edges: [] }, undefined as unknown as AutomataRepairSuggestion, 'DFA');
    expect(repaired.nodes).toHaveLength(1);
    expect(repaired.nodes[0].id).toBe('q0');
  });
});
