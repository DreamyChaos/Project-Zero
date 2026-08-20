import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractionEngine } from './interaction/interaction-engine';
import { InteractionState } from './interaction/interaction-state';
import { StateRenderer } from './state/state-renderer';
import { EdgeRenderer } from './edge/edge-renderer';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';
import { CanvasPointerEvent } from './interaction/pointer-event';

describe('Canvas Pan & Interaction Reconstruction Contracts', () => {
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

  beforeEach(() => {
    stateRenderer = new StateRenderer();
    edgeRenderer = new EdgeRenderer();
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);

    stateRenderer.setStateNodes([
      { id: 'q0', label: 'q0', x: 0, y: 0, radius: 32, isInitial: true },
      { id: 'q1', label: 'q1', x: 200, y: 0, radius: 32, isAccepting: true },
      { id: 'q2', label: 'q2', x: 0, y: 200, radius: 32 },
    ]);

    edgeRenderer.setEdges([
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' },
      { id: 'e1', sourceNodeId: 'q1', targetNodeId: 'q2', label: '1' },
    ]);

    interactionEngine = new InteractionEngine();
  });

  // Contract 1: Select + empty background drag -> Panning
  it('1. Select + empty background drag initiates canvas Panning', () => {
    const downEvent = createPointer({
      worldPoint: { x: 500, y: 500 }, // Empty space
      screenPoint: { x: 500, y: 500 },
    });

    interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getState()).toBe(InteractionState.Panning);

    const moveEvent = createPointer({
      worldPoint: { x: 550, y: 520 },
      screenPoint: { x: 550, y: 520 },
    });

    interactionEngine.pointerMove(moveEvent, camera, stateRenderer, edgeRenderer);
    const camState = camera.getState();
    // Camera translation should shift to match pointer drag delta
    expect(camState.x).toBe(-50);
    expect(camState.y).toBe(-20);
  });

  // Contract 2: Select + node drag -> DraggingNode without camera movement
  it('2. Select + node drag initiates DraggingNode and leaves camera fixed', () => {
    const initialCamState = { ...camera.getState() };

    const downEvent = createPointer({
      worldPoint: { x: 0, y: 0 }, // Directly on q0
      screenPoint: { x: 400, y: 300 },
    });

    interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getState()).toBe(InteractionState.DraggingNode);

    const moveEvent = createPointer({
      worldPoint: { x: 40, y: 30 },
      screenPoint: { x: 440, y: 330 },
    });

    interactionEngine.pointerMove(moveEvent, camera, stateRenderer, edgeRenderer);
    const postCamState = camera.getState();

    // Node moved in world, camera stayed static
    expect(postCamState.x).toBe(initialCamState.x);
    expect(postCamState.y).toBe(initialCamState.y);
  });

  // Contract 3: Select + edge interaction -> Edge selection
  it('3. Select + edge click selects edge', () => {
    const edgeClick = createPointer({
      worldPoint: { x: 100, y: 0 }, // On edge e0
    });

    interactionEngine.pointerDown(edgeClick, camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getContext().isEdgeSelected('e0')).toBe(true);
  });

  // Contract 4: Box + background drag -> MarqueeSelection
  it('4. Box tool mode + background drag triggers MarqueeSelection', () => {
    interactionEngine.setMarqueeMode(true);
    const downEvent = createPointer({ worldPoint: { x: 500, y: 500 } });

    interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getState()).toBe(InteractionState.MarqueeSelection);
  });

  // Contract 5: Shift + background drag -> Marquee additive selection behavior
  it('5. Shift + background drag triggers additive MarqueeSelection', () => {
    const downEvent = createPointer({
      worldPoint: { x: 500, y: 500 },
      shiftKey: true,
    });

    interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getState()).toBe(InteractionState.MarqueeSelection);
  });

  // Contract 6: Space + background drag -> Panning
  it('6. Spacebar + background drag initiates Panning', () => {
    interactionEngine.keyDown(createKey(' '), camera, stateRenderer);
    const downEvent = createPointer({ worldPoint: { x: 500, y: 500 } });

    interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getState()).toBe(InteractionState.Panning);
  });

  // Contract 7: Middle mouse drag -> Panning
  it('7. Middle mouse button drag initiates Panning unconditionally', () => {
    const downEvent = createPointer({
      button: 1,
      worldPoint: { x: 0, y: 0 }, // Even on a node!
    });

    interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getState()).toBe(InteractionState.Panning);
  });

  // Contract 8: Pointer cancel -> returns to safe idle state
  it('8. Pointer cancel returns engine safely to Idle state', () => {
    interactionEngine.pointerDown(createPointer({ worldPoint: { x: 500, y: 500 } }), camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getState()).toBe(InteractionState.Panning);

    interactionEngine.pointerCancel();
    expect(interactionEngine.getState()).toBe(InteractionState.Idle);
  });

  // Contract 9: Pointer capture loss -> interaction state clean recovery
  it('9. Pointer capture loss cleans up drag context', () => {
    interactionEngine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);
    expect(interactionEngine.getState()).toBe(InteractionState.DraggingNode);

    interactionEngine.pointerCancel();
    expect(interactionEngine.getContext().dragOriginWorld).toBeNull();
    expect(interactionEngine.getState()).toBe(InteractionState.Idle);
  });

  // Contract 10: Pan does NOT mutate node world coordinates
  it('10. Canvas panning does NOT mutate state node world coordinates', () => {
    const q0Before = { ...stateRenderer.getStateNode('q0')! };
    const q1Before = { ...stateRenderer.getStateNode('q1')! };

    const downEvent = createPointer({ worldPoint: { x: 500, y: 500 }, screenPoint: { x: 500, y: 500 } });
    interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);

    const moveEvent = createPointer({ worldPoint: { x: 600, y: 600 }, screenPoint: { x: 600, y: 600 } });
    interactionEngine.pointerMove(moveEvent, camera, stateRenderer, edgeRenderer);

    const q0After = stateRenderer.getStateNode('q0')!;
    const q1After = stateRenderer.getStateNode('q1')!;

    expect(q0After.x).toBe(q0Before.x);
    expect(q0After.y).toBe(q0Before.y);
    expect(q1After.x).toBe(q1Before.x);
    expect(q1After.y).toBe(q1Before.y);
  });

  // Contract 11: Pan does NOT create graph undo history
  it('11. Canvas panning alters camera position without emitting node movement callbacks', () => {
    const onNodeMoved = vi.fn();
    const engine = new InteractionEngine({ callbacks: { onNodeMoved } });

    const downEvent = createPointer({ worldPoint: { x: 500, y: 500 }, screenPoint: { x: 500, y: 500 } });
    engine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);

    const moveEvent = createPointer({ worldPoint: { x: 600, y: 600 }, screenPoint: { x: 600, y: 600 } });
    engine.pointerMove(moveEvent, camera, stateRenderer, edgeRenderer);

    expect(onNodeMoved).not.toHaveBeenCalled();
  });

  // Contract 12: Zoom after pan -> camera transform consistency
  it('12. Camera zoom operations after panning maintain transform consistency', () => {
    // 1. Pan camera
    const downEvent = createPointer({ worldPoint: { x: 500, y: 500 }, screenPoint: { x: 500, y: 500 } });
    interactionEngine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);
    const moveEvent = createPointer({ worldPoint: { x: 600, y: 500 }, screenPoint: { x: 600, y: 500 } });
    interactionEngine.pointerMove(moveEvent, camera, stateRenderer, edgeRenderer);
    interactionEngine.pointerUp(moveEvent, camera, stateRenderer, edgeRenderer.getEdges());

    const camStateAfterPan = camera.getState();
    expect(camStateAfterPan.x).toBe(-100);

    // 2. Zoom at point
    camera.zoomAtPoint(1.2, { x: 400, y: 300 }, true);
    expect(camera.getState().zoom).toBe(1.2);

    // Coordinate conversion consistency check
    const worldCenter = camera.screenToWorld({ x: 400, y: 300 });
    const screenCenter = camera.worldToScreen(worldCenter);
    expect(screenCenter.x).toBeCloseTo(400);
    expect(screenCenter.y).toBeCloseTo(300);
  });

  // Contract 13: Resize after pan -> viewport remains valid
  it('13. Resizing viewport after panning preserves camera state and transform matrices', () => {
    camera.setPosition(150, -80, true);
    viewport.resize(1920, 1080);

    const state = camera.getState();
    expect(state.x).toBe(150);
    expect(state.y).toBe(-80);

    const matrix = camera.getWorldToScreenMatrix();
    expect(matrix).toBeDefined();
    expect(matrix.length).toBe(6);
  });

  // Contract 14: State drag after panning -> node movement calculates correctly in world space
  it('14. Dragging state nodes after panning operates accurately in world coordinates', () => {
    // Pan camera 100px right
    camera.setPosition(-100, 0, true);

    const onNodeMoved = vi.fn();
    const engine = new InteractionEngine({ callbacks: { onNodeMoved } });

    // Pointer down on q0 at (0,0) world
    const downEvent = createPointer({ worldPoint: { x: 0, y: 0 } });
    engine.pointerDown(downEvent, camera, stateRenderer, edgeRenderer);

    // Move pointer 50px right in world
    const moveEvent = createPointer({ worldPoint: { x: 50, y: 0 } });
    engine.pointerMove(moveEvent, camera, stateRenderer, edgeRenderer);

    expect(onNodeMoved).toHaveBeenCalledWith('q0', 50, 0);
  });

  // Contract 15: Edge creation after panning -> edge coordinates remain accurate
  it('15. Creating edges after panning uses correct world coordinate hit testing', () => {
    camera.setPosition(-100, 0, true);

    const onEdgeCreated = vi.fn();
    const engine = new InteractionEngine({ callbacks: { onEdgeCreated } });
    engine.setCreatingEdgeMode(true);

    // Pointer down on q0 (0,0)
    engine.pointerDown(createPointer({ worldPoint: { x: 0, y: 0 } }), camera, stateRenderer, edgeRenderer);

    // Pointer up on q1 (200,0)
    engine.pointerUp(createPointer({ worldPoint: { x: 200, y: 0 } }), camera, stateRenderer, edgeRenderer.getEdges());

    expect(onEdgeCreated).toHaveBeenCalledWith('q0', 'q1');
  });

  // Contract 16: Multiple nodes + edges -> complete graph travels together visually
  it('16. All nodes and edges retain relative positions during camera panning', () => {
    const q0PosBefore = { x: stateRenderer.getStateNode('q0')!.x, y: stateRenderer.getStateNode('q0')!.y };
    const q1PosBefore = { x: stateRenderer.getStateNode('q1')!.x, y: stateRenderer.getStateNode('q1')!.y };
    const relativeDistanceBefore = Math.hypot(q1PosBefore.x - q0PosBefore.x, q1PosBefore.y - q0PosBefore.y);

    // Execute pan
    camera.setPosition(250, 350, true);

    const q0PosAfter = { x: stateRenderer.getStateNode('q0')!.x, y: stateRenderer.getStateNode('q0')!.y };
    const q1PosAfter = { x: stateRenderer.getStateNode('q1')!.x, y: stateRenderer.getStateNode('q1')!.y };
    const relativeDistanceAfter = Math.hypot(q1PosAfter.x - q0PosAfter.x, q1PosAfter.y - q0PosAfter.y);

    expect(relativeDistanceAfter).toBe(relativeDistanceBefore);
  });
});
