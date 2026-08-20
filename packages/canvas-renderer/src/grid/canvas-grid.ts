/**
 * Infinite Adaptive Canvas Grid with Level-Of-Detail (LOD) scale bands and persistent reusable line buffers.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 6) and docs/07_Design_System.md.
 */

import { Camera } from '../camera/camera';
import { Viewport } from '../camera/viewport';
import { CanvasThemeTokens, DARK_THEME_TOKENS } from '../theme/theme-bridge';

export interface GridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'major' | 'minor' | 'subminor';
  opacity: number;
}

export interface GridConfiguration {
  readonly majorStep?: number;
  readonly minorStep?: number;
  readonly subMinorStep?: number;
  readonly majorColor?: string;
  readonly minorColor?: string;
  readonly subMinorColor?: string;
}

export class CanvasGrid {
  private readonly majorStep: number;
  private readonly minorStep: number;
  private readonly subMinorStep: number;
  private majorColor: string;
  private minorColor: string;
  private subMinorColor: string;

  // Persistent reusable buffer to eliminate allocations on rendering hot paths
  private readonly lineBuffer: GridLine[] = [];
  private lineCount: number = 0;

  constructor(config?: GridConfiguration, tokens: CanvasThemeTokens = DARK_THEME_TOKENS) {
    this.majorStep = config?.majorStep ?? 100;
    this.minorStep = config?.minorStep ?? 20;
    this.subMinorStep = config?.subMinorStep ?? 4;
    this.majorColor = config?.majorColor ?? tokens.gridMajor;
    this.minorColor = config?.minorColor ?? tokens.gridMinor;
    this.subMinorColor = config?.subMinorColor ?? tokens.gridSubMinor;
  }

  public applyTheme(tokens: CanvasThemeTokens): void {
    this.majorColor = tokens.gridMajor;
    this.minorColor = tokens.gridMinor;
    this.subMinorColor = tokens.gridSubMinor;
  }

  public evaluateLODOpacities(zoom: number): {
    majorAlpha: number;
    minorAlpha: number;
    subMinorAlpha: number;
  } {
    let majorAlpha = 0.8;
    let minorAlpha = 0.0;
    let subMinorAlpha = 0.0;

    if (zoom < 0.4) {
      majorAlpha = Math.min(0.8, zoom * 2.0);
      minorAlpha = 0.0;
      subMinorAlpha = 0.0;
    } else if (zoom >= 0.4 && zoom <= 2.5) {
      majorAlpha = 0.8;
      minorAlpha = Math.min(0.5, (zoom - 0.4) * 1.25);
      subMinorAlpha = 0.0;
    } else {
      majorAlpha = 0.8;
      minorAlpha = 0.5;
      subMinorAlpha = Math.min(0.3, (zoom - 2.5) * 0.2);
    }

    return { majorAlpha, minorAlpha, subMinorAlpha };
  }

  private appendLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: 'major' | 'minor' | 'subminor',
    opacity: number
  ): void {
    if (this.lineCount < this.lineBuffer.length) {
      const line = this.lineBuffer[this.lineCount];
      line.x1 = x1;
      line.y1 = y1;
      line.x2 = x2;
      line.y2 = y2;
      line.type = type;
      line.opacity = opacity;
    } else {
      this.lineBuffer.push({ x1, y1, x2, y2, type, opacity });
    }
    this.lineCount++;
  }

  /**
   * Internal zero-allocation grid line computation writing directly into reusable persistent lineBuffer.
   */
  public computeGridLines(camera: Camera): number {
    const zoom = camera.getState().zoom;
    const worldRect = camera.getVisibleWorldRect();
    const { majorAlpha, minorAlpha, subMinorAlpha } = this.evaluateLODOpacities(zoom);

    this.lineCount = 0;

    const generateStepLines = (
      step: number,
      type: 'major' | 'minor' | 'subminor',
      opacity: number
    ) => {
      if (opacity <= 0.01 || step <= 0) return;

      const startX = Math.floor(worldRect.minX / step) * step;
      const endX = Math.ceil(worldRect.maxX / step) * step;

      for (let x = startX; x <= endX; x += step) {
        if (type === 'minor' && x % this.majorStep === 0) continue;
        if (type === 'subminor' && (x % this.minorStep === 0 || x % this.majorStep === 0)) continue;

        this.appendLine(x, worldRect.minY, x, worldRect.maxY, type, opacity);
      }

      const startY = Math.floor(worldRect.minY / step) * step;
      const endY = Math.ceil(worldRect.maxY / step) * step;

      for (let y = startY; y <= endY; y += step) {
        if (type === 'minor' && y % this.majorStep === 0) continue;
        if (type === 'subminor' && (y % this.minorStep === 0 || y % this.majorStep === 0)) continue;

        this.appendLine(worldRect.minX, y, worldRect.maxX, y, type, opacity);
      }
    };

    generateStepLines(this.majorStep, 'major', majorAlpha);
    generateStepLines(this.minorStep, 'minor', minorAlpha);
    generateStepLines(this.subMinorStep, 'subminor', subMinorAlpha);

    return this.lineCount;
  }

  public getLineBuffer(): ReadonlyArray<GridLine> {
    return this.lineBuffer;
  }

  public getLineCount(): number {
    return this.lineCount;
  }

  /**
   * Public API returning a defensive copy for external consumers.
   */
  public generateGridLines(camera: Camera): ReadonlyArray<GridLine> {
    this.computeGridLines(camera);
    return this.lineBuffer.slice(0, this.lineCount);
  }

  /**
   * Render grid directly with zero array allocations and zero Point2D object instantiations on the hot render path.
   */
  public render2D(ctx: CanvasRenderingContext2D, camera: Camera, viewport: Viewport): void {
    this.computeGridLines(camera);
    if (this.lineCount === 0) return;

    ctx.save();
    ctx.lineWidth = 1.0 / viewport.getDevicePixelRatio();

    // Directly use the 3x3 camera matrix to transform points in-place without object creation
    const matrix = camera.getWorldToScreenMatrix();
    const a = matrix[0]; // zoomX
    const d = matrix[3]; // zoomY
    const e = matrix[4]; // translationX
    const f = matrix[5]; // translationY

    for (let i = 0; i < this.lineCount; i++) {
      const line = this.lineBuffer[i];

      const p1x = a * line.x1 + e;
      const p1y = d * line.y1 + f;
      const p2x = a * line.x2 + e;
      const p2y = d * line.y2 + f;

      let strokeColor = this.majorColor;
      if (line.type === 'minor') strokeColor = this.minorColor;
      if (line.type === 'subminor') strokeColor = this.subMinorColor;

      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = line.opacity;

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
