# Kinde JS Utils

## Description

Collection of methods and helpers for usage interfacing with Kinde

## Installation

```bash
# npm
npm install @kinde/js-utils
# yarn
yarn add @kinde/js-utils
# pnpm
pnpm install @kinde/js-utils
```

## Usage

### Methods

`base64UrlEncode` - creates a base64url encoding of a string (URL-safe, for use in query params e.g. PKCE)

`base64UrlDecode` - decodes a base64url string (e.g. OAuth state from callback URLs); use this instead of `atob()` when the value may be base64url

`sanitizeRedirect` - removes any trailing spaces from end of redirect URL

`mapLoginMethodParamsForUrl` - Maps all the login options to their relevant url query param

`generateAuthUrl` - builds a authentication URL to redirect users to start auth flow

`extractAuthResults` - Extracts tokens and expiry from implcit flow response

`generateRandomString` - Generates a random sring of a defined length

### Session Managers

exports `storageSettings` which can be used to configure the storage methods.

```json
{
  "keyPrefix": "kinde-", // Prefix to be used on all storage items
  "maxLength": 2000 // Max length of storage block, will auto split into separate chunks if needed
}
```

#### Session storage types

`MemoryStorage` - This holds the data in a simple memory store

`ChromeStore` - This holds the data in chrome.store.local for use with Google Chrome extensions.

`LocalStorage` - For using localStorage Note: do not use for sensitive data

### Token Helpers

Linking in with the activeStorage, a number of token helpers are available.

`setActiveStorage` - set the active storage manager

`getActiveStorage` - get the current active storage manager

#### Helpers

`getClaim` - Get a single claim from the Access Token

`getClaims` - Get all claims from the Access Token

`getCurrentOrganization` - get the current authenticated organisation

`getDecodedToken` - get the decoded id or access token

`getFlag` - get a single feature flag

`getPermission` - get a single permission value

`getPermissions` - get all user permissions

`getRoles` - get all the users roles

`getUserOrganizations` - get all the organizations the user has access to

`getUserProfile` - get the profile of the user from the ID token

## Step-up authentication

Step-up asks Kinde for a stronger or more recent authentication before a sensitive action. It uses the normal authorization endpoint. Kinde collects only the missing factor.

`acr: "mfa"` means two factors were accepted under the environment's MFA policy. It does not mean those factors are independent: a social login followed by a one-time code to the same mailbox has proven one channel twice. `phr` is stronger, because a phishing site cannot use a passkey. It does not assert independence either. For payments and regulated workloads, assess factor independence, enrolment, and recovery in your own configuration.

Pass `acrValues` (`"mfa"` or `"phr"`, or a list of them) and `maxAge` (seconds, `0` allowed) to `generateAuthUrl` for login and registration. Omit either option and it is left off the URL. A negative or non-integer `maxAge` throws.

```typescript
import {
  exchangeAuthCode,
  hasAuthenticationContext,
  navigateToKinde,
  readStepUpState,
  stepUp,
  UnmetAuthenticationRequirementsError,
} from "@kinde/js-utils";

// Require MFA in the last 5 minutes.
if (!(await hasAuthenticationContext({ acr: "mfa", maxAge: 300 }))) {
  const { url } = await stepUp("https://example.kinde.com", {
    clientId,
    redirectURL,
    acr: "mfa",
    maxAge: 300,
    returnTo: window.location.href,
  });
  await navigateToKinde({ url: url.toString() });
}
```

`stepUp` builds an interactive authorization URL with the same PKCE, `state`, and `nonce` handling as login. It never sends `prompt=none`. After the callback, `readStepUpState(state)` returns `returnTo` when one was set. Replace the stored access, ID, and refresh tokens from that callback (`exchangeAuthCode` does this). Refreshing does not upgrade `acr`, `amr`, or `auth_time`.

```typescript
const urlParams = new URLSearchParams(window.location.search);
try {
  const result = await exchangeAuthCode({
    urlParams,
    domain,
    clientId,
    redirectURL,
  });
  if (result.success) {
    const returnTo = readStepUpState(urlParams.get("state") ?? "").returnTo;
    if (returnTo) {
      window.location.assign(returnTo);
    }
  } else {
    // Sign-in failed. Show result.error; do not redirect.
  }
} catch (error) {
  if (error instanceof UnmetAuthenticationRequirementsError) {
    // Final answer. Show error.errorDescription, for example
    // "add a passkey to continue". error.state, error.acr, and error.maxAge
    // describe the request. Do not retry and do not redirect to login.
  }
}
```

`login_required` throws `LoginRequiredError` with the same fields. A callback that does not use `exchangeAuthCode` can call `readCallbackAuthenticationError` instead. State is checked before either error is reported.

`getAuthenticationContext()` returns `{ acr, amr, authTime }` for the current session. `acr` is `null` for a single-factor sign-in, and `amr` is `[]` when the token has none. `authTime` is taken from the ID token when there is one. `hasAuthenticationContext(ctx, { acr, maxAge })` is the pure check: ordering is none < `mfa` < `phr`, so `phr` meets `mfa`. `amr` is informational and is not consulted. A `maxAge` check fails when `authTime` is missing.

`isStepUpSupported(domain)` reads `acr_values_supported` from `/.well-known/openid-configuration`. When that list is absent, `stepUp({ acr })` throws and `stepUp({ maxAge })` sends `prompt=login` instead of `max_age`.

An API that protects a route checks a verified token with `hasAuthenticationContext`, then answers with `buildStepUpChallenge({ acr, maxAge })`: status `401` and `WWW-Authenticate: Bearer error="insufficient_user_authentication"`. Clients read that with `parseStepUpChallenge(response)` or `stepUpRequiredFromResponse(response)`. A `401` without that error is unchanged.

This package does not navigate, and it does not attach framework middleware. `requireAuthenticationContext` belongs in the framework SDK: verify the token first, then call `hasAuthenticationContext` and `buildStepUpChallenge`. `hasAuthenticationContext` does not verify a signature.

Other differences from the shared SDK shape:

- `authTime` is the value on the token. `getAuthenticationContext` does not call discovery. On an issuer that omits `acr_values_supported`, do not use `authTime` for recency.
- The `maxAge` comparison has no clock tolerance. This package has no existing token leeway.
- `buildStepUpChallenge` always sets `Access-Control-Expose-Headers: WWW-Authenticate`, so a browser can read the challenge when CORS is enabled. Do not put token contents in `errorDescription`.

## Kinde documentation

[Kinde Documentation](https://kinde.com/docs/) - Explore the Kinde docs

## Contributing

If you'd like to contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Submit a pull request.

## License

By contributing to Kinde, you agree that your contributions will be licensed under its MIT License.
