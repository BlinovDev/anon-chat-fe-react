# React Frontend (Anon Chat)

## Tech
- React + TypeScript + Vite
- WebCrypto: ECDH P-256 + AES-256-GCM
- Backend: HTTP + WebSocket (no auth, no server crypto)

---

## Iteration 1 — Transport Chat (No Encryption)

Goal: prove frontend can talk to backend.

UI:
- StartPage: inputs:
  - My UUID
  - Peer UUID
  - "Start messaging" button

Behavior on "Start messaging":
1) HTTP GET history:
   GET /v1/messages?user_id=<my>&peer_id=<peer>
2) Connect WebSocket:
   WS /v1/ws?user_id=<my>
3) Sending:
   POST /v1/messages
   body:
   {
     "client_msg_id": "<uuid>",
     "sender_id": "<my>",
     "recipient_id": "<peer>",
     "payload": { "text": "<plain text>" }
   }
4) Receiving:
   - on WS message: append to UI

Done when:
- two browser windows can exchange messages (HTTP send + WS receive)
- refresh reloads history correctly

---

## Iteration 2 — Add Encryption (ECDH P-256 + AES-256-GCM)

Crypto choice (fixed):
- Key agreement: ECDH P-256
- Message encryption: AES-256-GCM
- Payload format:
  {
    "alg": "ECDH-P256+A256GCM",
    "iv": [..12 bytes..],
    "ct": [..cipher bytes..]
  }

UI changes:
- Button: "Create encryption key pair"
- Show my public key (JWK) with copy
- Add input: "Peer public key (JWK)"
- Starting a chat now requires:
  - Peer UUID
  - Peer public key (JWK)

Key flow:
1) Each user generates ECDH keypair locally.
2) Users exchange public keys out-of-band (copy/paste).
3) Derive shared AES key:
   deriveKey(myPrivateKey, peerPublicKey) -> AES-GCM key
4) Before sending:
   plaintext -> AES-GCM encrypt -> payload -> POST /v1/messages
5) Before rendering incoming:
   payload -> AES-GCM decrypt -> show plaintext

Storage:
- Persist my keys locally (preferred: IndexedDB; MVP acceptable: export private JWK to localStorage if necessary).
- Private key must never be sent to backend.

Done when:
- backend stores only ciphertext payloads
- UI shows readable plaintext on both ends after key exchange
