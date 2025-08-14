import { MapNode, RoomType } from '../types';
import {
  traverseGraph,
  findNodeById,
  addChildNode,
  removeChildNode,
  findMaxDepth,
  findMaxId,
  calculateNodePositions
} from '../graph-operations';

describe('Graph Operations', () => {
  let root: MapNode;
  let child1: MapNode;
  let child2: MapNode;
  let grandchild: MapNode;

  beforeEach(() => {
    root = new MapNode(1, 0, 3, false);
    child1 = new MapNode(2, 1, 3, false);
    child2 = new MapNode(3, 1, 3, false);
    grandchild = new MapNode(4, 2, 3, false);

    root.nextRooms[0] = child1.id;
    root.nextRooms[1] = child2.id;
    root.children = [child1, child2];
    
    child1.nextRooms[0] = grandchild.id;
    child1.children = [grandchild];
    child1.parent = root;
    
    child2.parent = root;
    grandchild.parent = child1;
  });

  describe('traverseGraph', () => {
    it('should collect all unique nodes', () => {
      const nodes = traverseGraph(root);
      expect(nodes.size).toBe(4);
      expect(nodes.has(1)).toBe(true);
      expect(nodes.has(2)).toBe(true);
      expect(nodes.has(3)).toBe(true);
      expect(nodes.has(4)).toBe(true);
    });

    it('should handle shared nodes without duplicates', () => {
      // Make grandchild shared between child1 and child2
      child2.nextRooms[0] = grandchild.id;
      child2.children.push(grandchild);
      
      const nodes = traverseGraph(root);
      expect(nodes.size).toBe(4); // Still 4 unique nodes
    });

    it('should handle empty trees', () => {
      const single = new MapNode(1, 0, 1, false);
      const nodes = traverseGraph(single);
      expect(nodes.size).toBe(1);
    });
  });

  describe('findNodeById', () => {
    it('should find existing nodes', () => {
      const node = findNodeById(root, 3);
      expect(node).toBe(child2);
    });

    it('should return null for non-existent nodes', () => {
      const node = findNodeById(root, 999);
      expect(node).toBeNull();
    });

    it('should find the root node', () => {
      const node = findNodeById(root, 1);
      expect(node).toBe(root);
    });
  });

  describe('addChildNode', () => {
    it('should add a new child', () => {
      const newChild = new MapNode(5, 2, 3, false);
      const result = addChildNode(child2, newChild);
      
      expect(result).toBe(true);
      expect(child2.nextRooms.includes(5)).toBe(true);
      expect(child2.children.includes(newChild)).toBe(true);
    });

    it('should not add duplicate children', () => {
      const result = addChildNode(root, child1);
      expect(result).toBe(false);
      expect(root.nextRooms.filter(id => id === 2).length).toBe(1);
    });

    it('should not exceed 4 children', () => {
      const parent = new MapNode(10, 0, 3, false);
      for (let i = 1; i <= 4; i++) {
        const child = new MapNode(10 + i, 1, 3, false);
        addChildNode(parent, child);
      }
      
      const fifthChild = new MapNode(15, 1, 3, false);
      const result = addChildNode(parent, fifthChild);
      expect(result).toBe(false);
    });
  });

  describe('removeChildNode', () => {
    it('should remove an existing child', () => {
      const result = removeChildNode(root, child1.id);
      
      expect(result).toBe(true);
      expect(root.nextRooms[0]).toBe(0);
      expect(root.children.includes(child1)).toBe(false);
    });

    it('should return false for non-child nodes', () => {
      const result = removeChildNode(root, 999);
      expect(result).toBe(false);
    });

    it('should handle removing shared children', () => {
      // Share grandchild
      child2.nextRooms[0] = grandchild.id;
      child2.children.push(grandchild);
      
      const result1 = removeChildNode(child1, grandchild.id);
      expect(result1).toBe(true);
      expect(child1.nextRooms[0]).toBe(0);
      
      // Should still be in child2
      expect(child2.nextRooms[0]).toBe(grandchild.id);
    });
  });

  describe('findMaxDepth', () => {
    it('should find maximum depth in tree', () => {
      const maxDepth = findMaxDepth(root);
      expect(maxDepth).toBe(2);
    });

    it('should handle single node', () => {
      const single = new MapNode(1, 0, 1, false);
      const maxDepth = findMaxDepth(single);
      expect(maxDepth).toBe(0);
    });
  });

  describe('findMaxId', () => {
    it('should find maximum ID in tree', () => {
      const maxId = findMaxId(root);
      expect(maxId).toBe(4);
    });

    it('should handle single node', () => {
      const single = new MapNode(99, 0, 1, false);
      const maxId = findMaxId(single);
      expect(maxId).toBe(99);
    });
  });

  describe('calculateNodePositions', () => {
    it('should assign positions to all nodes', () => {
      calculateNodePositions(root);
      
      expect(root.x).toBeDefined();
      expect(root.y).toBeDefined();
      expect(child1.x).toBeDefined();
      expect(child1.y).toBeDefined();
      expect(child2.x).toBeDefined();
      expect(child2.y).toBeDefined();
    });

    it('should position children below parents', () => {
      calculateNodePositions(root);
      
      expect(child1.y).toBeGreaterThan(root.y);
      expect(child2.y).toBeGreaterThan(root.y);
      expect(grandchild.y).toBeGreaterThan(child1.y);
    });

    it('should space siblings horizontally', () => {
      calculateNodePositions(root);
      
      expect(child1.x).not.toBe(child2.x);
      expect(Math.abs(child1.x - child2.x)).toBeGreaterThanOrEqual(140);
    });

    it('should handle shared nodes', () => {
      // Share grandchild
      child2.nextRooms[0] = grandchild.id;
      child2.children.push(grandchild);
      
      calculateNodePositions(root);
      
      // Shared node should have one position between parents
      expect(grandchild.x).toBeDefined();
      expect(grandchild.y).toBeDefined();
    });
  });
});