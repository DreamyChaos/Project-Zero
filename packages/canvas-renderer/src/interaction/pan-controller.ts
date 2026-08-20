/**
 * Pan Controller for middle mouse, spacebar+drag, and touch canvas translation.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 3, 13).
 */

import { Camera } from '../camera/camera';
import { CanvasPointerEvent } from './pointer-event';
import { InteractionContext } from './interaction-context';

export class PanController {
  private isSpacePressed: boolean = false;

  public setSpacePressed(pressed: boolean): void {
    this.isSpacePressed = pressed;
  }

  public isSpaceBarPressed(): boolean {
    return this.isSpacePressed;
  }

  public shouldInitiatePan(event: CanvasPointerEvent, isBackgroundHit: boolean = false): boolean {
    // 1. Middle mouse button (button 1)
    if (event.button === 1) return true;
    // 2. Spacebar held down during drag
    if (this.isSpacePressed) return true;
    // 3. Touch pan on background
    if (event.pointerType === 'touch' && event.button === 0) return true;
    // 4. Default Select mode left-click on empty background
    if (event.button === 0 && isBackgroundHit) return true;

    return false;
  }

  public startPan(context: InteractionContext, event: CanvasPointerEvent, camera: Camera): void {
    const state = camera.getState();
    context.activePointerId = event.pointerId;
    context.dragOriginScreen = { x: event.screenPoint.x, y: event.screenPoint.y };
    context.cameraAnchor = { x: state.x, y: state.y };
  }

  public updatePan(context: InteractionContext, event: CanvasPointerEvent, camera: Camera): boolean {
    if (!context.dragOriginScreen || !context.cameraAnchor) {
      return false;
    }

    const zoom = camera.getState().zoom;
    const deltaScreenX = event.screenPoint.x - context.dragOriginScreen.x;
    const deltaScreenY = event.screenPoint.y - context.dragOriginScreen.y;

    const deltaWorldX = deltaScreenX / zoom;
    const deltaWorldY = deltaScreenY / zoom;

    const targetX = context.cameraAnchor.x - deltaWorldX;
    const targetY = context.cameraAnchor.y - deltaWorldY;

    camera.setPosition(targetX, targetY, true);
    return true;
  }

  public endPan(context: InteractionContext): void {
    context.activePointerId = null;
    context.dragOriginScreen = null;
    context.cameraAnchor = null;
  }
}
