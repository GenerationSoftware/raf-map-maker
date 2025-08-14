import { MapNodeData } from './types';

export class MapValidator {
  private errors: string[] = [];

  validate(data: MapNodeData[] | MapNodeData): boolean {
    this.errors = [];
    
    if (Array.isArray(data)) {
      return this.validateFlatStructure(data);
    } else {
      return this.validateSingleNode(data, 'root');
    }
  }

  private validateFlatStructure(nodes: MapNodeData[]): boolean {
    let valid = true;
    const nodeMap = new Map<number, MapNodeData>();

    if (nodes.length === 0) {
      this.errors.push('Map must contain at least one node');
      return false;
    }

    // Check for duplicate IDs and validate each node
    for (const node of nodes) {
      if (nodeMap.has(node.id)) {
        this.errors.push(`Duplicate node ID found: ${node.id}`);
        valid = false;
      }
      nodeMap.set(node.id, node);
      
      if (!this.validateSingleNode(node, `node[${node.id}]`)) {
        valid = false;
      }
    }

    // Find root node (should have ID 1)
    if (!nodeMap.has(1)) {
      this.errors.push('Root node with ID 1 not found');
      valid = false;
    }

    // Verify incremental IDs
    const sortedIds = Array.from(nodeMap.keys()).sort((a, b) => a - b);
    for (let i = 0; i < sortedIds.length; i++) {
      if (sortedIds[i] !== i + 1) {
        this.errors.push(`Node IDs must be incremental starting from 1. Missing ID: ${i + 1}`);
        valid = false;
        break;
      }
    }

    // Verify tree structure
    const childrenMap = new Map<number, number[]>();
    for (const node of nodes) {
      const childIds = node.nextRooms.filter(id => id > 0);
      if (childIds.length > 0) {
        childrenMap.set(node.id, childIds);
      }
    }

    // Check that all referenced children exist
    for (const node of nodes) {
      for (let i = 0; i < node.nextRooms.length; i++) {
        const childId = node.nextRooms[i];
        if (childId > 0) {
          if (!nodeMap.has(childId)) {
            this.errors.push(`Node ${node.id} references non-existent child ${childId}`);
            valid = false;
          }
        }
      }

      // Validate GOAL rooms have no children
      const nonZeroRooms = node.nextRooms.filter(id => id > 0).length;
      if (node.roomType === 2 && nonZeroRooms > 0) { // GOAL
        this.errors.push(`Node ${node.id}: GOAL rooms cannot have children`);
        valid = false;
      }
      
      // BATTLE rooms should have at least 1 child
      if (node.roomType === 1 && nonZeroRooms === 0) { // BATTLE
        this.errors.push(`Node ${node.id}: BATTLE rooms should have children or be GOAL type`);
        valid = false;
      }
    }

    // Ensure exactly one root (node not referenced by any other)
    const allChildIds = new Set<number>();
    for (const children of childrenMap.values()) {
      children.forEach(id => allChildIds.add(id));
    }
    
    const rootNodes = nodes.filter(n => !allChildIds.has(n.id));
    if (rootNodes.length !== 1) {
      this.errors.push(`Map must have exactly one root node, found ${rootNodes.length}`);
      valid = false;
    }

    return valid;
  }

  private validateSingleNode(node: MapNodeData, path: string): boolean {
    let valid = true;

    // Validate ID
    if (typeof node.id !== 'number' || node.id < 1) {
      this.errors.push(`${path}: id must be a positive integer`);
      valid = false;
    }

    // Validate room type (integer enum)
    if (![0, 1, 2].includes(node.roomType)) {
      this.errors.push(`${path}: roomType must be 0 (NULL), 1 (BATTLE), or 2 (GOAL)`);
      valid = false;
    }

    // Validate monster index
    if (node.roomType === 1) { // BATTLE
      if (typeof node.monsterIndex1 !== 'number' || node.monsterIndex1 < 0 || node.monsterIndex1 > 65535) {
        this.errors.push(`${path}: BATTLE rooms must have monsterIndex1 as a number between 0 and 65535`);
        valid = false;
      }
    } else if (node.roomType === 0 || node.roomType === 2) { // NULL or GOAL
      if (node.monsterIndex1 !== null) {
        this.errors.push(`${path}: NULL and GOAL rooms must have monsterIndex1 = null`);
        valid = false;
      }
    }
    

    // Validate nextRooms array
    if (!Array.isArray(node.nextRooms) || node.nextRooms.length !== 6) {
      this.errors.push(`${path}: nextRooms must be an array of exactly 6 elements`);
      valid = false;
    } else {
      let nonZeroCount = 0;
      for (let i = 0; i < node.nextRooms.length; i++) {
        if (typeof node.nextRooms[i] !== 'number' || node.nextRooms[i] < 0) {
          this.errors.push(`${path}: nextRooms[${i}] must be a non-negative integer`);
          valid = false;
        }
        if (node.nextRooms[i] > 0) {
          nonZeroCount++;
        }
      }
      
      // Validate that BATTLE rooms have 1-6 children
      if (node.roomType === 1 && (nonZeroCount < 1 || nonZeroCount > 6)) { // BATTLE
        this.errors.push(`${path}: BATTLE rooms must have 1-6 children (doors)`);
        valid = false;
      }
      
      // Validate that GOAL rooms have no children
      if (node.roomType === 2 && nonZeroCount > 0) { // GOAL
        this.errors.push(`${path}: GOAL rooms must have no children`);
        valid = false;
      }
    }

    return valid;
  }

  getErrors(): string[] {
    return this.errors;
  }
}