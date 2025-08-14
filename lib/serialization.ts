import { MapNode, MapNodeData } from './types';
import { MapValidator } from './validator';

/**
 * Serialize a map to JSON string
 */
export function serializeMap(root: MapNode): string {
  const data = root.toFlatJSON();
  return JSON.stringify(data, null, 2);
}

/**
 * Deserialize a JSON string to a map
 */
export function deserializeMap(jsonString: string): { root: MapNode | null; errors: string[] } {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate the data
    const validator = new MapValidator();
    if (!validator.validate(data)) {
      return { root: null, errors: validator.getErrors() };
    }
    
    // Reconstruct the map
    if (Array.isArray(data)) {
      const root = MapNode.fromFlatJSON(data as MapNodeData[]);
      if (!root) {
        return { root: null, errors: ['Could not reconstruct tree from data'] };
      }
      return { root, errors: [] };
    } else {
      return { root: null, errors: ['Invalid map file: Expected flat array format'] };
    }
  } catch (error) {
    return { root: null, errors: [`Error parsing JSON: ${(error as Error).message}`] };
  }
}

/**
 * Export map to a file-ready format
 */
export function exportMapToFile(root: MapNode): Blob {
  const data = serializeMap(root);
  return new Blob([data], { type: 'application/json' });
}