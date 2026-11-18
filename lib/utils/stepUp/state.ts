import { base64UrlDecode, base64UrlEncode } from "../base64UrlEncode";

const STEP_UP_STATE_KIND = "kinde-step-up";

type StepUpStateEnvelope = {
  k: typeof STEP_UP_STATE_KIND;
  state: string;
  returnTo: string;
};

/**
 * Carries `returnTo` inside the OAuth `state` parameter.
 * The value stored and sent is the envelope; `readStepUpState` recovers both parts.
 */
export const encodeStepUpState = (state: string, returnTo: string): string => {
  const envelope: StepUpStateEnvelope = {
    k: STEP_UP_STATE_KIND,
    state,
    returnTo,
  };
  return base64UrlEncode(JSON.stringify(envelope));
};

/**
 * Reads a step-up `state` value. States that are not step-up envelopes are returned unchanged.
 */
export const readStepUpState = (
  state: string,
): { state: string; returnTo?: string } => {
  try {
    const parsed: unknown = JSON.parse(base64UrlDecode(state));
    if (
      parsed &&
      typeof parsed === "object" &&
      "k" in parsed &&
      parsed.k === STEP_UP_STATE_KIND &&
      "state" in parsed &&
      typeof parsed.state === "string"
    ) {
      const returnTo =
        "returnTo" in parsed && typeof parsed.returnTo === "string"
          ? parsed.returnTo
          : undefined;
      return { state: parsed.state, returnTo };
    }
  } catch {
    // Not a step-up envelope.
  }
  return { state };
};
