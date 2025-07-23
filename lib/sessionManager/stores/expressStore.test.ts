import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExpressStore } from "../../main";
import { StorageKeys } from "../types";
import type { Request } from "express";
import { storageSettings } from "..";

const mockRequest = (
  sessionData: Record<string, unknown> | null,
  destroyError: Error | null = null,
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

describe("ExpressStore", () => {
  let req: Request;
  let sessionManager: ExpressStore;

  describe("constructor", () => {
    it("should throw an error if session is not available on the request", () => {
      req = mockRequest(null);
      expect(() => new ExpressStore(req)).toThrow(
        "Session not available on the request. Please ensure the 'express-session' middleware is configured and running before the Kinde middleware.",
      );
    });

    it("should not throw an error if session is available on the request", () => {
      req = mockRequest({});
      expect(() => new ExpressStore(req)).not.toThrow();
    });
  });

  describe("with a valid session", () => {
    const keyPrefix = storageSettings.keyPrefix;
    beforeEach(() => {
      const initialSession = {
        [`${keyPrefix}${StorageKeys.accessToken}0`]: "access-token",
        [`${keyPrefix}${StorageKeys.idToken}0`]: "id-token",
      };
      req = mockRequest(initialSession);
      sessionManager = new ExpressStore(req);
    });

    it("should get an item from the session", async () => {
      const accessToken = await sessionManager.getSessionItem(
        StorageKeys.accessToken,
      );
      expect(accessToken).toBe("access-token");
    });

    it("should return null for a non-existent item", async () => {
      const refreshToken = await sessionManager.getSessionItem(
        StorageKeys.refreshToken,
      );
      expect(refreshToken).toBeNull();
    });

    it("should set an item in the session", async () => {
      await sessionManager.setSessionItem(
        StorageKeys.refreshToken,
        "refresh-token",
      );
      expect(req.session![`${keyPrefix}${StorageKeys.refreshToken}0`]).toBe(
        "refresh-token",
      );
    });

    it("should remove an item from the session", async () => {
      await sessionManager.removeSessionItem(StorageKeys.accessToken);
      expect(
        req.session![`${keyPrefix}${StorageKeys.accessToken}0`],
      ).toBeUndefined();
    });

    it("should destroy the session", async () => {
      await sessionManager.destroySession();
      expect(req.session!.destroy).toHaveBeenCalled();
    });

    it("should reject with an error if destroying the session fails", async () => {
      const error = new Error("Failed to destroy Kinde session");
      req = mockRequest({}, error);
      sessionManager = new ExpressStore(req);
      await expect(sessionManager.destroySession()).rejects.toThrow(error);
    });
  });

  describe("splitting and reassembly logic", () => {
    const longString = "a".repeat(5000); // longer than default maxLength (2000)
    const keyPrefix = storageSettings.keyPrefix;
    const maxLength = storageSettings.maxLength;
    let req: Request;
    let sessionManager: ExpressStore;

    beforeEach(() => {
      req = mockRequest({});
      sessionManager = new ExpressStore(req);
    });

    it("should split and store a long string value across multiple session keys", async () => {
      await sessionManager.setSessionItem(StorageKeys.state, longString);
      expect(req.session![`${keyPrefix}state0`]).toBe(
        longString.slice(0, maxLength),
      );
      expect(req.session![`${keyPrefix}state1`]).toBe(
        longString.slice(maxLength, maxLength * 2),
      );
      expect(req.session![`${keyPrefix}state2`]).toBe(
        longString.slice(maxLength * 2),
      );
      expect(req.session![`${keyPrefix}state3`]).toBeUndefined();
    });

    it("should reassemble a long string value from multiple session keys", async () => {
      // Simulate split storage
      req.session![`${keyPrefix}state0`] = longString.slice(0, maxLength);
      req.session![`${keyPrefix}state1`] = longString.slice(
        maxLength,
        maxLength * 2,
      );
      req.session![`${keyPrefix}state2`] = longString.slice(maxLength * 2);
      const value = await sessionManager.getSessionItem(StorageKeys.state);
      expect(value).toBe(longString);
    });

    it("should remove all split keys for a long string value", async () => {
      req.session![`${keyPrefix}state0`] = "part1";
      req.session![`${keyPrefix}state1`] = "part2";
      req.session![`${keyPrefix}state2`] = "part3";
      await sessionManager.removeSessionItem(StorageKeys.state);
      expect(req.session![`${keyPrefix}state0`]).toBeUndefined();
      expect(req.session![`${keyPrefix}state1`]).toBeUndefined();
      expect(req.session![`${keyPrefix}state2`]).toBeUndefined();
    });

    it("should store and retrieve non-string values without splitting", async () => {
      const obj = { foo: "bar" };
      await sessionManager.setSessionItem(StorageKeys.nonce, obj);
      expect(req.session![`${keyPrefix}nonce0`]).toEqual(obj);
      const value = await sessionManager.getSessionItem(StorageKeys.nonce);
      expect(value).toEqual(obj); // Should return the original object
    });
  });
});
