import { describe, expect, it } from "vitest";
import {
  advanceTokenGeneration,
  getTokenGeneration,
  withTokenWriteLock,
} from "./tokenGeneration";

describe("tokenGeneration", () => {
  it("advances the generation", () => {
    const before = getTokenGeneration();
    advanceTokenGeneration();
    expect(getTokenGeneration()).toBe(before + 1);
  });

  it("runs writers one at a time, in call order", async () => {
    const order: string[] = [];
    let releaseFirst: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = withTokenWriteLock(async () => {
      order.push("first start");
      await gate;
      order.push("first end");
    });
    const second = withTokenWriteLock(async () => {
      order.push("second");
    });

    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first start", "first end", "second"]);
  });

  it("keeps the queue running after a writer fails", async () => {
    await expect(
      withTokenWriteLock(async () => {
        throw new Error("write failed");
      }),
    ).rejects.toThrow("write failed");
    await expect(withTokenWriteLock(async () => "ok")).resolves.toBe("ok");
  });
});
