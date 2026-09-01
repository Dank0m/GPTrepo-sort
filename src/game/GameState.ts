export const GameState = {
  Loading: "loading",
  Tutorial: "tutorial",
  Playing: "playing",
  LevelComplete: "levelComplete",
  Upgrade: "upgrade",
  Paused: "paused",
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

const ALLOWED: Record<GameState, GameState[]> = {
  [GameState.Loading]: [GameState.Tutorial, GameState.Playing],
  [GameState.Tutorial]: [GameState.Playing],
  [GameState.Playing]: [GameState.LevelComplete, GameState.Paused],
  [GameState.LevelComplete]: [GameState.Playing, GameState.Upgrade],
  [GameState.Upgrade]: [GameState.Playing],
  [GameState.Paused]: [GameState.Playing],
};

export function canEnter(from: GameState, to: GameState): boolean {
  return ALLOWED[from].includes(to);
}
