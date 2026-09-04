/**
 * Canvas Cursor Manager for interactive pointer feedback.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 13).
 */

import { InteractionState } from './interaction-state';

export type CanvasCursorStyle =
  | 'default'
  | 'grab'
  | 'grabbing'
  | 'crosshair'
  | 'pointer'
  | 'move';

export class CursorManager {
  private currentCursor: CanvasCursorStyle = 'default';
  private onCursorChange?: (cursor: CanvasCursorStyle) => void;

  constructor(onCursorChange?: (cursor: CanvasCursorStyle) => void) {
    this.onCursorChange = onCursorChange;
  }

  public getCursor(): CanvasCursorStyle {
    return this.currentCursor;
  }

  public setCursor(cursor: CanvasCursorStyle): void {
    if (this.currentCursor !== cursor) {
      this.currentCursor = cursor;
      if (this.onCursorChange) {
        this.onCursorChange(cursor);
      }
    }
  }

  public updateCursorForState(
    state: InteractionState,
    hasHoveredEntity: boolean,
    isHoveredNode: boolean,
    isBoxToolActive: boolean = false
  ): void {
    switch (state) {
      case InteractionState.Panning:
        this.setCursor('grabbing');
        break;
      case InteractionState.DraggingNode:
      case InteractionState.DraggingSelection:
        this.setCursor('move');
        break;
      case InteractionState.CreatingEdge:
      case InteractionState.MarqueeSelection:
        this.setCursor('crosshair');
        break;
      case InteractionState.Hover:
        this.setCursor(isHoveredNode ? 'grab' : 'pointer');
        break;
      case InteractionState.Idle:
      default:
        if (hasHoveredEntity) {
          this.setCursor('pointer');
        } else if (isBoxToolActive) {
          this.setCursor('crosshair');
        } else {
          this.setCursor('grab');
        }
        break;
    }
  }
}
