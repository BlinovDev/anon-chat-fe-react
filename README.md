# Anon Chat (React)

A minimal anonymous chat client with **client-side end-to-end encryption**. All crypto runs in the browser; the server only stores and delivers opaque payloads.

## Features

- **Anonymous messaging** — Identify by UUID only; no sign-up or auth.
- **E2E encryption** — Optional ECDH P-256 + AES-256-GCM; keys never leave the device.
- **Saved chats** — Store peer UUID + public key for quick re-join; delete individual chats (3s hover → Delete).
- **Profile** — Set your UUID, create or import key pair, copy public key to share.
- **Account backup** — Export/import account file (UUID, key pair, saved chats) to restore on another device or browser.
- **Clear-all** — 5s hover on the app title reveals a button to wipe all local data and reload.

## Backend

This frontend is designed to work with **[skrzynka](https://github.com/BlinovDev/skrzynka)** — a stateless message transport that issues anonymous IDs, stores encrypted payloads, and delivers messages over HTTP + WebSocket. No server-side crypto; security is entirely client-side.

## Run

```bash
npm install
npm run dev
```

Set `VITE_API_BASE` (e.g. in `.env`) to your skrzynka server URL (default: `http://localhost:8080`).
