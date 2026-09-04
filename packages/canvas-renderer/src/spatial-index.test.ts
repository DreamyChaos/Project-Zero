import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialIndex } from './spatial/spatial-index';
import { StateNode } from './state/state-node';
import { TransitionEdge } from './edge/edge-transition';
import { createBoundingBox } from './math/bounding-box';
import { Camera } from './camera/camera';
import { Viewport } from './camera/viewport';

describe('Hierarchical 2D Spatial Index (BVH / R-Tree)', () => {
  let spatialIndex: SpatialIndex;

  const nodeA: StateNode = { id: 'node_a', label: 'A', x: 50, y: 50, radius: 32 };
  const nodeB: StateNode = { id: 'node_b', label: 'B', x: 200, y: 50, radius: 32 };
  const nodeC: StateNode = { id: 'node_c', label: 'C', x: 500, y: 500, radius: 32 };
  const nodeNeg: StateNode = { id: 'node_neg', label: 'Neg', x: -300, y: -400, radius: 32 };

  const edgeAB: TransitionEdge = { id: 'edge_ab', sourceNodeId: 'node_a', targetNodeId: 'node_b', label: '0' };
  const edgeNeg: TransitionEdge = { id: 'edge_neg', sourceNodeId: 'node_neg', targetNodeId: 'node_a', label: '1' };

  beforeEach(() => {
    spatialIndex = new SpatialIndex({ maxLeafEntries: 4, minLeafEntries: 2 });
  });

  describe('Node and Edge Spatial Indexing', () => {
    it('indexes both StateNodes and TransitionEdges simultaneously', () => {
      spatialIndex.insertNode(nodeA);
      spatialIndex.insertNode(nodeB);
      spatialIndex.insertEdge(edgeAB, createBoundingBox(18, 18, 232, 82));

      expect(spatialIndex.sizeNodes()).toBe(2);
      expect(spatialIndex.sizeEdges()).toBe(1);
      expect(spatialIndex.size()).toBe(3);

      const res = spatialIndex.queryRange(createBoundingBox(0, 0, 300, 100));
      expect(res.nodes.length).toBe(2);
      expect(res.edges.length).toBe(1);
      expect(res.edges[0].id).toBe('edge_ab');
    });

    it('handles negative world coordinates and cross-quadrant queries correctly', () => {
      spatialIndex.insertNode(nodeNeg);
      spatialIndex.insertEdge(edgeNeg, createBoundingBox(-332, -432, 82, 82));

      expect(spatialIndex.sizeNodes()).toBe(1);

      // Query localized to negative quadrant
      const negQuery = spatialIndex.queryRange(createBoundingBox(-500, -500, -200, -200));
      expect(negQuery.nodes.length).toBe(1);
      expect(negQuery.nodes[0].id).toBe('node_neg');

      // Point query in negative space
      const pointHit = spatialIndex.queryPointNodes({ x: -300, y: -400 }, 10);
      expect(pointHit.length).toBe(1);
      expect(pointHit[0].id).toBe('node_neg');
    });

    it('updates node and edge bounding volumes dynamically during movement', () => {
      spatialIndex.insertNode(nodeA);
      spatialIndex.insertEdge(edgeAB, createBoundingBox(18, 18, 232, 82));

      // Move nodeA far away to (1000, 1000)
      const movedNodeA: StateNode = { ...nodeA, x: 1000, y: 1000 };
      spatialIndex.updateNode(movedNodeA);

      // Old area has 0 node hits
      expect(spatialIndex.queryPointNodes({ x: 50, y: 50 }, 10).length).toBe(0);
      // New area has 1 node hit
      expect(spatialIndex.queryPointNodes({ x: 1000, y: 1000 }, 10).length).toBe(1);

      // Move edgeAB
      const newEdgeBounds = createBoundingBox(900, 900, 1200, 1200);
      spatialIndex.updateEdge(edgeAB, newEdgeBounds);
      expect(spatialIndex.queryRangeEdges(createBoundingBox(0, 0, 300, 100)).length).toBe(0);
      expect(spatialIndex.queryRangeEdges(createBoundingBox(800, 800, 1300, 1300)).length).toBe(1);
    });

    it('removes nodes and edges cleanly and condenses tree hierarchy', () => {
      spatialIndex.insertNode(nodeA);
      spatialIndex.insertNode(nodeB);
      spatialIndex.insertEdge(edgeAB, createBoundingBox(18, 18, 232, 82));

      expect(spatialIndex.removeNode('node_a')).toBe(true);
      expect(spatialIndex.removeEdge('edge_ab')).toBe(true);

      expect(spatialIndex.sizeNodes()).toBe(1);
      expect(spatialIndex.sizeEdges()).toBe(0);
      expect(spatialIndex.getNode('node_a')).toBeUndefined();
      expect(spatialIndex.getEdge('edge_ab')).toBeUndefined();
    });
  });

  describe('Frustum Culling & Zero-Allocation Buffers', () => {
    it('executes frustum queries with padding buffer correctly', () => {
      spatialIndex.insertNode(nodeA);
      spatialIndex.insertNode(nodeB);
      spatialIndex.insertNode(nodeC);

      const viewport = new Viewport(800, 600, 1.0);
      const camera = new Camera(viewport);
      camera.setPosition(100, 100, true);

      const frustumRes = spatialIndex.queryFrustum(camera, 50);
      expect(frustumRes.nodes.some((n) => n.id === 'node_a')).toBe(true);
      expect(frustumRes.nodes.some((n) => n.id === 'node_b')).toBe(true);
    });

    it('adapts frustum padding across extreme zoom levels (0.1x, 0.3x, 1.0x, 5.0x)', () => {
      spatialIndex.insertNode(nodeA); // (50, 50)
      spatialIndex.insertNode(nodeB); // (200, 50)
      spatialIndex.insertNode(nodeC); // (500, 500)

      const viewport = new Viewport(800, 600, 1.0);
      const camera = new Camera(viewport);
      camera.setPosition(50, 50, true);

      // At zoom 0.1x, visible world is huge: ~8000x6000 world units
      camera.setZoom(0.1, true);
      const res01 = spatialIndex.queryFrustum(camera);
      expect(res01.nodes.length).toBe(3);

      // At zoom 0.3x
      camera.setZoom(0.3, true);
      const res03 = spatialIndex.queryFrustum(camera);
      expect(res03.nodes.length).toBe(3);

      // At zoom 1.0x
      camera.setZoom(1.0, true);
      const res1 = spatialIndex.queryFrustum(camera);
      expect(res1.nodes.some((n) => n.id === 'node_a')).toBe(true);
      expect(res1.nodes.some((n) => n.id === 'node_b')).toBe(true);

      // At zoom 5.0x, visible world is tight: 160x120 world units centered at (50, 50) -> includes node_a, excludes node_c
      camera.setZoom(5.0, true);
      const res5 = spatialIndex.queryFrustum(camera);
      expect(res5.nodes.some((n) => n.id === 'node_a')).toBe(true);
      expect(res5.nodes.some((n) => n.id === 'node_c')).toBe(false);
    });

    it('reuses external query buffers for zero-allocation query passes', () => {
      spatialIndex.insertNode(nodeA);
      spatialIndex.insertNode(nodeB);

      const reusableNodes: StateNode[] = [];
      const reusableEdges: TransitionEdge[] = [];

      spatialIndex.queryRange(createBoundingBox(0, 0, 300, 100), reusableNodes, reusableEdges);
      expect(reusableNodes.length).toBe(2);

      // Subsequent query reuses array without heap reallocation
      reusableNodes.length = 0;
      spatialIndex.queryPointNodes({ x: 50, y: 50 }, 10, reusableNodes);
      expect(reusableNodes.length).toBe(1);
    });
  });

  describe('Large-Graph Scale & BVH Node Splitting', () => {
    it('handles 1,000+ nodes and 1,000+ edges with hierarchical tree splitting', () => {
      const total = 1000;
      for (let i = 0; i < total; i++) {
        const x = (i % 50) * 120;
        const y = Math.floor(i / 50) * 120;
        spatialIndex.insertNode({
          id: `node_${i}`,
          label: `q${i}`,
          x,
          y,
          radius: 32,
        });

        if (i > 0) {
          spatialIndex.insertEdge(
            { id: `edge_${i}`, sourceNodeId: `node_${i - 1}`, targetNodeId: `node_${i}`, label: '0' },
            createBoundingBox(x - 120, y, x, y + 30)
          );
        }
      }

      expect(spatialIndex.sizeNodes()).toBe(1000);
      expect(spatialIndex.sizeEdges()).toBe(999);

      // Localized query in 400x400 area returns localized sub-branch candidates in O(log N)
      const localBox = createBoundingBox(0, 0, 300, 300);
      const queryRes = spatialIndex.queryRange(localBox);
      expect(queryRes.nodes.length).toBeGreaterThan(0);
      expect(queryRes.nodes.length).toBeLessThan(40);
    });
  });
});
