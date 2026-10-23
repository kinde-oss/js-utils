export type AgentAuthErrorCode =
  | "fetch_unavailable"
  | "invalid_url"
  | "invalid_response"
  | "not_unauthorized"
  | "missing_resource_url"
  | "resource_mismatch"
  | "issuer_mismatch"
  | "no_authorization_server"
  | "metadata_unavailable"
  | "no_client_identity"
  | "invalid_client_metadata"
  | "openid_scope_not_allowed"
  | "state_mismatch"
  | "pkce_unsupported"
  | "crypto_unavailable"
  | "no_revocation_endpoint"
  | (string & {});

export class AgentAuthError extends Error {
  readonly code: AgentAuthErrorCode;
  readonly description?: string;
  readonly status?: number;

  constructor(
    code: AgentAuthErrorCode,
    description?: string,
    status?: number,
    options?: { cause?: unknown },
  ) {
    super(description ? `${code}: ${description}` : code, options);
    this.name = "AgentAuthError";
    this.code = code;
    this.description = description;
    this.status = status;
  }
}
