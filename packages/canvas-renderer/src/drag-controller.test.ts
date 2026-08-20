import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DragController } from './interaction/drag-controller';
import { InteractionContext } from './interaction/interaction-context';
import { StateNode } from './state/state-node';

describe('DragController Subsystem', () => {
  let dragController: DragController;
  let context: InteractionContext;

  let nodes: StateNode[];

  beforeEach(() => {
    dragController = new DragController({ enableGridSnap: false, gridSnapStep: 20 });
    context = new InteractionContext();
    nodes = [
      { id: 'q0', label: 'q0', x: 100, y: 100 },
      { id: 'q1', label: 'q1', x: 200, y: 100 },
    ];
  });

  it('initializes with default options and supports grid snap toggling', () => {
    expect(dragController.isGridSnapEnabled()).toBe(false);
    expect(dragController.getGridSnapStep()).toBe(20);

    dragController.setGridSnap(true, 50);
    expect(dragController.isGridSnapEnabled()).toBe(true);
    expect(dragController.getGridSnapStep()).toBe(50);
  });

  it('drags single selected node and updates coordinates', () => {
    const onNodeMoved = vi.fn();
    context.selectNode('q0');

    dragController.startDrag(context, nodes, { x: 100, y: 100 });
    expect(context.dragOriginWorld).toEqual({ x: 100, y: 100 });

    const moved = dragController.updateDrag(context, nodes, { x: 140, y: 160 }, onNodeMoved);
    expect(moved).toBe(true);
    expect(nodes[0].x).toBe(140);
    expect(nodes[0].y).toBe(160);
    expect(onNodeMoved).toHaveBeenCalledWith('q0', 140, 160);

    dragController.endDrag(context);
    expect(context.dragOriginWorld).toBeNull();
  });

  it('drags multiple selected nodes maintaining relative offsets', () => {
    const onNodeMoved = vi.fn();
    context.selectNode('q0', true);
    context.selectNode('q1', true);

    nodes = [
      { id: 'q0', label: 'q0', x: 100, y: 100 },
      { id: 'q1', label: 'q1', x: 200, y: 100 },
    ];

    dragController.startDrag(context, nodes, { x: 100, y: 100 });
    dragController.updateDrag(context, nodes, { x: 120, y: 130 }, onNodeMoved);

    expect(nodes[0].x).toBe(120);
    expect(nodes[0].y).toBe(130);
    expect(nodes[1].x).toBe(220);
    expect(nodes[1].y).toBe(130);

    expect(onNodeMoved).toHaveBeenCalledWith('q0', 120, 130);
    expect(onNodeMoved).toHaveBeenCalledWith('q1', 220, 130);
  });

  it('applies grid snapping when enabled', () => {
    dragController.setGridSnap(true, 25);
    context.selectNode('q0');

    nodes = [
      { id: 'q0', label: 'q0', x: 100, y: 100 },
      { id: 'q1', label: 'q1', x: 200, y: 100 },
    ];

    dragController.startDrag(context, nodes, { x: 100, y: 100 });
    dragController.updateDrag(context, nodes, { x: 112, y: 138 });

    expect(nodes[0].x).toBe(100);
    expect(nodes[0].y).toBe(150);
  });
});
