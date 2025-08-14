'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './MapEditor.module.css';
import { MapNode, MapNodeData, RoomType } from '@/lib/types';
import { MapValidator } from '@/lib/validator';
import { generateMapWithMonsters } from '@/lib/map-generator-async';
import { getMonsters, getMonsterName } from '@/lib/monsters';

export default function MapEditor() {
  const [root, setRoot] = useState<MapNode | null>(null);
  const [maxDepth, setMaxDepth] = useState(3);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [monsterIndex, setMonsterIndex] = useState<number>(0);
  const [editChildrenMode, setEditChildrenMode] = useState(false);
  const [graphVersion, setGraphVersion] = useState(0); // Force re-render of graph
  const [monsters, setMonsters] = useState<{ [key: number]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  const nodeIdCounter = useRef({ value: 1 });
  const nodeElements = useRef(new Map<MapNode, SVGRectElement>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validator = useRef(new MapValidator());
  
  const minZoom = 0.1;
  const maxZoom = 2;
  const zoomStep = 0.1;

  useEffect(() => {
    generateMap();
    loadMonsters();
  }, []);

  const loadMonsters = async () => {
    try {
      const monsterData = await getMonsters();
      const monsterMap: { [key: number]: string } = {};
      monsterData.forEach(monster => {
        monsterMap[monster.index] = monster.name;
      });
      setMonsters(monsterMap);
    } catch (error) {
      console.error('Error loading monsters:', error);
      // Fallback monster names
      setMonsters({ 0: 'Goblin', 1: 'ThiccGoblin', 2: 'Troll', 3: 'Orc' });
    }
  };

  const generateMap = async () => {
    setIsGenerating(true);
    try {
      nodeIdCounter.current = { value: 1 };
      const { root: newRoot, nodeIdCounter: counter } = await generateMapWithMonsters(maxDepth);
      nodeIdCounter.current = counter;
      calculateNodePositions(newRoot);
      setRoot(newRoot);
      setSelectedNode(null);
    } catch (error) {
      console.error('Error generating map:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateNodePositions = (rootNode: MapNode) => {
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
      const hasMultipleParents = new Set<MapNode>();
      
      for (const node of nodes) {
        const parents = nodeParents.get(node.id);
        if (parents && parents.size > 0) {
          if (parents.size > 1) {
            hasMultipleParents.add(node);
          }
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
  };
  
  // Helper function to traverse the graph and collect all nodes
  const traverseGraph = (root: MapNode): Map<number, MapNode> => {
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
  };
  
  // Helper function to find a node by ID in the graph
  const findNodeById = (root: MapNode, id: number): MapNode | null => {
    const allNodes = traverseGraph(root);
    return allNodes.get(id) || null;
  };

  const selectNode = (node: MapNode) => {
    if (editChildrenMode && selectedNode && selectedNode !== node) {
      // In edit children mode, clicking another node adds/removes it as a child
      toggleChildNode(node);
    } else {
      // Normal selection mode
      setSelectedNode(node);
      setMonsterIndex(node.monsterIndex1 || 0);
      setEditChildrenMode(false);
    }
  };

  const updateMonsterIndex = (newMonsterIndex: number) => {
    if (!selectedNode || !root) return;
    setMonsterIndex(newMonsterIndex);
    
    if (selectedNode.roomType === RoomType.BATTLE) {
      selectedNode.monsterIndex1 = newMonsterIndex;
      // Force re-render
      setGraphVersion(v => v + 1);
      setRoot(root);
    }
  };

  const updateRoomType = (newRoomType: RoomType) => {
    if (!selectedNode || !root) return;
    
    selectedNode.roomType = newRoomType;
    
    // Update monster index based on room type
    if (newRoomType === RoomType.GOAL || newRoomType === RoomType.NULL) {
      selectedNode.monsterIndex1 = 0;
      setMonsterIndex(0);
    } else if (newRoomType === RoomType.BATTLE && selectedNode.monsterIndex1 === 0) {
      // If changing to BATTLE and no monster set, set default
      selectedNode.monsterIndex1 = 0; // Default to first available monster
      setMonsterIndex(0);
    }
    
    // If changing to GOAL, clear all children
    if (newRoomType === RoomType.GOAL) {
      selectedNode.nextRooms = [0, 0, 0, 0, 0, 0];
      selectedNode.children = [];
    }
    
    // Force re-render
    setGraphVersion(v => v + 1);
    setRoot(root);
  };

  const toggleChildNode = (targetNode: MapNode) => {
    if (!selectedNode || !root || targetNode === selectedNode) return;
    
    // Check if targetNode is already referenced in selectedNode's nextRooms
    const roomIndex = selectedNode.nextRooms.indexOf(targetNode.id);
    
    if (roomIndex !== -1) {
      // Remove the reference from nextRooms
      selectedNode.nextRooms[roomIndex] = 0;
      
      // Remove from children array
      const childIndex = selectedNode.children.findIndex(child => child.id === targetNode.id);
      if (childIndex !== -1) {
        selectedNode.children.splice(childIndex, 1);
      }
      
    } else if (selectedNode.nextRooms.filter(id => id > 0).length < 4) {
      // Add as a reference if we have room (max 4 doors) and it's not already a child
      
      // Check if this node is already a child (shouldn't add duplicates)
      if (selectedNode.nextRooms.includes(targetNode.id)) {
        return; // Already a child, do nothing
      }
      
      // Find first empty slot in nextRooms
      for (let i = 0; i < 7; i++) {
        if (selectedNode.nextRooms[i] === 0) {
          selectedNode.nextRooms[i] = targetNode.id;
          break;
        }
      }
      
      // Add to children array - this is important for graph traversal
      if (!selectedNode.children.some(child => child.id === targetNode.id)) {
        selectedNode.children.push(targetNode);
      }
      
    }
    
    // Recalculate positions for the new graph structure
    calculateNodePositions(root);
    
    // Force React to re-render the graph by incrementing version
    setGraphVersion(v => v + 1);
    setRoot(root);
  };

  const addNewNode = () => {
    if (!selectedNode || !root || selectedNode.nextRooms.filter(id => id > 0).length >= 4) return;
    
    // Create a new GOAL node
    const newNode = new MapNode(nodeIdCounter.current.value++, selectedNode.depth + 1, maxDepth, false);
    newNode.roomType = RoomType.GOAL;
    newNode.monsterIndex1 = 0;
    newNode.parent = selectedNode;
    newNode.nextRooms = [0, 0, 0, 0, 0, 0];
    newNode.children = [];
    
    // Add to parent's children array
    selectedNode.children.push(newNode);
    
    // Find first empty slot in nextRooms
    for (let i = 0; i < 7; i++) {
      if (selectedNode.nextRooms[i] === 0) {
        selectedNode.nextRooms[i] = newNode.id;
        break;
      }
    }
    
    // Recalculate positions for the new graph structure
    calculateNodePositions(root);
    
    // Force React to re-render the graph by incrementing version
    setGraphVersion(v => v + 1);
    setRoot(root);
  };

  const zoomIn = () => {
    if (currentZoom < maxZoom) {
      setCurrentZoom(prev => Math.min(prev + zoomStep, maxZoom));
    }
  };

  const zoomOut = () => {
    if (currentZoom > minZoom) {
      setCurrentZoom(prev => Math.max(prev - zoomStep, minZoom));
    }
  };

  const resetZoom = () => {
    setCurrentZoom(1);
  };

  const saveJSON = () => {
    if (!root) return;
    
    const data = JSON.stringify(root.toFlatJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-map.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validate the JSON against the schema
        if (!validator.current.validate(data)) {
          const errors = validator.current.getErrors();
          alert('Invalid map file:\n' + errors.join('\n'));
          return;
        }
        
        let newRoot: MapNode | null = null;
        
        if (Array.isArray(data)) {
          newRoot = MapNode.fromFlatJSON(data as MapNodeData[]);
        } else {
          alert('Invalid map file: Expected flat array format');
          return;
        }
        
        if (!newRoot) {
          alert('Error loading map: Could not reconstruct tree from data');
          return;
        }
        
        const newMaxDepth = findMaxDepth(newRoot);
        setMaxDepth(newMaxDepth);
        nodeIdCounter.current = { value: findMaxId(newRoot) + 1 };
        calculateNodePositions(newRoot);
        setRoot(newRoot);
        setSelectedNode(null);
      } catch (error) {
        alert('Error loading JSON file: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const findMaxDepth = (node: MapNode): number => {
    if (node.children.length === 0) {
      return node.depth;
    }
    return Math.max(...node.children.map(child => findMaxDepth(child)));
  };

  const findMaxId = (node: MapNode): number => {
    const childIds = node.children.map(child => findMaxId(child));
    return Math.max(node.id, ...childIds, 0);
  };

  const renderGraph = (rootNode: MapNode): React.ReactElement => {
    const nodes: React.ReactElement[] = [];
    const edges: React.ReactElement[] = [];
    
    // Use the shared traverseGraph function to get all nodes
    const allNodes = traverseGraph(rootNode);
    
    // Render all nodes and their edges
    allNodes.forEach(node => {
      // Render this node
      nodes.push(renderNode(node));
      
      // Render edges based on nextRooms connections
      node.nextRooms.forEach((childId) => {
        if (childId > 0) {
          const child = allNodes.get(childId);
          if (child) {
            // Draw edge - each parent-child pair is unique now
            edges.push(
              <line
                key={`edge-${node.id}-${child.id}`}
                x1={node.x}
                y1={node.y + 25}
                x2={child.x}
                y2={child.y - 25}
                stroke="#cbd5e0"
                strokeWidth={2}
              />
            );
          }
        }
      });
    });
    
    return (
      <g>
        {edges}
        {nodes}
      </g>
    );
  };

  const renderNode = (node: MapNode): React.ReactElement => {
    const getMonsterName = (index: number): string => {
      return monsters[index] || `Monster ${index}`;
    };

    const getNodeColor = () => {
      // Highlight potential children/parents in edit mode
      if (editChildrenMode && selectedNode) {
        if (selectedNode.nextRooms.includes(node.id)) {
          return '#4299e1'; // Blue for current children (referenced in nextRooms)
        }
        if (node !== selectedNode && selectedNode.nextRooms.filter(id => id > 0).length < 4) {
          return '#9f7aea'; // Purple for potential children
        }
      }
      if (node.roomType === RoomType.GOAL) return '#48bb78';
      if (node.monsterIndex1 === 1) return '#63b3ed';
      if (node.monsterIndex1 === 2) return '#f6ad55';
      if (node.monsterIndex1 === 3) return '#fc8181';
      if (node.monsterIndex1 === 4) return '#b794f4';
      return '#718096';
    };

    return (
      <g key={node.id}>
        <g
          transform={`translate(${node.x}, ${node.y})`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            selectNode(node);
          }}
        >
          <rect
            x={-60}
            y={-25}
            width={120}
            height={50}
            rx={8}
            strokeWidth={selectedNode?.id === node.id ? 4 : 2}
            stroke={selectedNode?.id === node.id ? '#1a202c' : '#cbd5e0'}
            fill={getNodeColor()}
          />
          <text y={-5} fill="white" fontSize={12} fontWeight={500} textAnchor="middle">
            {node.roomType === RoomType.BATTLE ? 'BATTLE' : node.roomType === RoomType.GOAL ? 'GOAL' : 'NULL'}
          </text>
          <text y={10} fill="white" fontSize={11} fontWeight={500} textAnchor="middle">
            {node.roomType === RoomType.BATTLE ? getMonsterName(node.monsterIndex1) : ''}
          </text>
        </g>
      </g>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Game Map Editor</h1>
      </header>
      
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label} htmlFor="depthInput">Max Depth:</label>
          <input
            type="number"
            id="depthInput"
            className={styles.input}
            min={1}
            max={16}
            value={maxDepth}
            onChange={(e) => setMaxDepth(Math.min(16, parseInt(e.target.value)))}
          />
          <button className={styles.button} onClick={generateMap} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Map'}
          </button>
        </div>
        
        <div className={styles.controlGroup}>
          <button className={styles.button} onClick={zoomIn}>Zoom In</button>
          <button className={styles.button} onClick={zoomOut}>Zoom Out</button>
          <button className={styles.button} onClick={resetZoom}>Reset Zoom</button>
          <span className={styles.zoomLevel}>{Math.round(currentZoom * 100)}%</span>
        </div>
        
        <div className={styles.controlGroup}>
          <button className={styles.button} onClick={saveJSON}>Save JSON</button>
          <button className={styles.button} onClick={() => fileInputRef.current?.click()}>
            Load JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className={styles.fileInput}
            onChange={loadJSON}
          />
        </div>
      </div>
      
      <div className={styles.editorContainer}>
        <div 
          className={styles.treeCanvas}
          onClick={() => {
            setSelectedNode(null);
            setEditChildrenMode(false);
          }}
        >
          {root && (
            <div 
              className={styles.svgContainer}
              style={{ transform: `scale(${currentZoom})` }}
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                key={`graph-${graphVersion}`}
                width={Math.max((root.subtreeWidth || 0) + 200, 1000)}
                height={(maxDepth + 1) * 150 + 100}
                onClick={(e) => {
                  // Check if clicking on SVG background (not a node)
                  if (e.target === e.currentTarget) {
                    setSelectedNode(null);
                    setEditChildrenMode(false);
                  }
                }}
              >
                {renderGraph(root)}
              </svg>
            </div>
          )}
        </div>
        
        {selectedNode && (
          <div className={styles.nodeEditor}>
            <h3 className={styles.nodeEditorTitle}>Edit Node</h3>
            <div className={styles.editorField}>
              <label className={styles.editorLabel}>
                Node ID: <span className={styles.editorValue}>{selectedNode.id}</span>
              </label>
            </div>
            <div className={styles.editorField}>
              <label className={styles.editorLabel} htmlFor="roomTypeSelect">
                Room Type:
              </label>
              <select
                id="roomTypeSelect"
                className={styles.select}
                value={selectedNode.roomType}
                onChange={(e) => updateRoomType(parseInt(e.target.value) as RoomType)}
              >
                <option value={RoomType.NULL}>NULL</option>
                <option value={RoomType.BATTLE}>BATTLE</option>
                <option value={RoomType.GOAL}>GOAL</option>
              </select>
            </div>
            <div className={styles.editorField}>
              <label className={styles.editorLabel}>
                <input
                  type="checkbox"
                  checked={editChildrenMode}
                  onChange={(e) => setEditChildrenMode(e.target.checked)}
                />
                Edit Children Mode
              </label>
            </div>
            {editChildrenMode && (
              <div className={styles.editorField}>
                <button 
                  className={styles.button}
                  onClick={addNewNode}
                  disabled={selectedNode.children.length >= 4}
                >
                  Add Node
                </button>
                <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                  Click nodes to add/remove as children
                </div>
              </div>
            )}
            {selectedNode.roomType === RoomType.BATTLE && (
              <div className={styles.editorField}>
                <label className={styles.editorLabel} htmlFor="monsterSelect">
                  Monster Index:
                </label>
                <select
                  id="monsterSelect"
                  className={styles.select}
                  value={monsterIndex}
                  onChange={(e) => updateMonsterIndex(parseInt(e.target.value))}
                >
                  {Object.entries(monsters).map(([index, name]) => (
                    <option key={index} value={index}>
                      {index} - {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedNode.roomType === RoomType.GOAL && (
              <div className={styles.editorField}>
                <label className={styles.editorLabel}>
                  This is a GOAL room (no monsters or doors)
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}