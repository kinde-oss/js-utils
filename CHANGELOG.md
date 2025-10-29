# Changelog


## 0.28.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.28.0...main)

### 🚀 Enhancements

- Pass captured tokens to onActivityTimeout callback ([40e53e0](https://github.com/kinde-oss/js-utils/commit/40e53e0))

### 💅 Refactors

- Use getItems for more efficient token capture ([ea52cad](https://github.com/kinde-oss/js-utils/commit/ea52cad))

### 🏡 Chore

- Lock file maintainance ([77adef2](https://github.com/kinde-oss/js-utils/commit/77adef2))
- Fix vitest ([4f8f54e](https://github.com/kinde-oss/js-utils/commit/4f8f54e))
- **test:** Lint fixes ([f6eac49](https://github.com/kinde-oss/js-utils/commit/f6eac49))
- Simplifying timeoutToken type definition ([9379861](https://github.com/kinde-oss/js-utils/commit/9379861))

### ❤️ Contributors

- Koosha Owji <koosha.owji@gmail.com>
- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.27.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.27.0...main)

### 🚀 Enhancements

- GetEntitlement ([30c1742](https://github.com/kinde-oss/js-utils/commit/30c1742))
- Add support for sync helpers ([ac7d47c](https://github.com/kinde-oss/js-utils/commit/ac7d47c))

### 🏡 Chore

- PR updates ([597b90b](https://github.com/kinde-oss/js-utils/commit/597b90b))
- PR feedback ([f241065](https://github.com/kinde-oss/js-utils/commit/f241065))

### ✅ Tests

- Add tests for sync claims ([259da46](https://github.com/kinde-oss/js-utils/commit/259da46))
- Add test coverage ([c79b540](https://github.com/kinde-oss/js-utils/commit/c79b540))
- Use removeSession item in tests ([6d9ea20](https://github.com/kinde-oss/js-utils/commit/6d9ea20))
- Updates to test coverage ([48b25f6](https://github.com/kinde-oss/js-utils/commit/48b25f6))
- Fix getRoles tests ([f2d8e30](https://github.com/kinde-oss/js-utils/commit/f2d8e30))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.26.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.26.0...main)

### 🚀 Enhancements

- Allow backend refresh tokens ([e1adb5f](https://github.com/kinde-oss/js-utils/commit/e1adb5f))

### 🩹 Fixes

- Use `macroTask` queue instead of `microTask` ([ab0d356](https://github.com/kinde-oss/js-utils/commit/ab0d356))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))
- Bailey Eaton <xYoshify@gmail.com>

## 0.25.1...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.25.1...main)

### 🚀 Enhancements

- Add subscription and notification system for store changes in session manager ([44b8c79](https://github.com/kinde-oss/js-utils/commit/44b8c79))
- Update mutative functions on all stores to notify listeners ([d504a9c](https://github.com/kinde-oss/js-utils/commit/d504a9c))
- Implement notification batching to optimize listener notifications ([1eb01cb](https://github.com/kinde-oss/js-utils/commit/1eb01cb))
- Add onRefreshHandler to custom handle token refreshes ([f05dd69](https://github.com/kinde-oss/js-utils/commit/f05dd69))
- Tightened the RefreshToken response type ([e1465ff](https://github.com/kinde-oss/js-utils/commit/e1465ff))

### 🩹 Fixes

- Ensure listeners are notified regardless of branch ([1e1ed25](https://github.com/kinde-oss/js-utils/commit/1e1ed25))
- Await `destroySession` calls so that `notifyListeners` is called after the mutation completes ([83ddf1f](https://github.com/kinde-oss/js-utils/commit/83ddf1f))
- Ensure all set operations are awaited so that `notifyListeners` is called after values have been set ([0371c5b](https://github.com/kinde-oss/js-utils/commit/0371c5b))

### 💅 Refactors

- Remove await from `notifyListeners` calls ([fd335f9](https://github.com/kinde-oss/js-utils/commit/fd335f9))

### 🏡 Chore

- Remove console logs ([5eff7fe](https://github.com/kinde-oss/js-utils/commit/5eff7fe))

### ✅ Tests

- Add comprehensive subscription and listener tests for `LocalStorage` and `MemoryStorage` ([cdfeffd](https://github.com/kinde-oss/js-utils/commit/cdfeffd))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))
- Bailey Eaton <xYoshify@gmail.com>

## 0.25.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.25.0...main)

### 🩹 Fixes

- Empty storage authCheck + tests ([5ecaf66](https://github.com/kinde-oss/js-utils/commit/5ecaf66))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.24.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.24.0...main)

### 🚀 Enhancements

- Store getItems ([009f3fc](https://github.com/kinde-oss/js-utils/commit/009f3fc))
- Add isTokenExpired method ([96a606b](https://github.com/kinde-oss/js-utils/commit/96a606b))
- Enhance sanitizeUrl to remove duplicate slashes in a URL ([c6bd3e9](https://github.com/kinde-oss/js-utils/commit/c6bd3e9))
- CheckAuth when tokens in storage ([4e258ee](https://github.com/kinde-oss/js-utils/commit/4e258ee))
- Add windowless support to functions ([fad072e](https://github.com/kinde-oss/js-utils/commit/fad072e))
- Add `isClient`/`isServer` utilities ([f1848a6](https://github.com/kinde-oss/js-utils/commit/f1848a6))

### 🩹 Fixes

- Return partial type ([30c513b](https://github.com/kinde-oss/js-utils/commit/30c513b))
- Add guard to clearRefreshTimer ([b6ee46d](https://github.com/kinde-oss/js-utils/commit/b6ee46d))

### 💅 Refactors

- Replace window checks with isClient utility in auth and timer functions ([42e400b](https://github.com/kinde-oss/js-utils/commit/42e400b))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))
- Bailey Eaton <xYoshify@gmail.com>

## 0.23.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.23.0...main)

### 🚀 Enhancements

- Setup switch org method and tests ([f0b72fe](https://github.com/kinde-oss/js-utils/commit/f0b72fe))
- Add secret to exchangeAuthCode. ([12ec101](https://github.com/kinde-oss/js-utils/commit/12ec101))
- Export sessionBase ([fa3f245](https://github.com/kinde-oss/js-utils/commit/fa3f245))

### 🩹 Fixes

- Resolve activity tracker infinite timeout loops ([a738431](https://github.com/kinde-oss/js-utils/commit/a738431))
- Run prettier ([4b8048d](https://github.com/kinde-oss/js-utils/commit/4b8048d))
- Address coderabbitai nitpicks ([9405b60](https://github.com/kinde-oss/js-utils/commit/9405b60))
- Address coderabbitai nitpicks for tests ([1ee93a8](https://github.com/kinde-oss/js-utils/commit/1ee93a8))
- Update return type for correct expected output. ([51b4e2f](https://github.com/kinde-oss/js-utils/commit/51b4e2f))
- Use type orgCode in SwitchOrgParams interface ([24e1d7a](https://github.com/kinde-oss/js-utils/commit/24e1d7a))
- Exclude destroySession to prevent infinite loops ([b4278c3](https://github.com/kinde-oss/js-utils/commit/b4278c3))

### 🏡 Chore

- Improve test coverage ([090746f](https://github.com/kinde-oss/js-utils/commit/090746f))
- Lint fix ([39ec698](https://github.com/kinde-oss/js-utils/commit/39ec698))
- Workspace update ([28f3b6a](https://github.com/kinde-oss/js-utils/commit/28f3b6a))

### 🤖 CI

- Update build/test workflow ([e8340bf](https://github.com/kinde-oss/js-utils/commit/e8340bf))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))
- Alexis ([@pesickaa](https://github.com/pesickaa))
- Koosha Owji <koosha.owji@gmail.com>

## 0.22.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.22.0...main)

### 🚀 Enhancements

- Add automatic activity tracking with session expiry ([7af7055](https://github.com/kinde-oss/js-utils/commit/7af7055))

### 🩹 Fixes

- Resolve activity proxy circular dependency, fix method binding, add tests ([cf7d01b](https://github.com/kinde-oss/js-utils/commit/cf7d01b))
- Activity tracking async timer tests and duplicate destroySession calls ([f12fae4](https://github.com/kinde-oss/js-utils/commit/f12fae4))
- Activity tracking test coverage ([e09828c](https://github.com/kinde-oss/js-utils/commit/e09828c))
- Fallback to insecure storage in updateActivityTimestamp ([36b109a](https://github.com/kinde-oss/js-utils/commit/36b109a))

### 💅 Refactors

- Utilise active storage and timers ([425c96a](https://github.com/kinde-oss/js-utils/commit/425c96a))

### 🏡 Chore

- Enforce activity timeout pre-warning constraint and add error handling ([41e1eed](https://github.com/kinde-oss/js-utils/commit/41e1eed))
- Update import from main to token ([777c738](https://github.com/kinde-oss/js-utils/commit/777c738))

### ✅ Tests

- Extend coverage ([8e2f782](https://github.com/kinde-oss/js-utils/commit/8e2f782))

### ❤️ Contributors

- Koosha Owji <koosha.owji@gmail.com>
- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.21.2...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.21.2...main)

### 🚀 Enhancements

- Add navigateToKinde method ([e14b8f0](https://github.com/kinde-oss/js-utils/commit/e14b8f0))

### 📖 Documentation

- Add jsdoc ([ffc1bf3](https://github.com/kinde-oss/js-utils/commit/ffc1bf3))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.21.1...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.21.1...main)

### 🩹 Fixes

- Portal url generaton ([334a9f8](https://github.com/kinde-oss/js-utils/commit/334a9f8))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.21.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.21.0...main)

### 🚀 Enhancements

- Add extra PortalPages ([d78f28d](https://github.com/kinde-oss/js-utils/commit/d78f28d))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.20.1...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.20.1...main)

### 🚀 Enhancements

- Domain optional when generating the portal url ([a7d72ec](https://github.com/kinde-oss/js-utils/commit/a7d72ec))
- GetPermissions hard check ([9589108](https://github.com/kinde-oss/js-utils/commit/9589108))
- GetEntitlement ([9a9a507](https://github.com/kinde-oss/js-utils/commit/9a9a507))
- Augmentable, typesafe config ([475118f](https://github.com/kinde-oss/js-utils/commit/475118f))
- Has-like utils ([c3267af](https://github.com/kinde-oss/js-utils/commit/c3267af))
- Add feature flags ([2a1e5a3](https://github.com/kinde-oss/js-utils/commit/2a1e5a3))
- Conditional callback checking for roles/permissions, KV checking for featureFlags ([07146c8](https://github.com/kinde-oss/js-utils/commit/07146c8))
- Billing entitlements, forceApi for permissions ([d4ab6cb](https://github.com/kinde-oss/js-utils/commit/d4ab6cb))
- Add `forceApi` option to `getRoles` ([7b1ac72](https://github.com/kinde-oss/js-utils/commit/7b1ac72))
- Add `getFlags`, add `forceApi` options ([7685ac5](https://github.com/kinde-oss/js-utils/commit/7685ac5))
- Add `hasBillingEntitlements` ([1bc057e](https://github.com/kinde-oss/js-utils/commit/1bc057e))
- Add `forceApi` option to `hasRoles` ([9361eaa](https://github.com/kinde-oss/js-utils/commit/9361eaa))
- Add `forceApi` option to `hasPermissions` ([865806f](https://github.com/kinde-oss/js-utils/commit/865806f))
- Add `forceApi` option to `hasFeatureFlags` ([c470482](https://github.com/kinde-oss/js-utils/commit/c470482))
- Add `forceApi` and billing entitlements to `has` ([4eb12cf](https://github.com/kinde-oss/js-utils/commit/4eb12cf))

### 🩹 Fixes

- Add empty array fallback ([8191ee6](https://github.com/kinde-oss/js-utils/commit/8191ee6))
- Add empty array fallback ([9c05889](https://github.com/kinde-oss/js-utils/commit/9c05889))
- Fallback to null if a matching flag isn't found with `forceApi` ([3d8e1c2](https://github.com/kinde-oss/js-utils/commit/3d8e1c2))
- Checking the feature flags individually is no longer an async op ([22fd6f9](https://github.com/kinde-oss/js-utils/commit/22fd6f9))
- Remove `base` option ([5656281](https://github.com/kinde-oss/js-utils/commit/5656281))
- Typo in test name ([c43ad1a](https://github.com/kinde-oss/js-utils/commit/c43ad1a))
- Add `type` to type-only imports ([8d38f3d](https://github.com/kinde-oss/js-utils/commit/8d38f3d))
- Improve error handling ([eb3ea0c](https://github.com/kinde-oss/js-utils/commit/eb3ea0c))
- Update test cases for new error handling ([dc45bf2](https://github.com/kinde-oss/js-utils/commit/dc45bf2))
- Add `forceApi` test cases ([f00ede8](https://github.com/kinde-oss/js-utils/commit/f00ede8))
- Missing edge test cases ([3495d34](https://github.com/kinde-oss/js-utils/commit/3495d34))

### 🏡 Chore

- Small fixes ([913afad](https://github.com/kinde-oss/js-utils/commit/913afad))
- Tests ([606ecfc](https://github.com/kinde-oss/js-utils/commit/606ecfc))
- Exports ([b141ce7](https://github.com/kinde-oss/js-utils/commit/b141ce7))
- Update exports ([80eab61](https://github.com/kinde-oss/js-utils/commit/80eab61))
- Small refactors and tweaks ([fea7017](https://github.com/kinde-oss/js-utils/commit/fea7017))
- Update types ([1e9aa3f](https://github.com/kinde-oss/js-utils/commit/1e9aa3f))
- Update exports ([632d0c6](https://github.com/kinde-oss/js-utils/commit/632d0c6))
- Update exports ([52d4e23](https://github.com/kinde-oss/js-utils/commit/52d4e23))
- Update tests for `forceApi` in `getRoles` ([bc5a3eb](https://github.com/kinde-oss/js-utils/commit/bc5a3eb))
- Remove no longer necessary test case ([04e38a2](https://github.com/kinde-oss/js-utils/commit/04e38a2))
- Update test case to include `hasBillingEntitlements` ([beabd41](https://github.com/kinde-oss/js-utils/commit/beabd41))
- Format ([c367a3a](https://github.com/kinde-oss/js-utils/commit/c367a3a))
- Update tests ([6207476](https://github.com/kinde-oss/js-utils/commit/6207476))
- Fix typo in jsdoc ([36b3947](https://github.com/kinde-oss/js-utils/commit/36b3947))
- Update commentary ([c221ec0](https://github.com/kinde-oss/js-utils/commit/c221ec0))
- Update hasura role test coverage ([9d8bd16](https://github.com/kinde-oss/js-utils/commit/9d8bd16))
- Add API call test coverage ([47c9c17](https://github.com/kinde-oss/js-utils/commit/47c9c17))
- Re-run format ([411a2ce](https://github.com/kinde-oss/js-utils/commit/411a2ce))
- Fix typo ([41938ad](https://github.com/kinde-oss/js-utils/commit/41938ad))
- Update test cases ([49a8548](https://github.com/kinde-oss/js-utils/commit/49a8548))
- Nit on naming ([aadc7aa](https://github.com/kinde-oss/js-utils/commit/aadc7aa))

### ❤️ Contributors

- Bailey Eaton <xYoshify@gmail.com>
- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.20.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.20.0...main)

### 🩹 Fixes

- Update to the getEntitlements response ([c59e159](https://github.com/kinde-oss/js-utils/commit/c59e159))

### 🏡 Chore

- Rename feature code to feature code ([772012b](https://github.com/kinde-oss/js-utils/commit/772012b))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.19.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.19.0...main)

### 🚀 Enhancements

- GetEntitlements ([ab760b6](https://github.com/kinde-oss/js-utils/commit/ab760b6))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.18.3...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.18.3...main)

### 🚀 Enhancements

- Add pages mode auth param ([3eae947](https://github.com/kinde-oss/js-utils/commit/3eae947))
- Add method to generate version header ([e31c6f0](https://github.com/kinde-oss/js-utils/commit/e31c6f0))

### 🩹 Fixes

- Expo-secure-store build imports ([ac39c3b](https://github.com/kinde-oss/js-utils/commit/ac39c3b))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.18.2...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.18.2...main)

### 🩹 Fixes

- Portal return URL validation ([cfadcbb](https://github.com/kinde-oss/js-utils/commit/cfadcbb))

### 🏡 Chore

- Refactor and disallow ws and ftp: ([d50bf02](https://github.com/kinde-oss/js-utils/commit/d50bf02))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.18.1...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.18.1...main)

### 🚀 Enhancements

- Add pricingTableKey ([f72a2df](https://github.com/kinde-oss/js-utils/commit/f72a2df))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.18.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.18.0...main)

### 🩹 Fixes

- Ensure absolute returnUrls are supplied to portal generation ([8b4e282](https://github.com/kinde-oss/js-utils/commit/8b4e282))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.17.1...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.17.1...main)

### 💅 Refactors

- Renamed generateProfileUrl to generatePortalUrl ([4dc8bd1](https://github.com/kinde-oss/js-utils/commit/4dc8bd1))

### 🏡 Chore

- Remove deplicate test ([f45be0c](https://github.com/kinde-oss/js-utils/commit/f45be0c))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.16.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.16.0...main)

### 🚀 Enhancements

- GenerateProfileUrl ([0b91c88](https://github.com/kinde-oss/js-utils/commit/0b91c88))
- Switch subnav to enum ([9f57750](https://github.com/kinde-oss/js-utils/commit/9f57750))
- Make subNav optional ([c72565e](https://github.com/kinde-oss/js-utils/commit/c72565e))

### 🩹 Fixes

- Add export for generateProfileUrl ([159f025](https://github.com/kinde-oss/js-utils/commit/159f025))

### 💅 Refactors

- Update generateProfileUrl types ([e27bcf6](https://github.com/kinde-oss/js-utils/commit/e27bcf6))

### 🏡 Chore

- Release v0.16.0 ([9b1ed67](https://github.com/kinde-oss/js-utils/commit/9b1ed67))
- Update endpoint and remove orgCode ([0f484f3](https://github.com/kinde-oss/js-utils/commit/0f484f3))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.15.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.15.0...main)

### 🚀 Enhancements

- GetRawToken ([5a11e5a](https://github.com/kinde-oss/js-utils/commit/5a11e5a))
- **types:** Export RefreshType ([598a446](https://github.com/kinde-oss/js-utils/commit/598a446))
- Support supplying audience as array ([ee3595b](https://github.com/kinde-oss/js-utils/commit/ee3595b))
- Plan interest ([812a1b7](https://github.com/kinde-oss/js-utils/commit/812a1b7))
- Support reauth functionality ([cf5329a](https://github.com/kinde-oss/js-utils/commit/cf5329a))

### 🩹 Fixes

- Correct typo in error message ([09b8508](https://github.com/kinde-oss/js-utils/commit/09b8508))

### 🏡 Chore

- **types:** Add type to import ([62e6a60](https://github.com/kinde-oss/js-utils/commit/62e6a60))

### ✅ Tests

- Added additional test for invalid base64 ([f946b11](https://github.com/kinde-oss/js-utils/commit/f946b11))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.14.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.14.0...main)

### 💅 Refactors

- Move splitstring util ([7ff41d1](https://github.com/kinde-oss/js-utils/commit/7ff41d1))

### 🏡 Chore

- Lint ([dd34e70](https://github.com/kinde-oss/js-utils/commit/dd34e70))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.13.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.13.0...main)

### 🚀 Enhancements

- Marketing tag properties ([a272b64](https://github.com/kinde-oss/js-utils/commit/a272b64))

### 🏡 Chore

- Correct typos ([5f88778](https://github.com/kinde-oss/js-utils/commit/5f88778))
- Lockfile maintainence ([5637114](https://github.com/kinde-oss/js-utils/commit/5637114))

### 🤖 CI

- Update setup action version ([2e20eeb](https://github.com/kinde-oss/js-utils/commit/2e20eeb))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.12.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.12.0...main)

### 🚀 Enhancements

- Improve treeshaking and lazy loading of expo-secure-store ([92ccd75](https://github.com/kinde-oss/js-utils/commit/92ccd75))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.11.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.11.0...main)

### 🚀 Enhancements

- Notify on token refresh after code exchange ([378c734](https://github.com/kinde-oss/js-utils/commit/378c734))

### 🏡 Chore

- Lockfile maintainance ([4c8a28c](https://github.com/kinde-oss/js-utils/commit/4c8a28c))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.10.1...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.10.1...main)

### 🚀 Enhancements

- Add callback to refresh token method. ([14d83e8](https://github.com/kinde-oss/js-utils/commit/14d83e8))

### 🩹 Fixes

- Long token expiry with refresh ([f74bbd4](https://github.com/kinde-oss/js-utils/commit/f74bbd4))

### 🏡 Chore

- Eslint ignore updates ([638f9c3](https://github.com/kinde-oss/js-utils/commit/638f9c3))

### ✅ Tests

- Add text for onRefresh ([58f9e36](https://github.com/kinde-oss/js-utils/commit/58f9e36))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.10.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.10.0...main)

### 🩹 Fixes

- Role docs and type exports ([cebdd3b](https://github.com/kinde-oss/js-utils/commit/cebdd3b))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.9.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.9.0...main)

### 🚀 Enhancements

- Enhancements to codeExchange ([5e893c4](https://github.com/kinde-oss/js-utils/commit/5e893c4))

### 🩹 Fixes

- Roles return type ([6c2345f](https://github.com/kinde-oss/js-utils/commit/6c2345f))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](https://github.com/DanielRivers))

## 0.8.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.8.0...main)

### 🚀 Enhancements

- Hasura mapping support ([9cecfa2](https://github.com/kinde-oss/js-utils/commit/9cecfa2))
- GetCurrentOrganisation hasura support and extended test coverage ([8612e14](https://github.com/kinde-oss/js-utils/commit/8612e14))

### 🩹 Fixes

- Test regression ([d0ffd7d](https://github.com/kinde-oss/js-utils/commit/d0ffd7d))

### 🏡 Chore

- PR feedback tweaks ([3ea032c](https://github.com/kinde-oss/js-utils/commit/3ea032c))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.7.3...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.7.3...main)

### 🚀 Enhancements

- Add option to disable url sanitation ([be656bf](https://github.com/kinde-oss/js-utils/commit/be656bf))

### 🩹 Fixes

- LoginMethodParams now a Partial ([eb48810](https://github.com/kinde-oss/js-utils/commit/eb48810))

### 🏡 Chore

- Remove unused import ([c550d84](https://github.com/kinde-oss/js-utils/commit/c550d84))
- Lint ([2f889bf](https://github.com/kinde-oss/js-utils/commit/2f889bf))
- Lint ([818eac2](https://github.com/kinde-oss/js-utils/commit/818eac2))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.7.2...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.7.2...main)

### 🩹 Fixes

- False boolean flag returning null ([b106a45](https://github.com/kinde-oss/js-utils/commit/b106a45))

### ✅ Tests

- Test to cover false boolean feature flags ([eb27de5](https://github.com/kinde-oss/js-utils/commit/eb27de5))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.7.1...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.7.1...main)

### 🚀 Enhancements

- Migrate to use js-utils and refresh token support ([ad2f6d6](https://github.com/kinde-oss/js-utils/commit/ad2f6d6))
- Export refresh timer methods ([490fdb0](https://github.com/kinde-oss/js-utils/commit/490fdb0))
- Update SDK usage matrics ([e688e22](https://github.com/kinde-oss/js-utils/commit/e688e22))
- Get claims from either token ([e84085b](https://github.com/kinde-oss/js-utils/commit/e84085b))

### 🩹 Fixes

- Insecure token storage when using no non custom domain ([7338321](https://github.com/kinde-oss/js-utils/commit/7338321))
- Only show production warning when explicity setting the 'useInsecureForRefreshToken' ([958f4ed](https://github.com/kinde-oss/js-utils/commit/958f4ed))
- Non prod kinde domains ([24be712](https://github.com/kinde-oss/js-utils/commit/24be712))
- Stronger typing on exchange code return type ([17a6770](https://github.com/kinde-oss/js-utils/commit/17a6770))
- State passed to generateAuthUrl not stored in state ([02e34ae](https://github.com/kinde-oss/js-utils/commit/02e34ae))
- Custom domain auto refresh ([4738ed4](https://github.com/kinde-oss/js-utils/commit/4738ed4))

### 📖 Documentation

- Update JSDocs ([45f7590](https://github.com/kinde-oss/js-utils/commit/45f7590))

### 🏡 Chore

- Lint ([08f7232](https://github.com/kinde-oss/js-utils/commit/08f7232))
- Remove debug console log ([c889b9c](https://github.com/kinde-oss/js-utils/commit/c889b9c))

### ✅ Tests

- Add tests ([979974d](https://github.com/kinde-oss/js-utils/commit/979974d))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.7.1...fix/refresh_insecure_token_storage

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.7.1...fix/refresh_insecure_token_storage)

### 🩹 Fixes

- Insecure token storage when using no non custom domain ([7338321](https://github.com/kinde-oss/js-utils/commit/7338321))
- Only show production warning when explicity setting the 'useInsecureForRefreshToken' ([958f4ed](https://github.com/kinde-oss/js-utils/commit/958f4ed))
- Non prod kinde domains ([24be712](https://github.com/kinde-oss/js-utils/commit/24be712))

### ✅ Tests

- Add tests ([979974d](https://github.com/kinde-oss/js-utils/commit/979974d))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.7.1...fix/refresh_insecure_token_storage

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.7.1...fix/refresh_insecure_token_storage)

### 🩹 Fixes

- Insecure token storage when using no non custom domain ([7338321](https://github.com/kinde-oss/js-utils/commit/7338321))
- Only show production warning when explicity setting the 'useInsecureForRefreshToken' ([958f4ed](https://github.com/kinde-oss/js-utils/commit/958f4ed))
- Non prod kinde domains ([24be712](https://github.com/kinde-oss/js-utils/commit/24be712))

### ✅ Tests

- Add tests ([979974d](https://github.com/kinde-oss/js-utils/commit/979974d))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.7.1...fix/refresh_insecure_token_storage

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.7.1...fix/refresh_insecure_token_storage)

### 🩹 Fixes

- Insecure token storage when using no non custom domain ([7338321](https://github.com/kinde-oss/js-utils/commit/7338321))
- Only show production warning when explicity setting the 'useInsecureForRefreshToken' ([958f4ed](https://github.com/kinde-oss/js-utils/commit/958f4ed))
- Non prod kinde domains ([24be712](https://github.com/kinde-oss/js-utils/commit/24be712))

### ✅ Tests

- Add tests ([979974d](https://github.com/kinde-oss/js-utils/commit/979974d))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.7.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.7.0...main)

### 🩹 Fixes

- Custom domain with http prefix ([17c9007](https://github.com/kinde-oss/js-utils/commit/17c9007))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.6.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.6.0...main)

### 🚀 Enhancements

- Add code verifier to generateAuthUrl reponse ([2d2eff4](https://github.com/kinde-oss/js-utils/commit/2d2eff4))
- Refresh fixes ([ea43219](https://github.com/kinde-oss/js-utils/commit/ea43219))
- Support cookie based refresh tokens ([9b67701](https://github.com/kinde-oss/js-utils/commit/9b67701))

### 🩹 Fixes

- Support generation authentication URLs in react native ([a366af2](https://github.com/kinde-oss/js-utils/commit/a366af2))
- Ignore expired cookies ([87cbd4f](https://github.com/kinde-oss/js-utils/commit/87cbd4f))
- Tests and error checking ([8c7dbf7](https://github.com/kinde-oss/js-utils/commit/8c7dbf7))

### 🏡 Chore

- Lint ([0368e77](https://github.com/kinde-oss/js-utils/commit/0368e77))
- Lint ([02280fc](https://github.com/kinde-oss/js-utils/commit/02280fc))

### ✅ Tests

- Improvement to tests ([8ec3f7b](https://github.com/kinde-oss/js-utils/commit/8ec3f7b))
- Tsignore ([c8c06df](https://github.com/kinde-oss/js-utils/commit/c8c06df))
- Change test names ([583b983](https://github.com/kinde-oss/js-utils/commit/583b983))
- Extend test suite ([319d8fa](https://github.com/kinde-oss/js-utils/commit/319d8fa))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.5.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.5.0...main)

### 🚀 Enhancements

- Update tests ([014734f](https://github.com/kinde-oss/js-utils/commit/014734f))
- Add isCustomDomain utility method. ([f14cdf6](https://github.com/kinde-oss/js-utils/commit/f14cdf6))

### 🩹 Fixes

- Linting issue ([4fc6367](https://github.com/kinde-oss/js-utils/commit/4fc6367))

### 🏡 Chore

- Linting issues fixed ([04ffbf7](https://github.com/kinde-oss/js-utils/commit/04ffbf7))
- Update test to use new types ([1bde95b](https://github.com/kinde-oss/js-utils/commit/1bde95b))
- Lint ([01e1e7d](https://github.com/kinde-oss/js-utils/commit/01e1e7d))

### ✅ Tests

- Update test to use PromptType enum ([fc1d1ad](https://github.com/kinde-oss/js-utils/commit/fc1d1ad))
- Remove left over only marker. ([aa4ddf3](https://github.com/kinde-oss/js-utils/commit/aa4ddf3))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))
- Dave Berner <davidajberner@gmail.com>

## 0.4.1...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.4.1...main)

### 🚀 Enhancements

- Add isAuthenticated and refreshToken functions ([6ae7ec2](https://github.com/kinde-oss/js-utils/commit/6ae7ec2))
- Add workflowId and ReleaseId query params ([d9d723b](https://github.com/kinde-oss/js-utils/commit/d9d723b))
- Added localStorage store ([38707bf](https://github.com/kinde-oss/js-utils/commit/38707bf))
- Add localStorage production warning ([3fb9290](https://github.com/kinde-oss/js-utils/commit/3fb9290))
- Add setItems to storage ([b085335](https://github.com/kinde-oss/js-utils/commit/b085335))
- Added hasActiveStorage and JSDocs ([8daa59d](https://github.com/kinde-oss/js-utils/commit/8daa59d))
- Add clearActiveStorage and tests ([6e2399f](https://github.com/kinde-oss/js-utils/commit/6e2399f))
- Add remove multiple items support from store ([8c9474c](https://github.com/kinde-oss/js-utils/commit/8c9474c))
- Add exchangeAuthCode method ([eb514ce](https://github.com/kinde-oss/js-utils/commit/eb514ce))
- Added framework settings config and expanded tests ([62ebed6](https://github.com/kinde-oss/js-utils/commit/62ebed6))
- Improve splitString ([c78f029](https://github.com/kinde-oss/js-utils/commit/c78f029))
- Add handling bad responses from token endpoint ([d033a0d](https://github.com/kinde-oss/js-utils/commit/d033a0d))
- Updates ([c7b873e](https://github.com/kinde-oss/js-utils/commit/c7b873e))
- Insecure storage support ([c0abe4e](https://github.com/kinde-oss/js-utils/commit/c0abe4e))
- Auto refresh token after code exchange ([c2c875f](https://github.com/kinde-oss/js-utils/commit/c2c875f))

### 🩹 Fixes

- Couple of small updates to generateAuthUrl, including auto setting store with nonce and state. ([e0e2422](https://github.com/kinde-oss/js-utils/commit/e0e2422))
- Remove exception when no state ([3c00453](https://github.com/kinde-oss/js-utils/commit/3c00453))
- Update LocalStorage and fix types ([f2384a1](https://github.com/kinde-oss/js-utils/commit/f2384a1))
- Solidify types more ([69e55c1](https://github.com/kinde-oss/js-utils/commit/69e55c1))
- PR updates ([3658bc4](https://github.com/kinde-oss/js-utils/commit/3658bc4))
- Add missing StorageKey ([05e7203](https://github.com/kinde-oss/js-utils/commit/05e7203))
- Extend code verifier ([7c649b4](https://github.com/kinde-oss/js-utils/commit/7c649b4))
- IsAuthenticatedPropsWithRefreshToken interface ([561489c](https://github.com/kinde-oss/js-utils/commit/561489c))
- Await removing storage items ([4f0e74b](https://github.com/kinde-oss/js-utils/commit/4f0e74b))
- Error handling improvements and improved security ([00a554f](https://github.com/kinde-oss/js-utils/commit/00a554f))
- Preseve browser state ([e0d39fd](https://github.com/kinde-oss/js-utils/commit/e0d39fd))
- Correct spelling of sanitizeUrl ([742f5a7](https://github.com/kinde-oss/js-utils/commit/742f5a7))
- Vite exports for builds ([ce4f2ce](https://github.com/kinde-oss/js-utils/commit/ce4f2ce))
- Done make refreshTimer exported ([014461e](https://github.com/kinde-oss/js-utils/commit/014461e))
- Correct incorrect spelling ([6012806](https://github.com/kinde-oss/js-utils/commit/6012806))
- Build error ([8de8eb3](https://github.com/kinde-oss/js-utils/commit/8de8eb3))
- Incorrect react-native requirement ([ba1f131](https://github.com/kinde-oss/js-utils/commit/ba1f131))
- Lockfile ([0303c8f](https://github.com/kinde-oss/js-utils/commit/0303c8f))
- Deployment id url parameter ([82aed0a](https://github.com/kinde-oss/js-utils/commit/82aed0a))
- Remove releaseId ([8fbb73f](https://github.com/kinde-oss/js-utils/commit/8fbb73f))

### 🏡 Chore

- **deps-dev:** Bump rollup ([f2444ac](https://github.com/kinde-oss/js-utils/commit/f2444ac))
- Lint ([382559d](https://github.com/kinde-oss/js-utils/commit/382559d))
- Lint ([6bc8a98](https://github.com/kinde-oss/js-utils/commit/6bc8a98))
- Remove console log ([cd668a8](https://github.com/kinde-oss/js-utils/commit/cd668a8))
- Lint ([aa264e8](https://github.com/kinde-oss/js-utils/commit/aa264e8))
- Lint ([bd82a91](https://github.com/kinde-oss/js-utils/commit/bd82a91))
- Clean up tests ([f8f605a](https://github.com/kinde-oss/js-utils/commit/f8f605a))
- Lint and remove only from tests ([912a7cb](https://github.com/kinde-oss/js-utils/commit/912a7cb))
- Update lock ([b33533e](https://github.com/kinde-oss/js-utils/commit/b33533e))
- Remove incomplete store. ([5ba4864](https://github.com/kinde-oss/js-utils/commit/5ba4864))
- Lint ([eff28e6](https://github.com/kinde-oss/js-utils/commit/eff28e6))
- Update test config ([7c866c1](https://github.com/kinde-oss/js-utils/commit/7c866c1))
- Remove redundant import ([034021b](https://github.com/kinde-oss/js-utils/commit/034021b))
- Updae lock and prettierignore ([abf5864](https://github.com/kinde-oss/js-utils/commit/abf5864))
- Lint ([c89a6ce](https://github.com/kinde-oss/js-utils/commit/c89a6ce))
- Lint ([e900979](https://github.com/kinde-oss/js-utils/commit/e900979))
- Allow ts-ignore in test ([4b0efcf](https://github.com/kinde-oss/js-utils/commit/4b0efcf))
- Lint ([635c044](https://github.com/kinde-oss/js-utils/commit/635c044))

### ✅ Tests

- Add tests for isAuthenticated and refreshToken ([c765e7d](https://github.com/kinde-oss/js-utils/commit/c765e7d))
- Fix tests ([8f0139b](https://github.com/kinde-oss/js-utils/commit/8f0139b))
- Add new methods to export test ([721f088](https://github.com/kinde-oss/js-utils/commit/721f088))
- Fix tests ([d8313d7](https://github.com/kinde-oss/js-utils/commit/d8313d7))
- Fix tests ([19ccb41](https://github.com/kinde-oss/js-utils/commit/19ccb41))
- Update tests ([3243c4e](https://github.com/kinde-oss/js-utils/commit/3243c4e))
- Minor updates ([b6877c0](https://github.com/kinde-oss/js-utils/commit/b6877c0))
- Fix unit tests ([fe8e4c0](https://github.com/kinde-oss/js-utils/commit/fe8e4c0))
- Expand refresh token tests ([5c2089f](https://github.com/kinde-oss/js-utils/commit/5c2089f))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.4.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.4.0...main)

### 🩹 Fixes

- Token utility export ([3ee4b53](https://github.com/kinde-oss/js-utils/commit/3ee4b53))
- Be explicit on token utils export ([1fe6d7e](https://github.com/kinde-oss/js-utils/commit/1fe6d7e))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.3.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.3.0...main)

### 🚀 Enhancements

- Add activeStorage, getDecodedToken and getUserOrganisations ([2221169](https://github.com/kinde-oss/js-utils/commit/2221169))
- More helpers and tests ([0789079](https://github.com/kinde-oss/js-utils/commit/0789079))
- Added getRoles and extended test coverage ([0b03912](https://github.com/kinde-oss/js-utils/commit/0b03912))
- Add error when no sub in idtoken and getting user ([d34ee6e](https://github.com/kinde-oss/js-utils/commit/d34ee6e))

### 🩹 Fixes

- Offline scope ([a82c634](https://github.com/kinde-oss/js-utils/commit/a82c634))
- Tests ([9be8fce](https://github.com/kinde-oss/js-utils/commit/9be8fce))

### 📖 Documentation

- Add helpers to readme ([60387bf](https://github.com/kinde-oss/js-utils/commit/60387bf))

### 🏡 Chore

- **deps-dev:** Bump vite in the npm_and_yarn group across 1 directory ([d29cf4b](https://github.com/kinde-oss/js-utils/commit/d29cf4b))
- Remove todo comment ([8aaeca0](https://github.com/kinde-oss/js-utils/commit/8aaeca0))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.2.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.2.0...main)

### 🚀 Enhancements

- Add nonce to StorageKeys ([587a9f6](https://github.com/kinde-oss/js-utils/commit/587a9f6))
- Add expo secure store session manager ([e86dd0f](https://github.com/kinde-oss/js-utils/commit/e86dd0f))
- Add nonce external definition and remove redundant code random generator calls ([3010015](https://github.com/kinde-oss/js-utils/commit/3010015))

### 🩹 Fixes

- Make generateRandomString work when not crypto ([12bce7d](https://github.com/kinde-oss/js-utils/commit/12bce7d))
- Ensure expo storage is loaded before using. ([7245aaa](https://github.com/kinde-oss/js-utils/commit/7245aaa))
- Return null when item doesn't exist from expo store ([80d76c4](https://github.com/kinde-oss/js-utils/commit/80d76c4))
- Error returning nonce and state ([3eb0cec](https://github.com/kinde-oss/js-utils/commit/3eb0cec))

### 🏡 Chore

- Correct js doc for chrome store ([925b8ba](https://github.com/kinde-oss/js-utils/commit/925b8ba))
- Lint ([19b5f96](https://github.com/kinde-oss/js-utils/commit/19b5f96))
- Remove console log ([b437cac](https://github.com/kinde-oss/js-utils/commit/b437cac))

### ✅ Tests

- Skip expo tests until mocked ([ae77939](https://github.com/kinde-oss/js-utils/commit/ae77939))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## 0.1.0...main

[compare changes](https://github.com/kinde-oss/js-utils/compare/0.1.0...main)

### 🚀 Enhancements

- Add memory storage manager ([149d99c](https://github.com/kinde-oss/js-utils/commit/149d99c))
- Add chromeStorage, extend testing and add more utility helpers ([582f818](https://github.com/kinde-oss/js-utils/commit/582f818))

### 🩹 Fixes

- Correct type used on sessionSettings ([2d462e4](https://github.com/kinde-oss/js-utils/commit/2d462e4))
- Correct type and add state as storageKey ([104f3f8](https://github.com/kinde-oss/js-utils/commit/104f3f8))
- SessionStore issues ([34a7298](https://github.com/kinde-oss/js-utils/commit/34a7298))

### 🏡 Chore

- Update dependancies ([ca6c240](https://github.com/kinde-oss/js-utils/commit/ca6c240))
- Update package.json ([d984d7d](https://github.com/kinde-oss/js-utils/commit/d984d7d))
- Lint: ([5eed18f](https://github.com/kinde-oss/js-utils/commit/5eed18f))
- Update readme and remove .only from tests ([f4fecc2](https://github.com/kinde-oss/js-utils/commit/f4fecc2))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))

## ...main


### 🚀 Enhancements

- Initial commit ([60e7ac8](https://github.com/kinde-oss/js-utils/commit/60e7ac8))
- Added eslint ([5d1988e](https://github.com/kinde-oss/js-utils/commit/5d1988e))
- Updates ([f246eac](https://github.com/kinde-oss/js-utils/commit/f246eac))
- Add mapLoginMethodParamsForUrl and improved typing and default values. ([d9ae73d](https://github.com/kinde-oss/js-utils/commit/d9ae73d))
- Add showCompleteScreen ([ad2a868](https://github.com/kinde-oss/js-utils/commit/ad2a868))

### 🩹 Fixes

- Change show complete screen to has success page ([7d12cac](https://github.com/kinde-oss/js-utils/commit/7d12cac))

### 📖 Documentation

- Update readme ([9b73820](https://github.com/kinde-oss/js-utils/commit/9b73820))

### 🏡 Chore

- Lint fixes ([12d9e8f](https://github.com/kinde-oss/js-utils/commit/12d9e8f))

### ✅ Tests

- Change test imports to extend coverage ([a53ae90](https://github.com/kinde-oss/js-utils/commit/a53ae90))

### ❤️ Contributors

- Daniel Rivers ([@DanielRivers](http://github.com/DanielRivers))
