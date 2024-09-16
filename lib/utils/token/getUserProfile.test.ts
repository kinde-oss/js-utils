import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { getUserProfile, setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";

const storage = new MemoryStorage();

describe("getUserProfile", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);
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
});
