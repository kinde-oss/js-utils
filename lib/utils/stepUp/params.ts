import { StorageKeys, type SessionManager } from "../../sessionManager";

export const ACR_VALUES = ["mfa", "phr"] as const;

export type AcrValue = (typeof ACR_VALUES)[number];

const isAcrValue = (value: string): value is AcrValue =>
  value === "mfa" || value === "phr";

/**
 * Maps `acrValues` to the `acr_values` query parameter.
 * Returns undefined when the option is unset so the parameter is omitted.
 */
export const formatAcrValues = (acrValues: unknown): string | undefined => {
  if (acrValues == null || acrValues === "") {
    return undefined;
  }

  const values = Array.isArray(acrValues) ? acrValues : [acrValues];
  if (values.length === 0) {
    return undefined;
  }

  const normalized = values.map((value) => {
    if (typeof value !== "string") {
      throw new Error(
        `acrValues must be "mfa" or "phr". Received ${String(value)}.`,
      );
    }
    const lower = value.toLowerCase();
    if (!isAcrValue(lower)) {
      throw new Error(`acrValues must be "mfa" or "phr". Received ${value}.`);
    }
    return lower;
  });

  return normalized.join(" ");
};

/**
 * Maps `maxAge` to the `max_age` query parameter.
 * `0` is valid. Unset values are omitted. Negative and non-integer values throw.
 */
export const formatMaxAge = (maxAge: unknown): string | undefined => {
  if (maxAge == null) {
    return undefined;
  }

  if (typeof maxAge !== "number" || !Number.isInteger(maxAge) || maxAge < 0) {
    throw new Error(
      `maxAge must be a non-negative integer number of seconds. Received ${String(maxAge)}.`,
    );
  }

  return String(maxAge);
};

export const highestAcr = (
  acrValues: string | null | undefined,
): AcrValue | null => {
  if (!acrValues) {
    return null;
  }
  const parts = acrValues
    .split(/\s+/)
    .map((part) => part.toLowerCase())
    .filter(isAcrValue);
  if (parts.includes("phr")) {
    return "phr";
  }
  if (parts.includes("mfa")) {
    return "mfa";
  }
  return null;
};

/**
 * Remembers the context requested on the authorization URL so a callback error
 * can report it. Clears any previous request when this login does not ask for one.
 */
export const rememberStepUpRequest = (
  storage: SessionManager | null,
  params: Record<string, string>,
): void => {
  if (!storage) {
    return;
  }

  if (params.acr_values) {
    void storage.setSessionItem(StorageKeys.stepUpAcr, params.acr_values);
  } else {
    void storage.removeSessionItem(StorageKeys.stepUpAcr);
  }

  if (Object.prototype.hasOwnProperty.call(params, "max_age")) {
    void storage.setSessionItem(StorageKeys.stepUpMaxAge, params.max_age);
  } else {
    void storage.removeSessionItem(StorageKeys.stepUpMaxAge);
  }
};

export const acrFromStored = (value: unknown): AcrValue | null => {
  if (typeof value !== "string") {
    return null;
  }
  return highestAcr(value);
};

export const maxAgeFromStored = (value: unknown): number | null => {
  if (typeof value !== "string" || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};
