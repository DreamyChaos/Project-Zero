/**
 * Real-Time Performance Telemetry HUD Overlay Renderer.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 17 & 20) on Layer 10.
 */

import { Viewport } from '../camera/viewport';
import { FrameTelemetry } from '../pipeline/telemetry-collector';
import { CanvasThemeTokens } from '../theme/theme-bridge';

export class TelemetryHUD {
  public renderHUD(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    telemetry: FrameTelemetry,
    tokens?: CanvasThemeTokens
  ): void {
    const vWidth = viewport.getWidth();
    const hudWidth = 220;
    const hudHeight = 76;
    const padding = 12;
    const x = vWidth - hudWidth - padding;
    const y = padding;

    ctx.save();

    // Translucent background card
    ctx.fillStyle = 'rgba(10, 13, 20, 0.85)';
    ctx.strokeStyle = tokens?.borderFocus ?? 'rgba(0, 168, 255, 0.4)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(x, y, hudWidth, hudHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Typography
    ctx.font = '11px "JetBrains Mono", monospace, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#E2E8F0';

    ctx.fillText(`FPS: ${telemetry.fps} (${telemetry.frameTimeMs.toFixed(1)}ms)`, x + 10, y + 10);
    ctx.fillText(`Draw Calls: ${telemetry.drawCommandCount} | Culled: ${telemetry.culledNodeCount + telemetry.culledEdgeCount}`, x + 10, y + 26);
    ctx.fillText(`Dirty Rects: ${telemetry.dirtyRegionCount}`, x + 10, y + 42);

    if (telemetry.isLODDegraded) {
      ctx.fillStyle = '#EF4444';
      ctx.fillText('LOD: DEGRADED', x + 10, y + 58);
    } else {
      ctx.fillStyle = '#10B981';
      ctx.fillText('LOD: OPTIMAL', x + 10, y + 58);
    }

    ctx.restore();
  }
}
