'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './MapEditor.module.css';
import { MapNode, MapNodeData } from '@/lib/types';
import { MapValidator } from '@/lib/validator';

export default function MapEditor() {
  const [root, setRoot] = useState<MapNode | null>(null);
  const [maxDepth, setMaxDepth] = useState(3);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [doorCount, setDoorCount] = useState(1);
  const [monsterIndex, setMonsterIndex] = useState<number>(1);
  
  const nodeIdCounter = useRef({ value: 1 });
  const nodeElements = useRef(new Map<MapNode, SVGRectElement>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validator = useRef(new MapValidator());
  
  const minZoom = 0.1;
  const maxZoom = 2;
  const zoomStep = 0.1;

  useEffect(() => {
    generateMap();
  }, []);

  const generateMap = () => {
    nodeIdCounter.current = { value: 1 };
    const newRoot = new MapNode(nodeIdCounter.current.value++, 0, maxDepth, true);
    newRoot.generateChildren(maxDepth, nodeIdCounter.current);
    calculateNodePositions(newRoot);
    setRoot(newRoot);
    setSelectedNode(null);
  };

  const calculateNodePositions = (rootNode: MapNode) => {
    const nodeWidth = 140;
    const levelHeight = 150;
    const siblingSpacing = 20;
    
    const calculateSubtreeWidth = (node: MapNode): number => {
      if (node.children.length === 0) {
        node.subtreeWidth = nodeWidth;
        return nodeWidth;
      }
      
      let totalWidth = 0;
      node.children.forEach((child, index) => {
        totalWidth += calculateSubtreeWidth(child);
        if (index > 0) {
          totalWidth += siblingSpacing;
        }
      });
      
      node.subtreeWidth = Math.max(nodeWidth, totalWidth);
      return node.subtreeWidth;
    };
    
    calculateSubtreeWidth(rootNode);
    
    const positionNodes = (node: MapNode, x: number, y: number) => {
      node.x = x;
      node.y = y;
      
      if (node.children.length === 0) return;
      
      let currentX = x - (node.subtreeWidth! / 2);
      
      node.children.forEach((child) => {
        const childX = currentX + (child.subtreeWidth! / 2);
        positionNodes(child, childX, y + levelHeight);
        currentX += child.subtreeWidth! + siblingSpacing;
      });
    };
    
    const totalWidth = rootNode.subtreeWidth || 1000;
    const startX = Math.max(totalWidth / 2, 400);
    
    positionNodes(rootNode, startX, 50);
  };

  const selectNode = (node: MapNode) => {
    setSelectedNode(node);
    setDoorCount(node.doorCount);
    setMonsterIndex(node.monsterIndex1 || 1);
  };

  const applyNodeChanges = () => {
    if (!selectedNode || !root) return;

    if (selectedNode.roomType === 'BATTLE') {
      selectedNode.monsterIndex1 = monsterIndex;
    }

    if (doorCount !== selectedNode.doorCount) {
      selectedNode.updateDoorCount(doorCount, maxDepth, nodeIdCounter.current);
      calculateNodePositions(root);
    }
    
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

  const renderNode = (node: MapNode): React.ReactElement => {
    const getMonsterName = (index: number): string => {
      const monsters = ['', 'GOBLIN', 'THICC_GOBLIN', 'TROLL', 'ORC'];
      return monsters[index] || '';
    };

    const getNodeColor = () => {
      if (node.roomType === 'GOAL') return '#48bb78';
      if (node.monsterIndex1 === 1) return '#63b3ed';
      if (node.monsterIndex1 === 2) return '#f6ad55';
      if (node.monsterIndex1 === 3) return '#fc8181';
      if (node.monsterIndex1 === 4) return '#b794f4';
      return '#718096';
    };

    return (
      <g key={node.id}>
        {node.parent && (
          <line
            x1={node.parent.x}
            y1={node.parent.y + 25}
            x2={node.x}
            y2={node.y - 25}
            stroke="#cbd5e0"
            strokeWidth={2}
          />
        )}
        <g
          transform={`translate(${node.x}, ${node.y})`}
          style={{ cursor: 'pointer' }}
          onClick={() => selectNode(node)}
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
            {node.roomType}
          </text>
          <text y={10} fill="white" fontSize={11} fontWeight={500} textAnchor="middle">
            {node.roomType === 'BATTLE' ? getMonsterName(node.monsterIndex1) : ''}
          </text>
          <text y={25} fill="white" fontSize={10} textAnchor="middle">
            {node.roomType === 'BATTLE' ? `Doors: ${node.doorCount}` : ''}
          </text>
        </g>
        {node.children.map(child => renderNode(child))}
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
          <button className={styles.button} onClick={generateMap}>
            Generate Map
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
        <div className={styles.treeCanvas}>
          {root && (
            <div 
              className={styles.svgContainer}
              style={{ transform: `scale(${currentZoom})` }}
            >
              <svg
                width={Math.max((root.subtreeWidth || 0) + 200, 1000)}
                height={(maxDepth + 1) * 150 + 100}
              >
                {renderNode(root)}
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
              <label className={styles.editorLabel}>
                Room Type: <span className={styles.editorValue}>{selectedNode.roomType}</span>
              </label>
            </div>
            {selectedNode.roomType === 'BATTLE' && (
              <>
                <div className={styles.editorField}>
                  <label className={styles.editorLabel} htmlFor="doorCountSelect">
                    Door Count:
                  </label>
                  <select
                    id="doorCountSelect"
                    className={styles.select}
                    value={doorCount}
                    onChange={(e) => setDoorCount(parseInt(e.target.value))}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
                <div className={styles.editorField}>
                  <label className={styles.editorLabel} htmlFor="monsterSelect">
                    Monster Index:
                  </label>
                  <select
                    id="monsterSelect"
                    className={styles.select}
                    value={monsterIndex}
                    onChange={(e) => setMonsterIndex(parseInt(e.target.value))}
                  >
                    <option value={1}>1 - Goblin</option>
                    <option value={2}>2 - Thicc Goblin</option>
                    <option value={3}>3 - Troll</option>
                    <option value={4}>4 - Orc</option>
                  </select>
                </div>
              </>
            )}
            {selectedNode.roomType === 'GOAL' && (
              <div className={styles.editorField}>
                <label className={styles.editorLabel}>
                  This is a GOAL room (no monsters or doors)
                </label>
              </div>
            )}
            <button 
              className={`${styles.button} ${styles.applyButton}`}
              onClick={applyNodeChanges}
            >
              Apply Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}