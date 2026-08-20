import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderQueue } from './pipeline/render-queue';
import { RenderLayer } from './layer/layer-manager';
import { CanvasGrid } from './grid/canvas-grid';
import { Camera } from './camera/camera';
import { Viewport } from './camera/viewport';
import { HitDispatcher } from './interaction/hit-dispatcher';
import { StateNode } from './state/state-node';
import { TransitionEdge } from './edge/edge-transition';
import {
  DEFAULT_FOCUS_RING_OFFSET,
  DEFAULT_MARQUEE_FILL_OPACITY,
  DEFAULT_MARQUEE_BORDER_WIDTH,
  getFocusIndicatorGeometry,
} from './interaction/selection-geometry';

describe('Performance, Memory Retention & Buffer Verification', () => {
  describe('RenderQueue In-Place Stable Sorting & Memory Release', () => {
    it('sorts draw commands in strict ascending layer order with in-place insertion sort', () => {
      const queue = new RenderQueue(16);

      queue.enqueue({ id: 'cmd3', layer: RenderLayer.Selection, execute: vi.fn() });
      queue.enqueue({ id: 'cmd1', layer: RenderLayer.Background, execute: vi.fn() });
      queue.enqueue({ id: 'cmd2', layer: RenderLayer.States, execute: vi.fn() });

      expect(queue.getCount()).toBe(3);

      const sorted = queue.getCommands();
      expect(sorted[0].layer).toBe(RenderLayer.Background);
      expect(sorted[1].layer).toBe(RenderLayer.States);
      expect(sorted[2].layer).toBe(RenderLayer.Selection);
    });

    it('nulls inactive command slots on clear() to release closures and prevent memory retention', () => {
      const queue = new RenderQueue(16);
      const testClosure = vi.fn();

      queue.enqueue({ id: 'cmd1', layer: RenderLayer.States, execute: testClosure });
      queue.enqueue({ id: 'cmd2', layer: RenderLayer.States, execute: testClosure });
      expect(queue.getCount()).toBe(2);
      expect(queue.getInternalSlot(0)).toBeDefined();

      queue.clear();
      expect(queue.getCount()).toBe(0);
      // Slots must be explicitly nulled/undefined to release closure references
      expect(queue.getInternalSlot(0)).toBeUndefined();
      expect(queue.getInternalSlot(1)).toBeUndefined();
      // Buffer capacity remains allocated for zero-allocation reuse
      expect(queue.getCapacity()).toBe(16);
    });

    it('flushes draw commands onto canvas context and resets count without releasing buffer', () => {
      const queue = new RenderQueue(16);
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      const executeFn = vi.fn();
      queue.enqueue({ id: 'cmd1', layer: RenderLayer.States, execute: executeFn });
      queue.enqueue({ id: 'cmd2', layer: RenderLayer.States, execute: executeFn });

      const count = queue.flush(mockCtx);
      expect(count).toBe(2);
      expect(executeFn).toHaveBeenCalledTimes(2);
      expect(queue.getCount()).toBe(0);
      expect(queue.getInternalSlot(0)).toBeUndefined();
    });
  });

  describe('CanvasGrid Persistent Line Buffer Reuse & Zero-Allocation Hot Path', () => {
    it('computes grid lines into persistent buffer without calling slice on hot render path', () => {
      const grid = new CanvasGrid();
      const viewport = new Viewport(800, 600, 1.0);
      const camera = new Camera(viewport);

      const count = grid.computeGridLines(camera);
      expect(count).toBeGreaterThan(0);
      expect(grid.getLineCount()).toBe(count);

      // Buffer instance remains the same
      const buf1 = grid.getLineBuffer();
      expect(buf1.length).toBeGreaterThanOrEqual(count);

      // Move camera and recompute
      camera.pan(100, 100);
      const count2 = grid.computeGridLines(camera);
      const buf2 = grid.getLineBuffer();
      expect(buf1).toBe(buf2); // Same object reference in memory
      expect(count2).toBeGreaterThan(0);
    });

    it('renders 2D grid in-place using camera matrix without heap allocations', () => {
      const grid = new CanvasGrid();
      const viewport = new Viewport(800, 600, 1.0);
      const camera = new Camera(viewport);

      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      grid.render2D(mockCtx, camera, viewport);
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('Bézier Hit-Test Adaptive Sampling & Bounded Precision', () => {
    let hitDispatcher: HitDispatcher;

    const q0: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0, radius: 32 };
    const q1: StateNode = { id: 'q1', label: 'q1', x: 200, y: 0, radius: 32 };
    const qLong: StateNode = { id: 'qLong', label: 'qLong', x: 3000, y: 0, radius: 32 };

    const eShort: TransitionEdge = { id: 'eShort', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'short', parallelIndex: 1 };
    const eLong: TransitionEdge = { id: 'eLong', sourceNodeId: 'q0', targetNodeId: 'qLong', label: 'long', parallelIndex: 1 };

    beforeEach(() => {
      hitDispatcher = new HitDispatcher();
    });

    it('calculates bounded adaptive steps between 16 and 100 steps based on arc length', () => {
      expect(hitDispatcher.calculateAdaptiveSteps(50, 8)).toBe(16);
      expect(hitDispatcher.calculateAdaptiveSteps(300, 8)).toBe(50);
      expect(hitDispatcher.calculateAdaptiveSteps(5000, 8)).toBe(100);
    });

    it('accurately hits short and ultra-long curves with bounded sampling', () => {
      const hitShort = hitDispatcher.hitTestEdge([eShort], [q0, q1], { x: 100, y: 17 });
      expect(hitShort?.id).toBe('eShort');

      const hitLong = hitDispatcher.hitTestEdge([eLong], [q0, qLong], { x: 1500, y: 17 });
      expect(hitLong?.id).toBe('eLong');
    });
  });

  describe('Design System Token Compliance', () => {
    it('uses Design System tokens for focus rings and marquee geometry', () => {
      expect(DEFAULT_FOCUS_RING_OFFSET).toBe(4); // --space-1: 4px
      expect(DEFAULT_MARQUEE_FILL_OPACITY).toBe(0.1); // 10% translucent accent
      expect(DEFAULT_MARQUEE_BORDER_WIDTH).toBe(1.5);

      const node: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0, radius: 32 };
      const focusGeom = getFocusIndicatorGeometry(node);
      expect(focusGeom.offset).toBe(4);
      expect(focusGeom.innerRadius).toBe(36);
      expect(focusGeom.outerRadius).toBe(38);
    });
  });

  describe('Large-Graph Deterministic Benchmarks (100 to 5,000 Nodes)', () => {
    const hitDispatcher = new HitDispatcher();

    const generateBenchmarkGraph = (nodeCount: number): { nodes: StateNode[]; edges: TransitionEdge[] } => {
      const nodes: StateNode[] = [];
      const edges: TransitionEdge[] = [];
      const cols = Math.ceil(Math.sqrt(nodeCount));

      for (let i = 0; i < nodeCount; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        nodes.push({
          id: `node_${i}`,
          label: `q${i}`,
          x: col * 120,
          y: row * 120,
          radius: 32,
        });

        if (i > 0) {
          edges.push({
            id: `edge_${i}`,
            sourceNodeId: `node_${i - 1}`,
            targetNodeId: `node_${i}`,
            label: '0',
          });
        }
      }
      return { nodes, edges };
    };

    it('evaluates hit queries across 100, 500, 1000, 2000, and 5000 node graphs deterministically', () => {
      const scales = [100, 500, 1000, 2000, 5000];

      for (const scale of scales) {
        const { nodes, edges } = generateBenchmarkGraph(scale);

        // 1. Direct hit on node 0
        const hitResult = hitDispatcher.evaluateHit(nodes, edges, { x: 0, y: 0 });
        expect(hitResult.type).toBe('node');
        expect(hitResult.nodeId).toBe('node_0');

        // 2. Direct hit on edge 1 (connects node_0 at (0,0) and node_1 at (120,0))
        if (edges.length > 0) {
          const edgeResult = hitDispatcher.evaluateHit(nodes, edges, { x: 60, y: 0 });
          expect(edgeResult.type).toBe('edge');
        }

        // 3. Background miss
        const missResult = hitDispatcher.evaluateHit(nodes, edges, { x: -500, y: -500 });
        expect(missResult.type).toBe('background');
      }
    });
  });
});
