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
    await storage.removeSessionItem(StorageKeys.accessToken);
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

  it("when no params are provided", async () => {
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

    const result = await hasRoles();

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

  describe("CustomCondition", () => {
    it("when sync custom condition returns true", async () => {
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

      const result = await hasRoles({
        roles: [
          {
            role: "admin",
            condition: (roleObj) => {
              return roleObj.key === "admin" && roleObj.name === "admin"; // Check full role object
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when sync custom condition returns false", async () => {
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

      const result = await hasRoles({
        roles: [
          {
            role: "admin",
            condition: () => false, // Always false
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when async custom condition returns true", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "moderator",
              name: "moderator",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "moderator",
            condition: async (roleObj) => {
              // Simulate async operation
              await new Promise((resolve) => setTimeout(resolve, 1));
              return roleObj.key === "moderator";
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when async custom condition returns false", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "user",
              name: "user",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "user",
            condition: async () => {
              // Simulate async operation
              await new Promise((resolve) => setTimeout(resolve, 1));
              return false;
            },
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when custom condition can access the full role object", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "superAdmin",
              name: "Super Administrator",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "superAdmin",
            condition: (roleObj) => {
              // Custom logic based on role object properties
              return (
                roleObj.key.includes("Admin") &&
                roleObj.name.includes("Administrator")
              );
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when combining string roles and custom conditions", async () => {
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
              key: "editor",
              name: "editor",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          "admin", // string role - check existence
          {
            role: "editor",
            condition: (roleObj) => roleObj.key === "editor", // custom condition
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when one condition fails in mixed types", async () => {
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

      const result = await hasRoles({
        roles: [
          "admin", // string role - passes
          {
            role: "editor",
            condition: () => false, // custom condition - fails (role doesn't exist, so condition won't be called)
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when custom condition evaluates role that doesn't exist", async () => {
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

      const result = await hasRoles({
        roles: [
          {
            role: "nonExistentRole",
            condition: () => true, // This won't be called because role doesn't exist
          },
        ],
      });

      expect(result).toBe(false);
    });
  });
});
