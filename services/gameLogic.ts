
import { ShapeType, ColoringScheme, GeoShape, GameMode, GameSettings } from '../types';
import { COLORS } from '../constants';

const getRandomFromList = <T>(list: T[]): T => {
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
};

const getRandomColors = (count: number): string[] => {
  const shuffled = [...COLORS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const generateRandomShape = (settings: GameSettings): GeoShape => {
  const type = getRandomFromList(settings.enabledShapes);
  const scheme = getRandomFromList(settings.enabledSchemes);
  
  let colorCount = 1;
  if (scheme === ColoringScheme.VERTICAL_HALF || scheme === ColoringScheme.HORIZONTAL_HALF) colorCount = 2;
  if (scheme === ColoringScheme.QUARTERS) colorCount = 4;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    scheme,
    colors: getRandomColors(colorCount)
  };
};

export const generateUniqueShapes = (count: number, settings: GameSettings, existing: GeoShape[] = []): GeoShape[] => {
  const shapes: GeoShape[] = [...existing];
  // Safety break to prevent infinite loops if pool is too small
  let attempts = 0;
  const maxAttempts = 500;

  while (shapes.length < count && attempts < maxAttempts) {
    attempts++;
    const newShape = generateRandomShape(settings);
    const isDuplicate = shapes.some(s => 
      s.type === newShape.type && 
      s.scheme === newShape.scheme && 
      JSON.stringify(s.colors) === JSON.stringify(newShape.colors)
    );
    if (!isDuplicate) {
      shapes.push(newShape);
    }
  }
  return shapes;
};

export const getDifficultyParams = (level: number, mode: GameMode) => {
  const memoCount = Math.min(12, 3 + Math.floor(level / 2));
  const viewTime = Math.max(3, 10 - level * 0.5);
  const gridCount = Math.min(48, 8 + level * 4);
  
  return { memoCount, viewTime, gridCount };
};
