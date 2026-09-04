/**
 * Viewport abstraction and coordinate transform manager.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 2 & 3).
 */

import { Point2D } from '../math/point2d';
import { Matrix3x3 } from '../math/matrix3x3';

export interface ViewportState {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

export class Viewport {
  private width: number;
  private height: number;
  private dpr: number;

  constructor(width: number = 800, height: number = 600, devicePixelRatio: number = 1.0) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.max(0.1, devicePixelRatio);
  }

  public resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  public setDevicePixelRatio(dpr: number): void {
    this.dpr = Math.max(0.1, dpr);
  }

  public getState(): ViewportState {
    return {
      width: this.width,
      height: this.height,
      devicePixelRatio: this.dpr,
    };
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getDevicePixelRatio(): number {
    return this.dpr;
  }

  public getCenter(): Point2D {
    return {
      x: this.width / 2,
      y: this.height / 2,
    };
  }

  public getDprMatrix(): Matrix3x3 {
    return [this.dpr, 0, 0, this.dpr, 0, 0];
  }
}
