/**
 * 2D Viewport Camera System with cursor-anchored zoom and spring kinetics.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 3).
 */

import { Point2D } from '../math/point2d';
import { BoundingBox2D, createBoundingBox } from '../math/bounding-box';
import {
  Matrix3x3,
  invertMatrix,
  transformPoint,
} from '../math/matrix3x3';
import { Viewport } from './viewport';

export interface CameraOptions {
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly fitPadding?: number;
  readonly stiffness?: number;
  readonly damping?: number;
}

export interface CameraState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export class Camera {
  public static readonly DEFAULT_MIN_ZOOM = 0.1;
  public static readonly DEFAULT_MAX_ZOOM = 5.0;
  public static readonly DEFAULT_FIT_PADDING = 40;

  private x: number = 0;
  private y: number = 0;
  private zoom: number = 1.0;

  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1.0;

  private vx: number = 0;
  private vy: number = 0;
  private vZoom: number = 0;

  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly fitPadding: number;
  private readonly stiffness: number;
  private readonly damping: number;

  private viewport: Viewport;

  constructor(viewport: Viewport, options?: CameraOptions) {
    this.viewport = viewport;
    this.minZoom = options?.minZoom ?? Camera.DEFAULT_MIN_ZOOM;
    this.maxZoom = options?.maxZoom ?? Camera.DEFAULT_MAX_ZOOM;
    this.fitPadding = options?.fitPadding ?? Camera.DEFAULT_FIT_PADDING;
    this.stiffness = options?.stiffness ?? 180;
    this.damping = options?.damping ?? 24;
  }

  public getState(): CameraState {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
    };
  }

  public getTargetState(): CameraState {
    return {
      x: this.targetX,
      y: this.targetY,
      zoom: this.targetZoom,
    };
  }

  public setPosition(x: number, y: number, immediate: boolean = true): void {
    this.targetX = x;
    this.targetY = y;
    if (immediate) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
    }
  }

  public setZoom(zoom: number, immediate: boolean = true): void {
    const clampedZoom = Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
    this.targetZoom = clampedZoom;
    if (immediate) {
      this.zoom = clampedZoom;
      this.vZoom = 0;
    }
  }

  public pan(deltaX: number, deltaY: number, immediate: boolean = true): void {
    const worldDeltaX = deltaX / this.zoom;
    const worldDeltaY = deltaY / this.zoom;

    this.setPosition(this.targetX - worldDeltaX, this.targetY - worldDeltaY, immediate);
  }

  public zoomAtPoint(
    factor: number,
    screenAnchor: Point2D,
    immediate: boolean = true
  ): void {
    const oldZoom = this.targetZoom;
    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, oldZoom * factor));

    if (Math.abs(newZoom - oldZoom) < 1e-6) {
      return;
    }

    const worldAnchor = this.screenToWorld(screenAnchor);

    const viewportCenter = this.viewport.getCenter();
    const newTargetX = worldAnchor.x - (screenAnchor.x - viewportCenter.x) / newZoom;
    const newTargetY = worldAnchor.y - (screenAnchor.y - viewportCenter.y) / newZoom;

    this.targetZoom = newZoom;
    this.targetX = newTargetX;
    this.targetY = newTargetY;

    if (immediate) {
      this.zoom = newZoom;
      this.x = newTargetX;
      this.y = newTargetY;
      this.vZoom = 0;
      this.vx = 0;
      this.vy = 0;
    }
  }

  public fitView(bounds: BoundingBox2D, immediate: boolean = false): void {
    if (bounds.width === 0 && bounds.height === 0) {
      this.setPosition(0, 0, immediate);
      this.setZoom(1.0, immediate);
      return;
    }

    const viewportW = this.viewport.getWidth() - this.fitPadding * 2;
    const viewportH = this.viewport.getHeight() - this.fitPadding * 2;

    if (viewportW <= 0 || viewportH <= 0) {
      return;
    }

    const scaleX = viewportW / bounds.width;
    const scaleY = viewportH / bounds.height;
    const fitScale = Math.min(scaleX, scaleY);
    const clampedZoom = Math.min(this.maxZoom, Math.max(this.minZoom, fitScale));

    this.targetX = bounds.centerX;
    this.targetY = bounds.centerY;
    this.targetZoom = clampedZoom;

    if (immediate) {
      this.x = bounds.centerX;
      this.y = bounds.centerY;
      this.zoom = clampedZoom;
      this.vx = 0;
      this.vy = 0;
      this.vZoom = 0;
    }
  }

  public update(deltaTimeMs: number): boolean {
    const dt = Math.min(0.033, Math.max(0.001, deltaTimeMs / 1000.0));

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dZoom = this.targetZoom - this.zoom;

    if (
      Math.abs(dx) < 1e-4 &&
      Math.abs(dy) < 1e-4 &&
      Math.abs(dZoom) < 1e-5 &&
      Math.abs(this.vx) < 1e-4 &&
      Math.abs(this.vy) < 1e-4 &&
      Math.abs(this.vZoom) < 1e-5
    ) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.zoom = this.targetZoom;
      this.vx = 0;
      this.vy = 0;
      this.vZoom = 0;
      return false;
    }

    const fx = this.stiffness * dx - this.damping * this.vx;
    const fy = this.stiffness * dy - this.damping * this.vy;
    const fZoom = this.stiffness * dZoom - this.damping * this.vZoom;

    this.vx += fx * dt;
    this.vy += fy * dt;
    this.vZoom += fZoom * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.zoom += this.vZoom * dt;

    return true;
  }

  public getWorldToScreenMatrix(): Matrix3x3 {
    const vCenter = this.viewport.getCenter();
    const e = vCenter.x - this.x * this.zoom;
    const f = vCenter.y - this.y * this.zoom;
    return [this.zoom, 0, 0, this.zoom, e, f];
  }

  public getScreenToWorldMatrix(): Matrix3x3 {
    return invertMatrix(this.getWorldToScreenMatrix());
  }

  public worldToScreen(worldPoint: Point2D): Point2D {
    return transformPoint(this.getWorldToScreenMatrix(), worldPoint);
  }

  public screenToWorld(screenPoint: Point2D): Point2D {
    return transformPoint(this.getScreenToWorldMatrix(), screenPoint);
  }

  public getVisibleWorldRect(): BoundingBox2D {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({
      x: this.viewport.getWidth(),
      y: this.viewport.getHeight(),
    });

    return createBoundingBox(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
  }
}
