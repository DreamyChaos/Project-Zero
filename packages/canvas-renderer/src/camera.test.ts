import { describe, it, expect, beforeEach } from 'vitest';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';
import { createBoundingBox } from './math/bounding-box';

describe('Viewport & Camera System', () => {
  let viewport: Viewport;
  let camera: Camera;

  beforeEach(() => {
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);
  });

  describe('Viewport', () => {
    it('initializes with specified dimensions and DPR', () => {
      expect(viewport.getWidth()).toBe(800);
      expect(viewport.getHeight()).toBe(600);
      expect(viewport.getDevicePixelRatio()).toBe(1.0);
      expect(viewport.getCenter()).toEqual({ x: 400, y: 300 });
    });

    it('resizes cleanly', () => {
      viewport.resize(1024, 768);
      expect(viewport.getWidth()).toBe(1024);
      expect(viewport.getHeight()).toBe(768);
      expect(viewport.getCenter()).toEqual({ x: 512, y: 384 });
    });

    it('updates device pixel ratio', () => {
      viewport.setDevicePixelRatio(2.0);
      expect(viewport.getDevicePixelRatio()).toBe(2.0);
    });
  });

  describe('Camera', () => {
    it('initializes at origin with unit zoom', () => {
      const state = camera.getState();
      expect(state.x).toBe(0);
      expect(state.y).toBe(0);
      expect(state.zoom).toBe(1.0);
    });

    it('handles direct pan operations', () => {
      camera.pan(100, -50, true);
      const state = camera.getState();
      expect(state.x).toBe(-100);
      expect(state.y).toBe(50);
    });

    it('enforces min and max zoom scale limits (0.1x to 5.0x)', () => {
      camera.setZoom(0.01, true);
      expect(camera.getState().zoom).toBe(0.1);

      camera.setZoom(10.0, true);
      expect(camera.getState().zoom).toBe(5.0);
    });

    it('performs cursor-anchored zoom keeping world anchor stationary', () => {
      // Screen center is (400, 300)
      const screenAnchor = { x: 200, y: 150 };
      const initialWorldPoint = camera.screenToWorld(screenAnchor);

      // Zoom in by factor 2.0 at screenAnchor
      camera.zoomAtPoint(2.0, screenAnchor, true);

      const postZoomWorldPoint = camera.screenToWorld(screenAnchor);
      expect(Math.abs(postZoomWorldPoint.x - initialWorldPoint.x)).toBeLessThan(0.001);
      expect(Math.abs(postZoomWorldPoint.y - initialWorldPoint.y)).toBeLessThan(0.001);
    });

    it('fits view automatically with mandatory padding (40px)', () => {
      const bounds = createBoundingBox(-100, -100, 100, 100); // 200x200 world rect
      camera.fitView(bounds, true);

      const state = camera.getState();
      expect(state.x).toBe(0);
      expect(state.y).toBe(0);

      // Viewport 800x600 with 40px padding = 720x520 available
      // scaleX = 720/200 = 3.6; scaleY = 520/200 = 2.6; expected zoom = 2.6
      expect(state.zoom).toBeCloseTo(2.6, 2);
    });

    it('animates camera state using spring kinetics update steps', () => {
      camera.setPosition(100, 100, false);
      expect(camera.getState().x).toBe(0); // Starts at origin

      let steps = 0;
      let animating = true;
      while (animating && steps < 100) {
        animating = camera.update(16);
        steps++;
      }

      expect(camera.getState().x).toBeCloseTo(100, 1);
      expect(camera.getState().y).toBeCloseTo(100, 1);
      expect(animating).toBe(false);
    });

    it('calculates correct worldToScreen and screenToWorld transforms', () => {
      camera.setPosition(50, -50, true);
      camera.setZoom(2.0, true);

      const worldPt = { x: 100, y: 100 };
      const screenPt = camera.worldToScreen(worldPt);
      const backPt = camera.screenToWorld(screenPt);

      expect(backPt.x).toBeCloseTo(worldPt.x, 3);
      expect(backPt.y).toBeCloseTo(worldPt.y, 3);
    });

    it('calculates visible world bounding rectangle correctly', () => {
      camera.setPosition(0, 0, true);
      camera.setZoom(1.0, true);

      const rect = camera.getVisibleWorldRect();
      // Viewport center (400,300) mapped to world origin (0,0)
      // TopLeft should be (-400, -300), BottomRight (400, 300)
      expect(rect.minX).toBe(-400);
      expect(rect.minY).toBe(-300);
      expect(rect.maxX).toBe(400);
      expect(rect.maxY).toBe(300);
    });
  });
});
