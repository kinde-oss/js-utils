import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalStorage } from "./localStorage";
import { StorageKeys } from "../types";
import { storageSettings } from "..";

enum ExtraKeys {
  testKey = "testKey2",
}

const localStorageMock = (function () {
  let store: { [key: string]: string } = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();
vi.stubGlobal("localStorage", localStorageMock);

describe("LocalStorage standard keys", () => {
  let sessionManager: LocalStorage;
  const consoleSpy = vi.spyOn(console, "warn");

  beforeEach(() => {
    sessionManager = new LocalStorage();
  });

  it("should show warning when using local storage access token explicity", () => {
    consoleSpy.mockReset();

    storageSettings.useInsecureForRefreshToken = true;
    new LocalStorage();
    expect(consoleSpy).toHaveBeenCalledWith(
      "LocalStorage store should not be used in production",
    );
    storageSettings.useInsecureForRefreshToken = false;
  });

  it("should not show warning when using secure refresh tokens", () => {
    consoleSpy.mockReset();
    storageSettings.useInsecureForRefreshToken = false;
    new LocalStorage();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("should set and get an item in session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );
  });

  it("should remove an item from session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    await sessionManager.removeSessionItem(StorageKeys.accessToken);
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should clear all items from session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );
    sessionManager.destroySession();
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should clear all items from session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, true);
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "true",
    );
    sessionManager.destroySession();
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });
});

describe("LocalStorage keys: storageKeys", () => {
  let sessionManager: LocalStorage<ExtraKeys>;

  beforeEach(() => {
    sessionManager = new LocalStorage<ExtraKeys>();
  });

  it("should set and get an item in storage: StorageKeys", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );
  });

  it("should remove an item from storage: StorageKeys", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    await sessionManager.removeSessionItem(StorageKeys.accessToken);
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should clear all items from storage: StorageKeys", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    sessionManager.destroySession();
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should set and get an item in extra storage", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBe(
      "testValue",
    );
  });

  it("should remove an item from extra storage", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBe(
      "testValue",
    );

    sessionManager.removeSessionItem(ExtraKeys.testKey);
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBeNull();
  });

  it("should clear all items from extra storage", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBe(
      "testValue",
    );

    sessionManager.destroySession();
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBeNull();
  });
});

describe("LocalStorage subscription/listening mechanism", () => {
  let sessionManager: LocalStorage;

  beforeEach(() => {
    sessionManager = new LocalStorage();
    localStorageMock.clear();
  });

  it("should call listener when item is set", async () => {
    let listenerCalled = false;
    const listener = () => {
      listenerCalled = true;
    };

    sessionManager.subscribe(listener);
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");

    // Wait for setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listenerCalled).toBe(true);
  });

  it("should call listener when item is removed", async () => {
    let listenerCalled = false;
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");

    const listener = () => {
      listenerCalled = true;
    };

    sessionManager.subscribe(listener);
    await sessionManager.removeSessionItem(StorageKeys.accessToken);

    // Wait for setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listenerCalled).toBe(true);
  });

  it("should call listener when session is destroyed", async () => {
    let listenerCalled = false;
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");

    const listener = () => {
      listenerCalled = true;
    };

    sessionManager.subscribe(listener);
    await sessionManager.destroySession();

    // Wait for setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listenerCalled).toBe(true);
  });

  it("should support multiple listeners", async () => {
    let listener1Called = false;
    let listener2Called = false;
    let listener3Called = false;

    const listener1 = () => {
      listener1Called = true;
    };
    const listener2 = () => {
      listener2Called = true;
    };
    const listener3 = () => {
      listener3Called = true;
    };

    sessionManager.subscribe(listener1);
    sessionManager.subscribe(listener2);
    sessionManager.subscribe(listener3);

    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");

    // Wait for setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listener1Called).toBe(true);
    expect(listener2Called).toBe(true);
    expect(listener3Called).toBe(true);
  });

  it("should support asynchronous listeners", async () => {
    let asyncListenerCalled = false;
    let asyncListenerValue = "";

    const asyncListener = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      asyncListenerCalled = true;
      asyncListenerValue = (await sessionManager.getSessionItem(
        StorageKeys.accessToken,
      )) as string;
    };

    sessionManager.subscribe(asyncListener);
    await sessionManager.setSessionItem(StorageKeys.accessToken, "asyncTest");

    // Wait for setTimeout to fire and async listener to complete
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(asyncListenerCalled).toBe(true);
    expect(asyncListenerValue).toBe("asyncTest");
  });

  it("should support mix of synchronous and asynchronous listeners", async () => {
    let syncCalled = false;
    let asyncCalled = false;

    const syncListener = () => {
      syncCalled = true;
    };

    const asyncListener = async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      asyncCalled = true;
    };

    sessionManager.subscribe(syncListener);
    sessionManager.subscribe(asyncListener);

    await sessionManager.setSessionItem(StorageKeys.idToken, "mixedTest");

    // Wait for setTimeout to fire and async listener to complete
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(syncCalled).toBe(true);
    expect(asyncCalled).toBe(true);
  });

  it("should unsubscribe listener when unsubscribe function is called", async () => {
    let listenerCalled = false;

    const listener = () => {
      listenerCalled = true;
    };

    const unsubscribe = sessionManager.subscribe(listener);

    // First change should trigger listener
    await sessionManager.setSessionItem(StorageKeys.accessToken, "test1");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(listenerCalled).toBe(true);

    // Reset and unsubscribe
    listenerCalled = false;
    unsubscribe();

    // Second change should not trigger listener
    await sessionManager.setSessionItem(StorageKeys.accessToken, "test2");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(listenerCalled).toBe(false);
  });

  it("should batch multiple synchronous calls into single notification", async () => {
    let callCount = 0;

    const listener = () => {
      callCount++;
    };

    sessionManager.subscribe(listener);

    // Perform multiple operations synchronously
    const promise1 = sessionManager.setSessionItem(
      StorageKeys.accessToken,
      "value1",
    );
    const promise2 = sessionManager.setSessionItem(
      StorageKeys.idToken,
      "value2",
    );
    const promise3 = sessionManager.setSessionItem(
      StorageKeys.refreshToken,
      "value3",
    );

    await Promise.all([promise1, promise2, promise3]);

    // Wait for setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    // With setTimeout batching, multiple synchronous calls should be batched into one
    expect(callCount).toBe(1);
  });

  it("should allow same listener to be subscribed multiple times", async () => {
    let callCount = 0;

    const listener = () => {
      callCount++;
    };

    // Subscribe same listener twice
    sessionManager.subscribe(listener);
    sessionManager.subscribe(listener);

    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");

    // Wait for setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Since Set is used, listener should only be called once
    expect(callCount).toBe(1);
  });

  it("should support unsubscribing one instance while keeping others", async () => {
    let listener1Called = false;
    let listener2Called = false;

    const listener1 = () => {
      listener1Called = true;
    };

    const listener2 = () => {
      listener2Called = true;
    };

    const unsubscribe1 = sessionManager.subscribe(listener1);
    sessionManager.subscribe(listener2);

    // Unsubscribe first listener
    unsubscribe1();

    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");

    // Wait for setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listener1Called).toBe(false);
    expect(listener2Called).toBe(true);
  });

  it("should notify listeners on setItems batch operation", async () => {
    let listenerCallCount = 0;

    const listener = () => {
      listenerCallCount++;
    };

    sessionManager.subscribe(listener);

    await sessionManager.setItems({
      [StorageKeys.accessToken]: "token1",
      [StorageKeys.idToken]: "token2",
      [StorageKeys.refreshToken]: "token3",
    });

    // Wait for setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 0));

    // With batching, setItems should trigger listener only once
    expect(listenerCallCount).toBe(1);
  });

  it("should not batch multiple calls when operations are separated by setTimeout boundaries", async () => {
    const callLog: string[] = [];

    const listener = () => {
      callLog.push("listener called");
    };

    sessionManager.subscribe(listener);

    // Set item
    await sessionManager.setSessionItem(StorageKeys.accessToken, "test1");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Remove item
    await sessionManager.removeSessionItem(StorageKeys.accessToken);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Set another item
    await sessionManager.setSessionItem(StorageKeys.idToken, "test2");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Each operation should trigger the listener when awaited between operations
    expect(callLog.length).toBe(3);
  });
});
