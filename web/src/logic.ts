import type { Obstacle } from "./types";

export const LANE_X: [number, number, number] = [-2.5, 0, 2.5];
export const ROAD_Z = 200;
export const PLAYER_Z = 25;
const SPAWN_Z = -ROAD_Z / 2;
const DESPAWN_Z = 40;
const BASE_SPEED = 10;
const MAX_SPEED = 35;
const SPEED_RAMP = 0.15;
const SPAWN_INTERVAL_BASE = 1.6;
const SPAWN_INTERVAL_MIN = 0.5;

const CAR_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#f97316"];

export interface GameState {
  lane: number;
  targetX: number;
  currentX: number;
  speed: number;
  distance: number;
  obstacles: Obstacle[];
  nextSpawn: number;
  obstacleId: number;
  alive: boolean;
  time: number;
  roadOffset: number;
  lastSpawnLanes: number[];
}

export function createInitialState(): GameState {
  return {
    lane: 1,
    targetX: LANE_X[1],
    currentX: LANE_X[1],
    speed: BASE_SPEED,
    distance: 0,
    obstacles: [],
    nextSpawn: 1.5,
    obstacleId: 0,
    alive: true,
    time: 0,
    roadOffset: 0,
    lastSpawnLanes: [],
  };
}

/**
 * Advance the game by dt seconds, mutating s. Obstacles move in place; a new
 * array is assigned to s.obstacles only when one spawns or despawns, and
 * `listChanged` reports that so the scene re-renders its obstacle list.
 */
export function step(s: GameState, dt: number): { listChanged: boolean; crashed: boolean } {
  let listChanged = false;
  s.time += dt;
  s.speed = Math.min(MAX_SPEED, BASE_SPEED + s.time * SPEED_RAMP);
  s.distance += s.speed * dt;

  // Smooth lane change - faster and more responsive
  const laneChangeLerp = Math.min(1, dt * 18);
  s.currentX += (s.targetX - s.currentX) * laneChangeLerp;

  // Scroll road markings
  s.roadOffset += s.speed * dt;

  // Spawn obstacles
  s.nextSpawn -= dt;
  if (s.nextSpawn <= 0) {
    const interval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_BASE - s.time * 0.008);
    s.nextSpawn = interval + Math.random() * interval * 0.4;

    // Pick a lane, but avoid spawning in same lane as last obstacle too often
    let lane = Math.floor(Math.random() * 3);
    if (s.lastSpawnLanes.length >= 2 && s.lastSpawnLanes.every((l) => l === lane)) {
      // Force a different lane
      const options = [0, 1, 2].filter((l) => l !== lane);
      lane = options[Math.floor(Math.random() * options.length)]!;
    }
    s.lastSpawnLanes = [...s.lastSpawnLanes.slice(-2), lane];

    // Don't spawn if there's already a close obstacle in that lane (see #4)
    const tooClose = s.obstacles.some((o) => o.lane === lane && o.z > SPAWN_Z + 8);
    if (!tooClose) {
      const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]!;
      s.obstacles = [...s.obstacles, { id: s.obstacleId++, lane, z: SPAWN_Z, color }];
      listChanged = true;
    }
  }

  // Move obstacles
  for (const obs of s.obstacles) {
    obs.z += s.speed * dt;
  }
  if (s.obstacles.some((o) => o.z >= DESPAWN_Z)) {
    s.obstacles = s.obstacles.filter((o) => o.z < DESPAWN_Z);
    listChanged = true;
  }

  // Collision - slightly more forgiving
  const px = s.currentX;
  for (const obs of s.obstacles) {
    const ox = LANE_X[obs.lane] ?? 0;
    if (Math.abs(px - ox) < 1.1 && Math.abs(PLAYER_Z - obs.z) < 2.2) {
      s.alive = false;
      return { listChanged, crashed: true };
    }
  }

  return { listChanged, crashed: false };
}
