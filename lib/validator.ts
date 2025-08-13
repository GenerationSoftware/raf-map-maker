import { MapNodeData } from './types';

export class MapValidator {
  private errors: string[] = [];

  validate(data: MapNodeData): boolean {
    this.errors = [];
    return this.validateNode(data, 'root') && this.validateTreeConsistency(data);
  }

  private validateNode(node: MapNodeData, path: string): boolean {
    let valid = true;

    // Validate required fields
    if (typeof node.id !== 'number' || node.id < 1) {
      this.errors.push(`${path}: id must be a positive integer`);
      valid = false;
    }

    if (typeof node.depth !== 'number' || node.depth < 0 || node.depth > 10) {
      this.errors.push(`${path}: depth must be between 0 and 10`);
      valid = false;
    }

    if (!['ROOT', 'MONSTER'].includes(node.roomType)) {
      this.errors.push(`${path}: roomType must be ROOT or MONSTER`);
      valid = false;
    }

    if (typeof node.doorCount !== 'number' || node.doorCount < 0 || node.doorCount > 4) {
      this.errors.push(`${path}: doorCount must be between 0 and 4`);
      valid = false;
    }

    // Validate monster type
    const validMonsters = ['GOBLIN', 'THICC_GOBLIN', 'TROLL', 'ORC'];
    
    if (node.roomType === 'ROOT') {
      if (node.monsterIndex1 !== null && !validMonsters.includes(node.monsterIndex1 as string)) {
        this.errors.push(`${path}: ROOT nodes must have valid monsterIndex1 or null`);
        valid = false;
      }
      if (node.depth !== 0) {
        this.errors.push(`${path}: ROOT nodes must have depth 0`);
        valid = false;
      }
    } else if (node.roomType === 'MONSTER') {
      if (!validMonsters.includes(node.monsterIndex1 as string)) {
        this.errors.push(`${path}: MONSTER nodes must have valid monsterIndex1`);
        valid = false;
      }
      if (node.depth < 1) {
        this.errors.push(`${path}: MONSTER nodes must have depth >= 1`);
        valid = false;
      }
    }

    // Validate children
    if (!Array.isArray(node.children)) {
      this.errors.push(`${path}: children must be an array`);
      valid = false;
    } else {
      if (node.children.length !== node.doorCount) {
        this.errors.push(`${path}: doorCount (${node.doorCount}) must match children count (${node.children.length})`);
        valid = false;
      }

      // Recursively validate children
      for (let i = 0; i < node.children.length; i++) {
        if (!this.validateNode(node.children[i], `${path}.children[${i}]`)) {
          valid = false;
        }
      }
    }

    return valid;
  }

  private validateTreeConsistency(data: MapNodeData): boolean {
    const visited = new Set<number>();
    
    const checkNode = (node: MapNodeData, expectedDepth: number): boolean => {
      // Check for duplicate IDs
      if (visited.has(node.id)) {
        this.errors.push(`Duplicate node ID found: ${node.id}`);
        return false;
      }
      visited.add(node.id);
      
      // Check depth consistency
      if (node.depth !== expectedDepth) {
        this.errors.push(`Node ${node.id} has incorrect depth. Expected ${expectedDepth}, got ${node.depth}`);
        return false;
      }
      
      // Recursively check children
      for (const child of node.children) {
        if (!checkNode(child, expectedDepth + 1)) {
          return false;
        }
      }
      
      return true;
    };
    
    return checkNode(data, 0);
  }

  getErrors(): string[] {
    return this.errors;
  }
}