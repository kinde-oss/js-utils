import { describe, expect, it } from "vitest";
import {
  buildStepUpChallenge,
  parseStepUpChallenge,
  parseWwwAuthenticate,
  stepUpRequiredFromResponse,
} from "./challenge";
import {
  StepUpRequiredError,
  UnmetAuthenticationRequirementsError,
} from "./errors";

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

  it("replaces CR and LF in the description", () => {
    const challenge = buildStepUpChallenge({
      acr: "mfa",
      errorDescription: 'line one\r\nline "two"\nend',
    });
    expect(challenge.headers["WWW-Authenticate"]).not.toMatch(/[\r\n]/);
    expect(challenge.headers["WWW-Authenticate"]).toContain(
      'error_description="line one line \\"two\\" end"',
    );
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

  it("skips a padded token68 challenge before the Bearer step-up challenge", () => {
    const header =
      'Negotiate YIIBhgYGKwYBBQUCoIIBejCCAXag==, Bearer error="insufficient_user_authentication", acr_values="mfa"';

    expect(parseWwwAuthenticate(header)).toEqual([
      { scheme: "Negotiate", params: {} },
      {
        scheme: "Bearer",
        params: {
          error: "insufficient_user_authentication",
          acr_values: "mfa",
        },
      },
    ]);
    expect(parseStepUpChallenge(responseWith(401, header))).toMatchObject({
      acr: "mfa",
    });
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

  it("reads an unquoted max_age and treats a missing or invalid one as absent", () => {
    expect(
      parseStepUpChallenge(
        responseWith(
          401,
          'Bearer error="insufficient_user_authentication", max_age=300',
        ),
      ),
    ).toMatchObject({ acr: null, maxAge: 300, errorDescription: "" });

    expect(
      parseStepUpChallenge(
        responseWith(
          401,
          'Bearer error="insufficient_user_authentication", max_age=""',
        ),
      )?.maxAge,
    ).toBeNull();
    expect(
      parseStepUpChallenge(
        responseWith(
          401,
          'Bearer error="insufficient_user_authentication", max_age="abc"',
        ),
      )?.maxAge,
    ).toBeNull();
  });

  it("stops at an unfinished quote, trailing whitespace, or a non-token scheme", () => {
    expect(parseWwwAuthenticate('Bearer error="unterminated')).toEqual([
      {
        scheme: "Bearer",
        params: { error: "unterminated" },
      },
    ]);
    expect(parseWwwAuthenticate("   ")).toEqual([]);
    expect(parseWwwAuthenticate('Bearer error="x", @')).toEqual([
      { scheme: "Bearer", params: { error: "x" } },
    ]);
    expect(parseWwwAuthenticate('Bearer error="abc\\')).toEqual([
      { scheme: "Bearer", params: { error: "abc" } },
    ]);
    expect(parseWwwAuthenticate("Bearer error=x y")).toEqual([
      { scheme: "Bearer", params: { error: "x" } },
      { scheme: "y", params: {} },
    ]);
  });
});

describe("step-up errors", () => {
  it("fills the default description and null claims when they are omitted", () => {
    expect(new StepUpRequiredError({})).toMatchObject({
      errorDescription: "A different authentication level is required",
      acr: null,
      maxAge: null,
    });
    expect(
      new UnmetAuthenticationRequirementsError({
        errorDescription: "could not",
        state: "state",
      }),
    ).toMatchObject({
      acr: null,
      maxAge: null,
      state: "state",
    });
  });
});
