import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EdgePreviewController } from './interaction/edge-preview';
import { InteractionContext } from './interaction/interaction-context';
import { StateNode } from './state/state-node';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';
import { RenderQueue } from './pipeline/render-queue';

describe('EdgePreviewController Subsystem & Extreme Zoom Scaling', () => {
  let edgePreviewController: EdgePreviewController;
  let context: InteractionContext;
  let viewport: Viewport;
  let camera: Camera;

  const nodeMap = new Map<string, StateNode>([
    ['q0', { id: 'q0', label: 'q0', x: 0, y: 0, radius: 32 }],
    ['q1', { id: 'q1', label: 'q1', x: 200, y: 0, radius: 32 }],
  ]);

  beforeEach(() => {
    edgePreviewController = new EdgePreviewController();
    context = new InteractionContext();
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);
  });

  it('starts, updates, and cancels temporary edge preview', () => {
    edgePreviewController.startEdgePreview(context, 'q0', { x: 0, y: 0 });
    expect(context.edgePreview?.sourceNodeId).toBe('q0');

    edgePreviewController.updateEdgePreview(context, { x: 100, y: 50 });
    expect(context.edgePreview?.currentPointerWorld).toEqual({ x: 100, y: 50 });

    edgePreviewController.cancelEdgePreview(context);
    expect(context.edgePreview).toBeNull();
  });

  it('commits temporary edge preview on target node and triggers callback', () => {
    const onEdgeCreated = vi.fn();
    edgePreviewController.startEdgePreview(context, 'q0', { x: 0, y: 0 });

    const committed = edgePreviewController.commitEdgePreview(context, 'q1', onEdgeCreated);
    expect(committed).toBe(true);
    expect(onEdgeCreated).toHaveBeenCalledWith('q0', 'q1');
    expect(context.edgePreview).toBeNull();
  });

  it('enqueues preview draw commands with clamped arrowhead sizes across extreme zoom (0.1x to 5.0x)', () => {
    const queue = new RenderQueue();
    edgePreviewController.startEdgePreview(context, 'q0', { x: 150, y: 0 });

    // 1. Standard 1.0x zoom
    camera.setZoom(1.0);
    edgePreviewController.enqueueDrawCommands(queue, context, camera, nodeMap);
    expect(queue.getCount()).toBe(1);

    // 2. Extreme min zoom 0.1x (arrowhead remains clamped >= 8px)
    camera.setZoom(0.1);
    queue.clear();
    edgePreviewController.enqueueDrawCommands(queue, context, camera, nodeMap);
    expect(queue.getCount()).toBe(1);

    // 3. Extreme max zoom 5.0x (arrowhead remains clamped <= 24px)
    camera.setZoom(5.0);
    queue.clear();
    edgePreviewController.enqueueDrawCommands(queue, context, camera, nodeMap);
    expect(queue.getCount()).toBe(1);
  });
});
