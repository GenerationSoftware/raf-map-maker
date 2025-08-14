# Game Map Editor

[![Tests](https://github.com/GenerationSoftware/raf-map-maker/actions/workflows/tests.yml/badge.svg)](https://github.com/GenerationSoftware/raf-map-maker/actions/workflows/tests.yml)

A graph-based game map editor for creating dungeon layouts with monsters and rooms.

## Features

- **Graph-based map generation** with configurable depth (1-10 levels)
- **Shared goal nodes** - multiple paths can lead to the same destination
- **Dynamic monster loading** via GraphQL with difficulty scaling by depth
- **Interactive editing mode** - add/remove connections between nodes visually
- **Smart node positioning** - automatic layout with parent-child centering
- **Zoom controls** - zoom from 10% to 200% for easy navigation
- **Save/Load** - export and import maps as JSON files with validation
- **Visual feedback** - color-coded nodes by monster type and edit mode
- **Comprehensive test suite** - 95%+ code coverage with unit and integration tests

## Getting Started

### Prerequisites

The application requires a GraphQL endpoint for monster data. Set the endpoint URL in your environment:

```bash
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:42069/graphql
```

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
2. **Select a Node**: Click any node to select it and view its properties
3. **Edit Children Mode**: Toggle "Edit Children Mode" to modify connections
4. **Add/Remove Connections**: In edit mode, click nodes to add/remove them as children
5. **Add New Nodes**: Use the "Add Node" button to create new goal nodes
6. **Change Monster Type**: Select different monsters for battle nodes
7. **Navigate**: Use zoom controls to view large maps easily
8. **Save/Load**: Export your map as JSON or import existing maps

## Map Structure

Each node in the graph contains:
- `id`: Unique identifier (sequential starting from 1)
- `roomType`: Integer enum (0=NULL, 1=BATTLE, 2=GOAL)
- `monsterIndex1`: Monster index (16-bit unsigned integer) or null for non-battle rooms
- `nextRooms`: Array of 6 room IDs (0 means no connection)

Room types:
- **NULL (0)**: Starting nodes with no monsters
- **BATTLE (1)**: Combat rooms with monsters (1-6 connections)
- **GOAL (2)**: End rooms with no monsters or connections

## JSON Schema

The map data follows a strict schema defined in `public/map-schema.json`. This ensures data integrity when loading maps and provides validation for external tools.

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

The test suite includes:
- **Unit tests** for all core modules
- **Integration tests** for graph operations
- **End-to-end tests** covering the full generate→edit→save→load workflow
- **95%+ code coverage** ensuring reliability

## Architecture

The codebase is organized into clean, testable modules:

- `lib/types.ts` - Core data structures and MapNode class
- `lib/graph-operations.ts` - Graph traversal and manipulation
- `lib/map-generator.ts` - Map generation logic
- `lib/serialization.ts` - Save/load operations
- `lib/validator.ts` - JSON schema validation
- `components/MapEditor.tsx` - React UI component