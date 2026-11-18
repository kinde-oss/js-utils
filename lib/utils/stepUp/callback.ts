import { StorageKeys } from "../../sessionManager";
import { getInsecureStorage } from "../token";
import {
  LoginRequiredError,
  UnmetAuthenticationRequirementsError,
} from "./errors";
import { acrFromStored, maxAgeFromStored } from "./params";

const STEP_UP_CALLBACK_ERRORS = [
  "unmet_authentication_requirements",
  "login_required",
] as const;

type StepUpCallbackErrorCode = (typeof STEP_UP_CALLBACK_ERRORS)[number];

export type CallbackAuthenticationRead =
  | { outcome: "ignore" }
  | { outcome: "reject"; message: string }
  | {
      outcome: "error";
      error: UnmetAuthenticationRequirementsError | LoginRequiredError;
    };

/** Whether the callback `error` is one this module maps to a step-up error. */
const isStepUpCallbackError = (
  error: string | null,
): error is StepUpCallbackErrorCode =>
  error !== null &&
  (STEP_UP_CALLBACK_ERRORS as readonly string[]).includes(error);

/**
 * Maps a callback `error` to a step-up error after the OAuth `state` matches
 * the value stored for this request. Other errors are ignored so existing
 * callback handling is unchanged. Does not retry and does not start a login.
 */
export const readCallbackAuthenticationError = async (
  urlParams: URLSearchParams,
): Promise<CallbackAuthenticationRead> => {
  const oauthError = urlParams.get("error");
  if (!isStepUpCallbackError(oauthError)) {
    return { outcome: "ignore" };
  }

  const storage = getInsecureStorage();
  if (!storage) {
    console.error("No active storage found");
    return {
      outcome: "reject",
      message: "Authentication storage is not initialized",
    };
  }

  const state = urlParams.get("state");
  const storedState = await storage.getSessionItem(StorageKeys.state);
  if (!state || state !== storedState) {
    console.error("Invalid state");
    return {
      outcome: "reject",
      message: `Invalid state; supplied ${state}, expected ${storedState}`,
    };
  }

  const details = {
    errorDescription: urlParams.get("error_description") ?? "",
    state,
    acr: acrFromStored(await storage.getSessionItem(StorageKeys.stepUpAcr)),
    maxAge: maxAgeFromStored(
      await storage.getSessionItem(StorageKeys.stepUpMaxAge),
    ),
  };

  if (oauthError === "unmet_authentication_requirements") {
    return {
      outcome: "error",
      error: new UnmetAuthenticationRequirementsError(details),
    };
  }

  return {
    outcome: "error",
    error: new LoginRequiredError(details),
  };
};
