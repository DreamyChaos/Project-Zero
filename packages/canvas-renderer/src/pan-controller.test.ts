import { describe, it, expect, beforeEach } from 'vitest';
import { PanController } from './interaction/pan-controller';
import { InteractionContext } from './interaction/interaction-context';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';
import { CanvasPointerEvent } from './interaction/pointer-event';

describe('PanController Subsystem', () => {
  let panController: PanController;
  let context: InteractionContext;
  let viewport: Viewport;
  let camera: Camera;

  const createEvent = (overrides: Partial<CanvasPointerEvent> = {}): CanvasPointerEvent => ({
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

  beforeEach(() => {
    panController = new PanController();
    context = new InteractionContext();
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);
  });

  it('determines pan initiation from middle button, space+drag, or touch', () => {
    expect(panController.shouldInitiatePan(createEvent({ button: 1 }))).toBe(true);

    expect(panController.shouldInitiatePan(createEvent({ button: 0 }))).toBe(false);
    panController.setSpacePressed(true);
    expect(panController.shouldInitiatePan(createEvent({ button: 0 }))).toBe(true);
    panController.setSpacePressed(false);

    expect(panController.shouldInitiatePan(createEvent({ pointerType: 'touch', button: 0 }))).toBe(true);
  });

  it('executes continuous screen-delta pan updates', () => {
    const startEvent = createEvent({ screenPoint: { x: 400, y: 300 } });
    panController.startPan(context, startEvent, camera);

    expect(context.dragOriginScreen).toEqual({ x: 400, y: 300 });

    const moveEvent = createEvent({ screenPoint: { x: 450, y: 320 } });
    const updated = panController.updatePan(context, moveEvent, camera);
    expect(updated).toBe(true);

    const camState = camera.getState();
    expect(camState.x).not.toBe(0);

    panController.endPan(context);
    expect(context.dragOriginScreen).toBeNull();
    expect(context.cameraAnchor).toBeNull();
  });
});
