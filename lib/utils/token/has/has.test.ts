import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { has } from "./has";

const storage = new MemoryStorage();

describe("has", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when no roles or permissions provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canEdit"],
      }),
    );
    const result = await has({});

    expect(result).toBe(true);
  });

  it("when only roles provided and user has all roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          { id: "1", key: "admin", name: "admin" },
          { id: "2", key: "user", name: "user" },
        ],
        permissions: ["canEdit"],
      }),
    );
    const result = await has({ roles: ["admin"] });

    expect(result).toBe(true);
  });

  it("when only roles provided and user missing roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "user", name: "user" }],
        permissions: ["canEdit"],
      }),
    );
    const result = await has({ roles: ["admin"] });

    expect(result).toBe(false);
  });

  it("when only permissions provided and user has all permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canEdit", "canDelete"],
      }),
    );
    const result = await has({ permissions: ["canEdit"] });

    expect(result).toBe(true);
  });

  it("when only permissions provided and user missing permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canView"],
      }),
    );
    const result = await has({ permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when both roles and permissions provided and user has both", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          { id: "1", key: "admin", name: "admin" },
          { id: "2", key: "user", name: "user" },
        ],
        permissions: ["canEdit", "canDelete", "canView"],
      }),
    );
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(true);
  });

  it("when both roles and permissions provided but user missing roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "user", name: "user" }],
        permissions: ["canEdit", "canDelete"],
      }),
    );
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when both roles and permissions provided but user missing permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canView"],
      }),
    );
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when both roles and permissions provided but user missing both", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "user", name: "user" }],
        permissions: ["canView"],
      }),
    );
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when multiple roles and permissions required and user has all", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          { id: "1", key: "admin", name: "admin" },
          { id: "2", key: "user", name: "user" },
          { id: "3", key: "viewer", name: "viewer" },
        ],
        permissions: ["canEdit", "canDelete", "canView", "canCreate"],
      }),
    );
    const result = await has({
      roles: ["admin", "user"],
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(true);
  });

  it("when multiple roles and permissions required but user missing some roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "user", name: "user" }],
        permissions: ["canEdit", "canDelete", "canView"],
      }),
    );
    const result = await has({
      roles: ["admin", "user"],
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(false);
  });

  it("when multiple roles and permissions required but user missing some permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          { id: "1", key: "admin", name: "admin" },
          { id: "2", key: "user", name: "user" },
        ],
        permissions: ["canEdit"],
      }),
    );
    const result = await has({
      roles: ["admin", "user"],
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(false);
  });
}); 