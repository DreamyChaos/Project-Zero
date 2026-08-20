/**
 * Accessibility Manager & ARIA Summary Generator for Project Zero Canvas Engine.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 18 & 19).
 */

import { StateNode } from '../state/state-node';
import { TransitionEdge } from '../edge/edge-transition';

export interface GraphAccessibilitySummary {
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly initialNodeId: string | null;
  readonly acceptingNodeIds: ReadonlyArray<string>;
}

export class AccessibilityManager {
  /**
   * Generates a concise screen reader description for a state node.
   * Formally specified in Section 18 Rule 2: ("State q0, Initial State, 2 outgoing transitions").
   */
  public static getNodeAccessibilityText(
    node: StateNode,
    outgoingEdgesCount: number = 0
  ): string {
    const parts: string[] = [`State ${node.label || node.id}`];

    if (node.isInitial) {
      parts.push('Initial State');
    }

    if (node.isAccepting) {
      parts.push('Accepting State');
    }

    if (outgoingEdgesCount === 1) {
      parts.push('1 outgoing transition');
    } else {
      parts.push(`${outgoingEdgesCount} outgoing transitions`);
    }

    return parts.join(', ');
  }

  /**
   * Generates a concise screen reader description for a transition edge.
   */
  public static getEdgeAccessibilityText(
    edge: TransitionEdge,
    sourceNode?: StateNode,
    targetNode?: StateNode
  ): string {
    const src = sourceNode ? sourceNode.label || sourceNode.id : edge.sourceNodeId;
    const tgt = targetNode ? targetNode.label || targetNode.id : edge.targetNodeId;
    const symbol = edge.label ? `on symbol '${edge.label}'` : 'on empty transition';
    return `Transition from ${src} to ${tgt} ${symbol}`;
  }

  /**
   * Summarizes the entire graph topology for screen reader live regions.
   */
  public static getGraphSummary(
    nodes: ReadonlyArray<StateNode>,
    edges: ReadonlyArray<TransitionEdge>
  ): GraphAccessibilitySummary {
    let initialNodeId: string | null = null;
    const acceptingNodeIds: string[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.isInitial && !initialNodeId) {
        initialNodeId = node.id;
      }
      if (node.isAccepting) {
        acceptingNodeIds.push(node.id);
      }
    }

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      initialNodeId,
      acceptingNodeIds,
    };
  }
}
