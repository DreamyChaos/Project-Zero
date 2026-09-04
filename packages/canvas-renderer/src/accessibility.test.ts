import { describe, it, expect, vi } from 'vitest';
import { AccessibilityManager } from './interaction/accessibility-manager';
import { SelectionController } from './interaction/selection-controller';
import { InteractionContext } from './interaction/interaction-context';
import { StateNode } from './state/state-node';
import { TransitionEdge } from './edge/edge-transition';

describe('Accessibility & WCAG Compliance Subsystem', () => {
  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, radius: 32, isInitial: true },
    { id: 'q1', label: 'q1', x: 150, y: 0, radius: 32, isAccepting: true },
    { id: 'q2', label: 'q2', x: 0, y: 150, radius: 32 },
  ];

  const edges: TransitionEdge[] = [
    { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
    { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q2', label: '1' },
  ];

  const createKey = (key: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent =>
    ({
      key,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      preventDefault: vi.fn(),
      ...overrides,
    } as unknown as KeyboardEvent);

  it('generates concise WCAG 2.1 AA screen reader descriptions for initial and accepting nodes', () => {
    const textQ0 = AccessibilityManager.getNodeAccessibilityText(nodes[0], 2);
    expect(textQ0).toBe('State q0, Initial State, 2 outgoing transitions');

    const textQ1 = AccessibilityManager.getNodeAccessibilityText(nodes[1], 1);
    expect(textQ1).toBe('State q1, Accepting State, 1 outgoing transition');
  });

  it('generates screen reader descriptions for transition edges', () => {
    const edgeText = AccessibilityManager.getEdgeAccessibilityText(edges[0], nodes[0], nodes[1]);
    expect(edgeText).toBe("Transition from q0 to q1 on symbol '0'");
  });

  it('summarizes overall graph topology for live regions', () => {
    const summary = AccessibilityManager.getGraphSummary(nodes, edges);
    expect(summary.totalNodes).toBe(3);
    expect(summary.totalEdges).toBe(2);
    expect(summary.initialNodeId).toBe('q0');
    expect(summary.acceptingNodeIds).toEqual(['q1']);
  });

  it('allows complete graph inspection and selection exclusively via keyboard', () => {
    const selectionController = new SelectionController();
    const context = new InteractionContext();

    // 1. Tab to first node
    const tabEvent = createKey('Tab');
    selectionController.handleKeyboardNavigation(context, tabEvent, nodes);
    expect(context.focusedNodeId).toBe('q0');
    expect(context.isNodeSelected('q0')).toBe(true);

    // 2. Spatial navigation via ArrowRight to q1
    const rightEvent = createKey('ArrowRight');
    selectionController.handleKeyboardNavigation(context, rightEvent, nodes);
    expect(context.isNodeSelected('q1')).toBe(true);

    // 3. Additive keyboard selection via Shift+ArrowDown
    const shiftDown = createKey('ArrowDown', { shiftKey: true });
    selectionController.handleKeyboardNavigation(context, shiftDown, nodes);
    expect(context.isNodeSelected('q1')).toBe(true);

    // 4. Escape clears all focus and selection
    const escape = createKey('Escape');
    selectionController.handleKeyboardNavigation(context, escape, nodes);
    expect(context.getSelectedNodeIds().length).toBe(0);
    expect(context.focusedNodeId).toBeNull();
  });
});
