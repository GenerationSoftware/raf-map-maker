# Game Map Editor

A tree-based game map editor for creating dungeon layouts with monsters and rooms.

## Features

- **Tree-based map generation** with configurable depth (1-10 levels)
- **Monster types** with difficulty scaling by depth:
  - Goblin (easiest, blue)
  - Thicc Goblin (orange)
  - Troll (red)  
  - Orc (hardest, purple)
- **Interactive editing** - click nodes to modify door counts and monster types
- **Zoom controls** - zoom from 10% to 200% for easy navigation
- **Save/Load** - export and import maps as JSON files
- **Visual feedback** - color-coded nodes by monster type

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## How to Use

1. **Generate a Map**: Set the desired depth and click "Generate Map"
2. **Edit Nodes**: Click any node to select it and modify its properties
3. **Change Door Count**: Adjusts the number of child nodes (1-4)
4. **Change Monster Type**: Select different monsters for any node (including root)
5. **Navigate**: Use zoom controls to view large maps easily
6. **Save/Load**: Export your map as JSON or import existing maps

## Map Structure

Each node in the tree contains:
- `id`: Unique identifier
- `depth`: Level in the tree (0 for root)
- `roomType`: Either "ROOT" or "MONSTER"
- `doorCount`: Number of child nodes (0-4)
- `monsterIndex1`: Monster type (can be any monster type or null for root nodes)
- `children`: Array of child nodes

## JSON Schema

The map data follows a strict schema defined in `public/map-schema.json`. This ensures data integrity when loading maps and provides validation for external tools.