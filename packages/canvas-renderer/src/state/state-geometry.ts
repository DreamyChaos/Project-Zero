/**
 * Geometry calculation utilities for Finite Automata state nodes.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 7).
 */

import { Point2D, distanceBetween } from '../math/point2d';
import { BoundingBox2D, createBoundingBox } from '../math/bounding-box';
import {
  StateNode,
  DEFAULT_NODE_RADIUS,
  DEFAULT_ACCEPTING_RING_OFFSET,
  DEFAULT_INITIAL_MARKER_SIZE,
  DEFAULT_HOVER_HALO_WIDTH,
} from './state-node';

export interface AdaptiveStateLayout {
  readonly radius: number;
  readonly lines: readonly string[];
  readonly baseFontSize: number;
}

/**
 * Splits and formats a state label into multiple balanced lines for interior circular layout.
 */
export function wrapStateLabel(label: string): string[] {
  const trimmed = (label ?? '').trim();
  if (!trimmed || trimmed.length <= 4) {
    return [trimmed];
  }

  // 1. Handle Set / Subset / Equivalence Class format: {q0,q1,q2,...}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1).trim();
    const items = inner.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    
    // Short set that fits on a single line comfortably
    if (items.length <= 2 && trimmed.length <= 9) {
      return [trimmed];
    }

    // Determine optimal items per line
    let itemsPerLine = 3;
    if (items.length <= 4) {
      itemsPerLine = 2;
    } else if (items.length <= 7) {
      itemsPerLine = 3;
    } else if (items.length <= 12) {
      itemsPerLine = 3;
    } else {
      itemsPerLine = 4;
    }

    const lines: string[] = [];
    for (let i = 0; i < items.length; i += itemsPerLine) {
      const chunk = items.slice(i, i + itemsPerLine);
      const isFirst = i === 0;
      const isLast = i + itemsPerLine >= items.length;
      const chunkStr = chunk.join(',');

      let line = chunkStr;
      if (isFirst) {
        line = '{' + line;
      }
      if (!isLast) {
        line = line + ',';
      } else {
        line = line + '}';
      }
      lines.push(line);
    }
    return lines;
  }

  // 2. Comma separated list without braces: q0,q1,q2
  if (trimmed.includes(',')) {
    const items = trimmed.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    if (items.length <= 2 && trimmed.length <= 8) {
      return [trimmed];
    }
    const itemsPerLine = items.length <= 4 ? 2 : 3;
    const lines: string[] = [];
    for (let i = 0; i < items.length; i += itemsPerLine) {
      const chunk = items.slice(i, i + itemsPerLine);
      const isLast = i + itemsPerLine >= items.length;
      lines.push(chunk.join(',') + (isLast ? '' : ','));
    }
    return lines;
  }

  // 3. Space separated words
  if (trimmed.includes(' ')) {
    const words = trimmed.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    for (const w of words) {
      if (!currentLine) {
        currentLine = w;
      } else if (currentLine.length + w.length + 1 <= 12) {
        currentLine += ' ' + w;
      } else {
        lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // 4. Long single token
  if (trimmed.length > 10) {
    const mid = Math.ceil(trimmed.length / 2);
    return [trimmed.slice(0, mid), trimmed.slice(mid)];
  }

  return [trimmed];
}

/**
 * Computes adaptive radius and multiline text layout to ensure full label containment within circular state bubbles.
 */
export function computeAdaptiveStateLayout(
  label: string,
  isAccepting: boolean = false,
  explicitRadius?: number,
  baseRadius: number = DEFAULT_NODE_RADIUS
): AdaptiveStateLayout {
  if (explicitRadius !== undefined && explicitRadius > 0) {
    const lines = wrapStateLabel(label);
    const fontSize = lines.length > 2 ? 10.5 : lines.length > 1 ? 12 : 14;
    return { radius: explicitRadius, lines, baseFontSize: fontSize };
  }

  const raw = (label ?? '').trim();
  if (raw.length <= 4) {
    return {
      radius: baseRadius,
      lines: [raw],
      baseFontSize: 14,
    };
  }

  const lines = wrapStateLabel(raw);

  let chosenFontSize = 13;
  if (lines.length >= 3 || raw.length > 22) {
    chosenFontSize = 10.5;
  } else if (lines.length === 2 || raw.length > 9) {
    chosenFontSize = 11.5;
  }

  const lineHeight = chosenFontSize * 1.25;
  const totalHeight = lines.length * lineHeight;
  const maxLineLen = Math.max(...lines.map((l) => l.length));
  const approxWidth = maxLineLen * (chosenFontSize * 0.58);

  const halfW = approxWidth / 2;
  const halfH = totalHeight / 2;
  const cornerDist = Math.sqrt(halfW * halfW + halfH * halfH);

  // Safety buffer from circular perimeter
  const padding = isAccepting ? 10 : 7;
  const requiredRadius = Math.ceil(cornerDist + padding);

  const finalRadius = Math.max(baseRadius, Math.min(58, requiredRadius));

  return {
    radius: finalRadius,
    lines,
    baseFontSize: chosenFontSize,
  };
}

export function getNodeRadius(node: StateNode): number {
  if (node.radius !== undefined && node.radius > 0) {
    return node.radius;
  }
  return computeAdaptiveStateLayout(node.label, !!node.isAccepting).radius;
}

export function getAcceptingRingRadius(nodeRadius: number): number {
  return Math.max(1, nodeRadius - DEFAULT_ACCEPTING_RING_OFFSET);
}

/**
 * Calculates the equilateral triangle vertices for an initial state entry arrow marker.
 * Equilateral triangle (side length = markerSize) pointing right to the left perimeter edge of the node circle.
 */
export function getInitialMarkerTriangle(
  nodeCenter: Point2D,
  nodeRadius: number,
  markerSize: number = DEFAULT_INITIAL_MARKER_SIZE
): readonly [Point2D, Point2D, Point2D] {
  const height = (Math.sqrt(3) / 2) * markerSize;
  const halfBase = markerSize / 2;

  // Tip contacts the left perimeter edge of the node circle (x - r, y)
  const tipX = nodeCenter.x - nodeRadius;
  const tipY = nodeCenter.y;

  const baseLeftX = tipX - height;
  const topY = tipY - halfBase;
  const bottomY = tipY + halfBase;

  return [
    { x: tipX, y: tipY },
    { x: baseLeftX, y: topY },
    { x: baseLeftX, y: bottomY },
  ];
}

/**
 * Computes enclosing World Space bounding box for a state node (including initial marker & halos).
 */
export function getNodeBoundingBox(node: StateNode): BoundingBox2D {
  const radius = getNodeRadius(node);
  const extraPadding = (node.isHovered ? DEFAULT_HOVER_HALO_WIDTH : 0) + 4;

  let minX = node.x - radius - extraPadding;
  const minY = node.y - radius - extraPadding;
  const maxX = node.x + radius + extraPadding;
  const maxY = node.y + radius + extraPadding;

  if (node.isInitial) {
    const markerHeight = (Math.sqrt(3) / 2) * DEFAULT_INITIAL_MARKER_SIZE;
    minX = Math.min(minX, node.x - radius - markerHeight - extraPadding);
  }

  return createBoundingBox(minX, minY, maxX, maxY);
}

/**
 * Tests continuous point-in-circle containment for state node interaction.
 */
export function containsPointInNode(node: StateNode, point: Point2D): boolean {
  const radius = getNodeRadius(node);
  const dist = distanceBetween({ x: node.x, y: node.y }, point);
  return dist <= radius;
}
