/**
 * 2D Hierarchical Bounding Volume Hierarchy (BVH / R-Tree) Spatial Index for Project Zero.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 16).
 *
 * Indexes both StateNodes and TransitionEdges with logarithmic frustum culling,
 * point containment, and range queries with zero-allocation reusable query buffers.
 */

import { Point2D } from '../math/point2d';
import {
  BoundingBox2D,
  createBoundingBox,
  intersectsBoundingBox,
  mergeBoundingBoxes,
} from '../math/bounding-box';
import { StateNode } from '../state/state-node';
import { getNodeBoundingBox } from '../state/state-geometry';
import { TransitionEdge } from '../edge/edge-transition';
import { Camera } from '../camera/camera';

export type SpatialItemKind = 'node' | 'edge';

export interface SpatialEntry<T> {
  readonly id: string;
  readonly kind: SpatialItemKind;
  bounds: BoundingBox2D;
  data: T;
}

export interface SpatialQueryResult {
  readonly nodes: ReadonlyArray<StateNode>;
  readonly edges: ReadonlyArray<TransitionEdge>;
}

export interface SpatialIndexOptions {
  readonly maxLeafEntries?: number;
  readonly minLeafEntries?: number;
}

class BVHNode {
  public bounds: BoundingBox2D;
  public children: BVHNode[] = [];
  public entries: Array<SpatialEntry<StateNode | TransitionEdge>> = [];
  public parent: BVHNode | null = null;
  public isLeaf: boolean = true;

  constructor(bounds: BoundingBox2D) {
    this.bounds = bounds;
  }

  public recalculateBounds(): void {
    if (this.isLeaf) {
      if (this.entries.length === 0) {
        return;
      }
      let b = this.entries[0].bounds;
      for (let i = 1; i < this.entries.length; i++) {
        b = mergeBoundingBoxes(b, this.entries[i].bounds);
      }
      this.bounds = b;
    } else {
      if (this.children.length === 0) {
        return;
      }
      let b = this.children[0].bounds;
      for (let i = 1; i < this.children.length; i++) {
        b = mergeBoundingBoxes(b, this.children[i].bounds);
      }
      this.bounds = b;
    }
  }
}

export class SpatialIndex {
  public static readonly DEFAULT_MAX_LEAF_ENTRIES = 8;
  public static readonly DEFAULT_MIN_LEAF_ENTRIES = 4;
  public static readonly DEFAULT_FRUSTUM_PADDING = 50; // Section 16 Rule 2 (50 world units)

  private readonly maxEntries: number;
  private readonly minEntries: number;

  private root: BVHNode;
  private readonly nodeEntryMap: Map<string, { entry: SpatialEntry<StateNode>; leaf: BVHNode }> = new Map();
  private readonly edgeEntryMap: Map<string, { entry: SpatialEntry<TransitionEdge>; leaf: BVHNode }> = new Map();

  // Persistent reusable query buffers for zero-allocation query hot paths
  private readonly nodeQueryBuffer: StateNode[] = [];
  private readonly edgeQueryBuffer: TransitionEdge[] = [];
  private readonly queryVisitedSet: Set<string> = new Set();

  constructor(options?: SpatialIndexOptions) {
    this.maxEntries = options?.maxLeafEntries ?? SpatialIndex.DEFAULT_MAX_LEAF_ENTRIES;
    this.minEntries = options?.minLeafEntries ?? SpatialIndex.DEFAULT_MIN_LEAF_ENTRIES;
    this.root = new BVHNode(createBoundingBox(0, 0, 0, 0));
  }

  public getMinEntries(): number {
    return this.minEntries;
  }

  // ---------------------------------------------------------------------------
  // Insertion Operations
  // ---------------------------------------------------------------------------

  public insertNode(node: StateNode): void {
    if (this.nodeEntryMap.has(node.id)) {
      this.removeNode(node.id);
    }

    const bounds = getNodeBoundingBox(node);
    const entry: SpatialEntry<StateNode> = {
      id: node.id,
      kind: 'node',
      bounds,
      data: node,
    };

    const leaf = this.chooseLeaf(this.root, bounds);
    leaf.entries.push(entry);
    this.nodeEntryMap.set(node.id, { entry, leaf });

    this.recomputeBoundsUpward(leaf);

    if (leaf.entries.length > this.maxEntries) {
      this.splitLeaf(leaf);
    }
  }

  public insertEdge(edge: TransitionEdge, bounds: BoundingBox2D): void {
    if (this.edgeEntryMap.has(edge.id)) {
      this.removeEdge(edge.id);
    }

    const entry: SpatialEntry<TransitionEdge> = {
      id: edge.id,
      kind: 'edge',
      bounds,
      data: edge,
    };

    const leaf = this.chooseLeaf(this.root, bounds);
    leaf.entries.push(entry);
    this.edgeEntryMap.set(edge.id, { entry, leaf });

    this.recomputeBoundsUpward(leaf);

    if (leaf.entries.length > this.maxEntries) {
      this.splitLeaf(leaf);
    }
  }

  // ---------------------------------------------------------------------------
  // Removal Operations
  // ---------------------------------------------------------------------------

  public removeNode(nodeId: string): boolean {
    const record = this.nodeEntryMap.get(nodeId);
    if (!record) return false;

    const { leaf } = record;
    const idx = leaf.entries.findIndex((e) => e.id === nodeId && e.kind === 'node');
    if (idx !== -1) {
      leaf.entries.splice(idx, 1);
    }
    this.nodeEntryMap.delete(nodeId);

    this.recomputeBoundsUpward(leaf);
    this.condenseTree(leaf);
    return true;
  }

  public removeEdge(edgeId: string): boolean {
    const record = this.edgeEntryMap.get(edgeId);
    if (!record) return false;

    const { leaf } = record;
    const idx = leaf.entries.findIndex((e) => e.id === edgeId && e.kind === 'edge');
    if (idx !== -1) {
      leaf.entries.splice(idx, 1);
    }
    this.edgeEntryMap.delete(edgeId);

    this.recomputeBoundsUpward(leaf);
    this.condenseTree(leaf);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Incremental Update Operations
  // ---------------------------------------------------------------------------

  public updateNode(node: StateNode): void {
    const record = this.nodeEntryMap.get(node.id);
    if (!record) {
      this.insertNode(node);
      return;
    }

    const newBounds = getNodeBoundingBox(node);
    record.entry.data = node;

    // Fast-path: if new bounds still fit comfortably inside existing leaf bounds without enlargement
    if (
      newBounds.minX >= record.leaf.bounds.minX &&
      newBounds.maxX <= record.leaf.bounds.maxX &&
      newBounds.minY >= record.leaf.bounds.minY &&
      newBounds.maxY <= record.leaf.bounds.maxY
    ) {
      record.entry.bounds = newBounds;
      record.leaf.recalculateBounds();
      return;
    }

    // Otherwise remove and reinsert into optimal BVH node
    this.removeNode(node.id);
    this.insertNode(node);
  }

  public updateEdge(edge: TransitionEdge, bounds: BoundingBox2D): void {
    const record = this.edgeEntryMap.get(edge.id);
    if (!record) {
      this.insertEdge(edge, bounds);
      return;
    }

    record.entry.data = edge;

    if (
      bounds.minX >= record.leaf.bounds.minX &&
      bounds.maxX <= record.leaf.bounds.maxX &&
      bounds.minY >= record.leaf.bounds.minY &&
      bounds.maxY <= record.leaf.bounds.maxY
    ) {
      record.entry.bounds = bounds;
      record.leaf.recalculateBounds();
      return;
    }

    this.removeEdge(edge.id);
    this.insertEdge(edge, bounds);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  public queryRange(
    rect: BoundingBox2D,
    outNodes?: StateNode[],
    outEdges?: TransitionEdge[]
  ): SpatialQueryResult {
    const nodes = outNodes ?? this.nodeQueryBuffer;
    const edges = outEdges ?? this.edgeQueryBuffer;

    if (!outNodes) this.nodeQueryBuffer.length = 0;
    if (!outEdges) this.edgeQueryBuffer.length = 0;
    this.queryVisitedSet.clear();

    this.querySubtree(this.root, rect, nodes, edges, this.queryVisitedSet);

    return { nodes, edges };
  }

  public queryRangeNodes(
    rect: BoundingBox2D,
    outNodes?: StateNode[]
  ): ReadonlyArray<StateNode> {
    const result = outNodes ?? this.nodeQueryBuffer;
    if (!outNodes) this.nodeQueryBuffer.length = 0;
    this.queryVisitedSet.clear();

    this.querySubtreeNodesOnly(this.root, rect, result, this.queryVisitedSet);
    return result;
  }

  public queryRangeEdges(
    rect: BoundingBox2D,
    outEdges?: TransitionEdge[]
  ): ReadonlyArray<TransitionEdge> {
    const result = outEdges ?? this.edgeQueryBuffer;
    if (!outEdges) this.edgeQueryBuffer.length = 0;
    this.queryVisitedSet.clear();

    this.querySubtreeEdgesOnly(this.root, rect, result, this.queryVisitedSet);
    return result;
  }

  public queryPoint(
    point: Point2D,
    tolerance: number = 0,
    outNodes?: StateNode[],
    outEdges?: TransitionEdge[]
  ): SpatialQueryResult {
    const queryBox: BoundingBox2D = {
      minX: point.x - tolerance,
      minY: point.y - tolerance,
      maxX: point.x + tolerance,
      maxY: point.y + tolerance,
      width: tolerance * 2,
      height: tolerance * 2,
      centerX: point.x,
      centerY: point.y,
    };

    return this.queryRange(queryBox, outNodes, outEdges);
  }

  public queryPointNodes(
    point: Point2D,
    tolerance: number = 0,
    outNodes?: StateNode[]
  ): ReadonlyArray<StateNode> {
    const queryBox = createBoundingBox(
      point.x - tolerance,
      point.y - tolerance,
      point.x + tolerance,
      point.y + tolerance
    );
    return this.queryRangeNodes(queryBox, outNodes);
  }

  public queryPointEdges(
    point: Point2D,
    tolerance: number = 0,
    outEdges?: TransitionEdge[]
  ): ReadonlyArray<TransitionEdge> {
    const queryBox = createBoundingBox(
      point.x - tolerance,
      point.y - tolerance,
      point.x + tolerance,
      point.y + tolerance
    );
    return this.queryRangeEdges(queryBox, outEdges);
  }

  public queryFrustum(
    camera: Camera,
    padding?: number,
    outNodes?: StateNode[],
    outEdges?: TransitionEdge[]
  ): SpatialQueryResult {
    const visibleWorld = camera.getVisibleWorldRect();
    const zoom = camera.getState().zoom;
    const effectivePadding = padding !== undefined
      ? padding
      : Math.max(20, Math.min(500, SpatialIndex.DEFAULT_FRUSTUM_PADDING / zoom));

    const frustumBox = createBoundingBox(
      visibleWorld.minX - effectivePadding,
      visibleWorld.minY - effectivePadding,
      visibleWorld.maxX + effectivePadding,
      visibleWorld.maxY + effectivePadding
    );
    return this.queryRange(frustumBox, outNodes, outEdges);
  }

  // ---------------------------------------------------------------------------
  // Accessors & Lifecycle
  // ---------------------------------------------------------------------------

  public getNode(id: string): StateNode | undefined {
    return this.nodeEntryMap.get(id)?.entry.data;
  }

  public getEdge(id: string): TransitionEdge | undefined {
    return this.edgeEntryMap.get(id)?.entry.data;
  }

  public getAllNodes(): ReadonlyArray<StateNode> {
    const result: StateNode[] = [];
    for (const record of this.nodeEntryMap.values()) {
      result.push(record.entry.data);
    }
    return result;
  }

  public getAllEdges(): ReadonlyArray<TransitionEdge> {
    const result: TransitionEdge[] = [];
    for (const record of this.edgeEntryMap.values()) {
      result.push(record.entry.data);
    }
    return result;
  }

  public sizeNodes(): number {
    return this.nodeEntryMap.size;
  }

  public sizeEdges(): number {
    return this.edgeEntryMap.size;
  }

  public size(): number {
    return this.nodeEntryMap.size + this.edgeEntryMap.size;
  }

  public clear(): void {
    this.nodeEntryMap.clear();
    this.edgeEntryMap.clear();
    this.root = new BVHNode(createBoundingBox(0, 0, 0, 0));
    this.nodeQueryBuffer.length = 0;
    this.edgeQueryBuffer.length = 0;
    this.queryVisitedSet.clear();
  }

  // ---------------------------------------------------------------------------
  // Internal Tree Construction & Maintenance
  // ---------------------------------------------------------------------------

  private chooseLeaf(node: BVHNode, entryBounds: BoundingBox2D): BVHNode {
    if (node.isLeaf) {
      return node;
    }

    let bestChild = node.children[0];
    let bestEnlargement = Infinity;
    let bestArea = Infinity;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childArea = child.bounds.width * child.bounds.height;
      const enlarged = mergeBoundingBoxes(child.bounds, entryBounds);
      const enlargedArea = enlarged.width * enlarged.height;
      const enlargement = enlargedArea - childArea;

      if (enlargement < bestEnlargement || (enlargement === bestEnlargement && childArea < bestArea)) {
        bestEnlargement = enlargement;
        bestArea = childArea;
        bestChild = child;
      }
    }

    return this.chooseLeaf(bestChild, entryBounds);
  }

  private splitLeaf(leaf: BVHNode): void {
    const allEntries = leaf.entries;
    // Sort along longest bounding axis for deterministic linear split
    const isXLonger = leaf.bounds.width >= leaf.bounds.height;
    allEntries.sort((a, b) => {
      const posA = isXLonger ? a.bounds.centerX : a.bounds.centerY;
      const posB = isXLonger ? b.bounds.centerX : b.bounds.centerY;
      if (posA !== posB) return posA - posB;
      return a.id.localeCompare(b.id);
    });

    const mid = Math.floor(allEntries.length / 2);
    const entriesA = allEntries.slice(0, mid);
    const entriesB = allEntries.slice(mid);

    leaf.entries = entriesA;
    leaf.recalculateBounds();

    const sibling = new BVHNode(createBoundingBox(0, 0, 0, 0));
    sibling.isLeaf = true;
    sibling.entries = entriesB;
    sibling.recalculateBounds();

    for (let i = 0; i < entriesB.length; i++) {
      const e = entriesB[i];
      if (e.kind === 'node') {
        const record = this.nodeEntryMap.get(e.id);
        if (record) record.leaf = sibling;
      } else {
        const record = this.edgeEntryMap.get(e.id);
        if (record) record.leaf = sibling;
      }
    }

    if (!leaf.parent) {
      const newRoot = new BVHNode(mergeBoundingBoxes(leaf.bounds, sibling.bounds));
      newRoot.isLeaf = false;
      newRoot.children.push(leaf, sibling);
      leaf.parent = newRoot;
      sibling.parent = newRoot;
      this.root = newRoot;
    } else {
      sibling.parent = leaf.parent;
      leaf.parent.children.push(sibling);
      this.recomputeBoundsUpward(leaf.parent);
      if (leaf.parent.children.length > this.maxEntries) {
        this.splitInternalNode(leaf.parent);
      }
    }
  }

  private splitInternalNode(node: BVHNode): void {
    const allChildren = node.children;
    const isXLonger = node.bounds.width >= node.bounds.height;
    allChildren.sort((a, b) => {
      const posA = isXLonger ? a.bounds.centerX : a.bounds.centerY;
      const posB = isXLonger ? b.bounds.centerX : b.bounds.centerY;
      return posA - posB;
    });

    const mid = Math.floor(allChildren.length / 2);
    const childrenA = allChildren.slice(0, mid);
    const childrenB = allChildren.slice(mid);

    node.children = childrenA;
    node.recalculateBounds();

    const sibling = new BVHNode(createBoundingBox(0, 0, 0, 0));
    sibling.isLeaf = false;
    sibling.children = childrenB;
    for (let i = 0; i < childrenB.length; i++) {
      childrenB[i].parent = sibling;
    }
    sibling.recalculateBounds();

    if (!node.parent) {
      const newRoot = new BVHNode(mergeBoundingBoxes(node.bounds, sibling.bounds));
      newRoot.isLeaf = false;
      newRoot.children.push(node, sibling);
      node.parent = newRoot;
      sibling.parent = newRoot;
      this.root = newRoot;
    } else {
      sibling.parent = node.parent;
      node.parent.children.push(sibling);
      this.recomputeBoundsUpward(node.parent);
      if (node.parent.children.length > this.maxEntries) {
        this.splitInternalNode(node.parent);
      }
    }
  }

  private recomputeBoundsUpward(node: BVHNode | null): void {
    let curr = node;
    while (curr) {
      curr.recalculateBounds();
      curr = curr.parent;
    }
  }

  private condenseTree(leaf: BVHNode): void {
    let curr: BVHNode | null = leaf;
    while (curr && curr.parent) {
      if ((curr.isLeaf && curr.entries.length === 0) || (!curr.isLeaf && curr.children.length === 0)) {
        const parentNode: BVHNode = curr.parent;
        const idx = parentNode.children.indexOf(curr);
        if (idx !== -1) {
          parentNode.children.splice(idx, 1);
        }
        curr = parentNode;
      } else {
        curr = curr.parent;
      }
    }

    // Collapse root if single child remains
    if (!this.root.isLeaf && this.root.children.length === 1) {
      this.root = this.root.children[0];
      this.root.parent = null;
    }
  }

  private querySubtree(
    node: BVHNode,
    queryBox: BoundingBox2D,
    outNodes: StateNode[],
    outEdges: TransitionEdge[],
    visited: Set<string>
  ): void {
    if (this.size() === 0) return;
    if (!intersectsBoundingBox(node.bounds, queryBox)) {
      return;
    }

    if (node.isLeaf) {
      for (let i = 0; i < node.entries.length; i++) {
        const entry = node.entries[i];
        if (!visited.has(entry.id) && intersectsBoundingBox(entry.bounds, queryBox)) {
          visited.add(entry.id);
          if (entry.kind === 'node') {
            outNodes.push(entry.data as StateNode);
          } else {
            outEdges.push(entry.data as TransitionEdge);
          }
        }
      }
    } else {
      for (let i = 0; i < node.children.length; i++) {
        this.querySubtree(node.children[i], queryBox, outNodes, outEdges, visited);
      }
    }
  }

  private querySubtreeNodesOnly(
    node: BVHNode,
    queryBox: BoundingBox2D,
    outNodes: StateNode[],
    visited: Set<string>
  ): void {
    if (this.sizeNodes() === 0) return;
    if (!intersectsBoundingBox(node.bounds, queryBox)) {
      return;
    }

    if (node.isLeaf) {
      for (let i = 0; i < node.entries.length; i++) {
        const entry = node.entries[i];
        if (entry.kind === 'node' && !visited.has(entry.id) && intersectsBoundingBox(entry.bounds, queryBox)) {
          visited.add(entry.id);
          outNodes.push(entry.data as StateNode);
        }
      }
    } else {
      for (let i = 0; i < node.children.length; i++) {
        this.querySubtreeNodesOnly(node.children[i], queryBox, outNodes, visited);
      }
    }
  }

  private querySubtreeEdgesOnly(
    node: BVHNode,
    queryBox: BoundingBox2D,
    outEdges: TransitionEdge[],
    visited: Set<string>
  ): void {
    if (this.sizeEdges() === 0) return;
    if (!intersectsBoundingBox(node.bounds, queryBox)) {
      return;
    }

    if (node.isLeaf) {
      for (let i = 0; i < node.entries.length; i++) {
        const entry = node.entries[i];
        if (entry.kind === 'edge' && !visited.has(entry.id) && intersectsBoundingBox(entry.bounds, queryBox)) {
          visited.add(entry.id);
          outEdges.push(entry.data as TransitionEdge);
        }
      }
    } else {
      for (let i = 0; i < node.children.length; i++) {
        this.querySubtreeEdgesOnly(node.children[i], queryBox, outEdges, visited);
      }
    }
  }
}
