import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasRoles } from "./hasRoles";

const storage = new MemoryStorage();

describe("hasRoles", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.idToken);
    const result = await hasRoles({ roles: ["admin"] });

    expect(result).toBe(false);
  });

  it("when no roles provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );
    const result = await hasRoles({});

    expect(result).toBe(true);
  });

  it("when empty roles array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: [] });

    expect(result).toBe(true);
  });

  it("when user has all required roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
          {
            id: "2",
            key: "user",
            name: "user",
          },
          {
            id: "3",
            key: "viewer",
            name: "viewer",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: ["admin", "user"] });

    expect(result).toBe(true);
  });

  it("when user has some but not all required roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: ["admin", "user"] });

    expect(result).toBe(false);
  });

  it("when user has no required roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "viewer",
            name: "viewer",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: ["admin", "user"] });

    expect(result).toBe(false);
  });

  it("when user has single required role", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: ["admin"] });

    expect(result).toBe(true);
  });

  it("when token has no roles", async () => {
    const consoleMock = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ roles: undefined }),
    );
    const result = await hasRoles({ roles: ["admin"] });

    expect(result).toBe(false);
    expect(consoleMock).toHaveBeenCalledWith(
      "No roles found in token, ensure roles have been included in the token customisation within the application settings",
    );
  });
});
