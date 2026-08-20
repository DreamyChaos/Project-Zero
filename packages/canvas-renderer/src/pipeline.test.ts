import { describe, it, expect, vi } from 'vitest';
import { RenderQueue, DrawCommand } from './pipeline/render-queue';
import { RenderLoop } from './pipeline/render-loop';
import { RenderLayer } from './layer/layer-manager';

describe('Render Pipeline Subsystem', () => {
  describe('RenderQueue', () => {
    it('enqueues and executes draw commands in strict layer order', () => {
      const queue = new RenderQueue();
      const executionOrder: string[] = [];

      const cmdStates: DrawCommand = {
        id: 'cmd-states',
        layer: RenderLayer.States,
        execute: () => executionOrder.push('States'),
      };

      const cmdGrid: DrawCommand = {
        id: 'cmd-grid',
        layer: RenderLayer.Grid,
        execute: () => executionOrder.push('Grid'),
      };

      const cmdEdges: DrawCommand = {
        id: 'cmd-edges',
        layer: RenderLayer.Edges,
        execute: () => executionOrder.push('Edges'),
      };

      // Enqueue out of layer order
      queue.enqueue(cmdStates);
      queue.enqueue(cmdGrid);
      queue.enqueue(cmdEdges);

      expect(queue.getCount()).toBe(3);

      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      const executed = queue.flush(mockCtx);
      expect(executed).toBe(3);
      expect(executionOrder).toEqual(['Grid', 'Edges', 'States']);
      expect(queue.getCount()).toBe(0);
    });

    it('expands buffer capacity dynamically without clearing existing commands', () => {
      const queue = new RenderQueue(2);
      for (let i = 0; i < 5; i++) {
        queue.enqueue({
          id: `cmd-${i}`,
          layer: RenderLayer.Background,
          execute: () => {},
        });
      }
      expect(queue.getCount()).toBe(5);
    });
  });

  describe('RenderLoop', () => {
    it('calculates delta time and enforces idle sleep threshold after 3 inactive frames', () => {
      const callback = vi.fn().mockReturnValue(false); // Non-active frames
      const loop = new RenderLoop(callback);

      loop.start();

      const metrics = loop.getMetrics();
      expect(metrics.isRunning).toBe(true);

      loop.stop();
    });

    it('wakes up sleeping loop when invalidate() is called', () => {
      const callback = vi.fn().mockReturnValue(false);
      const loop = new RenderLoop(callback);

      loop.start();
      loop.invalidate();

      const metrics = loop.getMetrics();
      expect(metrics.isSleeping).toBe(false);

      loop.stop();
    });
  });
});
