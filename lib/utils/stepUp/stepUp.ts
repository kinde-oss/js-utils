import { IssuerRouteTypes, PromptTypes, type LoginOptions } from "../../types";
import { applyReauthState, generateAuthUrl } from "../generateAuthUrl";
import { generateRandomString } from "../generateRandomString";
import { isStepUpSupported } from "./discovery";
import type { AcrValue } from "./params";
import { formatAcrValues, formatMaxAge } from "./params";
import { encodeStepUpState } from "./state";

export type StepUpOptions<T = Record<string, string>> = LoginOptions<T> & {
  /**
   * Authentication context to request. Maps to `acr_values`.
   * Takes precedence over `acrValues` when both are set.
   */
  acr?: AcrValue;
  /**
   * Where to send the user after the step-up. Carried inside OAuth `state`.
   * Read it back with `readStepUpState` on the callback. This package returns
   * the authorization URL and does not navigate.
   */
  returnTo?: string;
  /**
   * Extra authorization parameters from a generic bag.
   * `prompt=none` is rejected. Other entries are not copied onto the URL.
   */
  parameters?: Record<string, unknown>;
};

/** Whether a prompt value, from any source, is `none`. */
const isPromptNone = (value: unknown): boolean =>
  typeof value === "string" && value.toLowerCase() === PromptTypes.none;

/** Throws when any source would send `prompt=none`. */
const assertInteractive = (options: StepUpOptions): void => {
  const propertyPrompt = options.properties
    ? (options.properties as Record<string, unknown>).prompt
    : undefined;
  if (
    isPromptNone(options.prompt) ||
    isPromptNone(options.parameters?.prompt) ||
    isPromptNone(propertyPrompt)
  ) {
    throw new Error(
      "stepUp cannot send prompt=none. Kinde cannot collect a factor without a screen.",
    );
  }
};

/** Whether `acr` holds a requested context rather than an unset or empty value. */
const hasAcrRequest = (acr: unknown): boolean => {
  if (acr == null || acr === "") {
    return false;
  }
  return Array.isArray(acr) ? acr.length > 0 : true;
};

/**
 * Builds an interactive authorization URL that asks Kinde for a stronger or
 * more recent authentication. Returns the URL and PKCE material. Redirecting,
 * or opening a browser, is left to the caller (`navigateToKinde` or a framework).
 *
 * Never sends `prompt=none`. When discovery does not advertise
 * `acr_values_supported`, `acr` throws and a `maxAge`-only request falls back
 * to `prompt=login` without sending `max_age`.
 *
 * `reauthState` is decoded first. Its `acrValues`, `maxAge`, and `state` are
 * ignored, and it cannot change the `prompt=login` fallback.
 */
export const stepUp = async <T = Record<string, string>>(
  domain: string,
  options: StepUpOptions<T>,
  config?: { disableUrlSanitization: boolean },
): Promise<{
  url: URL;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeVerifier: string;
}> => {
  const requestedAcr = options.acr ?? options.acrValues;
  const hasAcr = hasAcrRequest(requestedAcr);
  const hasMaxAge = options.maxAge !== undefined && options.maxAge !== null;
  if (!hasAcr && !hasMaxAge) {
    throw new Error("stepUp requires acr or maxAge.");
  }

  const request = {
    ...applyReauthState(options),
    acrValues: options.acrValues,
    maxAge: options.maxAge,
    state: options.state,
  };

  assertInteractive(request);
  if (hasAcr) {
    formatAcrValues(requestedAcr);
  }
  if (hasMaxAge) {
    formatMaxAge(options.maxAge);
  }

  const supported = await isStepUpSupported(domain);
  let acrValues = hasAcr ? requestedAcr : undefined;
  let maxAge = hasMaxAge ? options.maxAge : undefined;
  let prompt = request.prompt;

  if (!supported) {
    if (hasAcr) {
      throw new Error("Step-up is not supported on this environment.");
    }
    acrValues = undefined;
    maxAge = undefined;
    prompt = PromptTypes.login;
  }

  const innerState = options.state ?? generateRandomString(32);
  const state = options.returnTo
    ? encodeStepUpState(innerState, options.returnTo)
    : options.state;

  return generateAuthUrl(
    domain,
    IssuerRouteTypes.login,
    {
      ...request,
      acrValues,
      maxAge,
      prompt,
      state,
    },
    config,
  );
};
