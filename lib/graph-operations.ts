import { MapNode } from './types';

/**
 * Traverse the graph and collect all unique nodes
 */
export function traverseGraph(root: MapNode): Map<number, MapNode> {
  const allNodes = new Map<number, MapNode>();
  const visited = new Set<number>();
  const queue: MapNode[] = [root];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    
    visited.add(node.id);
    allNodes.set(node.id, node);
    
    // Use nextRooms for traversal to ensure we follow actual connections
    for (const childId of node.nextRooms) {
      if (childId > 0 && !visited.has(childId)) {
        // Find child in already visited nodes first
        let child = allNodes.get(childId);
        if (!child) {
          // If not found, search in the tree structure
          const searchQueue: MapNode[] = [root];
          const searchVisited = new Set<number>();
          while (searchQueue.length > 0) {
            const searchNode = searchQueue.shift()!;
            if (searchNode.id === childId) {
              child = searchNode;
              break;
            }
            if (searchVisited.has(searchNode.id)) continue;
            searchVisited.add(searchNode.id);
            searchQueue.push(...searchNode.children);
          }
        }
        if (child) {
          queue.push(child);
        }
      }
    }
  }
  
  return allNodes;
}

/**
 * Find a node by ID in the graph
 */
export function findNodeById(root: MapNode, id: number): MapNode | null {
  const allNodes = traverseGraph(root);
  return allNodes.get(id) || null;
}

/**
 * Add a child node to a parent
 */
export function addChildNode(parent: MapNode, child: MapNode): boolean {
  // Check if already a child
  if (parent.nextRooms.includes(child.id)) {
    return false;
  }
  
  // Check if there's room
  const currentChildren = parent.nextRooms.filter(id => id > 0).length;
  if (currentChildren >= 4) {
    return false;
  }
  
  // Find first empty slot in nextRooms
  for (let i = 0; i < 7; i++) {
    if (parent.nextRooms[i] === 0) {
      parent.nextRooms[i] = child.id;
      break;
    }
  }
  
  // Add to children array if not already there
  if (!parent.children.some(c => c.id === child.id)) {
    parent.children.push(child);
  }
  
  return true;
}

/**
 * Remove a child node from a parent
 */
export function removeChildNode(parent: MapNode, childId: number): boolean {
  const roomIndex = parent.nextRooms.indexOf(childId);
  if (roomIndex === -1) {
    return false;
  }
  
  // Remove from nextRooms
  parent.nextRooms[roomIndex] = 0;
  
  // Remove from children array
  const childIndex = parent.children.findIndex(child => child.id === childId);
  if (childIndex !== -1) {
    parent.children.splice(childIndex, 1);
  }
  
  return true;
}

/**
 * Find the maximum depth in the tree
 */
export function findMaxDepth(node: MapNode): number {
  if (node.children.length === 0) {
    return node.depth;
  }
  return Math.max(...node.children.map(child => findMaxDepth(child)));
}

/**
 * Find the maximum ID in the tree
 */
export function findMaxId(root: MapNode): number {
  const allNodes = traverseGraph(root);
  let maxId = 0;
  allNodes.forEach(node => {
    maxId = Math.max(maxId, node.id);
  });
  return maxId;
}

/**
 * Calculate node positions for visualization
 */
export function calculateNodePositions(rootNode: MapNode): void {
  const nodeWidth = 140;
  const levelHeight = 150;
  const minSiblingSpacing = 40;
  
  // Use the shared traverseGraph function
  const allNodes = traverseGraph(rootNode);
  const nodesByDepth = new Map<number, MapNode[]>();
  const nodeParents = new Map<number, Set<MapNode>>();
  
  // Organize nodes by depth and track parent relationships
  allNodes.forEach(node => {
    // Group nodes by depth
    if (!nodesByDepth.has(node.depth)) {
      nodesByDepth.set(node.depth, []);
    }
    nodesByDepth.get(node.depth)!.push(node);
    
    // Track parent relationships based on nextRooms
    for (const childId of node.nextRooms) {
      if (childId > 0) {
        if (!nodeParents.has(childId)) {
          nodeParents.set(childId, new Set());
        }
        nodeParents.get(childId)!.add(node);
      }
    }
  });
  
  // Second pass: position nodes with parent-child centering
  const maxDepth = Math.max(...Array.from(nodesByDepth.keys()));
  
  // Start with root at center
  rootNode.x = 600;
  rootNode.y = 50;
  
  // Position nodes depth by depth
  for (let depth = 1; depth <= maxDepth; depth++) {
    const nodes = nodesByDepth.get(depth) || [];
    
    // For each node at this depth, calculate ideal position based on parents
    const idealPositions = new Map<MapNode, number>();
    
    for (const node of nodes) {
      const parents = nodeParents.get(node.id);
      if (parents && parents.size > 0) {
        // Calculate average parent position
        let sumX = 0;
        for (const parent of parents) {
          sumX += parent.x;
        }
        idealPositions.set(node, sumX / parents.size);
      } else {
        idealPositions.set(node, 600);
      }
    }
    
    // Sort nodes by ideal position
    nodes.sort((a, b) => {
      const posA = idealPositions.get(a) || 0;
      const posB = idealPositions.get(b) || 0;
      return posA - posB;
    });
    
    // Position nodes, trying to keep them close to ideal positions
    // while maintaining minimum spacing
    if (nodes.length === 1) {
      // Single node - place at ideal position
      nodes[0].x = idealPositions.get(nodes[0]) || 600;
    } else {
      // Multiple nodes - space them out while centering around parents
      const positions: number[] = [];
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const ideal = idealPositions.get(node) || 600;
        
        if (i === 0) {
          positions.push(ideal);
        } else {
          // Ensure minimum spacing from previous node
          const minX = positions[i - 1] + nodeWidth + minSiblingSpacing;
          positions.push(Math.max(minX, ideal));
        }
      }
      
      // Center the whole group if needed
      const leftMost = Math.min(...positions);
      const rightMost = Math.max(...positions);
      const groupCenter = (leftMost + rightMost) / 2;
      const idealCenter = Array.from(idealPositions.values()).reduce((a, b) => a + b, 0) / idealPositions.size;
      const offset = idealCenter - groupCenter;
      
      // Apply positions with centering offset (bounded to keep on screen)
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].x = positions[i] + Math.max(-leftMost + 100, Math.min(offset, 1000));
      }
    }
    
    // Set y position for all nodes at this depth
    for (const node of nodes) {
      node.y = 50 + depth * levelHeight;
    }
  }
  
  // Update subtreeWidth for the root
  const allX = Array.from(allNodes.values()).map(n => n.x);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  rootNode.subtreeWidth = maxX - minX + nodeWidth;
}