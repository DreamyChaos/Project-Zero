import { describe, it, expect, beforeEach } from 'vitest';
import { DamageTracker } from './pipeline/damage-tracker';
import { Camera } from './camera/camera';
import { Viewport } from './camera/viewport';
import { createBoundingBox } from './math/bounding-box';

describe('DamageTracker & Partial Viewport Invalidation (Section 15)', () => {
  let tracker: DamageTracker;
  let viewport: Viewport;
  let camera: Camera;

  beforeEach(() => {
    tracker = new DamageTracker({ margin: 6, fullRepaintThreshold: 0.5 });
    viewport = new Viewport(800, 600, 1.0);
    camera = new Camera(viewport);
    tracker.reset();
  });

  it('initializes with full invalidation by default before first reset', () => {
    const defaultTracker = new DamageTracker();
    const result = defaultTracker.computeDirtyScreenRegions(camera, viewport);
    expect(result.isFullRepaint).toBe(true);
    expect(result.dirtyRegions.length).toBe(1);
    expect(result.dirtyRegions[0].width).toBe(800);
    expect(result.dirtyRegions[0].height).toBe(600);
  });

  it('transforms dirty world boxes to screen space and expands by 6px anti-aliasing margin', () => {
    // World box [10, 10, 50, 50] (width 40, height 40)
    // At zoom 1.0, offset (400, 300):
    // Screen p1 = (410, 310), p2 = (450, 350)
    // Expanded by 6px: [404, 304, 456, 356] (width 52, height 52)
    tracker.addDirtyWorldBox(createBoundingBox(10, 10, 50, 50));

    const result = tracker.computeDirtyScreenRegions(camera, viewport);
    expect(result.isFullRepaint).toBe(false);
    expect(result.dirtyRegions.length).toBe(1);
    const region = result.dirtyRegions[0];
    expect(region.minX).toBe(404);
    expect(region.minY).toBe(304);
    expect(region.maxX).toBe(456);
    expect(region.maxY).toBe(356);
    expect(region.width).toBe(52);
    expect(region.height).toBe(52);
  });

  it('merges overlapping and adjacent damage rectangles into single minimal bounding box', () => {
    // Two overlapping screen boxes: [100, 100, 150, 150] and [140, 140, 200, 200]
    tracker.addDirtyScreenBox(createBoundingBox(100, 100, 150, 150));
    tracker.addDirtyScreenBox(createBoundingBox(140, 140, 200, 200));

    const result = tracker.computeDirtyScreenRegions(camera, viewport);
    expect(result.isFullRepaint).toBe(false);
    expect(result.dirtyRegions.length).toBe(1);

    const merged = result.dirtyRegions[0];
    expect(merged.minX).toBe(94); // 100 - 6
    expect(merged.minY).toBe(94);
    expect(merged.maxX).toBe(206); // 200 + 6
    expect(merged.maxY).toBe(206);
  });

  it('triggers full-screen repaint fallback if total merged dirty area exceeds 50% of viewport area', () => {
    // Viewport area is 800x600 = 480,000 px^2
    // A dirty screen box of 700x500 = 350,000 px^2 (> 72% > 50%)
    tracker.addDirtyScreenBox(createBoundingBox(50, 50, 750, 550));

    const result = tracker.computeDirtyScreenRegions(camera, viewport);
    expect(result.isFullRepaint).toBe(true);
    expect(result.dirtyRegions.length).toBe(1);
    expect(result.dirtyRegions[0].width).toBe(800);
    expect(result.dirtyRegions[0].height).toBe(600);
  });

  it('returns empty damage regions when no boxes are dirty and full invalidate is false', () => {
    const result = tracker.computeDirtyScreenRegions(camera, viewport);
    expect(result.isFullRepaint).toBe(false);
    expect(result.dirtyRegions.length).toBe(0);
  });

  it('computes physical clip rects correctly across DPR 1, DPR 2, and DPR 3 with outward rounding', () => {
    const region = createBoundingBox(10.2, 20.4, 60.7, 80.9);

    // DPR 1: [10, 20, 51, 61]
    const p1 = tracker.computePhysicalClipRect(region, 1.0);
    expect(p1.x).toBe(10);
    expect(p1.y).toBe(20);
    expect(p1.width).toBe(51); // 61 - 10
    expect(p1.height).toBe(61); // 81 - 20

    // DPR 2: [20, 40, 102, 122]
    const p2 = tracker.computePhysicalClipRect(region, 2.0);
    expect(p2.x).toBe(20); // floor(20.4)
    expect(p2.y).toBe(40); // floor(40.8)
    expect(p2.width).toBe(102); // ceil(121.4) = 122 - 20 = 102
    expect(p2.height).toBe(122); // ceil(161.8) = 162 - 40 = 122

    // DPR 3: [30, 61, 153, 182]
    const p3 = tracker.computePhysicalClipRect(region, 3.0);
    expect(p3.x).toBe(30); // floor(30.6)
    expect(p3.y).toBe(61); // floor(61.2)
    expect(p3.width).toBe(153); // ceil(182.1) = 183 - 30 = 153
    expect(p3.height).toBe(182); // ceil(242.7) = 243 - 61 = 182
  });
});
