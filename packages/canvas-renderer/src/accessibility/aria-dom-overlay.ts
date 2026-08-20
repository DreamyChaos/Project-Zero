/**
 * Semantic ARIA DOM Overlay & Screen Reader Accessibility Synchronization Subsystem.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 18) and WCAG 2.1 AA/AAA.
 */

import { StateNode } from '../state/state-node';
import { TransitionEdge } from '../edge/edge-transition';
import { AccessibilityManager } from '../interaction/accessibility-manager';
import { distanceBetween } from '../math/point2d';

export interface AriaDomOverlayCallbacks {
  readonly onNodeFocused?: (nodeId: string) => void;
  readonly onNodeActivated?: (nodeId: string) => void;
}

export class AriaDomOverlaySync {
  private container: HTMLElement | null = null;
  private rootElement: HTMLElement | null = null;
  private liveRegion: HTMLElement | null = null;
  private nodesContainer: HTMLElement | null = null;
  private edgesContainer: HTMLElement | null = null;

  private focusedNodeId: string | null = null;
  private lastFocusedPosition: { x: number; y: number } | null = null;
  private currentEdges: ReadonlyArray<TransitionEdge> = [];
  private previousEdges: ReadonlyArray<TransitionEdge> = [];

  private readonly nodeElementMap: Map<string, HTMLElement> = new Map();
  private readonly edgeElementMap: Map<string, HTMLElement> = new Map();

  private readonly callbacks?: AriaDomOverlayCallbacks;

  constructor(callbacks?: AriaDomOverlayCallbacks) {
    this.callbacks = callbacks;
  }

  public attach(container: HTMLElement): void {
    this.container = container;

    if (typeof document === 'undefined') return;

    // Create visually hidden but screen-reader accessible ARIA overlay container
    const root = document.createElement('div');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Finite Automata Interactive Graph Canvas');
    root.style.position = 'absolute';
    root.style.top = '0';
    root.style.left = '0';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.pointerEvents = 'none';
    root.style.overflow = 'hidden';

    // 1. Screen Reader Live Region
    const live = document.createElement('div');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.style.position = 'absolute';
    live.style.width = '1px';
    live.style.height = '1px';
    live.style.overflow = 'hidden';
    live.style.clip = 'rect(1px, 1px, 1px, 1px)';

    // 2. Nodes Container
    const nodesGroup = document.createElement('div');
    nodesGroup.setAttribute('role', 'group');
    nodesGroup.setAttribute('aria-label', 'Graph State Nodes');

    // 3. Edges Container
    const edgesGroup = document.createElement('div');
    edgesGroup.setAttribute('role', 'list');
    edgesGroup.setAttribute('aria-label', 'Graph Transition Edges');

    root.appendChild(live);
    root.appendChild(nodesGroup);
    root.appendChild(edgesGroup);
    container.appendChild(root);

    this.rootElement = root;
    this.liveRegion = live;
    this.nodesContainer = nodesGroup;
    this.edgesContainer = edgesGroup;
  }

  public detach(): void {
    if (this.rootElement && this.container) {
      if (this.rootElement.parentNode === this.container) {
        this.container.removeChild(this.rootElement);
      }
    }
    this.container = null;
    this.rootElement = null;
    this.liveRegion = null;
    this.nodesContainer = null;
    this.edgesContainer = null;
    this.nodeElementMap.clear();
    this.edgeElementMap.clear();
  }

  public announce(text: string): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = text;
    }
  }

  public syncNodes(
    nodes: ReadonlyArray<StateNode>,
    edges?: ReadonlyArray<TransitionEdge>
  ): void {
    if (edges !== undefined) {
      if (this.currentEdges.length > 0) {
        this.previousEdges = this.currentEdges;
      }
      this.currentEdges = edges;
    }
    const effectiveEdges = this.currentEdges;
    const activeNodeIds = new Set<string>();

    // Calculate outgoing transition counts
    const outgoingCounts = new Map<string, number>();
    for (let i = 0; i < effectiveEdges.length; i++) {
      const src = effectiveEdges[i].sourceNodeId;
      outgoingCounts.set(src, (outgoingCounts.get(src) ?? 0) + 1);
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      activeNodeIds.add(node.id);

      const label = AccessibilityManager.getNodeAccessibilityText(
        node,
        outgoingCounts.get(node.id) ?? 0
      );

      let el = this.nodeElementMap.get(node.id);
      if (!el && this.nodesContainer && typeof document !== 'undefined') {
        el = document.createElement('button');
        el.setAttribute('type', 'button');
        el.setAttribute('data-node-id', node.id);
        el.style.position = 'absolute';
        el.style.width = '1px';
        el.style.height = '1px';
        el.style.overflow = 'hidden';
        el.style.clip = 'rect(1px, 1px, 1px, 1px)';

        el.addEventListener('focus', () => {
          this.focusedNodeId = node.id;
          this.lastFocusedPosition = { x: node.x, y: node.y };
          if (this.callbacks?.onNodeFocused) {
            this.callbacks.onNodeFocused(node.id);
          }
        });

        el.addEventListener('click', () => {
          if (this.callbacks?.onNodeActivated) {
            this.callbacks.onNodeActivated(node.id);
          }
        });

        this.nodesContainer.appendChild(el);
        this.nodeElementMap.set(node.id, el);
      }

      if (el) {
        el.setAttribute('aria-label', label);
        el.setAttribute('aria-selected', node.isSelected ? 'true' : 'false');
        el.tabIndex = node.id === this.focusedNodeId || (!this.focusedNodeId && i === 0) ? 0 : -1;
      }
    }

    // Handle auto-recovery if focused node was deleted
    if (this.focusedNodeId && !activeNodeIds.has(this.focusedNodeId)) {
      this.recoverFocusToNearestNode(this.focusedNodeId, nodes, effectiveEdges);
    }

    // Prune deleted node DOM elements
    for (const [id, el] of this.nodeElementMap.entries()) {
      if (!activeNodeIds.has(id)) {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
        this.nodeElementMap.delete(id);
      }
    }
  }

  public syncEdges(
    edges: ReadonlyArray<TransitionEdge>,
    nodesMap: Map<string, StateNode>
  ): void {
    this.currentEdges = edges;
    const activeEdgeIds = new Set<string>();

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      activeEdgeIds.add(edge.id);

      const source = nodesMap.get(edge.sourceNodeId);
      const target = nodesMap.get(edge.targetNodeId);
      const label = AccessibilityManager.getEdgeAccessibilityText(edge, source, target);

      let el = this.edgeElementMap.get(edge.id);
      if (!el && this.edgesContainer && typeof document !== 'undefined') {
        el = document.createElement('div');
        el.setAttribute('role', 'listitem');
        el.setAttribute('data-edge-id', edge.id);
        el.style.position = 'absolute';
        el.style.width = '1px';
        el.style.height = '1px';
        el.style.overflow = 'hidden';
        el.style.clip = 'rect(1px, 1px, 1px, 1px)';

        this.edgesContainer.appendChild(el);
        this.edgeElementMap.set(edge.id, el);
      }

      if (el) {
        el.setAttribute('aria-label', label);
      }
    }

    // Prune deleted edge DOM elements
    for (const [id, el] of this.edgeElementMap.entries()) {
      if (!activeEdgeIds.has(id)) {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
        this.edgeElementMap.delete(id);
      }
    }
  }

  public setFocusedNode(nodeId: string | null): void {
    this.focusedNodeId = nodeId;
    for (const [id, el] of this.nodeElementMap.entries()) {
      el.tabIndex = id === nodeId ? 0 : -1;
      if (id === nodeId) {
        el.focus();
      }
    }
  }

  public getFocusedNodeId(): string | null {
    return this.focusedNodeId;
  }

  /**
   * Focus auto-recovery: prioritizes directly connected nodes by Euclidean distance,
   * falling back to nearest spatial node, with deterministic ID tie-breaking (Section 18).
   */
  private recoverFocusToNearestNode(
    deletedNodeId: string,
    nodes: ReadonlyArray<StateNode>,
    edges: ReadonlyArray<TransitionEdge>
  ): void {
    if (nodes.length === 0) {
      this.focusedNodeId = null;
      this.lastFocusedPosition = null;
      this.announce('Focused state deleted. Canvas empty.');
      return;
    }

    // 1. Gather directly connected neighboring node IDs from active or previous edges
    const connectedNodeIds = new Set<string>();
    const allCandidateEdges = edges.length > 0 ? edges : this.previousEdges;
    for (let i = 0; i < allCandidateEdges.length; i++) {
      const e = allCandidateEdges[i];
      if (e.sourceNodeId === deletedNodeId && e.targetNodeId !== deletedNodeId) {
        connectedNodeIds.add(e.targetNodeId);
      } else if (e.targetNodeId === deletedNodeId && e.sourceNodeId !== deletedNodeId) {
        connectedNodeIds.add(e.sourceNodeId);
      }
    }

    const origin = this.lastFocusedPosition ?? { x: 0, y: 0 };
    const connectedCandidates = nodes.filter((n) => connectedNodeIds.has(n.id));
    const searchPool = connectedCandidates.length > 0 ? connectedCandidates : nodes;

    let bestNode = searchPool[0];
    let shortestDist = distanceBetween(origin, { x: bestNode.x, y: bestNode.y });

    for (let i = 1; i < searchPool.length; i++) {
      const node = searchPool[i];
      const dist = distanceBetween(origin, { x: node.x, y: node.y });
      if (dist < shortestDist - 1e-6) {
        shortestDist = dist;
        bestNode = node;
      } else if (Math.abs(dist - shortestDist) <= 1e-6) {
        // Deterministic lexicographical tie-break
        if (node.id.localeCompare(bestNode.id) < 0) {
          bestNode = node;
        }
      }
    }

    this.setFocusedNode(bestNode.id);
    this.announce(`Focused state deleted. Focus shifted to nearest State ${bestNode.label}.`);
  }
}
