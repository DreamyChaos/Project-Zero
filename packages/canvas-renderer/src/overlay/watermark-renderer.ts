/**
 * Empty-State Educational Watermark Renderer.
 * Formally specified in docs/08_UI_UX_Specification.md (Section 2.5 & 3.1) and docs/07_Design_System.md.
 */

import { Viewport } from '../camera/viewport';
import { CanvasThemeTokens } from '../theme/theme-bridge';

export class WatermarkRenderer {
  public static readonly DEFAULT_WATERMARK_TEXT = "Double-click anywhere or press 'S' to place initial state q0";

  public renderWatermark(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    nodeCount: number,
    tokens?: CanvasThemeTokens
  ): void {
    if (nodeCount > 0) return;

    const width = viewport.getWidth();
    const height = viewport.getHeight();
    const color = tokens?.textSecondary ?? '#94A3B8';

    ctx.save();
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.45;

    ctx.fillText(
      WatermarkRenderer.DEFAULT_WATERMARK_TEXT,
      width / 2,
      height / 2
    );

    ctx.restore();
  }
}
