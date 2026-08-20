/**
 * Multi-User Collaborative Remote Cursor Renderer.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 21) on Layer 10.
 */

import { Camera } from '../camera/camera';
import { Viewport } from '../camera/viewport';

export interface RemoteCursor {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly x: number; // World X
  readonly y: number; // World Y
  readonly isSelecting?: boolean;
}

export class RemoteCursorRenderer {
  private readonly cursors: Map<string, RemoteCursor> = new Map();

  public setCursors(cursors: ReadonlyArray<RemoteCursor>): void {
    this.cursors.clear();
    for (let i = 0; i < cursors.length; i++) {
      this.cursors.set(cursors[i].id, cursors[i]);
    }
  }

  public updateCursor(cursor: RemoteCursor): void {
    this.cursors.set(cursor.id, cursor);
  }

  public removeCursor(id: string): boolean {
    return this.cursors.delete(id);
  }

  public getCursors(): ReadonlyArray<RemoteCursor> {
    const list: RemoteCursor[] = [];
    for (const c of this.cursors.values()) {
      list.push(c);
    }
    return list;
  }

  public clear(): void {
    this.cursors.clear();
  }

  public renderRemoteCursors(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    viewport: Viewport
  ): void {
    if (this.cursors.size === 0) return;

    ctx.save();

    for (const cursor of this.cursors.values()) {
      const screenPt = camera.worldToScreen({ x: cursor.x, y: cursor.y });

      // Clip out of screen bounds
      if (
        screenPt.x < -20 ||
        screenPt.x > viewport.getWidth() + 20 ||
        screenPt.y < -20 ||
        screenPt.y > viewport.getHeight() + 20
      ) {
        continue;
      }

      const x = screenPt.x;
      const y = screenPt.y;

      // 1. Draw Pointer Arrow
      ctx.fillStyle = cursor.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 14);
      ctx.lineTo(x + 4, y + 11);
      ctx.lineTo(x + 9, y + 16);
      ctx.lineTo(x + 11, y + 14);
      ctx.lineTo(x + 6, y + 9);
      ctx.lineTo(x + 11, y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 2. Draw User Name Badge
      if (cursor.name && cursor.name.length > 0) {
        ctx.font = '10px Inter, system-ui, sans-serif';
        const textWidth = ctx.measureText(cursor.name).width;
        const badgeWidth = textWidth + 10;
        const badgeHeight = 16;
        const badgeX = x + 12;
        const badgeY = y + 12;

        ctx.fillStyle = cursor.color;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(cursor.name, badgeX + 5, badgeY + badgeHeight / 2);
      }
    }

    ctx.restore();
  }
}
