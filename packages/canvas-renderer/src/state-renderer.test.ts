import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateRenderer } from './state/state-renderer';
import { StateNode } from './state/state-node';
import { RenderQueue } from './pipeline/render-queue';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';
import { RenderLayer } from './layer/layer-manager';

describe('StateRenderer Subsystem', () => {
  let stateRenderer: StateRenderer;
  let viewport: Viewport;
  let camera: Camera;
  let queue: RenderQueue;

  beforeEach(() => {
    stateRenderer = new StateRenderer();
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);
    queue = new RenderQueue();
  });

  it('manages state node CRUD operations', () => {
    const q0: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0 };
    const q1: StateNode = { id: 'q1', label: 'q1', x: 100, y: 100 };

    stateRenderer.setStateNodes([q0, q1]);
    expect(stateRenderer.getStateNodes().length).toBe(2);

    expect(stateRenderer.getStateNode('q0')).toEqual(q0);

    const removed = stateRenderer.removeStateNode('q0');
    expect(removed).toBe(true);
    expect(stateRenderer.getStateNodes().length).toBe(1);

    stateRenderer.clear();
    expect(stateRenderer.getStateNodes().length).toBe(0);
  });

  it('enqueues draw commands across Layers 4, 5, 6, 7 for visible state nodes', () => {
    const node: StateNode = {
      id: 'q0',
      label: 'q0',
      x: 0,
      y: 0,
      isInitial: true,
      isAccepting: true,
      isSelected: true,
      isHovered: true,
    };

    stateRenderer.addStateNode(node);
    const count = stateRenderer.enqueueDrawCommands(queue, camera, viewport);
    expect(count).toBe(1);

    const commands = queue.getCommands();
    expect(commands.length).toBe(4);

    const layers = commands.map((c) => c.layer);
    expect(layers).toContain(RenderLayer.States); // Layer 4
    expect(layers).toContain(RenderLayer.StateLabels); // Layer 5
    expect(layers).toContain(RenderLayer.Selection); // Layer 6
    expect(layers).toContain(RenderLayer.Hover); // Layer 7
  });

  it('performs frustum culling to skip off-screen state nodes', () => {
    camera.setPosition(0, 0, true);
    camera.setZoom(1.0, true);

    const visibleNode: StateNode = { id: 'visible', label: 'q0', x: 0, y: 0 };
    const offscreenNode: StateNode = { id: 'offscreen', label: 'q1', x: 10000, y: 10000 };

    stateRenderer.setStateNodes([visibleNode, offscreenNode]);

    const count = stateRenderer.enqueueDrawCommands(queue, camera, viewport);
    expect(count).toBe(1); // Only 1 node visible
  });

  it('executes state draw commands onto Canvas2D context without error', () => {
    const node: StateNode = {
      id: 'q0',
      label: 'q0',
      x: 0,
      y: 0,
      isInitial: true,
      isAccepting: true,
      isSelected: true,
      isHovered: true,
    };

    stateRenderer.addStateNode(node);
    stateRenderer.enqueueDrawCommands(queue, camera, viewport);

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      font: '',
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    const executed = queue.flush(mockCtx);
    expect(executed).toBe(4);
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalledWith('q0', expect.any(Number), expect.any(Number));
  });
});
