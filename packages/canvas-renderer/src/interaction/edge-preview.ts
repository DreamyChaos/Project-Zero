/**
 * Dynamic Edge Preview Controller for edge creation interaction mode.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 8, 13, 18).
 */

import { Point2D } from '../math/point2d';
import { InteractionContext } from './interaction-context';
import { StateNode } from '../state/state-node';
import { getNodeRadius } from '../state/state-geometry';
import { RenderQueue, DrawCommand } from '../pipeline/render-queue';
import { RenderLayer } from '../layer/layer-manager';
import { Camera } from '../camera/camera';
import { CanvasThemeTokens, DARK_THEME_TOKENS } from '../theme/theme-bridge';
import { getArrowheadTriangle } from '../edge/edge-geometry';

export class EdgePreviewController {
  public startEdgePreview(context: InteractionContext, sourceNodeId: string, pointerWorld: Point2D): void {
    context.edgePreview = {
      sourceNodeId,
      currentPointerWorld: pointerWorld,
    };
  }

  public updateEdgePreview(context: InteractionContext, currentPointerWorld: Point2D): void {
    if (context.edgePreview) {
      context.edgePreview = {
        ...context.edgePreview,
        currentPointerWorld,
      };
    }
  }

  public cancelEdgePreview(context: InteractionContext): void {
    context.edgePreview = null;
  }

  public commitEdgePreview(
    context: InteractionContext,
    targetNodeId: string,
    onEdgeCreated?: (sourceId: string, targetId: string) => void
  ): boolean {
    if (!context.edgePreview) return false;

    const sourceId = context.edgePreview.sourceNodeId;
    context.edgePreview = null;

    if (onEdgeCreated) {
      onEdgeCreated(sourceId, targetNodeId);
      return true;
    }
    return false;
  }

  public enqueueDrawCommands(
    queue: RenderQueue,
    context: InteractionContext,
    camera: Camera,
    nodesMap: Map<string, StateNode>,
    theme: CanvasThemeTokens = DARK_THEME_TOKENS
  ): void {
    if (!context.edgePreview) return;

    const { sourceNodeId, currentPointerWorld } = context.edgePreview;
    const sourceNode = nodesMap.get(sourceNodeId);
    if (!sourceNode) return;

    const cmd: DrawCommand = {
      id: 'edge-preview-line',
      layer: RenderLayer.TemporaryPreview,
      execute: (ctx) => {
        const sourceCenter = camera.worldToScreen({ x: sourceNode.x, y: sourceNode.y });
        const pointerScreen = camera.worldToScreen(currentPointerWorld);
        const zoom = camera.getState().zoom;
        const radius = getNodeRadius(sourceNode) * zoom;

        const dx = pointerScreen.x - sourceCenter.x;
        const dy = pointerScreen.y - sourceCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) return;

        const dirX = dx / dist;
        const dirY = dy / dist;

        const startX = sourceCenter.x + dirX * radius;
        const startY = sourceCenter.y + dirY * radius;

        ctx.save();
        // Render dashed accent preview line (Section 13 Rule 2)
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(pointerScreen.x, pointerScreen.y);
        ctx.strokeStyle = theme.borderFocus;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();

        // Render arrowhead tip at current pointer with clamped sizing across 0.1x to 5.0x zoom
        const angle = Math.atan2(dy, dx);
        const arrowheadLength = Math.max(8, Math.min(24, 12 * Math.sqrt(zoom)));
        const arrowheadWidth = Math.max(6, Math.min(16, 8 * Math.sqrt(zoom)));
        const triangle = getArrowheadTriangle(pointerScreen, angle, arrowheadLength, arrowheadWidth);

        ctx.beginPath();
        ctx.moveTo(triangle[0].x, triangle[0].y);
        ctx.lineTo(triangle[1].x, triangle[1].y);
        ctx.lineTo(triangle[2].x, triangle[2].y);
        ctx.closePath();
        ctx.fillStyle = theme.borderFocus;
        ctx.fill();

        ctx.restore();
      },
    };
    queue.enqueue(cmd);
  }
}
