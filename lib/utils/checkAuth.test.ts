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

  it("error when domain supplied", async () => {
    const result = await CheckAuth.checkAuth({ domain: null, clientId });
     expect (result).toEqual({
      success: false,
      error: "Domain is required for authentication check",
    });
  });

  it("error when clientId supplied", async () => {
    const result = await CheckAuth.checkAuth({ domain, clientId: null });
     expect (result).toEqual({
      success: false,
      error: "Client ID is required for authentication check",
    });
  });

});
