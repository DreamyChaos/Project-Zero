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

  describe('Global Double-Click Transition Editing', () => {
    it('detects double-click on transition edge, selects it, and emits subscribeEdgeDoubleClicked', () => {
      engine.setStateNodes([
        { id: 'q0', label: 'q0', x: 0, y: 0 },
        { id: 'q1', label: 'q1', x: 200, y: 0 },
      ]);
      const edge: TransitionEdge = { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' };
      engine.setTransitionEdges([edge]);

      const dblClickSpy = vi.fn();
      const unsub = engine.subscribeEdgeDoubleClicked(dblClickSpy);

      // World point on edge (100, 2) corresponds to screen point (612, 386)
      const mockDblClickEvent = {
        clientX: 612,
        clientY: 386,
        button: 0,
      } as unknown as MouseEvent;

      const handled = engine.handleDoubleClick(mockDblClickEvent);
      expect(handled).toBe(true);
      expect(dblClickSpy).toHaveBeenCalledTimes(1);
      expect(dblClickSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'e0', label: 'a' }));

      // Selected edge should be e0
      const selectedEdges = engine.getInteractionEngine().getContext().getSelectedEdgeIds();
      expect(selectedEdges).toEqual(['e0']);

      unsub();
    });

    it('detects double-click on transition label area', () => {
      engine.setStateNodes([
        { id: 'q0', label: 'q0', x: 0, y: 0 },
        { id: 'q1', label: 'q1', x: 200, y: 0 },
      ]);
      const edge: TransitionEdge = { id: 'e_pda', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, a -> ε' };
      engine.setTransitionEdges([edge]);

      const dblClickSpy = vi.fn();
      engine.subscribeEdgeDoubleClicked(dblClickSpy);

      // Label anchor is at (100, 0) with normal (0, -1) offset 14 -> label center at (100, -14)
      // Camera: width=1024, height=768, zoom=1, center=(0,0)
      // Screen = (512 + worldX, 384 - worldY) = (512+100, 384-(-14)) = (612, 398)
      const mockDblClickEvent = {
        clientX: 612,
        clientY: 398,
        button: 0,
      } as unknown as MouseEvent;

      const handled = engine.handleDoubleClick(mockDblClickEvent);
      expect(handled).toBe(true);
      expect(dblClickSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'e_pda' }));
    });

    it('preserves empty-canvas state creation when double-clicking background in add-state mode', () => {
      engine.setStateNodes([
        { id: 'q0', label: 'q0', x: 0, y: 0 },
      ]);
      engine.setTool('add-state');

      const dblClickSpy = vi.fn();
      engine.subscribeEdgeDoubleClicked(dblClickSpy);

      const addStateSpy = vi.fn();
      engine.subscribeNodeAdded?.(addStateSpy);

      // Double-click empty canvas at screen (800, 500) -> world (288, 116)
      const mockDblClickEvent = {
        clientX: 800,
        clientY: 500,
        button: 0,
      } as unknown as MouseEvent;

      const handled = engine.handleDoubleClick(mockDblClickEvent);
      expect(handled).toBe(true);
      expect(dblClickSpy).not.toHaveBeenCalled();
    });

    it('detects double-click on self-loop transition', () => {
      engine.setStateNodes([
        { id: 'q0', label: 'q0', x: 0, y: 0, radius: 32 },
      ]);
      const selfLoop: TransitionEdge = {
        id: 'e_loop',
        sourceNodeId: 'q0',
        targetNodeId: 'q0',
        label: '0 -> 1, R',
        isSelfLoop: true,
      };
      engine.setTransitionEdges([selfLoop]);

      const dblClickSpy = vi.fn();
      engine.subscribeEdgeDoubleClicked(dblClickSpy);

      // Self-loop apex curve reaches y ≈ -69. Screen: world (0, -69) -> screen (512, 315)
      const mockDblClickEvent = {
        clientX: 512,
        clientY: 315,
        button: 0,
      } as unknown as MouseEvent;

      const handled = engine.handleDoubleClick(mockDblClickEvent);
      expect(handled).toBe(true);
      expect(dblClickSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'e_loop' }));
    });
  });
});
