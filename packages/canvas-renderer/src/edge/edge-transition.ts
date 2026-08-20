/**
 * Transition Edge data interface for Project Zero Canvas Engine.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 8).
 */

export interface TransitionEdge {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly label: string;
  readonly inputSymbol?: string;
  readonly stackTop?: string;
  readonly stackReplacement?: string;
  readonly readSymbol?: string;
  readonly writeSymbol?: string;
  readonly moveDirection?: 'L' | 'R' | 'S';
  readonly parallelIndex?: number;
  readonly isSelfLoop?: boolean;
  readonly isSelected?: boolean;
  readonly isExecutionHighlighted?: boolean;
  readonly isHovered?: boolean;
  readonly isDisabled?: boolean;
  readonly color?: string;
  readonly strokeWidth?: number;
  readonly textColor?: string;
}

export const DEFAULT_EDGE_COLOR = '#64748B';
export const DEFAULT_EDGE_STROKE_WIDTH = 2;
export const DEFAULT_SELECTED_EDGE_STROKE_WIDTH = 3.5;
export const DEFAULT_ARROWHEAD_LENGTH = 12;
export const DEFAULT_ARROWHEAD_WIDTH = 8;
export const DEFAULT_SELF_LOOP_RADIUS = 24;
export const DEFAULT_PARALLEL_OFFSET_STEP = 24;
export const DEFAULT_LABEL_NORMAL_OFFSET = 14;
export const DEFAULT_LABEL_BACKGROUND_PILL_PADDING = 4;
export const DEFAULT_LABEL_BACKGROUND_OPACITY = 0.8;
