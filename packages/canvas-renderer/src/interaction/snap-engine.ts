/**
 * Snap-to-Grid & Multi-Node Smart Alignment Guide Engine.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 3.1 & 21) and docs/08_UI_UX_Specification.md (Section 1.1).
 */

import { StateNode } from '../state/state-node';
import { getNodeRadius } from '../state/state-geometry';

export interface AlignmentGuide {
  readonly type: 'horizontal' | 'vertical';
  readonly position: number; // World coordinate for the alignment line (y for horizontal, x for vertical)
  readonly start: number; // Min world coordinate along the cross axis
  readonly end: number; // Max world coordinate along the cross axis
}

export interface SnapEngineOptions {
  readonly enabled?: boolean;
  readonly snapToGrid?: boolean;
  readonly snapToNodes?: boolean;
  readonly gridPitch?: number; // Default: 20 world units
  readonly snapThreshold?: number; // Default: 6 world units
}

export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly snappedX: boolean;
  readonly snappedY: boolean;
  readonly guides: ReadonlyArray<AlignmentGuide>;
}

export class SnapEngine {
  public static readonly DEFAULT_GRID_PITCH = 20;
  public static readonly DEFAULT_SNAP_THRESHOLD = 6;

  private enabled: boolean;
  private snapToGrid: boolean;
  private snapToNodes: boolean;
  private gridPitch: number;
  private snapThreshold: number;

  // Persistent reusable guide buffer
  private readonly activeGuides: AlignmentGuide[] = [];

  constructor(options?: SnapEngineOptions) {
    this.enabled = options?.enabled ?? true;
    this.snapToGrid = options?.snapToGrid ?? true;
    this.snapToNodes = options?.snapToNodes ?? true;
    this.gridPitch = options?.gridPitch ?? SnapEngine.DEFAULT_GRID_PITCH;
    this.snapThreshold = options?.snapThreshold ?? SnapEngine.DEFAULT_SNAP_THRESHOLD;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setSnapToGrid(snap: boolean): void {
    this.snapToGrid = snap;
  }

  public setSnapToNodes(snap: boolean): void {
    this.snapToNodes = snap;
  }

  public setGridPitch(pitch: number): void {
    this.gridPitch = pitch;
  }

  public setSnapThreshold(threshold: number): void {
    this.snapThreshold = threshold;
  }

  public clearGuides(): void {
    this.activeGuides.length = 0;
  }

  public getActiveGuides(): ReadonlyArray<AlignmentGuide> {
    return this.activeGuides;
  }

  /**
   * Evaluates snap coordinates and smart alignment guides for a moving node against other nodes and grid.
   */
  public evaluateSnap(
    targetX: number,
    targetY: number,
    draggedNodeId: string | null,
    referenceNodes: ReadonlyArray<StateNode>
  ): SnapResult {
    this.activeGuides.length = 0;

    if (!this.enabled) {
      return {
        x: targetX,
        y: targetY,
        snappedX: false,
        snappedY: false,
        guides: this.activeGuides,
      };
    }

    let bestX = targetX;
    let bestY = targetY;
    let minDiffX = this.snapThreshold + 1;
    let minDiffY = this.snapThreshold + 1;
    let snappedX = false;
    let snappedY = false;

    // 1. Evaluate Smart Alignment against other visible state nodes (Priority 1)
    if (this.snapToNodes && referenceNodes.length > 0) {
      for (let i = 0; i < referenceNodes.length; i++) {
        const ref = referenceNodes[i];
        if (draggedNodeId && ref.id === draggedNodeId) {
          continue;
        }

        const refRadius = getNodeRadius(ref);

        // Vertical Alignment (matching X coordinates: center, left edge, right edge)
        const xCandidates = [ref.x, ref.x - refRadius, ref.x + refRadius];
        for (let j = 0; j < xCandidates.length; j++) {
          const candX = xCandidates[j];
          const diffX = Math.abs(targetX - candX);
          if (diffX <= this.snapThreshold && diffX < minDiffX) {
            minDiffX = diffX;
            bestX = candX;
            snappedX = true;

            const startY = Math.min(targetY, ref.y) - 40;
            const endY = Math.max(targetY, ref.y) + 40;
            this.activeGuides.push({
              type: 'vertical',
              position: candX,
              start: startY,
              end: endY,
            });
          }
        }

        // Horizontal Alignment (matching Y coordinates: center, top edge, bottom edge)
        const yCandidates = [ref.y, ref.y - refRadius, ref.y + refRadius];
        for (let j = 0; j < yCandidates.length; j++) {
          const candY = yCandidates[j];
          const diffY = Math.abs(targetY - candY);
          if (diffY <= this.snapThreshold && diffY < minDiffY) {
            minDiffY = diffY;
            bestY = candY;
            snappedY = true;

            const startX = Math.min(targetX, ref.x) - 40;
            const endX = Math.max(targetX, ref.x) + 40;
            this.activeGuides.push({
              type: 'horizontal',
              position: candY,
              start: startX,
              end: endX,
            });
          }
        }
      }
    }

    // 2. Evaluate Grid Snapping (Priority 2, applied if node snap not active on axis)
    if (this.snapToGrid && this.gridPitch > 0) {
      if (!snappedX) {
        const gridX = Math.round(targetX / this.gridPitch) * this.gridPitch;
        const diffX = Math.abs(targetX - gridX);
        if (diffX <= this.snapThreshold) {
          bestX = gridX;
          snappedX = true;
        }
      }

      if (!snappedY) {
        const gridY = Math.round(targetY / this.gridPitch) * this.gridPitch;
        const diffY = Math.abs(targetY - gridY);
        if (diffY <= this.snapThreshold) {
          bestY = gridY;
          snappedY = true;
        }
      }
    }

    return {
      x: bestX,
      y: bestY,
      snappedX,
      snappedY,
      guides: this.activeGuides,
    };
  }
}
