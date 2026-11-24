import { revokeToken } from "../token";
import { AgentAuthError } from "../errors";
import type { ResourceServerConfig } from "./config";

export const adminRevoke = async (
  config: ResourceServerConfig,
  token: string,
  tokenTypeHint?: "access_token" | "refresh_token",
): Promise<void> => {
  if (!config.clientId) {
    throw new AgentAuthError(
      "missing_client_credentials",
      "clientId is required to revoke tokens",
    );
  }
  await revokeToken({
    revocationEndpoint: config.revocationEndpoint,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    token,
    tokenTypeHint,
    fetch: config.fetch,
  });
};
