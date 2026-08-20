import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectionController } from './interaction/selection-controller';
import { InteractionContext } from './interaction/interaction-context';
import { StateNode } from './state/state-node';
import { CanvasPointerEvent } from './interaction/pointer-event';

describe('SelectionController Subsystem', () => {
  let selectionController: SelectionController;
  let context: InteractionContext;

  const nodes: StateNode[] = [
    { id: 'q0', label: 'q0', x: 100, y: 100 },
    { id: 'q1', label: 'q1', x: 200, y: 100 },
    { id: 'q2', label: 'q2', x: 300, y: 100 },
  ];

  const createEvent = (overrides: Partial<CanvasPointerEvent> = {}): CanvasPointerEvent => ({
    pointerId: 1,
    pointerType: 'mouse',
    clientX: 400,
    clientY: 300,
    screenX: 400,
    screenY: 300,
    worldPoint: { x: 0, y: 0 },
    screenPoint: { x: 400, y: 300 },
    pressure: 0.5,
    button: 0,
    buttons: 1,
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    ...overrides,
  });

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

  beforeEach(() => {
    selectionController = new SelectionController();
    context = new InteractionContext();
  });

  it('selects single node and clears previous selection', () => {
    selectionController.handlePointerSelection(context, createEvent(), { type: 'node', nodeId: 'q0' });
    expect(context.isNodeSelected('q0')).toBe(true);

    selectionController.handlePointerSelection(context, createEvent(), { type: 'node', nodeId: 'q1' });
    expect(context.isNodeSelected('q0')).toBe(false);
    expect(context.isNodeSelected('q1')).toBe(true);
  });

  it('toggles selection with Ctrl / Meta modifier', () => {
    selectionController.handlePointerSelection(context, createEvent({ ctrlKey: true }), { type: 'node', nodeId: 'q0' });
    selectionController.handlePointerSelection(context, createEvent({ ctrlKey: true }), { type: 'node', nodeId: 'q1' });
    expect(context.getSelectedNodeIds().length).toBe(2);

    selectionController.handlePointerSelection(context, createEvent({ ctrlKey: true }), { type: 'node', nodeId: 'q0' });
    expect(context.isNodeSelected('q0')).toBe(false);
    expect(context.isNodeSelected('q1')).toBe(true);
  });

  it('adds to selection with Shift modifier', () => {
    selectionController.handlePointerSelection(context, createEvent(), { type: 'node', nodeId: 'q0' });
    selectionController.handlePointerSelection(context, createEvent({ shiftKey: true }), { type: 'node', nodeId: 'q1' });
    expect(context.getSelectedNodeIds()).toEqual(['q0', 'q1']);
  });

  it('clears selection on background click without modifiers', () => {
    context.selectNode('q0');
    context.selectEdge('e0');

    selectionController.handlePointerSelection(context, createEvent(), { type: 'background' });
    expect(context.getSelectedNodeIds().length).toBe(0);
    expect(context.getSelectedEdgeIds().length).toBe(0);
  });

  it('handles keyboard navigation with Tab, Shift+Tab, and Arrow keys', () => {
    const tabEvent = createKey('Tab');
    selectionController.handleKeyboardNavigation(context, tabEvent, nodes);
    expect(context.focusedNodeId).toBe('q0');

    selectionController.handleKeyboardNavigation(context, tabEvent, nodes);
    expect(context.focusedNodeId).toBe('q1');

    const arrowRight = createKey('ArrowRight');
    selectionController.handleKeyboardNavigation(context, arrowRight, nodes);
    expect(context.focusedNodeId).toBe('q2');

    const escape = createKey('Escape');
    selectionController.handleKeyboardNavigation(context, escape, nodes);
    expect(context.getSelectedNodeIds().length).toBe(0);
  });
});
