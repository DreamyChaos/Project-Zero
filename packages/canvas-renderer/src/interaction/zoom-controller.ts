/**
 * Zoom Controller for wheel, pinch, and cursor-anchored scaling.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 3).
 */

import { Camera } from '../camera/camera';
import { Point2D } from '../math/point2d';

export class ZoomController {
  public handleWheel(
    event: WheelEvent,
    screenPoint: Point2D,
    camera: Camera
  ): void {
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const isTrackpadPinch = event.ctrlKey;
    const delta = event.deltaY;
    let factor: number;

    if (isTrackpadPinch) {
      // Continuous fine trackpad pinch zoom
      factor = Math.exp(-delta * 0.01);
    } else {
      // Discrete mouse wheel steps
      factor = delta > 0 ? 0.9 : 1.1;
    }

    camera.zoomAtPoint(factor, screenPoint, true);
  }

  public zoomIn(camera: Camera, viewportCenter: Point2D, immediate: boolean = true): void {
    camera.zoomAtPoint(1.2, viewportCenter, immediate);
  }

  public zoomOut(camera: Camera, viewportCenter: Point2D, immediate: boolean = true): void {
    camera.zoomAtPoint(0.8, viewportCenter, immediate);
  }

  public resetZoom(camera: Camera, immediate: boolean = true): void {
    camera.setZoom(1.0, immediate);
  }
}
