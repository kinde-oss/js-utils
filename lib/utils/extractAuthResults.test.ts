import { describe, it, expect } from "vitest";
import { extractAuthResults } from "./extractAuthResults";

describe("extractAuthResults", () => {
  it("should encode a string to base64 URL safe format", () => {
    const result = extractAuthResults(
      "https://gijchalnbihhgelejnhpopfimempmlel.chromiumapp.org/?access_token=someaccesstokenvalue&expires_in=86400&id_token=someidtoken&scope=email%20profile%20openid%20offline&state=ABCDE1234&token_type=bearer",
    );
    expect(result).toEqual({
      accessToken: "someaccesstokenvalue",
      expiresIn: 86400,
      idToken: "someidtoken",
    });
  });

  it("should encode a string to base64 URL safe format", () => {
    const result = extractAuthResults(
      "https://gijchalnbihhgelejnhpopfimempmlel.chromiumapp.org/?access_token=someaccesstokenvalue&id_token=someidtoken&scope=email%20profile%20openid%20offline&state=ABCDE1234&token_type=bearer",
    );
    expect(result).toEqual({
      accessToken: "someaccesstokenvalue",
      expiresIn: 0,
      idToken: "someidtoken",
    });
  });
});
