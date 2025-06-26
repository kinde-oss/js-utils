import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExpressSessionManager } from "./expressSessionManager";
import { StorageKeys } from "../types";
import type { Request } from "express";

const mockRequest = (
  sessionData: Record<string, unknown> | null,
  destroyError: Error | null = null
) => {
  const session = sessionData
    ? {
        ...sessionData,
        destroy: vi.fn((callback: (err: Error | null) => void) => {
          callback(destroyError);
        }),
      }
    : undefined;

  return {
    session,
  } as unknown as Request;
};

describe("ExpressSessionManager", () => {
  let req: Request;
  let sessionManager: ExpressSessionManager;

  describe("constructor", () => {
    it("should throw an error if session is not available on the request", () => {
      req = mockRequest(null);
      expect(() => new ExpressSessionManager(req)).toThrow(
        "Session not available on the request. Please ensure the 'express-session' middleware is configured and running before the Kinde middleware."
      );
    });

    it("should not throw an error if session is available on the request", () => {
      req = mockRequest({});
      expect(() => new ExpressSessionManager(req)).not.toThrow();
    });
  });

  describe("with a valid session", () => {
    beforeEach(() => {
      const initialSession = {
        [StorageKeys.accessToken]: "access-token",
        [StorageKeys.idToken]: "id-token",
      };
      req = mockRequest(initialSession);
      sessionManager = new ExpressSessionManager(req);
    });

    it("should get an item from the session", async () => {
      const accessToken = await sessionManager.getSessionItem(
        StorageKeys.accessToken
      );
      expect(accessToken).toBe("access-token");
    });

    it("should return null for a non-existent item", async () => {
      const refreshToken = await sessionManager.getSessionItem(
        StorageKeys.refreshToken
      );
      expect(refreshToken).toBeNull();
    });

    it("should set an item in the session", async () => {
      await sessionManager.setSessionItem(
        StorageKeys.refreshToken,
        "refresh-token"
      );
      expect(req.session![StorageKeys.refreshToken]).toBe("refresh-token");
    });

    it("should remove an item from the session", async () => {
      await sessionManager.removeSessionItem(StorageKeys.accessToken);
      expect(req.session![StorageKeys.accessToken]).toBeUndefined();
    });

    it("should destroy the session", async () => {
      await sessionManager.destroySession();
      expect(req.session!.destroy).toHaveBeenCalled();
    });

    it("should reject with an error if destroying the session fails", async () => {
      const error = new Error("Failed to destroy Kinde session");
      req = mockRequest({}, error);
      sessionManager = new ExpressSessionManager(req);
      await expect(sessionManager.destroySession()).rejects.toThrow(error);
    });
  });
});
