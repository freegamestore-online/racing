import { describe, it, expect, vi, afterEach } from "vitest";
import { createInitialState, step } from "../logic";

afterEach(() => vi.restoreAllMocks());

describe("step", () => {
  it("flags list changes only on spawn and despawn; moves obstacles in place", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // always lane 0, which the player is not in
    const s = createInitialState();

    // Before the first spawn (nextSpawn 1.5s) nothing changes.
    expect(step(s, 0.05).listChanged).toBe(false);

    let spawned = false;
    for (let i = 0; i < 40 && !spawned; i++) spawned = step(s, 0.05).listChanged;
    expect(spawned).toBe(true);
    expect(s.obstacles).toHaveLength(1);

    // The obstacle advances every frame without a list change, so the scene
    // must follow obstacle.z itself rather than rely on a re-render.
    const obs = s.obstacles[0]!;
    const list = s.obstacles;
    const z = obs.z;
    const r = step(s, 0.05);
    expect(r.listChanged).toBe(false);
    expect(s.obstacles).toBe(list);
    expect(obs.z).toBeGreaterThan(z);

    // It eventually drives off the bottom and the list changes again.
    let despawned = false;
    for (let i = 0; i < 400 && !despawned; i++) {
      const before = s.obstacles;
      step(s, 0.05);
      despawned = !s.obstacles.includes(obs) && before !== s.obstacles;
    }
    expect(despawned).toBe(true);
  });

  it("reports a crash when an obstacle reaches the player's lane", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // lane 1, the player's lane
    const s = createInitialState();
    let crashed = false;
    for (let i = 0; i < 400 && !crashed; i++) crashed = step(s, 0.05).crashed;
    expect(crashed).toBe(true);
    expect(s.alive).toBe(false);
  });
});
