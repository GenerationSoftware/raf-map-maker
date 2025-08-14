export type MonsterType = 'GOBLIN' | 'THICC_GOBLIN' | 'TROLL' | 'ORC';

export enum RoomType {
  NULL = 0,
  ROOT = 1,  // Not used anymore but kept for enum consistency
  BATTLE = 2,
  GOAL = 3
}

export interface MapNodeData {
  id: number;
  roomType: number;  // Using integer enum values: 0=NULL, 2=BATTLE, 3=GOAL
  monsterIndex1: string | null;  // Monster type string or null
  nextRooms: number[];  // Array of 7 room IDs
}

export class MapNode {
  id: number;
  depth: number;
  roomType: RoomType;
  monsterIndex1: number;
  nextRooms: number[];
  children: MapNode[];
  parent: MapNode | null;
  x: number;
  y: number;
  subtreeWidth?: number;

  constructor(id: number, depth: number, maxDepth: number, isRoot: boolean = false) {
    this.id = id;
    this.depth = depth;
    this.roomType = (depth >= maxDepth) ? RoomType.GOAL : RoomType.BATTLE;
    this.monsterIndex1 = this.roomType === RoomType.GOAL ? 0 : this.getRandomMonsterIndex(depth, maxDepth);
    this.nextRooms = new Array(7).fill(0);
    this.children = [];
    this.parent = null;
    this.x = 0;
    this.y = 0;
  }

  getRandomMonsterIndex(depth: number, maxDepth: number): number {
    const depthRatio = depth / Math.max(maxDepth, 1);
    
    if (depthRatio <= 0.25) {
      const weights = [70, 20, 8, 2];
      return this.weightedRandomIndex(weights);
    }
    else if (depthRatio <= 0.5) {
      const weights = [40, 35, 20, 5];
      return this.weightedRandomIndex(weights);
    }
    else if (depthRatio <= 0.75) {
      const weights = [15, 30, 35, 20];
      return this.weightedRandomIndex(weights);
    }
    else {
      const weights = [5, 15, 35, 45];
      return this.weightedRandomIndex(weights);
    }
  }

  weightedRandomIndex(weights: number[]): number {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return i + 1;
      }
    }
    return weights.length;
  }

  generateChildren(maxDepth: number, nodeIdCounter: { value: number }, sharedGoalNode?: MapNode): { value: number; goalNode?: MapNode } {
    if (this.depth >= maxDepth || this.roomType === RoomType.GOAL) {
      this.children = [];
      this.roomType = RoomType.GOAL;
      this.monsterIndex1 = 0;
      return { value: nodeIdCounter.value };
    }

    this.children = [];
    let goalNode = sharedGoalNode;
    
    // Check if this is a penultimate node (depth = maxDepth - 1)
    const isPenultimate = this.depth === maxDepth - 1;
    
    if (isPenultimate) {
      // Penultimate nodes all share a single GOAL node
      if (!goalNode) {
        // Create the shared GOAL node if it doesn't exist
        goalNode = new MapNode(nodeIdCounter.value++, this.depth + 1, maxDepth, false);
        goalNode.roomType = RoomType.GOAL;
        goalNode.monsterIndex1 = 0;
      }
      
      // Penultimate nodes have only one connection to the shared GOAL node
      this.nextRooms[0] = goalNode.id;
      this.children = [goalNode]; // Store reference for tree traversal
      
      return { value: nodeIdCounter.value, goalNode };
    } else {
      // Non-penultimate nodes generate normal children
      const numChildren = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < numChildren; i++) {
        const child = new MapNode(nodeIdCounter.value++, this.depth + 1, maxDepth, false);
        child.parent = this;
        this.children.push(child);
        this.nextRooms[i] = child.id;
        const result = child.generateChildren(maxDepth, nodeIdCounter, goalNode);
        nodeIdCounter.value = result.value;
        if (result.goalNode) {
          goalNode = result.goalNode;
        }
      }
      return { value: nodeIdCounter.value, goalNode };
    }
  }


  toJSON(): MapNodeData {
    const monsters = ['', 'GOBLIN', 'THICC_GOBLIN', 'TROLL', 'ORC'];
    return {
      id: this.id,
      roomType: this.roomType,
      monsterIndex1: (this.roomType === RoomType.NULL || this.roomType === RoomType.GOAL) ? null : monsters[this.monsterIndex1] || null,
      nextRooms: [...this.nextRooms]
    };
  }

  toFlatJSON(): MapNodeData[] {
    const result: MapNodeData[] = [];
    const visited = new Set<number>();
    const queue: MapNode[] = [this];
    const nodeMap = new Map<number, MapNode>();
    
    // BFS to collect all nodes
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      
      visited.add(node.id);
      nodeMap.set(node.id, node);
      
      // Add children to queue based on nextRooms to follow actual connections
      for (const childId of node.nextRooms) {
        if (childId > 0) {
          const child = node.children.find(c => c.id === childId);
          if (child && !visited.has(child.id)) {
            queue.push(child);
          }
        }
      }
    }
    
    // Create ID mapping to ensure sequential IDs
    const oldToNew = new Map<number, number>();
    const sortedNodes = Array.from(nodeMap.values()).sort((a, b) => a.id - b.id);
    sortedNodes.forEach((node, index) => {
      oldToNew.set(node.id, index + 1);
    });
    
    // Export with remapped IDs
    for (const node of sortedNodes) {
      const data = node.toJSON();
      data.id = oldToNew.get(node.id)!;
      
      // Remap nextRooms IDs
      data.nextRooms = node.nextRooms.map(childId => 
        childId > 0 ? (oldToNew.get(childId) || 0) : 0
      );
      
      result.push(data);
    }
    
    return result;
  }

  static fromJSON(data: MapNodeData, parent: MapNode | null = null, depth: number = 0): MapNode {
    const node = new MapNode(data.id, depth, 0, false);
    node.roomType = data.roomType;
    
    // Convert monster string back to index
    if (data.monsterIndex1 === null) {
      node.monsterIndex1 = 0;
    } else {
      const monsters = ['', 'GOBLIN', 'THICC_GOBLIN', 'TROLL', 'ORC'];
      node.monsterIndex1 = monsters.indexOf(data.monsterIndex1);
      if (node.monsterIndex1 === -1) node.monsterIndex1 = 1; // Default to GOBLIN if unknown
    }
    
    node.nextRooms = data.nextRooms ? [...data.nextRooms] : new Array(7).fill(0);
    node.parent = parent;
    node.children = [];
    return node;
  }

  static fromFlatJSON(dataArray: MapNodeData[]): MapNode | null {
    if (!dataArray || dataArray.length === 0) return null;
    
    const nodeMap = new Map<number, MapNode>();
    const childrenMap = new Map<number, number[]>();
    
    // First pass: identify parent-child relationships
    for (const data of dataArray) {
      const childIds = data.nextRooms.filter(id => id > 0);
      if (childIds.length > 0) {
        childrenMap.set(data.id, childIds);
      }
    }
    
    // Find root (node that is not a child of any other node)
    const allChildIds = new Set<number>();
    for (const children of childrenMap.values()) {
      children.forEach(id => allChildIds.add(id));
    }
    
    const rootData = dataArray.find(n => !allChildIds.has(n.id));
    if (!rootData) return null;
    
    // Build tree recursively
    const buildNode = (data: MapNodeData, depth: number): MapNode => {
      const node = MapNode.fromJSON(data, null, depth);
      nodeMap.set(node.id, node);
      
      const childIds = data.nextRooms.filter(id => id > 0);
      for (const childId of childIds) {
        const childData = dataArray.find(n => n.id === childId);
        if (childData) {
          const child = buildNode(childData, depth + 1);
          child.parent = node;
          node.children.push(child);
        }
      }
      
      return node;
    };
    
    return buildNode(rootData, 0);
  }
}