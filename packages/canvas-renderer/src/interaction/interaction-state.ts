/**
 * Interaction States for Project Zero Canvas Engine.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 13).
 */

export enum InteractionState {
  Idle = 'Idle',
  Hover = 'Hover',
  DraggingNode = 'DraggingNode',
  DraggingSelection = 'DraggingSelection',
  Panning = 'Panning',
  MarqueeSelection = 'MarqueeSelection',
  CreatingEdge = 'CreatingEdge',
  Zooming = 'Zooming',
}

/**
 * Type predicate to check if the current interaction state represents an active drag operation.
 */
export function isDraggingInteractionState(state: InteractionState): boolean {
  return (
    state === InteractionState.DraggingNode ||
    state === InteractionState.DraggingSelection ||
    state === InteractionState.Panning ||
    state === InteractionState.MarqueeSelection ||
    state === InteractionState.CreatingEdge
  );
}
