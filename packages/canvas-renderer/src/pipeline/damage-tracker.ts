/**
 * Dirty Rectangle Tracking & Partial Viewport Invalidation Engine.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 15).
 */

import { BoundingBox2D, createBoundingBox, intersectsBoundingBox, mergeBoundingBoxes } from '../math/bounding-box';
import { Camera } from '../camera/camera';
import { Viewport } from '../camera/viewport';

export interface DamageTrackerOptions {
  readonly margin?: number; // Base anti-aliasing margin in CSS pixels (default: 6px)
  readonly fullRepaintThreshold?: number; // Default: 0.50 (50% of viewport area)
}

export interface PhysicalClipRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class DamageTracker {
  public static readonly DEFAULT_AA_MARGIN = 6; // 6px anti-aliasing / shadow bleed margin (Section 15 Rule 1)
  public static readonly DEFAULT_FULL_REPAINT_THRESHOLD = 0.5; // 50% surface area fallback (Section 15 Rule 2)

  private readonly margin: number;
  private readonly fullRepaintThreshold: number;

  private isFullInvalidate: boolean = true;

  // Persistent reusable buffers
  private readonly dirtyWorldBoxes: BoundingBox2D[] = [];
  private readonly dirtyScreenBoxes: BoundingBox2D[] = [];
  private readonly mergedScreenBoxes: BoundingBox2D[] = [];

  constructor(options?: DamageTrackerOptions) {
    this.margin = options?.margin ?? DamageTracker.DEFAULT_AA_MARGIN;
    this.fullRepaintThreshold = options?.fullRepaintThreshold ?? DamageTracker.DEFAULT_FULL_REPAINT_THRESHOLD;
  }

  public invalidateAll(): void {
    this.isFullInvalidate = true;
    this.dirtyWorldBoxes.length = 0;
    this.dirtyScreenBoxes.length = 0;
    this.mergedScreenBoxes.length = 0;
  }

  public addDirtyWorldBox(box: BoundingBox2D): void {
    if (this.isFullInvalidate) return;
    this.dirtyWorldBoxes.push(box);
  }

  public addDirtyScreenBox(box: BoundingBox2D): void {
    if (this.isFullInvalidate) return;
    this.dirtyScreenBoxes.push(box);
  }

  public getDirtyWorldBoxCount(): number {
    return this.dirtyWorldBoxes.length;
  }

  public computeDirtyScreenRegions(camera: Camera, viewport: Viewport): {
    isFullRepaint: boolean;
    dirtyRegions: ReadonlyArray<BoundingBox2D>;
  } {
    if (this.isFullInvalidate) {
      return {
        isFullRepaint: true,
        dirtyRegions: [
          createBoundingBox(0, 0, viewport.getWidth(), viewport.getHeight()),
        ],
      };
    }

    if (this.dirtyWorldBoxes.length === 0 && this.dirtyScreenBoxes.length === 0) {
      return {
        isFullRepaint: false,
        dirtyRegions: [],
      };
    }

    this.mergedScreenBoxes.length = 0;

    const vWidth = viewport.getWidth();
    const vHeight = viewport.getHeight();
    const viewportArea = vWidth * vHeight;

    // 1. Transform world-space dirty boxes to screen-space with AA margin expansion
    for (let i = 0; i < this.dirtyWorldBoxes.length; i++) {
      const wBox = this.dirtyWorldBoxes[i];
      const p1 = camera.worldToScreen({ x: wBox.minX, y: wBox.minY });
      const p2 = camera.worldToScreen({ x: wBox.maxX, y: wBox.maxY });

      const minX = Math.max(0, Math.min(p1.x, p2.x) - this.margin);
      const minY = Math.max(0, Math.min(p1.y, p2.y) - this.margin);
      const maxX = Math.min(vWidth, Math.max(p1.x, p2.x) + this.margin);
      const maxY = Math.min(vHeight, Math.max(p1.y, p2.y) + this.margin);

      if (maxX > minX && maxY > minY) {
        this.mergedScreenBoxes.push(createBoundingBox(minX, minY, maxX, maxY));
      }
    }

    // 2. Add raw screen dirty boxes with AA margin expansion
    for (let i = 0; i < this.dirtyScreenBoxes.length; i++) {
      const sBox = this.dirtyScreenBoxes[i];
      const minX = Math.max(0, sBox.minX - this.margin);
      const minY = Math.max(0, sBox.minY - this.margin);
      const maxX = Math.min(vWidth, sBox.maxX + this.margin);
      const maxY = Math.min(vHeight, sBox.maxY + this.margin);

      if (maxX > minX && maxY > minY) {
        this.mergedScreenBoxes.push(createBoundingBox(minX, minY, maxX, maxY));
      }
    }

    if (this.mergedScreenBoxes.length === 0) {
      return { isFullRepaint: false, dirtyRegions: [] };
    }

    // 3. Iteratively merge overlapping or adjacent damage rectangles
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < this.mergedScreenBoxes.length; i++) {
        for (let j = i + 1; j < this.mergedScreenBoxes.length; j++) {
          const a = this.mergedScreenBoxes[i];
          const b = this.mergedScreenBoxes[j];

          if (intersectsBoundingBox(a, b)) {
            this.mergedScreenBoxes[i] = mergeBoundingBoxes(a, b);
            this.mergedScreenBoxes.splice(j, 1);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }

    // 4. Calculate total merged surface area
    let totalDirtyArea = 0;
    for (let i = 0; i < this.mergedScreenBoxes.length; i++) {
      const b = this.mergedScreenBoxes[i];
      totalDirtyArea += b.width * b.height;
    }

    // 5. Fallback rule: If total dirty area exceeds threshold (> 50%), trigger full viewport repaint (Section 15 Rule 2)
    if (totalDirtyArea / viewportArea > this.fullRepaintThreshold) {
      this.isFullInvalidate = true;
      return {
        isFullRepaint: true,
        dirtyRegions: [createBoundingBox(0, 0, vWidth, vHeight)],
      };
    }

    return {
      isFullRepaint: false,
      dirtyRegions: this.mergedScreenBoxes,
    };
  }

  /**
   * Converts a logical screen bounding box into physical device pixel clipping coordinates,
   * rounding outward to eliminate sub-pixel gaps across DPR 1, 2, and 3+.
   */
  public computePhysicalClipRect(region: BoundingBox2D, dpr: number): PhysicalClipRect {
    const scale = Math.max(1, dpr);
    const x = Math.floor(region.minX * scale);
    const y = Math.floor(region.minY * scale);
    const maxX = Math.ceil(region.maxX * scale);
    const maxY = Math.ceil(region.maxY * scale);
    return {
      x,
      y,
      width: Math.max(0, maxX - x),
      height: Math.max(0, maxY - y),
    };
  }

  public reset(): void {
    this.isFullInvalidate = false;
    this.dirtyWorldBoxes.length = 0;
    this.dirtyScreenBoxes.length = 0;
    this.mergedScreenBoxes.length = 0;
  }
}
