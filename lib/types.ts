export type MonsterType = 'GOBLIN' | 'THICC_GOBLIN' | 'TROLL' | 'ORC';
export type RoomType = 'BATTLE' | 'GOAL';

export interface MapNodeData {
  id: number;
  roomType: RoomType;
  monsterIndex1: number;
  nextRooms: number[];
}

export class MapNode {
  id: number;
  depth: number;
  roomType: RoomType;
  doorCount: number;
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
    this.roomType = (depth >= maxDepth) ? 'GOAL' : 'BATTLE';
    this.doorCount = this.roomType === 'GOAL' ? 0 : Math.floor(Math.random() * 4) + 1;
    this.monsterIndex1 = this.roomType === 'GOAL' ? 0 : this.getRandomMonsterIndex(depth, maxDepth);
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

  generateChildren(maxDepth: number, nodeIdCounter: { value: number }): { value: number } {
    if (this.depth >= maxDepth || this.roomType === 'GOAL') {
      this.doorCount = 0;
      this.children = [];
      this.roomType = 'GOAL';
      this.monsterIndex1 = 0;
      return nodeIdCounter;
    }

    this.children = [];
    for (let i = 0; i < this.doorCount; i++) {
      const child = new MapNode(nodeIdCounter.value++, this.depth + 1, maxDepth, false);
      child.parent = this;
      this.children.push(child);
      this.nextRooms[i] = child.id;
      nodeIdCounter = child.generateChildren(maxDepth, nodeIdCounter);
    }
    return nodeIdCounter;
  }

  updateDoorCount(newCount: number, maxDepth: number, nodeIdCounter: { value: number }): { value: number } {
    if (this.roomType === 'GOAL') return nodeIdCounter;
    
    this.doorCount = newCount;
    
    if (this.depth >= maxDepth) {
      this.doorCount = 0;
      this.children = [];
      this.roomType = 'GOAL';
      this.monsterIndex1 = 0;
      return nodeIdCounter;
    }

    while (this.children.length > newCount) {
      const removed = this.children.pop();
      if (removed) {
        const index = this.nextRooms.indexOf(removed.id);
        if (index >= 0) this.nextRooms[index] = 0;
      }
    }

    while (this.children.length < newCount) {
      const child = new MapNode(nodeIdCounter.value++, this.depth + 1, maxDepth, false);
      child.parent = this;
      this.children.push(child);
      this.nextRooms[this.children.length - 1] = child.id;
      nodeIdCounter = child.generateChildren(maxDepth, nodeIdCounter);
    }

    return nodeIdCounter;
  }

  toJSON(): MapNodeData {
    return {
      id: this.id,
      roomType: this.roomType,
      monsterIndex1: this.monsterIndex1,
      nextRooms: [...this.nextRooms]
    };
  }

  toFlatJSON(): MapNodeData[] {
    const result: MapNodeData[] = [this.toJSON()];
    for (const child of this.children) {
      result.push(...child.toFlatJSON());
    }
    return result;
  }

  static fromJSON(data: MapNodeData, parent: MapNode | null = null, depth: number = 0): MapNode {
    const node = new MapNode(data.id, depth, 0, false);
    node.roomType = data.roomType;
    node.doorCount = data.nextRooms.filter(id => id > 0).length;
    node.monsterIndex1 = data.monsterIndex1;
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