import { afterEach, describe, expect, it, vi } from "vitest";
import { storageSettings } from "../sessionManager";
import {
  createTokenRequestDeadline,
  withTokenSessionLock,
} from "./tokenGeneration";

describe("withTokenSessionLock", () => {
  const originalPrefix = storageSettings.keyPrefix;

  afterEach(() => {
    storageSettings.keyPrefix = originalPrefix;
    Reflect.deleteProperty(navigator, "locks");
  });

  it("runs callers one at a time, in call order, without the Web Locks API", async () => {
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
    const second = withTokenSessionLock(async () => {
      order.push("second");
    });

    await started;
    expect(order).toEqual(["first start"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first start", "first end", "second"]);
  });

  it("keeps later callers running after one fails", async () => {
    await expect(
      withTokenSessionLock(async () => {
        throw new Error("write failed");
      }),
    ).rejects.toThrow("write failed");
    await expect(withTokenSessionLock(async () => "ok")).resolves.toBe("ok");
  });

  it("requests an exclusive lock named with the storage prefix", async () => {
    storageSettings.keyPrefix = "app-";
    const request = vi.fn(
      async (_name: string, callback: () => Promise<string>) => callback(),
    );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request },
    });

    await expect(withTokenSessionLock(async () => "locked")).resolves.toBe(
      "locked",
    );

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("kinde:token-session:app-");
    expect(request.mock.calls[0]).toHaveLength(2);
  });

  it("rejects a nested call after an await instead of waiting on the held lock", async () => {
    await expect(
      withTokenSessionLock(async () => {
        await Promise.resolve();
        return withTokenSessionLock(async () => "inner");
      }),
    ).rejects.toThrow(/Nested token session lock rejected/);

    await expect(withTokenSessionLock(async () => "after")).resolves.toBe(
      "after",
    );
  });

  it("rejects a nested Web Lock request without re-requesting the held lock", async () => {
    let held = false;
    const request = vi.fn(
      async (_name: string, callback: () => Promise<unknown>) => {
        if (held) {
          return new Promise(() => {});
        }
        held = true;
        try {
          return await callback();
        } finally {
          held = false;
        }
      },
    );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request },
    });

    await expect(
      withTokenSessionLock(async () => {
        await Promise.resolve();
        return withTokenSessionLock(async () => "inner");
      }),
    ).rejects.toThrow(/Nested token session lock rejected/);
    expect(request).toHaveBeenCalledTimes(1);

    await expect(withTokenSessionLock(async () => "after")).resolves.toBe(
      "after",
    );
  });

  it("returns the task failure from the Web Locks request", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: (_name: string, callback: () => Promise<unknown>) =>
          callback(),
      },
    });

    await expect(
      withTokenSessionLock(async () => {
        throw new Error("lock failed");
      }),
    ).rejects.toThrow("lock failed");
  });
});

describe("createTokenRequestDeadline", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("aborts an open signal when the deadline has elapsed before the body is read", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const deadline = createTokenRequestDeadline(1_000);
    const abort = vi.spyOn(AbortController.prototype, "abort");
    vi.setSystemTime(1_000);

    const read = vi.fn(() => Promise.resolve("body"));
    await expect(deadline.readBody(read)).rejects.toMatchObject({
      name: "TimeoutError",
    });

    expect(read).not.toHaveBeenCalled();
    expect(deadline.signal.aborted).toBe(true);
    expect(deadline.signal.reason).toMatchObject({ name: "TimeoutError" });
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it("aborts an open signal when the body arrives after the deadline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const deadline = createTokenRequestDeadline(1_000);
    let resolveBody: (value: string) => void = () => {};
    const pending = deadline.readBody(
      () =>
        new Promise<string>((resolve) => {
          resolveBody = resolve;
        }),
    );
    const abort = vi.spyOn(AbortController.prototype, "abort");
    vi.setSystemTime(1_000);
    resolveBody("body");

    await expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
    expect(deadline.signal.aborted).toBe(true);
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it("does not abort again when the signal is already aborted", async () => {
    vi.useFakeTimers();
    const deadline = createTokenRequestDeadline(1_000);
    let resolveBody: (value: string) => void = () => {};
    const pending = deadline.readBody(
      () =>
        new Promise<string>((resolve) => {
          resolveBody = resolve;
        }),
    );
    const assertion = expect(pending).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await vi.advanceTimersByTimeAsync(1_000);
    const abort = vi.spyOn(AbortController.prototype, "abort");
    resolveBody("body");
    await assertion;
    await expect(
      deadline.readBody(() => Promise.resolve("again")),
    ).rejects.toMatchObject({
      name: "TimeoutError",
    });

    expect(abort).not.toHaveBeenCalled();
  });
});
