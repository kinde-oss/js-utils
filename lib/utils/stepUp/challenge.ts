import { StepUpRequiredError } from "./errors";
import type { AcrValue } from "./params";
import { formatAcrValues, formatMaxAge, highestAcr } from "./params";

const CHALLENGE_ERROR = "insufficient_user_authentication";
const DEFAULT_DESCRIPTION = "A different authentication level is required";

export type ParsedStepUpChallenge = {
  acr: AcrValue | null;
  maxAge: number | null;
  errorDescription: string;
};

export type StepUpChallenge = {
  status: 401;
  headers: {
    "WWW-Authenticate": string;
    "Access-Control-Expose-Headers": "WWW-Authenticate";
  };
  body: {
    error: typeof CHALLENGE_ERROR;
    error_description: string;
  };
};

/** Quotes a header value. CR and LF become spaces so they cannot split the header. */
const quote = (value: string): string =>
  `"${value
    .replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')}"`;

/**
 * RFC 9470 challenge for an API whose verified token does not meet the requirement.
 * Copy `Access-Control-Expose-Headers` when the API enables CORS so browsers can read it.
 * Keep `errorDescription` free of token contents.
 */
export const buildStepUpChallenge = (requirement: {
  acr?: AcrValue;
  maxAge?: number;
  errorDescription?: string;
}): StepUpChallenge => {
  const errorDescription = requirement.errorDescription ?? DEFAULT_DESCRIPTION;
  const parts = [
    `error=${quote(CHALLENGE_ERROR)}`,
    `error_description=${quote(errorDescription)}`,
  ];

  const acrValues = formatAcrValues(requirement.acr);
  if (acrValues) {
    parts.push(`acr_values=${quote(acrValues)}`);
  }

  const maxAge = formatMaxAge(requirement.maxAge);
  if (maxAge !== undefined) {
    parts.push(`max_age=${quote(maxAge)}`);
  }

  return {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer ${parts.join(", ")}`,
      "Access-Control-Expose-Headers": "WWW-Authenticate",
    },
    body: {
      error: CHALLENGE_ERROR,
      error_description: errorDescription,
    },
  };
};

type AuthChallenge = {
  scheme: string;
  params: Record<string, string>;
};

/** Whether `char` is an RFC 9110 token character. */
const isTokenChar = (char: string): boolean =>
  /[A-Za-z0-9!#$%&'*+\-.^_`|~]/.test(char);

/**
 * Splits a WWW-Authenticate header into challenges.
 * Commas inside quoted values do not separate parameters, and a token that is
 * not `name=value` starts the next challenge.
 */
export const parseWwwAuthenticate = (header: string): AuthChallenge[] => {
  const challenges: AuthChallenge[] = [];
  let index = 0;

  /** Advances past whitespace. */
  const skipWhitespace = () => {
    while (index < header.length && /\s/.test(header[index])) {
      index += 1;
    }
  };

  /** Reads a token; returns "" when the next character cannot start one. */
  const readToken = (): string => {
    const start = index;
    while (index < header.length && isTokenChar(header[index])) {
      index += 1;
    }
    return header.slice(start, index);
  };

  /** Reads a quoted string, unescaping `\x`. An unterminated string runs to the end. */
  const readQuoted = (): string => {
    index += 1;
    let value = "";
    while (index < header.length) {
      const char = header[index];
      if (char === "\\") {
        index += 1;
        if (index < header.length) {
          value += header[index];
          index += 1;
        }
        continue;
      }
      if (char === '"') {
        index += 1;
        return value;
      }
      value += char;
      index += 1;
    }
    return value;
  };

  /** Reads an auth-param value: a quoted string or a token. */
  const readValue = (): string => {
    skipWhitespace();
    if (header[index] === '"') {
      return readQuoted();
    }
    return readToken();
  };

  while (index < header.length) {
    skipWhitespace();
    if (index >= header.length) {
      break;
    }
    if (header[index] === ",") {
      index += 1;
      continue;
    }

    const scheme = readToken();
    if (!scheme) {
      break;
    }

    const params: Record<string, string> = {};
    /** Skips a token68 credential (with `=` padding) that ends the challenge. */
    const skipToken68 = (): boolean => {
      const checkpoint = index;
      skipWhitespace();
      const match = /^[A-Za-z0-9\-._~+/]+=*/.exec(header.slice(index));
      if (match) {
        index += match[0].length;
        skipWhitespace();
        if (index >= header.length || header[index] === ",") {
          return true;
        }
      }
      index = checkpoint;
      return false;
    };
    /** Reads one `name=value` auth-param; restores the position when there is none. */
    const readParam = (): boolean => {
      const checkpoint = index;
      skipWhitespace();
      const name = readToken();
      skipWhitespace();
      if (!name || header[index] !== "=") {
        index = checkpoint;
        return false;
      }
      index += 1;
      params[name.toLowerCase()] = readValue();
      skipWhitespace();
      return true;
    };

    // A scheme carries either a token68 credential or auth-params. The first
    // auth-param is separated from the scheme by whitespace; later params, and
    // the next challenge, are separated by commas.
    if (!skipToken68() && readParam()) {
      while (index < header.length && header[index] === ",") {
        const checkpoint = index;
        index += 1;
        if (!readParam()) {
          index = checkpoint;
          break;
        }
      }
    }

    challenges.push({ scheme, params });
  }

  return challenges;
};

/** `max_age` from a challenge, or null when absent or not a non-negative integer. */
const maxAgeFromChallenge = (value: string | undefined): number | null => {
  if (value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

/**
 * Reads an RFC 9470 step-up challenge from a 401 response.
 * Returns null for any other 401, including `invalid_token`, so existing
 * refresh and sign-in handling is unchanged.
 */
export const parseStepUpChallenge = (response: {
  status: number;
  headers: { get(name: string): string | null };
}): ParsedStepUpChallenge | null => {
  if (response.status !== 401) {
    return null;
  }

  const header = response.headers.get("WWW-Authenticate");
  if (!header) {
    return null;
  }

  const challenge = parseWwwAuthenticate(header).find(
    (item) =>
      item.scheme.toLowerCase() === "bearer" &&
      item.params.error?.toLowerCase() === CHALLENGE_ERROR,
  );
  if (!challenge) {
    return null;
  }

  return {
    acr: highestAcr(challenge.params.acr_values),
    maxAge: maxAgeFromChallenge(challenge.params.max_age),
    errorDescription: challenge.params.error_description ?? "",
  };
};

/** `StepUpRequiredError` for an RFC 9470 challenge response, or null for any other response. */
export const stepUpRequiredFromResponse = (response: {
  status: number;
  headers: { get(name: string): string | null };
}): StepUpRequiredError | null => {
  const challenge = parseStepUpChallenge(response);
  if (!challenge) {
    return null;
  }
  return new StepUpRequiredError(challenge);
};
