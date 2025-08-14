import { RoomType } from '../types';
import { generateMap, createGoalNode } from '../map-generator';
import { 
  addChildNode, 
  removeChildNode, 
  findNodeById,
  traverseGraph,
  calculateNodePositions 
} from '../graph-operations';
import { serializeMap, deserializeMap } from '../serialization';
import { MapValidator } from '../validator';

describe('End-to-End Map Workflow', () => {
  it('should complete full workflow: generate, edit, save, and load', () => {
    // Step 1: Generate a new map
    console.log('Step 1: Generating map...');
    const { root: originalRoot, nodeIdCounter } = generateMap(3);
    
    expect(originalRoot).toBeDefined();
    expect(originalRoot.id).toBe(1);
    expect(originalRoot.depth).toBe(0);
    
    // Verify the generated structure
    const allNodes = traverseGraph(originalRoot);
    console.log(`Generated map with ${allNodes.size} nodes`);
    expect(allNodes.size).toBeGreaterThan(1);
    
    // Check that penultimate nodes share a GOAL node
    const goalNodes = Array.from(allNodes.values()).filter(n => n.roomType === RoomType.GOAL);
    console.log(`Found ${goalNodes.length} GOAL node(s)`);
    
    // Step 2: Edit the map - add a new node
    console.log('Step 2: Editing map...');
    
    // Find a BATTLE node to edit
    const battleNode = Array.from(allNodes.values()).find(
      n => n.roomType === RoomType.BATTLE && n.nextRooms.filter(id => id > 0).length < 4
    );
    expect(battleNode).toBeDefined();
    
    // Create and add a new GOAL node
    const newGoalNode = createGoalNode(battleNode!.depth, nodeIdCounter.value++, 3);
    const addResult = addChildNode(battleNode!, newGoalNode);
    expect(addResult).toBe(true);
    console.log(`Added new GOAL node with ID ${newGoalNode.id} to node ${battleNode!.id}`);
    
    // Verify the node was added
    expect(battleNode!.nextRooms.includes(newGoalNode.id)).toBe(true);
    expect(battleNode!.children.some(c => c.id === newGoalNode.id)).toBe(true);
    
    // Remove a child from another node
    const nodeWithChildren = Array.from(allNodes.values()).find(
      n => n.nextRooms.filter(id => id > 0).length > 0 && n.id !== battleNode!.id
    );
    if (nodeWithChildren) {
      const childToRemove = nodeWithChildren.nextRooms.find(id => id > 0);
      if (childToRemove) {
        const removeResult = removeChildNode(nodeWithChildren, childToRemove);
        expect(removeResult).toBe(true);
        console.log(`Removed child ${childToRemove} from node ${nodeWithChildren.id}`);
      }
    }
    
    // Step 3: Calculate positions for visualization
    console.log('Step 3: Calculating node positions...');
    calculateNodePositions(originalRoot);
    
    // Verify all nodes have positions
    const updatedNodes = traverseGraph(originalRoot);
    updatedNodes.forEach(node => {
      expect(node.x).toBeDefined();
      expect(node.y).toBeDefined();
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
    });
    console.log('All nodes have valid positions');
    
    // Step 4: Save to JSON
    console.log('Step 4: Saving to JSON...');
    const jsonString = serializeMap(originalRoot);
    expect(jsonString).toBeDefined();
    expect(typeof jsonString).toBe('string');
    
    // Parse and validate the JSON structure
    const parsedJson = JSON.parse(jsonString);
    expect(Array.isArray(parsedJson)).toBe(true);
    console.log(`Saved ${parsedJson.length} nodes to JSON`);
    
    // Verify no duplicate IDs in saved data
    const ids = parsedJson.map((n: any) => n.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
    
    // Note: IDs may not be sequential after edits (node removal)
    // But they should be sorted in the output
    const sortedIds = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sortedIds);
    console.log(`JSON has sorted IDs: ${sortedIds.slice(0, 5).join(', ')}...`);
    
    // Step 5: Validate the saved data
    console.log('Step 5: Validating saved data...');
    const validator = new MapValidator();
    const isValid = validator.validate(parsedJson);
    
    if (!isValid) {
      console.error('Validation errors:', validator.getErrors());
    }
    expect(isValid).toBe(true);
    console.log('Saved data passes validation');
    
    // Step 6: Load from JSON
    console.log('Step 6: Loading from JSON...');
    const { root: loadedRoot, errors } = deserializeMap(jsonString);
    
    expect(errors).toEqual([]);
    expect(loadedRoot).not.toBeNull();
    console.log('Successfully loaded map from JSON');
    
    // Step 7: Verify loaded map matches saved structure
    console.log('Step 7: Verifying loaded map...');
    
    // Compare node counts
    const loadedNodes = traverseGraph(loadedRoot!);
    const originalNodes = traverseGraph(originalRoot);
    
    // Should have same number of nodes (minus any orphaned nodes)
    console.log(`Original: ${originalNodes.size} nodes, Loaded: ${loadedNodes.size} nodes`);
    
    // Verify structure integrity
    expect(loadedRoot!.id).toBe(1); // Root should always be ID 1
    expect(loadedRoot!.roomType).toBe(originalRoot.roomType);
    
    // Verify all loaded nodes have valid properties
    loadedNodes.forEach(node => {
      expect(node.id).toBeGreaterThan(0);
      expect(node.roomType).toBeDefined();
      expect(node.nextRooms).toHaveLength(7);
      
      // Verify connections are valid
      node.nextRooms.forEach(childId => {
        if (childId > 0) {
          const child = findNodeById(loadedRoot!, childId);
          expect(child).not.toBeNull();
        }
      });
    });
    console.log('Loaded map has valid structure');
    
    // Step 8: Test round-trip consistency
    console.log('Step 8: Testing round-trip consistency...');
    
    // Save the loaded map again
    const secondJsonString = serializeMap(loadedRoot!);
    const secondParsedJson = JSON.parse(secondJsonString);
    
    // Should be identical to first save
    expect(secondParsedJson.length).toBe(parsedJson.length);
    
    // Compare each node
    for (let i = 0; i < parsedJson.length; i++) {
      expect(secondParsedJson[i].id).toBe(parsedJson[i].id);
      expect(secondParsedJson[i].roomType).toBe(parsedJson[i].roomType);
      expect(secondParsedJson[i].monsterIndex1).toBe(parsedJson[i].monsterIndex1);
      expect(secondParsedJson[i].nextRooms).toEqual(parsedJson[i].nextRooms);
    }
    console.log('Round-trip save/load is consistent');
    
    console.log('✅ End-to-end test completed successfully!');
  });

  it('should handle edge cases in the workflow', () => {
    // Test with minimum depth
    const { root: minRoot } = generateMap(1);
    expect(minRoot).toBeDefined();
    
    const minJson = serializeMap(minRoot);
    const { root: loadedMin, errors: minErrors } = deserializeMap(minJson);
    expect(minErrors).toEqual([]);
    expect(loadedMin).not.toBeNull();
    
    // Test with maximum reasonable depth
    const { root: maxRoot } = generateMap(5);
    expect(maxRoot).toBeDefined();
    
    const maxJson = serializeMap(maxRoot);
    const { root: loadedMax, errors: maxErrors } = deserializeMap(maxJson);
    expect(maxErrors).toEqual([]);
    expect(loadedMax).not.toBeNull();
    
    // Test loading invalid JSON
    const { root: invalidRoot, errors: invalidErrors } = deserializeMap('invalid json');
    expect(invalidRoot).toBeNull();
    expect(invalidErrors.length).toBeGreaterThan(0);
    
    // Test loading empty array
    const { root: emptyRoot, errors: emptyErrors } = deserializeMap('[]');
    expect(emptyRoot).toBeNull();
    expect(emptyErrors.length).toBeGreaterThan(0);
  });

  it('should maintain shared node references through save/load', () => {
    // Generate a map with shared GOAL node
    const { root } = generateMap(3);
    
    // Find the shared GOAL node
    const allNodes = traverseGraph(root);
    const goalNodes = Array.from(allNodes.values()).filter(n => n.roomType === RoomType.GOAL);
    
    if (goalNodes.length > 0) {
      const sharedGoal = goalNodes[0];
      
      // Count how many parents reference this GOAL node
      let parentCount = 0;
      allNodes.forEach(node => {
        if (node.nextRooms.includes(sharedGoal.id)) {
          parentCount++;
        }
      });
      
      // Save and load
      const json = serializeMap(root);
      const { root: loaded } = deserializeMap(json);
      
      // Verify the shared node still has the same number of parents
      const loadedNodes = traverseGraph(loaded!);
      let loadedParentCount = 0;
      loadedNodes.forEach(node => {
        if (node.nextRooms.includes(sharedGoal.id)) {
          loadedParentCount++;
        }
      });
      
      expect(loadedParentCount).toBe(parentCount);
    }
  });
});