import { describe, it, expect } from 'vitest';
import {
  CANVAS_RENDERER_VERSION,
  CanvasEngine,
  Camera,
  Viewport,
  LayerManager,
  CanvasGrid,
  StateRenderer,
  EdgeRenderer,
  InteractionEngine,
  InteractionState,
  HitDispatcher,
  DragController,
  PanController,
  ZoomController,
  SelectionController,
  MarqueeController,
  EdgePreviewController,
  CursorManager,
  getNodeRadius,
  getAcceptingRingRadius,
  getInitialMarkerTriangle,
  computeStraightEdgeGeometry,
  computeCurvedEdgeGeometry,
  computeSelfLoopGeometry,
  getArrowheadTriangle,
  RenderQueue,
  RenderLoop,
  RenderLayer,
  createPoint,
  createBoundingBox,
  createIdentityMatrix,
} from './index';

describe('Canvas Renderer Main Exports', () => {
  it('exports correct package version and core classes', () => {
    expect(CANVAS_RENDERER_VERSION).toBe('1.0.0');
    expect(CanvasEngine).toBeDefined();
    expect(Camera).toBeDefined();
    expect(Viewport).toBeDefined();
    expect(LayerManager).toBeDefined();
    expect(CanvasGrid).toBeDefined();
    expect(StateRenderer).toBeDefined();
    expect(EdgeRenderer).toBeDefined();
    expect(InteractionEngine).toBeDefined();
    expect(HitDispatcher).toBeDefined();
    expect(DragController).toBeDefined();
    expect(PanController).toBeDefined();
    expect(ZoomController).toBeDefined();
    expect(SelectionController).toBeDefined();
    expect(MarqueeController).toBeDefined();
    expect(EdgePreviewController).toBeDefined();
    expect(CursorManager).toBeDefined();
    expect(RenderQueue).toBeDefined();
    expect(RenderLoop).toBeDefined();
    expect(InteractionState.Idle).toBe('Idle');
    expect(RenderLayer.Edges).toBe(2);
  });

  it('exports math, state, and edge geometry helper functions', () => {
    expect(createPoint(1, 2)).toEqual({ x: 1, y: 2 });
    expect(createBoundingBox(0, 0, 10, 10)).toBeDefined();
    expect(createIdentityMatrix()).toEqual([1, 0, 0, 1, 0, 0]);

    expect(getNodeRadius({ id: 'q0', label: 'q0', x: 0, y: 0 })).toBe(32);
    expect(getAcceptingRingRadius(32)).toBe(26);
    expect(getInitialMarkerTriangle({ x: 0, y: 0 }, 32, 16).length).toBe(3);

    expect(computeStraightEdgeGeometry({ x: 0, y: 0 }, 32, { x: 200, y: 0 }, 32)).toBeDefined();
    expect(computeCurvedEdgeGeometry({ x: 0, y: 0 }, 32, { x: 200, y: 0 }, 32, 1)).toBeDefined();
    expect(computeSelfLoopGeometry({ x: 0, y: 0 }, 32)).toBeDefined();
    expect(getArrowheadTriangle({ x: 100, y: 100 }, 0, 12, 8).length).toBe(3);
  });
});
