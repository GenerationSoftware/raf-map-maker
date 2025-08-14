import { fetchMonsters, Monster } from './graphql/client';

export interface MonsterData {
  index: number;
  name: string;
  health: number;
  characterAddress: string;
}

// Cache for monster data
let monsterCache: MonsterData[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all monsters with caching
 */
export async function getMonsters(): Promise<MonsterData[]> {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (monsterCache && (now - lastFetchTime < CACHE_DURATION)) {
    return monsterCache;
  }
  
  const monsters = await fetchMonsters();
  
  // Convert GraphQL response to our format - use indices as-is
  monsterCache = monsters.map(monster => ({
    index: parseInt(monster.index),
    name: monster.character.name,
    health: parseInt(monster.health),
    characterAddress: monster.characterAddress,
  })).sort((a, b) => a.index - b.index); // Sort by index
  
  lastFetchTime = now;
  return monsterCache;
}

/**
 * Get monster by index
 */
export async function getMonsterByIndex(index: number): Promise<MonsterData | null> {
  const monsters = await getMonsters();
  return monsters.find(monster => monster.index === index) || null;
}

/**
 * Get monster name by index
 */
export async function getMonsterName(index: number): Promise<string> {
  const monster = await getMonsterByIndex(index);
  return monster?.name || 'Unknown';
}

/**
 * Get all monster names indexed by their index
 */
export async function getMonsterNames(): Promise<{ [key: number]: string }> {
  const monsters = await getMonsters();
  const names: { [key: number]: string } = {};
  
  monsters.forEach(monster => {
    names[monster.index] = monster.name;
  });
  
  return names;
}

/**
 * Get the total number of available monsters
 */
export async function getMonsterCount(): Promise<number> {
  const monsters = await getMonsters();
  return monsters.length;
}

/**
 * Validate if a monster index exists
 */
export async function isValidMonsterIndex(index: number): Promise<boolean> {
  const monsters = await getMonsters();
  return monsters.some(monster => monster.index === index);
}

/**
 * Get a random monster index weighted by depth (for map generation)
 */
export async function getRandomMonsterIndex(depth: number, maxDepth: number): Promise<number> {
  const monsters = await getMonsters();
  const availableIndices = monsters.map(m => m.index);
  
  if (availableIndices.length === 0) {
    throw new Error('No monsters available from GraphQL');
  }
  
  const depthRatio = depth / Math.max(maxDepth, 1);
  
  // Weight distribution based on depth (similar to original logic)
  let weights: number[];
  if (depthRatio <= 0.25) {
    weights = [70, 20, 8, 2]; // Favor easier monsters
  } else if (depthRatio <= 0.5) {
    weights = [40, 35, 20, 5];
  } else if (depthRatio <= 0.75) {
    weights = [15, 30, 35, 20];
  } else {
    weights = [5, 15, 35, 45]; // Favor harder monsters
  }
  
  // Ensure we don't have more weights than available monsters
  while (weights.length > availableIndices.length) {
    weights.pop();
  }
  
  // Fill missing weights with 0
  while (weights.length < availableIndices.length) {
    weights.push(0);
  }
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return availableIndices[i];
    }
  }
  
  // Fallback to first available index
  return availableIndices[0];
}