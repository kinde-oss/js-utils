import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { getUserProfile, getUserProfileSync, setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";

const storage = new MemoryStorage();

describe("getUserProfile", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.idToken);
    const idToken = await getUserProfile();

    expect(idToken).toStrictEqual(null);
  });

  it("when has basic stuff", async () => {
    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const idToken = await getUserProfile();

    expect(idToken).toStrictEqual({
      email: undefined,
      familyName: undefined,
      givenName: undefined,
      id: "kp_cfcb1ae5b9254ad99521214014c54f43",
      picture: undefined,
    });
  });

  it("when has basic stuff", async () => {
    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        given_name: "Bob",
        family_name: "Kinde",
        email: "bob@kinde.com",
        picture: "https://kinde.com/",
      }),
    );
    const idToken = await getUserProfile();

    expect(idToken).toStrictEqual({
      email: "bob@kinde.com",
      familyName: "Kinde",
      givenName: "Bob",
      id: "kp_cfcb1ae5b9254ad99521214014c54f43",
      picture: "https://kinde.com/",
    });
  });

  it("when no sub, return null", async () => {
    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        sub: null,
      }),
    );
    const idToken = await getUserProfile();

    expect(idToken).toStrictEqual(null);
  });

  it("when no sub, return null", async () => {
    const consoleMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        sub: null,
      }),
    );
    await getUserProfile();

    expect(consoleMock).toHaveBeenCalledWith("No sub in idToken");
  });
});

describe("getUserProfileSync", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", () => {
    storage.removeSessionItem(StorageKeys.idToken);
    const idToken = getUserProfileSync();

    expect(idToken).toStrictEqual(null);
  });

  it("maps basic props", () => {
    storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        given_name: "Bob",
        family_name: "Kinde",
        email: "bob@kinde.com",
        picture: "https://kinde.com/",
      }),
    );
    const idToken = getUserProfileSync();
    expect(idToken).toStrictEqual({
      email: "bob@kinde.com",
      familyName: "Kinde",
      givenName: "Bob",
      id: "kp_cfcb1ae5b9254ad99521214014c54f43",
      picture: "https://kinde.com/",
    });
  });
});
