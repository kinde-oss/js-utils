# fix(js-utils): split ExpoSecureStore into self-contained `@kinde/js-utils/expo` entry

Fixes #212

## Problem

`ExpoSecureStore` lived on the main `@kinde/js-utils` entry and relied on `/* webpackIgnore: true */` to avoid build failures in web frameworks (see #139).

That created a bundler conflict:

- **Webpack / Next.js** — `webpackIgnore` prevented build-time resolution of optional `expo-secure-store`
- **Metro / Expo** — the same hint stopped Metro from bundling `expo-secure-store`, causing runtime failures when upgrading `@kinde/js-utils`
- **Vite / SSR (TanStack Start, Nitro)** — unresolved runtime imports on the server

Removing `webpackIgnore` alone would fix Expo but risk regressing web builds. The underlying issue is that optional React Native code was shipped in the default package entry every web app consumes.

## Solution

Split Expo storage into a dedicated, opt-in package entry and build it separately.

### Package changes

- Added `@kinde/js-utils/expo` export in `package.json`
- Removed `ExpoSecureStore` from the main `@kinde/js-utils` entry
- Removed `ExpoSecureStore` from the `sessionManager` barrel export
- Removed `webpackIgnore` hints — no longer needed with this architecture

### Build changes

- **`vite.config.ts`** — builds main entry only (`dist/js-utils.js`)
- **`vite.expo.config.ts`** — builds a self-contained Expo entry (`dist/expo.js`) with `codeSplitting: false`
- Extracted `storageSettings` into its own module so the Expo bundle does not pull in `LocalStorage`, `MemoryStorage`, or `ChromeStore`

### Consumer migration

**Before:**

```ts
import { ExpoSecureStore } from "@kinde/js-utils";

const Store = await ExpoSecureStore.default();
const storage = new Store();
```

**After:**

```ts
import { ExpoSecureStore } from "@kinde/js-utils/expo";

const storage = new ExpoSecureStore();
```

Web apps continue using `@kinde/js-utils` only — no changes required.

## Why this over removing `webpackIgnore` alone

| Approach | Expo | Web / Next.js |
| --- | --- | --- |
| Keep `webpackIgnore` | Metro fails to bundle | Build succeeds |
| Remove `webpackIgnore` | Metro works | Build may fail (#347) |
| **Split `@kinde/js-utils/expo`** | Self-contained bundle | Main entry has zero Expo code |

## Validation

- [x] `dist/js-utils.js` contains no `expo-secure-store` references
- [x] `dist/expo.js` is self-contained (no shared `sessionManager-*.js` chunks)
- [x] Unit tests for main bundle isolation and expo entry behavior
- [ ] `@kinde/expo` SDK updated to import from `@kinde/js-utils/expo`
- [ ] Expo app smoke test with linked local `@kinde/js-utils`
- [ ] Next.js production build smoke test without `expo-secure-store` installed

### Next.js SSR smoke test

```bash
cd kinde-js-utils && pnpm build

cd kinde-auth-nextjs/playground
# add pnpm.overrides: { "@kinde/js-utils": "file:../../kinde-js-utils" }
pnpm install
rm -rf .next && pnpm build
rg "expo-secure-store" .next -l   # expect no matches
pnpm start
```

## Follow-up

- Update `@kinde/expo` to use `@kinde/js-utils/expo`
- Bump dependent Kinde SDKs after release
- Consider a deprecation shim on the main entry for one release if needed

---

## Checklist

- [x] I have read the "Pull requests" section in the contributing guidelines.
- [x] I agree to the terms within the code of conduct.
