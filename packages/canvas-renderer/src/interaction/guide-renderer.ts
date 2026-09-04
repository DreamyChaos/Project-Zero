/**
 * Alignment Guide Renderer for smart snapping feedback.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 5 & 21) on Layer 10.
 */

import { Camera } from '../camera/camera';
import { AlignmentGuide } from './snap-engine';
import { CanvasThemeTokens } from '../theme/theme-bridge';

export class GuideRenderer {
  public static readonly GUIDE_COLOR = '#00A8FF'; // Linear / Figma-grade smart guide cyan
  public static readonly GUIDE_DASH = [4, 4];

  public renderGuides(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    guides: ReadonlyArray<AlignmentGuide>,
    tokens?: CanvasThemeTokens
  ): void {
    if (guides.length === 0) return;

    const zoom = camera.getState().zoom;
    const color = tokens?.borderFocus ?? GuideRenderer.GUIDE_COLOR;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 1 / zoom);
    ctx.setLineDash(GuideRenderer.GUIDE_DASH);
    ctx.globalAlpha = 0.85;

    for (let i = 0; i < guides.length; i++) {
      const guide = guides[i];
      ctx.beginPath();
      if (guide.type === 'vertical') {
        ctx.moveTo(guide.position, guide.start);
        ctx.lineTo(guide.position, guide.end);
      } else {
        ctx.moveTo(guide.start, guide.position);
        ctx.lineTo(guide.end, guide.position);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}
