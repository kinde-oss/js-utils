import { describe, it, expect, vi, beforeEach } from "vitest";
import * as CheckAuth from "./checkAuth";
import * as RefreshToken from "./token/refreshToken";
import * as GetCookie from "./getCookie";

describe("checkAuth", () => {
  const domain = "auth.test.com";
  const clientId = "client-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use cookie refresh type when using not custom domain and no _kbrte cookie", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(GetCookie, "getCookie").mockResolvedValue("value");

    await CheckAuth.checkAuth({ domain: "test.kinde.com", clientId });

    expect(GetCookie.getCookie).not.toHaveBeenCalled();
    expect(RefreshToken.refreshToken).toHaveBeenCalledWith({
      domain: "test.kinde.com",
      clientId,
      refreshType: RefreshToken.RefreshType.refreshToken,
    });
  });

  it("should use cookie refresh type when using custom domain and _kbrte cookie exists", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(GetCookie, "getCookie").mockReturnValue("value");

    await CheckAuth.checkAuth({ domain, clientId });

    expect(GetCookie.getCookie).toHaveBeenCalledWith("_kbrte");

    expect(RefreshToken.refreshToken).toHaveBeenCalledWith({
      domain,
      clientId,
      refreshType: RefreshToken.RefreshType.cookie,
    });
  });

  it("should use cookie refresh type when using custom domain and no _kbrte cookie", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(GetCookie, "getCookie").mockReturnValue(null);

    await CheckAuth.checkAuth({ domain, clientId });

    expect(GetCookie.getCookie).toHaveBeenCalledWith("_kbrte");

    expect(RefreshToken.refreshToken).toHaveBeenCalledWith({
      domain,
      clientId,
      refreshType: RefreshToken.RefreshType.refreshToken,
    });
  });

  // it.only('should use cookie refresh type when using custom domain and no _kbrte cookie', async () => {
  //   vi.spyOn(refreshToken, "refreshToken").mockResolvedValue({
  //     success: true,
  //   });

  //   const result = await checkAuth({ domain: "test.kinde.com", clientId });

  //   expect(refreshToken.refreshToken).toHaveBeenCalledWith({
  //     domain: "test.kinde.com",
  //     clientId,
  //     refreshType: refreshToken.RefreshType.refreshToken,
  //   });
  //   expect(result).toEqual({});
  // });

  // it('should use refresh token type when not using custom domain', async () => {
  //   (refreshToken as vi.Mock).mockResolvedValue({} as RefreshTokenResult);

  //   const result = await checkAuth({ domain: 'test.kinde.com', clientId });

  //   expect(refreshToken).toHaveBeenCalledWith({
  //     domain: 'not-custom.com',
  //     clientId,
  //     refreshType: RefreshType.refreshToken,
  //   });
  //   expect(result).toEqual({});
  // });

  // it('should use refresh token type when forceLocalStorage is true', async () => {
  //   (refreshToken as vi.Mock).mockResolvedValue({} as RefreshTokenResult);

  //   // Mock storageSettings to force local storage
  //   const originalStorageSettings = storageSettings;
  //   storageSettings.useInsecureForRefreshToken = true;

  //   const result = await checkAuth({ domain, clientId });

  //   expect(refreshToken).toHaveBeenCalledWith({
  //     domain,
  //     clientId,
  //     refreshType: RefreshType.refreshToken,
  //   });
  //   expect(result).toEqual({});

  //   // Restore original storageSettings
  //   storageSettings.useInsecureForRefreshToken = originalStorageSettings.useInsecureForRefreshToken;
  // });
});
