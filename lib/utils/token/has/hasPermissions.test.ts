import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasPermissions } from "./hasPermissions";

const storage = new MemoryStorage();

describe("hasPermissions", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.idToken);
    const result = await hasPermissions({ permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when no permissions provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const result = await hasPermissions({});

    expect(result).toBe(true);
  });

  it("when empty permissions array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const result = await hasPermissions({ permissions: [] });

    expect(result).toBe(true);
  });

  it("when user has all required permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        permissions: ["canEdit", "canDelete", "canView"],
      }),
    );
    const result = await hasPermissions({
      permissions: ["canEdit", "canView"],
    });

    expect(result).toBe(true);
  });

  it("when user has some but not all required permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const result = await hasPermissions({
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(false);
  });

  it("when user has no required permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canView"] }),
    );
    const result = await hasPermissions({
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(false);
  });

  it("when user has single required permission", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const result = await hasPermissions({ permissions: ["canEdit"] });

    expect(result).toBe(true);
  });

  it("when token has no permissions array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: null }),
    );
    const result = await hasPermissions({ permissions: ["canEdit"] });

    expect(result).toBe(false);
  });
});
