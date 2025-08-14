import { MapNode, RoomType } from '../types';
import { createGoalNode, createBattleNode } from '../map-generator';
import { MapValidator } from '../validator';

describe('UI Integration Tests', () => {
  describe('Node Creation Functions', () => {
    it('should create nodes with correct nextRooms array length', () => {
      // Test direct MapNode constructor
      const directNode = new MapNode(1, 0, 3, false, 0);
      expect(directNode.nextRooms).toHaveLength(6);
      expect(directNode.nextRooms).toEqual([0, 0, 0, 0, 0, 0]);

      // Test createGoalNode function
      const goalNode = createGoalNode(1, 2, 3);
      expect(goalNode.nextRooms).toHaveLength(6);
      expect(goalNode.nextRooms).toEqual([0, 0, 0, 0, 0, 0]);

      // Test createBattleNode function
      const battleNode = createBattleNode(1, 3, 3, 1);
      expect(battleNode.nextRooms).toHaveLength(6);
      expect(battleNode.nextRooms).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('should create nodes that pass validation', () => {
      const validator = new MapValidator();

      // Test single GOAL node (needs to be root with ID 1)
      const goalNode = createGoalNode(0, 1, 1); // depth 0, id 1, maxDepth 1
      goalNode.roomType = RoomType.NULL; // Root should be NULL type
      goalNode.monsterIndex1 = 0;
      const goalData = goalNode.toJSON();
      expect(validator.validate([goalData])).toBe(true);

      // Test BATTLE node with child (needs sequential IDs starting from 1)
      const rootBattle = createBattleNode(0, 1, 2, 1); // Root battle node
      rootBattle.roomType = RoomType.BATTLE;
      const childGoal = createGoalNode(1, 2, 2); // Child goal node
      
      rootBattle.nextRooms[0] = childGoal.id;
      rootBattle.children = [childGoal];
      
      const battleData = rootBattle.toJSON();
      const childData = childGoal.toJSON();
      
      const isValid = validator.validate([battleData, childData]);
      if (!isValid) {
        console.error('Validation errors:', validator.getErrors());
      }
      expect(isValid).toBe(true);
    });

    it('should simulate UI addNewNode functionality', () => {
      // Simulate what the UI addNewNode function does
      const parentNode = new MapNode(1, 0, 3, false, 1);
      parentNode.roomType = RoomType.BATTLE;
      
      // Simulate creating a new GOAL node (like addNewNode does)
      const newNode = new MapNode(2, parentNode.depth + 1, 3, false);
      newNode.roomType = RoomType.GOAL;
      newNode.monsterIndex1 = 0;
      newNode.parent = parentNode;
      newNode.nextRooms = [0, 0, 0, 0, 0, 0]; // This should be 6 elements
      newNode.children = [];
      
      // Verify the created node is valid
      expect(newNode.nextRooms).toHaveLength(6);
      
      // Test serialization and validation
      parentNode.children.push(newNode);
      parentNode.nextRooms[0] = newNode.id;
      
      const validator = new MapValidator();
      const parentData = parentNode.toJSON();
      const childData = newNode.toJSON();
      
      expect(validator.validate([parentData, childData])).toBe(true);
      
      if (!validator.validate([parentData, childData])) {
        console.error('Validation errors:', validator.getErrors());
      }
    });
  });
});