const ALG = 'ECDH-P256+A256GCM'
const KEY_STORE = 'anon-chat-keys'
const KEY_PAIR_ID = 'ecdh-p256-keypair'

export interface EncryptedPayload {
  alg: string
  iv: number[]
  ct: number[]
}

const ecParams: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' }
const gcmIvLength = 12
const gcmTagLength = 128

export async function generateKeyPair(): Promise<{ publicKeyJwk: string; privateKeyJwk: string }> {
  const pair = await crypto.subtle.generateKey(ecParams, true, ['deriveBits'])
  const pub = await crypto.subtle.exportKey('jwk', pair.publicKey)
  const priv = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const publicKeyJwk = JSON.stringify(pub)
  const privateKeyJwk = JSON.stringify(priv)
  await saveKeyPair(publicKeyJwk, privateKeyJwk)
  return { publicKeyJwk, privateKeyJwk }
}

export async function getMyPublicKeyJwk(): Promise<string | null> {
  const raw = await getStoredKeyPair()
  if (!raw) return null
  const { publicKeyJwk } = JSON.parse(raw) as { publicKeyJwk: string; privateKeyJwk: string }
  return publicKeyJwk
}

async function deriveAesKey(myPrivateJwk: string, peerPublicJwk: string): Promise<CryptoKey> {
  const myPrivate = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(myPrivateJwk) as JsonWebKey,
    ecParams,
    false,
    ['deriveBits']
  )
  const peerPublic = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(peerPublicJwk) as JsonWebKey,
    ecParams,
    false,
    []
  )
  const shared = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: peerPublic },
    myPrivate,
    256
  )
  return crypto.subtle.importKey('raw', shared, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encrypt(
  plaintext: string,
  myPrivateJwk: string,
  peerPublicJwk: string
): Promise<string> {
  const key = await deriveAesKey(myPrivateJwk, peerPublicJwk)
  const iv = crypto.getRandomValues(new Uint8Array(gcmIvLength))
  const encoded = new TextEncoder().encode(plaintext)
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: gcmTagLength },
    key,
    encoded
  )
  const payload: EncryptedPayload = {
    alg: ALG,
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ct)),
  }
  return JSON.stringify(payload)
}

export async function decrypt(
  cipherPayload: string,
  myPrivateJwk: string,
  peerPublicJwk: string
): Promise<string> {
  const key = await deriveAesKey(myPrivateJwk, peerPublicJwk)
  const payload = JSON.parse(cipherPayload) as EncryptedPayload
  if (payload.alg !== ALG || !Array.isArray(payload.iv) || !Array.isArray(payload.ct)) {
    throw new Error('Invalid encrypted payload')
  }
  const iv = new Uint8Array(payload.iv)
  const ct = new Uint8Array(payload.ct)
  const dec = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: gcmTagLength },
    key,
    ct
  )
  return new TextDecoder().decode(dec)
}

function isEncryptedPayload(payload: string): boolean {
  try {
    const o = JSON.parse(payload) as unknown
    return typeof o === 'object' && o !== null && 'alg' in o && (o as { alg: string }).alg === ALG
  } catch {
    return false
  }
}

export async function decryptIfNeeded(
  payload: string,
  myPrivateJwk: string | undefined,
  peerPublicJwk: string | undefined
): Promise<string> {
  if (!myPrivateJwk || !peerPublicJwk || !isEncryptedPayload(payload)) return payload
  return decrypt(payload, myPrivateJwk, peerPublicJwk)
}

export async function encryptIfNeeded(
  plaintext: string,
  myPrivateJwk: string | undefined,
  peerPublicJwk: string | undefined
): Promise<string> {
  if (!myPrivateJwk || !peerPublicJwk) return plaintext
  return encrypt(plaintext, myPrivateJwk, peerPublicJwk)
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(KEY_STORE, 1)
    r.onerror = () => reject(r.error)
    r.onsuccess = () => resolve(r.result)
    r.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys')
    }
  })
}

async function saveKeyPair(publicKeyJwk: string, privateKeyJwk: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite')
    const store = tx.objectStore('keys')
    store.put({ publicKeyJwk, privateKeyJwk }, KEY_PAIR_ID)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

async function getStoredKeyPair(): Promise<string | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readonly')
    const req = tx.objectStore('keys').get(KEY_PAIR_ID)
    req.onsuccess = () => {
      db.close()
      const row = req.result
      resolve(row ? JSON.stringify(row) : null)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getStoredPrivateKeyJwk(): Promise<string | null> {
  const raw = await getStoredKeyPair()
  if (!raw) return null
  const { privateKeyJwk } = JSON.parse(raw) as { publicKeyJwk: string; privateKeyJwk: string }
  return privateKeyJwk
}
