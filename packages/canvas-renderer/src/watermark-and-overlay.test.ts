import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatermarkRenderer } from './overlay/watermark-renderer';
import { TelemetryHUD } from './overlay/telemetry-hud';
import { RemoteCursorRenderer } from './overlay/remote-cursor-renderer';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';

describe('Overlays: Watermark, Telemetry HUD, and Remote Cursors (Section 2.5, 3.1 & 21)', () => {
  let viewport: Viewport;
  let camera: Camera;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      roundRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 40 }),
      font: '',
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
  });

  describe('WatermarkRenderer', () => {
    it('renders empty-state watermark text when node count is 0', () => {
      const watermark = new WatermarkRenderer();
      watermark.renderWatermark(mockCtx, viewport, 0);

      expect(mockCtx.fillText).toHaveBeenCalledWith(
        WatermarkRenderer.DEFAULT_WATERMARK_TEXT,
        400,
        300
      );
    });

    it('suppresses watermark when node count is greater than 0', () => {
      const watermark = new WatermarkRenderer();
      watermark.renderWatermark(mockCtx, viewport, 3);

      expect(mockCtx.fillText).not.toHaveBeenCalled();
    });
  });

  describe('TelemetryHUD', () => {
    it('renders telemetry HUD card with live FPS and metrics', () => {
      const hud = new TelemetryHUD();
      hud.renderHUD(mockCtx, viewport, {
        frameTimeMs: 16.66,
        fps: 60,
        drawCommandCount: 24,
        culledNodeCount: 10,
        culledEdgeCount: 5,
        dirtyRegionCount: 2,
        isLODDegraded: false,
      });

      expect(mockCtx.roundRect).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('FPS: 60 (16.7ms)', expect.any(Number), expect.any(Number));
      expect(mockCtx.fillText).toHaveBeenCalledWith('LOD: OPTIMAL', expect.any(Number), expect.any(Number));
    });

    it('renders degraded status text when LOD is degraded', () => {
      const hud = new TelemetryHUD();
      hud.renderHUD(mockCtx, viewport, {
        frameTimeMs: 22.0,
        fps: 45,
        drawCommandCount: 15,
        culledNodeCount: 0,
        culledEdgeCount: 0,
        dirtyRegionCount: 1,
        isLODDegraded: true,
      });

      expect(mockCtx.fillText).toHaveBeenCalledWith('LOD: DEGRADED', expect.any(Number), expect.any(Number));
    });
  });

  describe('RemoteCursorRenderer', () => {
    it('manages remote cursor records and renders pointers with name badges', () => {
      const remoteRenderer = new RemoteCursorRenderer();
      remoteRenderer.setCursors([
        { id: 'user_1', name: 'Alice', color: '#3B82F6', x: 0, y: 0 },
        { id: 'user_2', name: 'Bob', color: '#10B981', x: 100, y: 50 },
      ]);

      expect(remoteRenderer.getCursors().length).toBe(2);

      remoteRenderer.renderRemoteCursors(mockCtx, camera, viewport);
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('Alice', expect.any(Number), expect.any(Number));
      expect(mockCtx.fillText).toHaveBeenCalledWith('Bob', expect.any(Number), expect.any(Number));
    });

    it('removes cursor by ID', () => {
      const remoteRenderer = new RemoteCursorRenderer();
      remoteRenderer.setCursors([
        { id: 'user_1', name: 'Alice', color: '#3B82F6', x: 0, y: 0 },
      ]);
      expect(remoteRenderer.removeCursor('user_1')).toBe(true);
      expect(remoteRenderer.getCursors().length).toBe(0);
    });
  });
});
