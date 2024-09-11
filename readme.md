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

`base64UrlEncode` - creates a base64 encoding of a string

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

`ExpoSecureStore` - Secure storage for Expo apps

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
