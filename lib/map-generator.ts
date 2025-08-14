import { MapNode, RoomType } from './types';

export interface NodeIdCounter {
  value: number;
}

/**
 * Generate a complete map with the given max depth and available monster indices
 */
export function generateMap(maxDepth: number, availableMonsterIndices: number[] = [0, 1, 2, 3]): { root: MapNode; nodeIdCounter: NodeIdCounter } {
  const nodeIdCounter: NodeIdCounter = { value: 1 };
  const root = new MapNode(nodeIdCounter.value++, 0, maxDepth, true, 0); // Root node has no monster
  const result = root.generateChildren(maxDepth, nodeIdCounter, undefined, availableMonsterIndices);
  nodeIdCounter.value = result.value;
  return { root, nodeIdCounter };
}

/**
 * Create a new GOAL node
 */
export function createGoalNode(parentDepth: number, nodeId: number, maxDepth: number): MapNode {
  const node = new MapNode(nodeId, parentDepth + 1, maxDepth, false);
  node.roomType = RoomType.GOAL;
  node.monsterIndex1 = 0;
  node.nextRooms = [0, 0, 0, 0, 0, 0];
  node.children = [];
  return node;
}

/**
 * Create a new BATTLE node
 */
export function createBattleNode(parentDepth: number, nodeId: number, maxDepth: number, monsterIndex: number = 1): MapNode {
  const node = new MapNode(nodeId, parentDepth + 1, maxDepth, false);
  node.roomType = RoomType.BATTLE;
  node.monsterIndex1 = monsterIndex;
  node.nextRooms = [0, 0, 0, 0, 0, 0];
  node.children = [];
  return node;
}