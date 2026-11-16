import { afterAll, describe, expect, it, vi } from "vitest";

const realGetBuiltinModule = process.getBuiltinModule.bind(process);
const builtinSpy = vi.spyOn(process, "getBuiltinModule").mockImplementation(((
  specifier: string,
) => {
  if (specifier === "node:async_hooks") {
    return {};
  }
  return realGetBuiltinModule(specifier);
}) as typeof process.getBuiltinModule);

const { callWithTokenSession, withTokenSessionLock } =
  await import("./tokenGeneration");

const sawAsyncHooksProbe = builtinSpy.mock.calls.some(
  (call) => call[0] === "node:async_hooks",
);
builtinSpy.mockRestore();

afterAll(() => {
  builtinSpy.mockRestore();
});

describe("token session lock without AsyncLocalStorage", () => {
  afterAll(() => {
    Reflect.deleteProperty(navigator, "locks");
  });

  it("rejects a same-turn nested lock and still runs a later caller", async () => {
    expect(sawAsyncHooksProbe).toBe(true);
    await expect(
      callWithTokenSession(() => withTokenSessionLock(async () => "inner")),
    ).rejects.toThrow(/Nested token session lock rejected/);

    await expect(withTokenSessionLock(async () => "after")).resolves.toBe(
      "after",
    );
  });

  it("queues another caller while one token operation is in progress", async () => {
    const order: string[] = [];
    let releaseFirst: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let enteredFirst: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      enteredFirst = resolve;
    });

    const first = withTokenSessionLock(async () => {
      order.push("first start");
      enteredFirst();
      await gate;
      order.push("first end");
    });
    await started;
    const second = withTokenSessionLock(async () => {
      order.push("second");
    });

    expect(order).toEqual(["first start"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first start", "first end", "second"]);
  });
});
