import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage, getFlag } from ".";
import { createMockAccessToken } from "./testUtils";

const storage = new MemoryStorage();

describe("getFlag - Hasura", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.accessToken);
    const idToken = await getFlag("test");

    expect(idToken).toStrictEqual(null);
  });

  it("boolean true", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        ["x-hasura-feature-flags"]: {
          test: {
            v: true,
            t: "b",
          },
        },
      }),
    );
    const idToken = await getFlag<boolean>("test");

    expect(idToken).toStrictEqual(true);
  });

  it("boolean false", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        ["x-hasura-feature-flags"]: {
          test: {
            v: false,
            t: "b",
          },
        },
      }),
    );
    const idToken = await getFlag<boolean>("test");

    expect(idToken).toStrictEqual(false);
  });

  it("string", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        ["x-hasura-feature-flags"]: {
          test: {
            v: "hello",
            t: "s",
          },
        },
      }),
    );
    const idToken = await getFlag<string>("test");

    expect(idToken).toStrictEqual("hello");
  });

  it("integer", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          test: {
            v: 5,
            t: "i",
          },
        },
      }),
    );
    const idToken = await getFlag<number>("test");

    expect(idToken).toStrictEqual(5);
  });

  it("no existing flag", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        ["x-hasura-feature-flags"]: {
          test: {
            v: 5,
            t: "i",
          },
        },
      }),
    );
    const idToken = await getFlag<number>("noexist");

    expect(idToken).toStrictEqual(null);
  });
});
