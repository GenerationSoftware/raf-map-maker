// Monster types are now fetched dynamically from GraphQL
// This type is kept for backward compatibility but not used

export enum RoomType {
  NULL = 0,
  BATTLE = 1,
  GOAL = 2
}

export interface BattleRoomData {
  monsterIndex1: number;  // Monster index (16-bit unsigned integer)
}

export interface MapNodeData {
  id: number;
  roomType: number;  // Using integer enum values: 0=NULL, 1=BATTLE, 2=GOAL
  roomData: BattleRoomData | null;  // Room-specific data, null for NULL/GOAL rooms
  nextRooms: number[];  // Array of 6 room IDs
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

  constructor(id: number, depth: number, maxDepth: number, isRoot: boolean = false, monsterIndex: number = 0) {
    this.id = id;
    this.depth = depth;
    this.roomType = (depth >= maxDepth) ? RoomType.GOAL : RoomType.BATTLE;
    this.monsterIndex1 = this.roomType === RoomType.GOAL ? 0 : monsterIndex;
    this.nextRooms = new Array(6).fill(0);
    this.children = [];
    this.parent = null;
    this.x = 0;
    this.y = 0;
  }


  generateChildren(maxDepth: number, nodeIdCounter: { value: number }, sharedGoalNode?: MapNode, availableMonsterIndices: number[] = [0, 1, 2, 3]): { value: number; goalNode?: MapNode } {
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
        const monsterIndex = this.getRandomMonsterIndexForDepth(this.depth + 1, maxDepth, availableMonsterIndices);
        const child = new MapNode(nodeIdCounter.value++, this.depth + 1, maxDepth, false, monsterIndex);
        child.parent = this;
        this.children.push(child);
        this.nextRooms[i] = child.id;
        const result = child.generateChildren(maxDepth, nodeIdCounter, goalNode, availableMonsterIndices);
        nodeIdCounter.value = result.value;
        if (result.goalNode) {
          goalNode = result.goalNode;
        }
      }
      return { value: nodeIdCounter.value, goalNode };
    }
  }

  private getRandomMonsterIndexForDepth(depth: number, maxDepth: number, availableIndices: number[]): number {
    if (availableIndices.length === 0) return 0;
    
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
    if (totalWeight === 0) return availableIndices[0];
    
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

  toJSON(): MapNodeData {
    return {
      id: this.id,
      roomType: this.roomType,
      roomData: this.roomType === RoomType.BATTLE ? { monsterIndex1: this.monsterIndex1 } : null,
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
    
    // Extract monster index from roomData if it's a BATTLE room
    if (data.roomType === RoomType.BATTLE && data.roomData && 'monsterIndex1' in data.roomData) {
      node.monsterIndex1 = data.roomData.monsterIndex1;
    } else {
      node.monsterIndex1 = 0;
    }
    
    node.nextRooms = data.nextRooms ? [...data.nextRooms] : new Array(6).fill(0);
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