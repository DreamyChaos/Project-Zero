/**
 * Drag Controller for interactive state node translation and grid snapping.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 13).
 */

import { Point2D } from '../math/point2d';
import { StateNode } from '../state/state-node';
import { InteractionContext } from './interaction-context';

export interface DragControllerOptions {
  readonly enableGridSnap?: boolean;
  readonly gridSnapStep?: number;
}

export class DragController {
  private enableGridSnap: boolean;
  private gridSnapStep: number;
  private readonly initialNodePositions: Map<string, Point2D> = new Map<string, Point2D>();

  constructor(options?: DragControllerOptions) {
    this.enableGridSnap = options?.enableGridSnap ?? false;
    this.gridSnapStep = options?.gridSnapStep ?? 20;
  }

  public isGridSnapEnabled(): boolean {
    return this.enableGridSnap;
  }

  public getGridSnapStep(): number {
    return this.gridSnapStep;
  }

  public setGridSnap(enable: boolean, step: number = 20): void {
    this.enableGridSnap = enable;
    this.gridSnapStep = Math.max(1, step);
  }

  public startDrag(
    context: InteractionContext,
    stateNodes: ReadonlyArray<StateNode>,
    pointerWorld: Point2D
  ): void {
    context.dragOriginWorld = pointerWorld;
    this.initialNodePositions.clear();

    for (const node of stateNodes) {
      if (context.isNodeSelected(node.id)) {
        this.initialNodePositions.set(node.id, { x: node.x, y: node.y });
      }
    }
  }

  public updateDrag(
    context: InteractionContext,
    stateNodes: ReadonlyArray<StateNode>,
    currentWorldPoint: Point2D,
    onNodeMoved?: (id: string, newX: number, newY: number) => void
  ): boolean {
    if (!context.dragOriginWorld || this.initialNodePositions.size === 0) {
      return false;
    }

    const deltaX = currentWorldPoint.x - context.dragOriginWorld.x;
    const deltaY = currentWorldPoint.y - context.dragOriginWorld.y;

    let movedAny = false;

    for (const node of stateNodes) {
      const initialPos = this.initialNodePositions.get(node.id);
      if (!initialPos) continue;

      let targetX = initialPos.x + deltaX;
      let targetY = initialPos.y + deltaY;

      if (this.enableGridSnap) {
        targetX = Math.round(targetX / this.gridSnapStep) * this.gridSnapStep;
        targetY = Math.round(targetY / this.gridSnapStep) * this.gridSnapStep;
      }

      if (targetX !== node.x || targetY !== node.y) {
        (node as { x: number; y: number }).x = targetX;
        (node as { x: number; y: number }).y = targetY;
        movedAny = true;
        if (onNodeMoved) {
          onNodeMoved(node.id, targetX, targetY);
        }
      }
    }

    return movedAny;
  }

  public endDrag(
    context: InteractionContext,
    onDragEnd?: (id: string, x: number, y: number) => void,
    stateNodes?: ReadonlyArray<StateNode>
  ): void {
    if (onDragEnd && stateNodes) {
      for (const node of stateNodes) {
        if (this.initialNodePositions.has(node.id)) {
          onDragEnd(node.id, node.x, node.y);
        }
      }
    }
    context.dragOriginWorld = null;
    this.initialNodePositions.clear();
  }
}
