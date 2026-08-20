import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractionEngine } from './interaction/interaction-engine';
import { InteractionState, isDraggingInteractionState } from './interaction/interaction-state';
import { StateRenderer } from './state/state-renderer';
import { EdgeRenderer } from './edge/edge-renderer';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';
import { CanvasPointerEvent } from './interaction/pointer-event';
import { RenderQueue } from './pipeline/render-queue';

describe('InteractionEngine Subsystem', () => {
  let interactionEngine: InteractionEngine;
  let stateRenderer: StateRenderer;
  let edgeRenderer: EdgeRenderer;
  let viewport: Viewport;
  let camera: Camera;

  const createPointer = (overrides: Partial<CanvasPointerEvent> = {}): CanvasPointerEvent => ({
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

  const createWheel = (overrides: Partial<WheelEvent> = {}): WheelEvent =>
    ({
      deltaY: 0,
      ctrlKey: false,
      preventDefault: vi.fn(),
      ...overrides,
    } as unknown as WheelEvent);

  beforeEach(() => {
    stateRenderer = new StateRenderer();
    edgeRenderer = new EdgeRenderer();
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);

    stateRenderer.setStateNodes([
      { id: 'q0', label: 'q0', x: 0, y: 0, radius: 32 },
      { id: 'q1', label: 'q1', x: 200, y: 0, radius: 32 },
      { id: 'q2', label: 'q2', x: 0, y: 200, radius: 32 },
    ]);

    edgeRenderer.setEdges([
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q2', label: '1' },
    ]);

    interactionEngine = new InteractionEngine();
  });

  describe('Interaction States & Predicates', () => {
    it('starts in Idle state and verifies dragging predicates', () => {
      expect(interactionEngine.getState()).toBe(InteractionState.Idle);
      expect(isDraggingInteractionState(InteractionState.Idle)).toBe(false);
      expect(isDraggingInteractionState(InteractionState.Hover)).toBe(false);
      expect(isDraggingInteractionState(InteractionState.DraggingNode)).toBe(true);
      expect(isDraggingInteractionState(InteractionState.DraggingSelection)).toBe(true);
      expect(isDraggingInteractionState(InteractionState.Panning)).toBe(true);
      expect(isDraggingInteractionState(InteractionState.MarqueeSelection)).toBe(true);
      expect(isDraggingInteractionState(InteractionState.CreatingEdge)).toBe(true);
      expect(isDraggingInteractionState(InteractionState.Zooming)).toBe(false);
    });

    it('emits onStateChanged callbacks on state transitions', () => {
      const onStateChanged = vi.fn();
      const engine = new InteractionEngine({
        callbacks: { onStateChanged },
      });

      engine.pointerMove(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(onStateChanged).toHaveBeenCalledWith(InteractionState.Hover);
    });
  });

  describe('Hover & Event Routing', () => {
    it('transitions to Hover when pointer moves over a node', () => {
      const event = createPointer({
        worldPoint: { x: 0, y: 0 },
        button: 0,
        buttons: 0,
      });

      const changed = interactionEngine.pointerMove(event, camera, stateRenderer, edgeRenderer);
      expect(changed).toBe(true);
      expect(interactionEngine.getState()).toBe(InteractionState.Hover);
      expect(interactionEngine.getContext().hoveredNodeId).toBe('q0');
      expect(interactionEngine.getContext().cursor).toBe('grab');
    });

    it('transitions to Hover when pointer moves over an edge', () => {
      const event = createPointer({
        worldPoint: { x: 100, y: 0 }, // on edge e0
        button: 0,
        buttons: 0,
      });

      const changed = interactionEngine.pointerMove(event, camera, stateRenderer, edgeRenderer);
      expect(changed).toBe(true);
      expect(interactionEngine.getState()).toBe(InteractionState.Hover);
      expect(interactionEngine.getContext().hoveredEdgeId).toBe('e0');
      expect(interactionEngine.getContext().cursor).toBe('pointer');
    });

    it('returns to Idle when pointer leaves entities', () => {
      interactionEngine.pointerMove(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(interactionEngine.getState()).toBe(InteractionState.Hover);

      interactionEngine.pointerMove(createPointer({ worldPoint: { x: 500, y: 500 } }), camera, stateRenderer, edgeRenderer);
      expect(interactionEngine.getState()).toBe(InteractionState.Idle);
      expect(interactionEngine.getContext().hoveredNodeId).toBeNull();
      expect(interactionEngine.getContext().hoveredEdgeId).toBeNull();
    });
  });

  describe('Selection Controller', () => {
    it('selects single node on click and clears on background click', () => {
      const onSelectionChanged = vi.fn();
      const engine = new InteractionEngine({ callbacks: { onSelectionChanged } });

      // Click on q0
      engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(engine.getContext().isNodeSelected('q0')).toBe(true);
      expect(onSelectionChanged).toHaveBeenCalledWith(['q0'], []);

      // Click on background
      engine.pointerDown(createPointer({ worldPoint: { x: 500, y: 500 } }), camera, stateRenderer, edgeRenderer);
      expect(engine.getContext().isNodeSelected('q0')).toBe(false);
      expect(onSelectionChanged).toHaveBeenCalledWith([], []);
    });

    it('supports Ctrl/Cmd multi-selection toggle', () => {
      const onSelectionChanged = vi.fn();
      const engine = new InteractionEngine({ callbacks: { onSelectionChanged } });

      engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 }, ctrlKey: true }), camera, stateRenderer, edgeRenderer);
      expect(engine.getContext().isNodeSelected('q0')).toBe(true);

      engine.pointerDown(createPointer({ worldPoint: { x: 200, y: 0 }, ctrlKey: true }), camera, stateRenderer, edgeRenderer);
      expect(engine.getContext().isNodeSelected('q0')).toBe(true);
      expect(engine.getContext().isNodeSelected('q1')).toBe(true);

      // Toggle off q0
      engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 }, ctrlKey: true }), camera, stateRenderer, edgeRenderer);
      expect(engine.getContext().isNodeSelected('q0')).toBe(false);
      expect(engine.getContext().isNodeSelected('q1')).toBe(true);
    });

    it('supports Shift additive selection', () => {
      const engine = new InteractionEngine();

      engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(engine.getContext().getSelectedNodeIds()).toEqual(['q0']);

      engine.pointerDown(createPointer({ worldPoint: { x: 200, y: 0 }, shiftKey: true }), camera, stateRenderer, edgeRenderer);
      expect(engine.getContext().isNodeSelected('q0')).toBe(true);
      expect(engine.getContext().isNodeSelected('q1')).toBe(true);
    });

    it('handles edge selection', () => {
      interactionEngine.pointerDown(createPointer({ worldPoint: { x: 100, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(interactionEngine.getContext().isEdgeSelected('e0')).toBe(true);
    });

    it('handles Tab, Shift+Tab, and Escape keyboard navigation', () => {
      // Focus navigation via Tab
      const tabEvent = createKey('Tab');
      const handled = interactionEngine.keyDown(tabEvent, camera, stateRenderer);
      expect(handled).toBe(true);
      expect(interactionEngine.getContext().isNodeSelected('q0')).toBe(true);

      // Next node
      interactionEngine.keyDown(tabEvent, camera, stateRenderer);
      expect(interactionEngine.getContext().isNodeSelected('q1')).toBe(true);

      // Shift+Tab backward
      const shiftTabEvent = createKey('Tab', { shiftKey: true });
      interactionEngine.keyDown(shiftTabEvent, camera, stateRenderer);
      expect(interactionEngine.getContext().isNodeSelected('q0')).toBe(true);

      // Escape to clear
      const escapeEvent = createKey('Escape');
      interactionEngine.keyDown(escapeEvent, camera, stateRenderer);
      expect(interactionEngine.getContext().getSelectedNodeIds().length).toBe(0);
    });
  });

  describe('Drag Controller & Grid Snapping', () => {
    it('moves single node and invokes onNodeMoved callback', () => {
      const onNodeMoved = vi.fn();
      const engine = new InteractionEngine({ callbacks: { onNodeMoved } });

      engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(engine.getState()).toBe(InteractionState.DraggingNode);

      engine.pointerMove(createPointer({ worldPoint: { x: 50, y: 30 } }), camera, stateRenderer, edgeRenderer);
      expect(onNodeMoved).toHaveBeenCalledWith('q0', 50, 30);

      engine.pointerUp(createPointer({ worldPoint: { x: 50, y: 30 } }), camera, stateRenderer, edgeRenderer.getEdges());
      expect(engine.getState()).toBe(InteractionState.Idle);
    });

    it('moves multiple selected nodes together in DraggingSelection state', () => {
      const onNodeMoved = vi.fn();
      const engine = new InteractionEngine({ callbacks: { onNodeMoved } });

      // Select q0 and q1
      engine.getContext().selectNode('q0', true);
      engine.getContext().selectNode('q1', true);

      engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(engine.getState()).toBe(InteractionState.DraggingSelection);

      engine.pointerMove(createPointer({ worldPoint: { x: 10, y: 15 } }), camera, stateRenderer, edgeRenderer);
      expect(onNodeMoved).toHaveBeenCalledWith('q0', 10, 15);
      expect(onNodeMoved).toHaveBeenCalledWith('q1', 210, 15);
    });

    it('snaps node position to grid when grid snap is enabled', () => {
      const onNodeMoved = vi.fn();
      const engine = new InteractionEngine({
        dragOptions: { enableGridSnap: true, gridSnapStep: 25 },
        callbacks: { onNodeMoved },
      });

      engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      engine.pointerMove(createPointer({ worldPoint: { x: 28, y: 52 } }), camera, stateRenderer, edgeRenderer);

      expect(onNodeMoved).toHaveBeenCalledWith('q0', 25, 50);
    });
  });

  describe('Pan Controller', () => {
    it('pans camera via middle mouse button', () => {
      const event = createPointer({
        button: 1,
        worldPoint: { x: 100, y: 100 },
        screenPoint: { x: 200, y: 200 },
      });

      interactionEngine.pointerDown(event, camera, stateRenderer, edgeRenderer);
      expect(interactionEngine.getState()).toBe(InteractionState.Panning);

      const moveEvent = createPointer({
        button: 1,
        worldPoint: { x: 150, y: 150 },
        screenPoint: { x: 250, y: 220 },
      });

      interactionEngine.pointerMove(moveEvent, camera, stateRenderer, edgeRenderer);
      const camState = camera.getState();
      expect(camState.x).not.toBe(0);

      interactionEngine.pointerUp(moveEvent, camera, stateRenderer, edgeRenderer.getEdges());
      expect(interactionEngine.getState()).toBe(InteractionState.Idle);
    });

    it('pans camera via Spacebar + drag', () => {
      const spaceDown = createKey(' ');
      interactionEngine.keyDown(spaceDown, camera, stateRenderer);
      expect(interactionEngine.getPanController().isSpaceBarPressed()).toBe(true);
      expect(interactionEngine.getContext().cursor).toBe('grab');

      const downEvent = createPointer({ button: 0, screenPoint: { x: 100, y: 100 } });
      interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);
      expect(interactionEngine.getState()).toBe(InteractionState.Panning);

      const spaceUp = createKey(' ');
      interactionEngine.keyUp(spaceUp);
      expect(interactionEngine.getPanController().isSpaceBarPressed()).toBe(false);
    });

    it('pans camera via Touch drag on background', () => {
      const touchEvent = createPointer({
        pointerType: 'touch',
        button: 0,
        worldPoint: { x: 500, y: 500 },
        screenPoint: { x: 100, y: 100 },
      });

      interactionEngine.pointerDown(touchEvent, camera, stateRenderer, edgeRenderer);
      expect(interactionEngine.getState()).toBe(InteractionState.Panning);
    });
  });

  describe('Zoom Controller', () => {
    it('zooms via mouse wheel event anchored to pointer', () => {
      const wheelEvent = createWheel({ deltaY: -100 });
      const initialZoom = camera.getState().zoom;

      interactionEngine.wheel(wheelEvent, { x: 400, y: 300 }, camera);
      expect(camera.getState().zoom).toBeGreaterThan(initialZoom);
    });

    it('handles trackpad pinch zoom with ctrlKey', () => {
      const pinchEvent = createWheel({ deltaY: 20, ctrlKey: true });
      const initialZoom = camera.getState().zoom;

      interactionEngine.wheel(pinchEvent, { x: 400, y: 300 }, camera);
      expect(camera.getState().zoom).toBeLessThan(initialZoom);
    });

    it('provides zoomIn, zoomOut, resetZoom controls', () => {
      const zoomCtrl = interactionEngine.getZoomController();
      zoomCtrl.zoomIn(camera, { x: 400, y: 300 });
      expect(camera.getState().zoom).toBeCloseTo(1.2, 2);

      zoomCtrl.resetZoom(camera);
      expect(camera.getState().zoom).toBe(1.0);

      zoomCtrl.zoomOut(camera, { x: 400, y: 300 });
      expect(camera.getState().zoom).toBeCloseTo(0.8, 2);
    });
  });

  describe('Marquee Selection Controller', () => {
    it('creates marquee rectangle and selects enclosed nodes', () => {
      interactionEngine.setMarqueeMode(true);
      // Start drag on background at (-50, -50)
      interactionEngine.pointerDown(
        createPointer({ worldPoint: { x: -50, y: -50 } }),
        camera,
        stateRenderer,
        edgeRenderer
      );
      expect(interactionEngine.getState()).toBe(InteractionState.MarqueeSelection);

      // Drag to (250, 50) covering q0 (0,0) and q1 (200,0)
      interactionEngine.pointerMove(
        createPointer({ worldPoint: { x: 250, y: 50 } }),
        camera,
        stateRenderer,
        edgeRenderer
      );

      expect(interactionEngine.getContext().isNodeSelected('q0')).toBe(true);
      expect(interactionEngine.getContext().isNodeSelected('q1')).toBe(true);
      expect(interactionEngine.getContext().isNodeSelected('q2')).toBe(false);

      interactionEngine.pointerUp(
        createPointer({ worldPoint: { x: 250, y: 50 } }),
        camera,
        stateRenderer,
        edgeRenderer.getEdges()
      );
      expect(interactionEngine.getState()).toBe(InteractionState.Idle);
    });

    it('enqueues marquee draw commands on Selection layer', () => {
      const queue = new RenderQueue();
      interactionEngine.pointerDown(
        createPointer({ worldPoint: { x: 0, y: 0 } }),
        camera,
        stateRenderer,
        edgeRenderer
      );
      interactionEngine.getMarqueeController().startMarquee(interactionEngine.getContext(), { x: 0, y: 0 });

      interactionEngine.enqueueDrawCommands(queue, camera, stateRenderer);
      expect(queue.getCount()).toBeGreaterThan(0);
    });
  });

  describe('Edge Preview Controller', () => {
    it('creates dynamic preview line and commits new edge on valid target node', () => {
      const onEdgeCreated = vi.fn();
      const engine = new InteractionEngine({ callbacks: { onEdgeCreated } });
      engine.setCreatingEdgeMode(true);
      expect(engine.isCreatingEdge()).toBe(true);

      // Start on q0
      engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(engine.getState()).toBe(InteractionState.CreatingEdge);
      expect(engine.getContext().edgePreview?.sourceNodeId).toBe('q0');

      // Move toward q2
      engine.pointerMove(createPointer({ worldPoint: { x: 0, y: 150 } }), camera, stateRenderer, edgeRenderer);
      expect(engine.getContext().edgePreview?.currentPointerWorld).toEqual({ x: 0, y: 150 });

      // Release on q2
      engine.pointerUp(createPointer({ worldPoint: { x: 0, y: 200 } }), camera, stateRenderer, edgeRenderer.getEdges());
      expect(onEdgeCreated).toHaveBeenCalledWith('q0', 'q2');
      expect(engine.getState()).toBe(InteractionState.Idle);
      expect(engine.getContext().edgePreview).toBeNull();
    });

    it('cancels edge preview on Escape key or empty canvas release', () => {
      interactionEngine.setCreatingEdgeMode(true);

      interactionEngine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
      expect(interactionEngine.getState()).toBe(InteractionState.CreatingEdge);

      const escapeKey = createKey('Escape');
      interactionEngine.keyDown(escapeKey, camera, stateRenderer);
      expect(interactionEngine.getState()).toBe(InteractionState.Idle);
      expect(interactionEngine.getContext().edgePreview).toBeNull();
    });
  });

  describe('Cursor Manager & Updates', () => {
    it('updates cursor style for all interaction states', () => {
      const onCursorChanged = vi.fn();
      const engine = new InteractionEngine({ callbacks: { onCursorChanged } });

      const cursorMgr = engine.getCursorManager();
      cursorMgr.setCursor('crosshair');
      expect(cursorMgr.getCursor()).toBe('crosshair');
      expect(onCursorChanged).toHaveBeenCalledWith('crosshair');
    });
  });

  describe('Reset & Lifecycle', () => {
    it('resets context and active states cleanly', () => {
      interactionEngine.getContext().selectNode('q0');
      interactionEngine.reset();

      expect(interactionEngine.getState()).toBe(InteractionState.Idle);
      expect(interactionEngine.getContext().getSelectedNodeIds().length).toBe(0);
      expect(interactionEngine.getContext().hoveredNodeId).toBeNull();
    });
  });
});
