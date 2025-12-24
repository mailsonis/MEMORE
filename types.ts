
export enum ShapeType {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  TRIANGLE = 'TRIANGLE',
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
  STAR = 'STAR'
}

export enum ColoringScheme {
  SOLID = 'SOLID',
  VERTICAL_HALF = 'VERTICAL_HALF',
  HORIZONTAL_HALF = 'HORIZONTAL_HALF',
  QUARTERS = 'QUARTERS'
}

export interface GameSettings {
  enabledShapes: ShapeType[];
  enabledSchemes: ColoringScheme[];
}

export interface GeoShape {
  id: string;
  type: ShapeType;
  scheme: ColoringScheme;
  colors: string[]; // 1 to 4 colors depending on scheme
}

export enum GameState {
  MENU = 'MENU',
  OBSERVATION = 'OBSERVATION',
  RECOGNITION = 'RECOGNITION',
  FEEDBACK = 'FEEDBACK',
  GAME_OVER = 'GAME_OVER'
}

export enum GameMode {
  TRAINING = 'TRAINING',
  CHALLENGE = 'CHALLENGE',
  INFINITE = 'INFINITE'
}

export interface GameStats {
  score: number;
  level: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalTime: number;
  bestCombo: number;
}
