import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import { getRoles } from ".";

const storage = new MemoryStorage();

describe("getRoles - Hasura", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);
    const idToken = await getRoles();

    expect(idToken).toStrictEqual([]);
  });

  it("with token no roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ "x-hasura-roles": undefined }),
    );
    const idToken = await getRoles();
    expect(idToken).toStrictEqual([]);
  });

  it("warns when token no roles", async () => {
    const consoleMock = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ "x-hasura-roles": undefined }),
    );
    await getRoles();
    expect(consoleMock).toHaveBeenCalledWith(
      "No roles found in token, ensure roles have been included in the token customisation within the application settings",
    );
  });

  it("with value and typed permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ roles: null, "x-hasura-roles": ["admin"] }),
    );
    const idToken = await getRoles();

    expect(idToken).toStrictEqual(["admin"]);
  });
});
