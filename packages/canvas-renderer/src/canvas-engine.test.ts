import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CanvasEngine } from './canvas-engine';
import { StateNode } from './state/state-node';
import { TransitionEdge } from './edge/edge-transition';
import { InteractionState } from './interaction/interaction-state';

describe('CanvasEngine Subsystem Facade', () => {
  let engine: CanvasEngine;

  beforeEach(() => {
    engine = new CanvasEngine({
      width: 1024,
      height: 768,
      devicePixelRatio: 2.0,
      theme: 'dark',
    });
  });

  afterEach(() => {
    engine.destroy();
  });

  it('initializes subcomponents with configured parameters and theme', () => {
    const viewport = engine.getViewport();
    expect(viewport.getWidth()).toBe(1024);
    expect(viewport.getHeight()).toBe(768);
    expect(viewport.getDevicePixelRatio()).toBe(2.0);

    const camera = engine.getCamera();
    expect(camera.getState().zoom).toBe(1.0);

    const layers = engine.getLayerManager().getOrderedLayers();
    expect(layers.length).toBe(11);

    expect(engine.getStateRenderer()).toBeDefined();
    expect(engine.getEdgeRenderer()).toBeDefined();
    expect(engine.getInteractionEngine()).toBeDefined();
    expect(engine.getSpatialIndex()).toBeDefined();
    expect(engine.getThemeMode()).toBe('dark');
  });

  it('synchronizes StateNodes and TransitionEdges with SpatialIndex automatically', () => {
    const q0: StateNode = { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true };
    const q1: StateNode = { id: 'q1', label: 'q1', x: 100, y: 0, isAccepting: true };
    const edge: TransitionEdge = { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' };

    engine.setStateNodes([q0, q1]);
    engine.setTransitionEdges([edge]);

    const spatialIndex = engine.getSpatialIndex();
    expect(spatialIndex.sizeNodes()).toBe(2);
    expect(spatialIndex.sizeEdges()).toBe(1);
    expect(spatialIndex.getNode('q0')).toBeDefined();
    expect(spatialIndex.getEdge('e0')).toBeDefined();

    engine.removeTransitionEdge('e0');
    expect(spatialIndex.sizeEdges()).toBe(0);

    engine.removeStateNode('q0');
    expect(spatialIndex.sizeNodes()).toBe(1);
    expect(spatialIndex.getNode('q0')).toBeUndefined();
  });

  it('routes pointer events through broad-phase spatial index candidates', () => {
    engine.setStateNodes([
      { id: 'q0', label: 'q0', x: 0, y: 0 },
      { id: 'q1', label: 'q1', x: 200, y: 0 },
    ]);

    const mockMouseEvent = {
      clientX: 512, // Viewport center (512, 384) -> World (0,0) hits q0
      clientY: 384,
      button: 0,
      buttons: 1,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
    } as unknown as MouseEvent;

    const handled = engine.handlePointerDown(mockMouseEvent);
    expect(handled).toBe(true);
    expect(engine.getInteractionEngine().getState()).toBe(InteractionState.DraggingNode);
  });

  it('switches design system theme dynamically across all subsystems without engine recreation', () => {
    expect(engine.getThemeMode()).toBe('dark');
    expect(engine.getTheme().bgBase).toBe('#0A0D14');

    engine.setTheme('light');
    expect(engine.getThemeMode()).toBe('light');
    expect(engine.getTheme().bgBase).toBe('#F8FAFC');
    expect(engine.getStateRenderer().getTheme().stateFill).toBe('#FFFFFF');

    engine.setTheme('high-contrast');
    expect(engine.getThemeMode()).toBe('high-contrast');
    expect(engine.getTheme().borderFocus).toBe('#FFFF00');
  });

  it('resizes canvas and viewport cleanly', () => {
    engine.resize(1920, 1080, 1.0);
    const viewport = engine.getViewport();

    expect(viewport.getWidth()).toBe(1920);
    expect(viewport.getHeight()).toBe(1080);
    expect(viewport.getDevicePixelRatio()).toBe(1.0);
  });

  it('attaches and detaches HTMLCanvasElement surfaces', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      scale: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      width: 0,
      height: 0,
      style: { width: '', height: '' },
      getContext: vi.fn().mockReturnValue(mockCtx),
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 1024, height: 768 }),
    } as unknown as HTMLCanvasElement;

    engine.attach(mockCanvas);
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');

    engine.detach();
    const metrics = engine.getRenderLoop().getMetrics();
    expect(metrics.isRunning).toBe(false);
  });

  it('executes frame rendering pass including nodes, edges, and interaction overlays', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      scale: vi.fn(),
      lineWidth: 1,
      strokeStyle: '#000',
      globalAlpha: 1,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      width: 0,
      height: 0,
      style: { width: '', height: '' },
      getContext: vi.fn().mockReturnValue(mockCtx),
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 1024, height: 768 }),
    } as unknown as HTMLCanvasElement;

    engine.attach(mockCanvas);
    engine.setStateNodes([
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true },
      { id: 'q1', label: 'q1', x: 200, y: 0, isAccepting: true },
    ]);
    engine.addTransitionEdge({ id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' });

    engine.renderFrame();

    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.scale).toHaveBeenCalledWith(2.0, 2.0);
    expect(mockCtx.bezierCurveTo).toHaveBeenCalled();
    expect(mockCtx.roundRect).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalledWith('a', expect.any(Number), expect.any(Number));
  });
});
