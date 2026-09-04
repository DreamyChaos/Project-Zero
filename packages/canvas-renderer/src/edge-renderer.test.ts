import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EdgeRenderer } from './edge/edge-renderer';
import { TransitionEdge } from './edge/edge-transition';
import { StateRenderer } from './state/state-renderer';
import { RenderQueue } from './pipeline/render-queue';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';
import { RenderLayer } from './layer/layer-manager';

describe('EdgeRenderer Subsystem', () => {
  let edgeRenderer: EdgeRenderer;
  let stateRenderer: StateRenderer;
  let viewport: Viewport;
  let camera: Camera;
  let queue: RenderQueue;

  beforeEach(() => {
    edgeRenderer = new EdgeRenderer();
    stateRenderer = new StateRenderer();
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);
    queue = new RenderQueue();

    // Populate test state nodes
    stateRenderer.setStateNodes([
      { id: 'q0', label: 'q0', x: 0, y: 0 },
      { id: 'q1', label: 'q1', x: 200, y: 0 },
    ]);
  });

  it('manages transition edge CRUD operations', () => {
    const e0: TransitionEdge = { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0, 1' };

    edgeRenderer.setEdges([e0]);
    expect(edgeRenderer.getEdges().length).toBe(1);
    expect(edgeRenderer.getEdge('e0')).toEqual(e0);

    const removed = edgeRenderer.removeEdge('e0');
    expect(removed).toBe(true);
    expect(edgeRenderer.getEdges().length).toBe(0);

    edgeRenderer.clear();
  });

  it('enqueues draw commands across Layer 2 (Edges) and Layer 3 (EdgeLabels)', () => {
    const edge: TransitionEdge = {
      id: 'e0',
      sourceNodeId: 'q0',
      targetNodeId: 'q1',
      label: 'a',
      isSelected: true,
      isHovered: true,
    };

    edgeRenderer.addEdge(edge);

    const count = edgeRenderer.enqueueDrawCommands(queue, stateRenderer, camera, viewport);
    expect(count).toBe(1);

    const commands = queue.getCommands();
    expect(commands.length).toBe(2);

    const layers = commands.map((c) => c.layer);
    expect(layers).toContain(RenderLayer.Edges); // Layer 2
    expect(layers).toContain(RenderLayer.EdgeLabels); // Layer 3
  });

  it('enqueues self-loop and multi-edge transitions correctly', () => {
    const selfLoopEdge: TransitionEdge = {
      id: 'self-q0',
      sourceNodeId: 'q0',
      targetNodeId: 'q0',
      label: '1; R',
      isSelfLoop: true,
    };

    const parallelEdge: TransitionEdge = {
      id: 'multi-e1',
      sourceNodeId: 'q0',
      targetNodeId: 'q1',
      label: 'b',
      parallelIndex: 1,
    };

    edgeRenderer.setEdges([selfLoopEdge, parallelEdge]);

    const count = edgeRenderer.enqueueDrawCommands(queue, stateRenderer, camera, viewport);
    expect(count).toBe(2);

    const commands = queue.getCommands();
    expect(commands.length).toBe(4); // 2 paths + 2 labels
  });

  it('performs frustum culling to skip off-screen edges', () => {
    camera.setPosition(0, 0, true);
    camera.setZoom(1.0, true);

    stateRenderer.addStateNode({ id: 'offscreen1', label: 'qX', x: 10000, y: 10000 });
    stateRenderer.addStateNode({ id: 'offscreen2', label: 'qY', x: 10200, y: 10000 });

    edgeRenderer.addEdge({
      id: 'e-offscreen',
      sourceNodeId: 'offscreen1',
      targetNodeId: 'offscreen2',
      label: 'off',
    });

    const count = edgeRenderer.enqueueDrawCommands(queue, stateRenderer, camera, viewport);
    expect(count).toBe(0);
  });

  it('executes edge draw commands onto Canvas2D context without error', () => {
    const edge: TransitionEdge = {
      id: 'e0',
      sourceNodeId: 'q0',
      targetNodeId: 'q1',
      label: '0',
    };

    edgeRenderer.addEdge(edge);
    edgeRenderer.enqueueDrawCommands(queue, stateRenderer, camera, viewport);

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 20 }),
      font: '',
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    const executed = queue.flush(mockCtx);
    expect(executed).toBe(2);
    expect(mockCtx.bezierCurveTo).toHaveBeenCalled();
    expect(mockCtx.roundRect).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalledWith('0', expect.any(Number), expect.any(Number));
  });
});
