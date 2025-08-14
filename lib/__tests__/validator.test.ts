import { MapValidator } from '../validator';
import { RoomType } from '../types';

describe('MapValidator', () => {
  let validator: MapValidator;

  beforeEach(() => {
    validator = new MapValidator();
  });

  describe('validate', () => {
    it('should accept valid map data', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 0,
          nextRooms: [2, 3, 0, 0, 0, 0]
        },
        {
          id: 2,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        },
        {
          id: 3,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(true);
      expect(validator.getErrors()).toEqual([]);
    });

    it('should reject duplicate node IDs', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 0,
          nextRooms: [0, 0, 0, 0, 0, 0]
        },
        {
          id: 1, // Duplicate ID
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors()).toContain('Duplicate node ID found: 1');
    });

    it('should reject non-sequential IDs', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 0,
          nextRooms: [3, 0, 0, 0, 0, 0, 0]
        },
        {
          id: 3, // Skipped ID 2
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors().some(e => e.includes('Missing ID: 2'))).toBe(true);
    });

    it('should reject invalid room types', () => {
      const data = [
        {
          id: 1,
          roomType: 99, // Invalid room type
          monsterIndex1: 0,
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors().some(e => e.includes('roomType must be'))).toBe(true);
    });

    it('should require monster for BATTLE rooms', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: null, // Should have a monster
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors().some(e => e.includes('BATTLE rooms must have monsterIndex1 as a number'))).toBe(true);
    });

    it('should require null monster for GOAL rooms', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.GOAL,
          monsterIndex1: 0, // Should be null
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors().some(e => e.includes('GOAL rooms must have monsterIndex1 = null'))).toBe(true);
    });

    it('should reject GOAL rooms with children', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [2, 0, 0, 0, 0, 0] // Should have no children
        },
        {
          id: 2,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors().some(e => e.includes('GOAL rooms must have no children'))).toBe(true);
    });

    it('should reject BATTLE rooms without children', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 0,
          nextRooms: [0, 0, 0, 0, 0, 0] // Should have children
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors().some(e => e.includes('BATTLE rooms should have children'))).toBe(true);
    });

    it('should allow max 6 children for BATTLE rooms', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 0,
          nextRooms: [2, 3, 4, 5, 6, 7] // 6 children, which should be max allowed
        },
        {
          id: 2,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        },
        {
          id: 3,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        },
        {
          id: 4,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        },
        {
          id: 5,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        },
        {
          id: 6,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        },
        {
          id: 7,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(true);
    });

    it('should validate nextRooms array structure', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 0,
          nextRooms: [2, 0, 0] // Wrong length, should be 6
        },
        {
          id: 2,
          roomType: RoomType.GOAL,
          monsterIndex1: null,
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors().some(e => e.includes('nextRooms must be an array of exactly 6 elements'))).toBe(true);
    });

    it('should reject non-existent child references', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 0,
          nextRooms: [999, 0, 0, 0, 0, 0, 0] // References non-existent node
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      expect(validator.getErrors().some(e => e.includes('references non-existent child 999'))).toBe(true);
    });

    it('should require exactly one root node', () => {
      const data = [
        {
          id: 1,
          roomType: RoomType.BATTLE,
          monsterIndex1: 0,
          nextRooms: [0, 0, 0, 0, 0, 0]
        },
        {
          id: 2,
          roomType: RoomType.BATTLE,
          monsterIndex1: 3,
          nextRooms: [0, 0, 0, 0, 0, 0]
        }
      ];

      const result = validator.validate(data);
      expect(result).toBe(false);
      // Two independent nodes means 2 roots
      expect(validator.getErrors().some(e => e.includes('Map must have exactly one root node'))).toBe(true);
    });
  });

  describe('getErrors', () => {
    it('should return empty array when no errors', () => {
      expect(validator.getErrors()).toEqual([]);
    });

    it('should accumulate multiple errors', () => {
      const data = [
        {
          id: 2, // Should start at 1
          roomType: 99, // Invalid
          monsterIndex1: 99999, // Invalid monster index
          nextRooms: [0, 0, 0] // Wrong length, should be 6
        }
      ];

      validator.validate(data);
      const errors = validator.getErrors();
      expect(errors.length).toBeGreaterThan(1);
    });
  });
});