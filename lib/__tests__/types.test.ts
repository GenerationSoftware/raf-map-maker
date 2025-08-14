import { MapNode, RoomType } from '../types';

describe('MapNode', () => {
  describe('constructor', () => {
    it('should create a BATTLE node at depth 0', () => {
      const node = new MapNode(1, 0, 3, false);
      expect(node.id).toBe(1);
      expect(node.depth).toBe(0);
      expect(node.roomType).toBe(RoomType.BATTLE);
      expect(node.nextRooms).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(node.children).toEqual([]);
      expect(node.parent).toBeNull();
    });

    it('should create a GOAL node at max depth', () => {
      const node = new MapNode(1, 3, 3, false);
      expect(node.roomType).toBe(RoomType.GOAL);
      expect(node.monsterIndex1).toBe(0);
    });
  });

  describe('generateChildren', () => {
    it('should generate children for non-penultimate nodes', () => {
      const root = new MapNode(1, 0, 3, true);
      const nodeIdCounter = { value: 2 };
      const result = root.generateChildren(3, nodeIdCounter);
      
      expect(root.children.length).toBeGreaterThan(0);
      expect(root.children.length).toBeLessThanOrEqual(4);
      expect(result.value).toBeGreaterThan(2);
    });

    it('should create shared GOAL node for penultimate nodes', () => {
      const node1 = new MapNode(1, 2, 3, false);
      const node2 = new MapNode(2, 2, 3, false);
      const nodeIdCounter = { value: 3 };
      
      const result1 = node1.generateChildren(3, nodeIdCounter);
      const result2 = node2.generateChildren(3, nodeIdCounter, result1.goalNode);
      
      // Both should reference the same GOAL node
      expect(node1.nextRooms[0]).toBe(node2.nextRooms[0]);
      expect(result1.goalNode).toBe(result2.goalNode);
    });

    it('should not generate children for GOAL nodes', () => {
      const node = new MapNode(1, 3, 3, false);
      const nodeIdCounter = { value: 2 };
      const result = node.generateChildren(3, nodeIdCounter);
      
      expect(node.children).toEqual([]);
      expect(node.roomType).toBe(RoomType.GOAL);
      expect(result.value).toBe(2);
    });
  });

  describe('toJSON', () => {
    it('should serialize a BATTLE node correctly', () => {
      const node = new MapNode(1, 0, 3, false);
      node.roomType = RoomType.BATTLE;
      node.monsterIndex1 = 2;
      node.nextRooms = [2, 3, 0, 0, 0, 0, 0];
      
      const json = node.toJSON();
      expect(json.id).toBe(1);
      expect(json.roomType).toBe(RoomType.BATTLE);
      expect(json.monsterIndex1).toBe('THICC_GOBLIN');
      expect(json.nextRooms).toEqual([2, 3, 0, 0, 0, 0, 0]);
    });

    it('should serialize a GOAL node with null monster', () => {
      const node = new MapNode(1, 3, 3, false);
      node.roomType = RoomType.GOAL;
      
      const json = node.toJSON();
      expect(json.monsterIndex1).toBeNull();
    });
  });

  describe('toFlatJSON', () => {
    it('should export all nodes without duplicates', () => {
      const root = new MapNode(1, 0, 2, true);
      const nodeIdCounter = { value: 2 };
      root.generateChildren(2, nodeIdCounter);
      
      const flatJson = root.toFlatJSON();
      const ids = flatJson.map(n => n.id);
      const uniqueIds = new Set(ids);
      
      // No duplicates
      expect(ids.length).toBe(uniqueIds.size);
      
      // Sorted by ID
      const sortedIds = [...ids].sort((a, b) => a - b);
      expect(ids).toEqual(sortedIds);
    });

    it('should handle shared nodes correctly', () => {
      const root = new MapNode(1, 0, 3, false);
      const child1 = new MapNode(2, 1, 3, false);
      const shared = new MapNode(3, 2, 3, false);
      
      root.nextRooms[0] = child1.id;
      root.children.push(child1);
      
      child1.nextRooms[0] = shared.id;
      child1.children.push(shared);
      
      const flatJson = root.toFlatJSON();
      expect(flatJson.length).toBe(3);
      expect(flatJson.map(n => n.id)).toEqual([1, 2, 3]);
    });
  });

  describe('fromFlatJSON', () => {
    it('should reconstruct a tree from flat JSON', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 'GOBLIN',
          nextRooms: [2, 3, 0, 0, 0, 0, 0]
        },
        {
          id: 2,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0, 0]
        },
        {
          id: 3,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0, 0]
        }
      ];
      
      const root = MapNode.fromFlatJSON(data);
      expect(root).not.toBeNull();
      expect(root!.id).toBe(1);
      expect(root!.children.length).toBe(2);
      expect(root!.nextRooms).toEqual([2, 3, 0, 0, 0, 0, 0]);
    });

    it('should handle empty data', () => {
      const root = MapNode.fromFlatJSON([]);
      expect(root).toBeNull();
    });
  });
});