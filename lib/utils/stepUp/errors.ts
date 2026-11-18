import type { AcrValue } from "./params";

type CallbackErrorDetails = {
  errorDescription: string;
  state: string;
  acr?: AcrValue | null;
  maxAge?: number | null;
};

/**
 * Kinde could not collect the requested authentication context.
 * This is a final answer: do not retry the same request and do not redirect to login.
 */
export class UnmetAuthenticationRequirementsError extends Error {
  readonly error = "unmet_authentication_requirements" as const;
  readonly errorDescription: string;
  readonly state: string;
  readonly acr: AcrValue | null;
  readonly maxAge: number | null;

  /** @param details Callback `error_description` and `state`, and the requested context. */
  constructor(details: CallbackErrorDetails) {
    super(details.errorDescription);
    this.name = "UnmetAuthenticationRequirementsError";
    this.errorDescription = details.errorDescription;
    this.state = details.state;
    this.acr = details.acr ?? null;
    this.maxAge = details.maxAge ?? null;
  }
}

/**
 * Kinde answered `prompt=none` with `login_required`.
 * The app decides whether to start an interactive login.
 */
export class LoginRequiredError extends Error {
  readonly error = "login_required" as const;
  readonly errorDescription: string;
  readonly state: string;
  readonly acr: AcrValue | null;
  readonly maxAge: number | null;

  /** @param details Callback `error_description` and `state`, and the requested context. */
  constructor(details: CallbackErrorDetails) {
    super(details.errorDescription);
    this.name = "LoginRequiredError";
    this.errorDescription = details.errorDescription;
    this.state = details.state;
    this.acr = details.acr ?? null;
    this.maxAge = details.maxAge ?? null;
  }
}

/**
 * An API answered with the RFC 9470 `insufficient_user_authentication` challenge.
 * Call `stepUp` with `acr` and `maxAge`, then retry the request once.
 */
export class StepUpRequiredError extends Error {
  readonly error = "insufficient_user_authentication" as const;
  readonly errorDescription: string;
  readonly acr: AcrValue | null;
  readonly maxAge: number | null;

  /** @param details Values read from the challenge. Missing values default to null. */
  constructor(details: {
    errorDescription?: string;
    acr?: AcrValue | null;
    maxAge?: number | null;
  }) {
    const errorDescription =
      details.errorDescription ??
      "A different authentication level is required";
    super(errorDescription);
    this.name = "StepUpRequiredError";
    this.errorDescription = errorDescription;
    this.acr = details.acr ?? null;
    this.maxAge = details.maxAge ?? null;
  }
}
