# SP DEX

A customized Orderly Network DEX built with Vite, React, and the Orderly SDK.

This app is configured for an API-credential-first trading flow. Wallet connect UI is hidden, API credential login is available from the top navigation, and saved API credentials can be restored from local browser storage on the next visit.

## Features

- Orderly trading page and portfolio modules
- API credential login using an existing Orderly Account ID, API key, and API secret
- Optional local persistence for API credential sessions
- API-only mode via `VITE_API_CREDENTIAL_ONLY`
- Custom theme overrides in `app/styles/theme.css`
- Runtime configuration through `public/config.js`

## Requirements

- Node.js 20 or newer
- Yarn

## Development

Install dependencies:

```sh
yarn install
```

Start the local dev server:

```sh
yarn dev
```

By default the app runs at:

```txt
http://localhost:5173
```

## Build

Create a production build:

```sh
yarn build
```

Create the SPA build:

```sh
yarn build:spa
```

## Configuration

Runtime settings live in `public/config.js`. Important values include:

```js
window.__RUNTIME_CONFIG__ = {
  VITE_ORDERLY_BROKER_ID: "demo",
  VITE_ORDERLY_BROKER_NAME: "1111",
  VITE_API_CREDENTIAL_ONLY: "true",
};
```

Set `VITE_API_CREDENTIAL_ONLY` to `"false"` if you want to restore normal wallet connector behavior.

## API Credential Login

The app supports logging in with:

- Orderly Account ID
- Orderly API key
- Orderly API secret

After a successful login, credentials are stored in local browser storage under:

```txt
sp_api_credential_login
```

On the next visit, the app attempts to restore the API session automatically. Clicking `Disconnect` clears the saved local credentials.

## Disclaimer

This software is provided for development and integration purposes only. It is not financial advice, investment advice, or a recommendation to trade.

Trading perpetuals and digital assets involves substantial risk, including the possible loss of funds. You are responsible for understanding the risks, permissions, and account access granted by any API credential used with this app.

API secrets stored in browser `localStorage` can be accessed by anyone with access to the browser profile or by malicious scripts running on the same origin. Use this persistence only in trusted environments. For production user-facing deployments, consider requiring explicit user consent, limiting API key permissions, using short-lived keys where possible, and avoiding storage of trading secrets in browser-accessible storage.

Wallet-free API credential login can support trading actions that are authorized by an existing Orderly API key. It does not replace wallet signatures for wallet-owned or chain-level actions such as deposits, withdrawals, account registration, or API key management.

Use this app at your own risk.

## Useful Paths

- `app/components/ApiCredentialLogin.tsx` - API credential login and local restore
- `app/components/orderlyProvider/index.tsx` - Orderly provider and API-only mode
- `app/pages/portfolio/Layout.tsx` - Portfolio layout customization
- `app/styles/theme.css` - Theme and UI overrides
- `public/config.js` - Runtime configuration
