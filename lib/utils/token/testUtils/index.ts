import { createHmac } from "crypto";

export const createMockAccessToken = (values = {}) => {
  const header = {
    alg: "HS256", // Algorithm (HMAC with SHA-256)
    typ: "JWT", // Type
  };
  const payload = {
    aud: [],
    azp: "b9da18c441b44d81bab3e8232de2e18d",
    billing: {
      has_payment_details: false,
    },
    exp: 1168335720000,
    iat: 1168335720000,
    iss: "https://kinde.com",
    jti: "27daa125-2fb2-4e14-9270-742cd56e764b",
    org_code: "org_123456789",
    permissions: ["read:users", "read:competitions"],
    scp: ["openid", "profile", "email", "offline"],
    sub: "kp_cfcb1ae5b9254ad99521214014c54f43",
    ...values,
  };
  const secretKey = "asecretkey";

  // Encode header and payload as Base64URL
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url",
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  // Create signature
  const signature = createHmac("sha256", secretKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};
