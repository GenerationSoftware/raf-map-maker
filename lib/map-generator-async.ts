import { generateMap, NodeIdCounter } from './map-generator';
import { MapNode } from './types';
import { getMonsters } from './monsters';

/**
 * Generate a map with monsters fetched from GraphQL
 * This is the async wrapper that fetches monster data and then generates the map
 */
export async function generateMapWithMonsters(maxDepth: number): Promise<{ root: MapNode; nodeIdCounter: NodeIdCounter }> {
  try {
    // Fetch available monsters from GraphQL
    const monsters = await getMonsters();
    const availableMonsterIndices = monsters.map(monster => monster.index);
    
    // Generate map with the available monster indices
    return generateMap(maxDepth, availableMonsterIndices);
  } catch (error) {
    console.error('Error fetching monsters, using fallback indices:', error);
    // Fallback to default monster indices if GraphQL fails
    return generateMap(maxDepth, [0, 1, 2, 3]);
  }
}