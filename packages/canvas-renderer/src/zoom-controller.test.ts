import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZoomController } from './interaction/zoom-controller';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';

describe('ZoomController Subsystem', () => {
  let zoomController: ZoomController;
  let viewport: Viewport;
  let camera: Camera;

  const createWheel = (overrides: Partial<WheelEvent> = {}): WheelEvent =>
    ({
      deltaY: 0,
      ctrlKey: false,
      preventDefault: vi.fn(),
      ...overrides,
    } as unknown as WheelEvent);

  beforeEach(() => {
    zoomController = new ZoomController();
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);
  });

  it('handles discrete wheel zoom scaling', () => {
    const wheelIn = createWheel({ deltaY: -100 });
    zoomController.handleWheel(wheelIn, { x: 400, y: 300 }, camera);
    expect(camera.getState().zoom).toBeCloseTo(1.1, 2);

    const wheelOut = createWheel({ deltaY: 100 });
    zoomController.handleWheel(wheelOut, { x: 400, y: 300 }, camera);
    expect(camera.getState().zoom).toBeCloseTo(1.1 * 0.9, 2);
  });

  it('handles trackpad fine pinch zooming with ctrlKey', () => {
    const pinch = createWheel({ deltaY: 15, ctrlKey: true });
    zoomController.handleWheel(pinch, { x: 400, y: 300 }, camera);
    expect(camera.getState().zoom).toBeLessThan(1.0);
  });

  it('executes zoomIn, zoomOut, and resetZoom commands', () => {
    zoomController.zoomIn(camera, { x: 400, y: 300 });
    expect(camera.getState().zoom).toBeCloseTo(1.2, 2);

    zoomController.zoomOut(camera, { x: 400, y: 300 });
    expect(camera.getState().zoom).toBeCloseTo(1.2 * 0.8, 2);

    zoomController.resetZoom(camera);
    expect(camera.getState().zoom).toBe(1.0);
  });
});
