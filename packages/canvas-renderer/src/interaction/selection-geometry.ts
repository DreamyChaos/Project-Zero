/**
 * Selection & Focus Indicator Geometry calculation utilities and Design System token bindings.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 11 & 18) and docs/07_Design_System.md (Section 2, 4, 5 & 10).
 */

import { Point2D } from '../math/point2d';
import { BoundingBox2D, createBoundingBox, mergeBoundingBoxes } from '../math/bounding-box';
import { StateNode, DEFAULT_SELECTION_STROKE_WIDTH } from '../state/state-node';
import { getNodeRadius, getNodeBoundingBox } from '../state/state-geometry';

// Design System Token Constants (docs/07_Design_System.md)
export const DEFAULT_FOCUS_RING_OFFSET = 4; // --space-1: 4px baseline offset (Section 4 & Section 5.2)
export const DEFAULT_FOCUS_RING_INNER_WIDTH = 2; // 2px focus ring stroke (Section 10)
export const DEFAULT_FOCUS_RING_OUTER_WIDTH = 2; // 2px high-contrast contrast border
export const DEFAULT_MARQUEE_FILL_OPACITY = 0.1; // 10% translucent accent fill (Section 11 Rule 2)
export const DEFAULT_MARQUEE_BORDER_WIDTH = 1.5; // 1.5px dashed border (Section 11 Rule 2)

export interface SelectionOutlineGeometry {
  readonly center: Point2D;
  readonly radius: number;
  readonly strokeWidth: number;
}

export interface FocusIndicatorGeometry {
  readonly center: Point2D;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly offset: number;
}

/**
 * Calculates the enclosing bounding box for a collection of selected state nodes.
 */
export function getSelectionBoundingBox(selectedNodes: ReadonlyArray<StateNode>): BoundingBox2D | null {
  if (selectedNodes.length === 0) {
    return null;
  }

  let merged = getNodeBoundingBox(selectedNodes[0]);
  for (let i = 1; i < selectedNodes.length; i++) {
    merged = mergeBoundingBoxes(merged, getNodeBoundingBox(selectedNodes[i]));
  }
  return merged;
}

/**
 * Computes the primary accent selection outline geometry for a state node.
 * 3px primary accent stroke (#3B82F6 / --border-focus) per Section 11 Rule 1.
 */
export function getSelectionOutlineGeometry(node: StateNode): SelectionOutlineGeometry {
  const radius = getNodeRadius(node);
  return {
    center: { x: node.x, y: node.y },
    radius,
    strokeWidth: DEFAULT_SELECTION_STROKE_WIDTH,
  };
}

/**
 * Computes high-contrast keyboard focus indicator ring geometry.
 * 4px offset high-contrast double outline ring per Section 18 Rule 1 and Design System Section 5.2.
 */
export function getFocusIndicatorGeometry(node: StateNode): FocusIndicatorGeometry {
  const radius = getNodeRadius(node);
  const offset = DEFAULT_FOCUS_RING_OFFSET;
  return {
    center: { x: node.x, y: node.y },
    innerRadius: radius + offset,
    outerRadius: radius + offset + DEFAULT_FOCUS_RING_INNER_WIDTH,
    offset,
  };
}

/**
 * Normalizes any two world space coordinates into a standard bounding box.
 * Handles negative-width and negative-height drag rectangles.
 */
export function normalizeMarqueeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): BoundingBox2D {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);
  return createBoundingBox(minX, minY, maxX, maxY);
}
