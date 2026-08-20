/**
 * Interaction Context state container.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 11, 13).
 */

import { Point2D } from '../math/point2d';
import { BoundingBox2D } from '../math/bounding-box';
import { CanvasCursorStyle } from './cursor-manager';

export interface EdgePreviewState {
  readonly sourceNodeId: string;
  readonly currentPointerWorld: Point2D;
}

export class InteractionContext {
  public hoveredNodeId: string | null = null;
  public hoveredEdgeId: string | null = null;

  public readonly selectedNodeIds: Set<string> = new Set<string>();
  public readonly selectedEdgeIds: Set<string> = new Set<string>();

  public activePointerId: number | null = null;
  public dragOriginWorld: Point2D | null = null;
  public dragOriginScreen: Point2D | null = null;
  public cameraAnchor: Point2D | null = null;

  public marqueeRect: BoundingBox2D | null = null;
  public edgePreview: EdgePreviewState | null = null;

  public cursor: CanvasCursorStyle = 'default';
  public focusedNodeId: string | null = null;

  public clearSelection(): void {
    this.selectedNodeIds.clear();
    this.selectedEdgeIds.clear();
  }

  public selectNode(id: string, additive: boolean = false): void {
    if (!additive) {
      this.clearSelection();
    }
    this.selectedNodeIds.add(id);
    this.focusedNodeId = id;
  }

  public toggleNodeSelection(id: string): void {
    if (this.selectedNodeIds.has(id)) {
      this.selectedNodeIds.delete(id);
      if (this.focusedNodeId === id) {
        this.focusedNodeId = null;
      }
    } else {
      this.selectedNodeIds.add(id);
      this.focusedNodeId = id;
    }
  }

  public selectEdge(id: string, additive: boolean = false): void {
    if (!additive) {
      this.clearSelection();
    }
    this.selectedEdgeIds.add(id);
  }

  public toggleEdgeSelection(id: string): void {
    if (this.selectedEdgeIds.has(id)) {
      this.selectedEdgeIds.delete(id);
    } else {
      this.selectedEdgeIds.add(id);
    }
  }

  public isNodeSelected(id: string): boolean {
    return this.selectedNodeIds.has(id);
  }

  public isEdgeSelected(id: string): boolean {
    return this.selectedEdgeIds.has(id);
  }

  public getSelectedNodeIds(): ReadonlyArray<string> {
    return Array.from(this.selectedNodeIds);
  }

  public getSelectedEdgeIds(): ReadonlyArray<string> {
    return Array.from(this.selectedEdgeIds);
  }

  public resetDrag(): void {
    this.activePointerId = null;
    this.dragOriginWorld = null;
    this.dragOriginScreen = null;
    this.cameraAnchor = null;
    this.marqueeRect = null;
    this.edgePreview = null;
  }

  public reset(): void {
    this.hoveredNodeId = null;
    this.hoveredEdgeId = null;
    this.focusedNodeId = null;
    this.cursor = 'default';
    this.clearSelection();
    this.resetDrag();
  }
}
