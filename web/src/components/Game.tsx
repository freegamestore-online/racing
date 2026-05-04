import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Obstacle } from "../types";

const LANE_X: [number, number, number] = [-2.5, 0, 2.5];
const ROAD_Z = 200;
const SPAWN_Z = -ROAD_Z / 2;
const DESPAWN_Z = 40;
const BASE_SPEED = 15;
const MAX_SPEED = 45;
const SPEED_RAMP = 0.3;
const SPAWN_INTERVAL_BASE = 1.2;
const SPAWN_INTERVAL_MIN = 0.4;

const CAR_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

interface GameProps {
  onScore: (score: number) => void;
  onGameOver: () => void;
}

interface GameState {
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
}

function createInitialState(): GameState {
  return {
    lane: 1,
    targetX: LANE_X[1],
    currentX: LANE_X[1],
    speed: BASE_SPEED,
    distance: 0,
    obstacles: [],
    nextSpawn: 0.5,
    obstacleId: 0,
    alive: true,
    time: 0,
  };
}

const WHEEL_POSITIONS: [number, number, number][] = [
  [-0.7, -0.2, 0.9],
  [0.7, -0.2, 0.9],
  [-0.7, -0.2, -0.9],
  [0.7, -0.2, -0.9],
];

function PlayerCar({ xRef }: { xRef: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (group.current && xRef.current !== undefined) {
      group.current.position.x = xRef.current;
    }
  });

  return (
    <group ref={group} position={[0, 0.4, 25]}>
      <mesh>
        <boxGeometry args={[1.4, 0.5, 3]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      <mesh position={[0, 0.4, 0.2]}>
        <boxGeometry args={[1.2, 0.4, 1.6]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      {WHEEL_POSITIONS.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.2, 0.3, 0.5]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function ObstacleCar({ obstacle }: { obstacle: Obstacle }) {
  const x = LANE_X[obstacle.lane] ?? 0;
  return (
    <group position={[x, 0.4, obstacle.z]}>
      <mesh>
        <boxGeometry args={[1.4, 0.5, 3]} />
        <meshStandardMaterial color={obstacle.color} />
      </mesh>
      <mesh position={[0, 0.4, -0.2]}>
        <boxGeometry args={[1.2, 0.4, 1.6]} />
        <meshStandardMaterial color={obstacle.color} metalness={0.3} roughness={0.7} />
      </mesh>
      {WHEEL_POSITIONS.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.2, 0.3, 0.5]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Road() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD_Z / 4]}>
        <planeGeometry args={[9, ROAD_Z]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, -0.01, -ROAD_Z / 4]}>
        <planeGeometry args={[16, ROAD_Z]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, -0.01, -ROAD_Z / 4]}>
        <planeGeometry args={[16, ROAD_Z]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh
          key={`l${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-1.25, 0.01, -i * 5 + ROAD_Z / 4]}
        >
          <planeGeometry args={[0.15, 2]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      ))}
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh
          key={`r${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[1.25, 0.01, -i * 5 + ROAD_Z / 4]}
        >
          <planeGeometry args={[0.15, 2]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.4, 0.01, -ROAD_Z / 4]}>
        <planeGeometry args={[0.2, ROAD_Z]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.4, 0.01, -ROAD_Z / 4]}>
        <planeGeometry args={[0.2, ROAD_Z]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function GameScene({ onScore, onGameOver }: GameProps) {
  const state = useRef<GameState>(createInitialState());
  const playerX = useRef<number>(LANE_X[1]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const forceUpdate = useRef(0);
  const meshGroupRef = useRef<THREE.Group>(null!);
  const touchStartRef = useRef<number | null>(null);
  const onScoreRef = useRef(onScore);
  const onGameOverRef = useRef(onGameOver);
  onScoreRef.current = onScore;
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = state.current;
      if (!s.alive) return;
      if (e.key === "ArrowLeft" || e.key === "a") {
        if (s.lane > 0) {
          s.lane--;
          s.targetX = LANE_X[s.lane]!;
        }
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        if (s.lane < 2) {
          s.lane++;
          s.targetX = LANE_X[s.lane]!;
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) touchStartRef.current = touch.clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (!touch || touchStartRef.current === null) return;
      const dx = touch.clientX - touchStartRef.current;
      touchStartRef.current = null;
      if (Math.abs(dx) < 30) return;
      const s = state.current;
      if (!s.alive) return;
      if (dx < 0 && s.lane > 0) {
        s.lane--;
        s.targetX = LANE_X[s.lane]!;
      } else if (dx > 0 && s.lane < 2) {
        s.lane++;
        s.targetX = LANE_X[s.lane]!;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useFrame((_, delta) => {
    const s = state.current;
    if (!s.alive) return;

    const dt = Math.min(delta, 0.05);
    s.time += dt;
    s.speed = Math.min(MAX_SPEED, BASE_SPEED + s.time * SPEED_RAMP);
    s.distance += s.speed * dt;
    onScoreRef.current(Math.floor(s.distance));

    // Smooth lane change
    s.currentX += (s.targetX - s.currentX) * Math.min(1, dt * 12);
    playerX.current = s.currentX;

    // Spawn obstacles
    s.nextSpawn -= dt;
    if (s.nextSpawn <= 0) {
      const interval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_BASE - s.time * 0.01);
      s.nextSpawn = interval + Math.random() * interval * 0.5;
      const lane = Math.floor(Math.random() * 3);
      const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]!;
      s.obstacles.push({ id: s.obstacleId++, lane, z: SPAWN_Z, color });
    }

    // Move obstacles
    for (const obs of s.obstacles) {
      obs.z += s.speed * dt;
    }
    s.obstacles = s.obstacles.filter((o) => o.z < DESPAWN_Z);

    // Collision
    const px = s.currentX;
    const pz = 25;
    for (const obs of s.obstacles) {
      const ox = LANE_X[obs.lane] ?? 0;
      if (Math.abs(px - ox) < 1.3 && Math.abs(pz - obs.z) < 2.5) {
        s.alive = false;
        onGameOverRef.current();
        return;
      }
    }

    obstaclesRef.current = [...s.obstacles];
    forceUpdate.current++;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 15, 10]} intensity={1} />
      <fog attach="fog" args={["#0f172a", 60, 120]} />
      <color attach="background" args={["#0f172a"]} />
      <Road />
      <PlayerCar xRef={playerX} />
      <group ref={meshGroupRef}>
        {obstaclesRef.current.map((obs) => (
          <ObstacleCar key={obs.id} obstacle={obs} />
        ))}
      </group>
    </>
  );
}

export function Game({ onScore, onGameOver }: GameProps) {
  return (
    <Canvas
      camera={{ position: [0, 12, 35], fov: 60, near: 0.1, far: 200 }}
      style={{ width: "100%", height: "100%" }}
    >
      <GameScene onScore={onScore} onGameOver={onGameOver} />
    </Canvas>
  );
}
