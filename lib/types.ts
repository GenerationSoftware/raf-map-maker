export type MonsterType = 'GOBLIN' | 'THICC_GOBLIN' | 'TROLL' | 'ORC';
export type RoomType = 'ROOT' | 'MONSTER';

export interface MapNodeData {
  id: number;
  depth: number;
  roomType: RoomType;
  doorCount: number;
  monsterIndex1: MonsterType | null;
  children: MapNodeData[];
}

export class MapNode {
  id: number;
  depth: number;
  roomType: RoomType;
  doorCount: number;
  monsterIndex1: MonsterType | null;
  children: MapNode[];
  parent: MapNode | null;
  x: number;
  y: number;
  subtreeWidth?: number;

  constructor(id: number, depth: number, maxDepth: number, isRoot: boolean = false) {
    this.id = id;
    this.depth = depth;
    this.roomType = isRoot ? 'ROOT' : 'MONSTER';
    this.doorCount = Math.floor(Math.random() * 4) + 1;
    this.monsterIndex1 = isRoot ? null : this.getRandomMonster(depth, maxDepth);
    this.children = [];
    this.parent = null;
    this.x = 0;
    this.y = 0;
  }

  getRandomMonster(depth: number, maxDepth: number): MonsterType {
    const monsters: MonsterType[] = ['GOBLIN', 'THICC_GOBLIN', 'TROLL', 'ORC'];
    
    const depthRatio = depth / Math.max(maxDepth, 1);
    
    if (depthRatio <= 0.25) {
      const weights = [70, 20, 8, 2];
      return this.weightedRandom(monsters, weights);
    }
    else if (depthRatio <= 0.5) {
      const weights = [40, 35, 20, 5];
      return this.weightedRandom(monsters, weights);
    }
    else if (depthRatio <= 0.75) {
      const weights = [15, 30, 35, 20];
      return this.weightedRandom(monsters, weights);
    }
    else {
      const weights = [5, 15, 35, 45];
      return this.weightedRandom(monsters, weights);
    }
  }

  weightedRandom(items: MonsterType[], weights: number[]): MonsterType {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    return items[items.length - 1];
  }

  generateChildren(maxDepth: number, nodeIdCounter: { value: number }): { value: number } {
    if (this.depth >= maxDepth) {
      this.doorCount = 0;
      this.children = [];
      return nodeIdCounter;
    }

    this.children = [];
    for (let i = 0; i < this.doorCount; i++) {
      const child = new MapNode(nodeIdCounter.value++, this.depth + 1, maxDepth, false);
      child.parent = this;
      this.children.push(child);
      nodeIdCounter = child.generateChildren(maxDepth, nodeIdCounter);
    }
    return nodeIdCounter;
  }

  updateDoorCount(newCount: number, maxDepth: number, nodeIdCounter: { value: number }): { value: number } {
    this.doorCount = newCount;
    
    if (this.depth >= maxDepth) {
      this.doorCount = 0;
      this.children = [];
      return nodeIdCounter;
    }

    while (this.children.length > newCount) {
      this.children.pop();
    }

    while (this.children.length < newCount) {
      const child = new MapNode(nodeIdCounter.value++, this.depth + 1, maxDepth, false);
      child.parent = this;
      this.children.push(child);
      nodeIdCounter = child.generateChildren(maxDepth, nodeIdCounter);
    }

    return nodeIdCounter;
  }

  toJSON(): MapNodeData {
    return {
      id: this.id,
      depth: this.depth,
      roomType: this.roomType,
      doorCount: this.doorCount,
      monsterIndex1: this.monsterIndex1,
      children: this.children.map(child => child.toJSON())
    };
  }

  static fromJSON(data: MapNodeData, parent: MapNode | null = null): MapNode {
    const node = new MapNode(data.id, data.depth, 0, data.roomType === 'ROOT');
    node.roomType = data.roomType;
    node.doorCount = data.doorCount;
    node.monsterIndex1 = data.monsterIndex1;
    node.parent = parent;
    node.children = data.children.map(childData => MapNode.fromJSON(childData, node));
    return node;
  }
}