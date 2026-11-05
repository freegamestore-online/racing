export interface Obstacle {
  id: number;
  lane: number;
  z: number;
  color: string;
}

export type GamePhase = "playing" | "over";
