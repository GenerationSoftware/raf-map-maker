import { generateMap, NodeIdCounter } from './map-generator';
import { MapNode } from './types';
import { getMonsters } from './monsters';

/**
 * Generate a map with monsters fetched from GraphQL
 * This is the async wrapper that fetches monster data and then generates the map
 */
export async function generateMapWithMonsters(maxDepth: number): Promise<{ root: MapNode; nodeIdCounter: NodeIdCounter }> {
  // Fetch available monsters from GraphQL
  const monsters = await getMonsters();
  const availableMonsterIndices = monsters.map(monster => monster.index);
  
  if (availableMonsterIndices.length === 0) {
    throw new Error('No monsters available from GraphQL');
  }
  
  // Generate map with the available monster indices
  return generateMap(maxDepth, availableMonsterIndices);
}