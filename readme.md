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

### Session Managers

exports `storageSettings` which can be used to configure the storage methods.

```json
{
  "keyPrefix": "kinde-", // Prefix to be used on all storage items
  "maxLength": 2000 // Max length of storage block, will auto split into separate chunks if needed
}
```

`MemoryStorage` - This holds the data in a simple memory store

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
