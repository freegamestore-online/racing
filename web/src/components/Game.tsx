import { useRef, useEffect, useState } from "react";
import { useGameSounds } from "@freegamestore/games";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Obstacle } from "../types";
import { LANE_X, PLAYER_Z, ROAD_Z, createInitialState, step, type GameState } from "../logic";

interface GameProps {
  onScore: (score: number) => void;
  onGameOver: () => void;
  paused?: boolean;
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
    <group ref={group} position={[0, 0.4, PLAYER_Z]}>
      {/* Car body */}
      <mesh>
        <boxGeometry args={[1.4, 0.5, 3]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.4, 0.2]}>
        <boxGeometry args={[1.2, 0.4, 1.6]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      {/* Windshield highlight */}
      <mesh position={[0, 0.45, -0.5]}>
        <boxGeometry args={[1.0, 0.3, 0.05]} />
        <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.3} />
      </mesh>
      {/* Tail lights */}
      <mesh position={[-0.5, 0.15, 1.51]}>
        <boxGeometry args={[0.3, 0.15, 0.02]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff3333" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.5, 0.15, 1.51]}>
        <boxGeometry args={[0.3, 0.15, 0.02]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff3333" emissiveIntensity={0.8} />
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
  const group = useRef<THREE.Group>(null!);
  const x = LANE_X[obstacle.lane] ?? 0;

  // The game step moves obstacle.z in place; follow it every frame.
  useFrame(() => {
    group.current.position.z = obstacle.z;
  });

  return (
    <group ref={group} position={[x, 0.4, obstacle.z]}>
      {/* Car body */}
      <mesh>
        <boxGeometry args={[1.4, 0.5, 3]} />
        <meshStandardMaterial color={obstacle.color} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.4, -0.2]}>
        <boxGeometry args={[1.2, 0.4, 1.6]} />
        <meshStandardMaterial color={obstacle.color} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Headlights (facing player) */}
      <mesh position={[-0.45, 0.15, 1.51]}>
        <boxGeometry args={[0.25, 0.2, 0.02]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.0} />
      </mesh>
      <mesh position={[0.45, 0.15, 1.51]}>
        <boxGeometry args={[0.25, 0.2, 0.02]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.0} />
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

function Road({ roadOffsetRef }: { roadOffsetRef: React.RefObject<number> }) {
  const dashesLeftRef = useRef<THREE.Group>(null!);
  const dashesRightRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    const offset = roadOffsetRef.current ?? 0;
    if (dashesLeftRef.current) dashesLeftRef.current.position.z = offset % 5;
    if (dashesRightRef.current) dashesRightRef.current.position.z = offset % 5;
  });

  return (
    <group>
      {/* Road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD_Z / 4]}>
        <planeGeometry args={[9, ROAD_Z]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Grass left */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, -0.01, -ROAD_Z / 4]}>
        <planeGeometry args={[16, ROAD_Z]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
      {/* Grass right */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, -0.01, -ROAD_Z / 4]}>
        <planeGeometry args={[16, ROAD_Z]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
      {/* Lane dashes - left lane divider (scrolling) */}
      <group ref={dashesLeftRef}>
        {Array.from({ length: 50 }).map((_, i) => (
          <mesh
            key={`l${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-1.25, 0.01, -i * 5 + ROAD_Z / 4]}
          >
            <planeGeometry args={[0.15, 2.5]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        ))}
      </group>
      {/* Lane dashes - right lane divider (scrolling) */}
      <group ref={dashesRightRef}>
        {Array.from({ length: 50 }).map((_, i) => (
          <mesh
            key={`r${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[1.25, 0.01, -i * 5 + ROAD_Z / 4]}
          >
            <planeGeometry args={[0.15, 2.5]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        ))}
      </group>
      {/* Road edge lines (solid white) */}
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

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 14, 38);
    camera.lookAt(0, 0, 5);
  }, [camera]);
  return null;
}

function GameScene({ onScore, onGameOver, paused }: GameProps) {
  const state = useRef<GameState>(createInitialState());
  const playerX = useRef<number>(LANE_X[1]);
  const roadOffsetRef = useRef<number>(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const onScoreRef = useRef(onScore);
  const onGameOverRef = useRef(onGameOver);
  const pausedRef = useRef(paused);
  const sounds = useGameSounds();
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const { gl } = useThree();
  onScoreRef.current = onScore;
  onGameOverRef.current = onGameOver;
  pausedRef.current = paused;

  const changeLane = (dir: -1 | 1) => {
    const s = state.current;
    if (!s.alive || pausedRef.current) return;
    const newLane = s.lane + dir;
    if (newLane >= 0 && newLane <= 2) {
      s.lane = newLane;
      s.targetX = LANE_X[s.lane]!;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") {
        changeLane(-1);
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        changeLane(1);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (!touch || touchStartRef.current === null) return;
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;
      touchStartRef.current = null;

      // If it was a quick tap (< 200ms) with minimal movement, use tap-based controls
      if (elapsed < 200 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        const rect = gl.domElement.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (touch.clientX < midX) {
          changeLane(-1);
        } else {
          changeLane(1);
        }
        return;
      }

      // Swipe detection with lower threshold
      if (Math.abs(dx) < 20) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.5) return; // Ignore mostly-vertical swipes
      if (dx < 0) {
        changeLane(-1);
      } else {
        changeLane(1);
      }
    };

    // Touch on the canvas only: the on-screen arrow buttons and the topbar
    // handle their own taps, so window-level touch would change lane twice.
    const canvas = gl.domElement;
    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const s = state.current;
    if (!s.alive || pausedRef.current) return;

    const dt = Math.min(delta, 0.05);
    const { listChanged, crashed } = step(s, dt);
    onScoreRef.current(Math.floor(s.distance));
    playerX.current = s.currentX;
    roadOffsetRef.current = s.roadOffset;
    if (listChanged) setObstacles(s.obstacles);
    if (crashed) {
      soundsRef.current.playGameOver();
      onGameOverRef.current();
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 20, 10]} intensity={1.2} />
      <directionalLight position={[-5, 10, -10]} intensity={0.3} />
      <fog attach="fog" args={["#0f172a", 80, 140]} />
      <color attach="background" args={["#0f172a"]} />
      <CameraRig />
      <Road roadOffsetRef={roadOffsetRef} />
      <PlayerCar xRef={playerX} />
      {obstacles.map((obs) => (
        <ObstacleCar key={obs.id} obstacle={obs} />
      ))}
    </>
  );
}

function MobileControls({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  return (
    <div
      className="absolute bottom-4 left-0 right-0 flex justify-between px-4 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          onLeft();
        }}
        className="pointer-events-auto select-none"
        style={{
          width: 64,
          height: 64,
          borderRadius: "1.25rem",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff",
          fontSize: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
        }}
        aria-label="Move left"
      >
        &#9664;
      </button>
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          onRight();
        }}
        className="pointer-events-auto select-none"
        style={{
          width: 64,
          height: 64,
          borderRadius: "1.25rem",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff",
          fontSize: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
        }}
        aria-label="Move right"
      >
        &#9654;
      </button>
    </div>
  );
}

export function Game({ onScore, onGameOver, paused }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = containerRef.current?.clientWidth ?? window.innerWidth;
      setIsMobile(w < 768 || "ontouchstart" in window);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 14, 38], fov: 55, near: 0.1, far: 250 }}
        style={{ width: "100%", height: "100%" }}
      >
        <GameScene onScore={onScore} onGameOver={onGameOver} paused={paused} />
      </Canvas>
      {isMobile && (
        <MobileControls
          onLeft={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
          }}
          onRight={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
          }}
        />
      )}
    </div>
  );
}
