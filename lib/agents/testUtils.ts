import { vi } from "vitest";

export const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

export const mockFetch = (
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

export const serverMetadata = {
  issuer: "https://auth.example.com",
  authorization_endpoint: "https://auth.example.com/oauth2/auth",
  token_endpoint: "https://auth.example.com/oauth2/token",
  revocation_endpoint: "https://auth.example.com/oauth2/revoke",
  registration_endpoint: "https://auth.example.com/oauth2/register",
  code_challenge_methods_supported: ["S256"],
  client_id_metadata_document_supported: true,
};
