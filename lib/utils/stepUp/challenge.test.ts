import { describe, expect, it } from "vitest";
import {
  buildStepUpChallenge,
  parseStepUpChallenge,
  parseWwwAuthenticate,
  stepUpRequiredFromResponse,
} from "./challenge";
import { StepUpRequiredError } from "./errors";

const responseWith = (status: number, authenticate?: string): Response =>
  new Response(null, {
    status,
    headers: authenticate ? { "WWW-Authenticate": authenticate } : undefined,
  });

describe("buildStepUpChallenge", () => {
  it("builds the RFC 9470 challenge", () => {
    const challenge = buildStepUpChallenge({ acr: "mfa", maxAge: 300 });

    expect(challenge.status).toBe(401);
    expect(challenge.headers["Access-Control-Expose-Headers"]).toBe(
      "WWW-Authenticate",
    );
    expect(challenge.headers["WWW-Authenticate"]).toBe(
      'Bearer error="insufficient_user_authentication", error_description="A different authentication level is required", acr_values="mfa", max_age="300"',
    );
    expect(challenge.body).toEqual({
      error: "insufficient_user_authentication",
      error_description: "A different authentication level is required",
    });
  });

  it("omits acr_values or max_age when that requirement was not set", () => {
    const acrOnly = buildStepUpChallenge({ acr: "phr" });
    expect(acrOnly.headers["WWW-Authenticate"]).not.toMatch(/max_age=/);
    expect(acrOnly.headers["WWW-Authenticate"]).toContain('acr_values="phr"');

    const ageOnly = buildStepUpChallenge({ maxAge: 0 });
    expect(ageOnly.headers["WWW-Authenticate"]).not.toMatch(/acr_values=/);
    expect(ageOnly.headers["WWW-Authenticate"]).toContain('max_age="0"');
  });

  it("quotes and escapes the description", () => {
    const challenge = buildStepUpChallenge({
      acr: "mfa",
      errorDescription: 'say "hi"',
    });
    expect(challenge.headers["WWW-Authenticate"]).toContain(
      'error_description="say \\"hi\\""',
    );
  });

  it("throws for an invalid maxAge", () => {
    expect(() => buildStepUpChallenge({ maxAge: -1 })).toThrow(
      /non-negative integer/,
    );
  });
});

describe("parseStepUpChallenge", () => {
  it("parses several challenges, quoted commas, and escaped quotes", () => {
    const header = [
      'Bearer realm="example", error="invalid_token", error_description="nope"',
      'Basic realm="other"',
      'Bearer error="insufficient_user_authentication", error_description="say \\"hi\\", please", ACR_VALUES="mfa phr", MAX_AGE="300"',
    ].join(", ");

    const parsed = parseStepUpChallenge(responseWith(401, header));
    expect(parsed).toEqual({
      acr: "phr",
      maxAge: 300,
      errorDescription: 'say "hi", please',
    });
    expect(parseWwwAuthenticate(header)).toHaveLength(3);
  });

  it("returns null for a plain 401 and for other bearer errors", () => {
    expect(parseStepUpChallenge(responseWith(401))).toBeNull();
    expect(
      parseStepUpChallenge(responseWith(401, 'Bearer error="invalid_token"')),
    ).toBeNull();
    expect(
      parseStepUpChallenge(
        responseWith(
          200,
          'Bearer error="insufficient_user_authentication", acr_values="mfa"',
        ),
      ),
    ).toBeNull();
    expect(
      stepUpRequiredFromResponse(
        responseWith(401, 'Bearer error="invalid_token"'),
      ),
    ).toBeNull();
  });

  it("returns a StepUpRequiredError for a step-up challenge", () => {
    const error = stepUpRequiredFromResponse(
      responseWith(
        401,
        'Bearer error="insufficient_user_authentication", error_description="A different authentication level is required", acr_values="mfa", max_age="300"',
      ),
    );

    expect(error).toBeInstanceOf(StepUpRequiredError);
    expect(error).toMatchObject({
      acr: "mfa",
      maxAge: 300,
      errorDescription: "A different authentication level is required",
    });
  });
});
