import type { PeerKeysMap } from './storage'

export const ACCOUNT_FILE_VERSION = 1

export interface AccountExport {
  version: number
  myId: string
  publicKeyJwk?: string
  privateKeyJwk?: string
  /** Saved chats: peer UUID -> peer public key (JWK). */
  peerKeys?: PeerKeysMap
}

const FILENAME = 'anon-chat-account.json'

/** Builds account data for export. */
export function buildAccountExport(
  myId: string,
  publicKeyJwk: string | null,
  privateKeyJwk: string | null,
  peerKeys?: PeerKeysMap
): AccountExport {
  const data: AccountExport = {
    version: ACCOUNT_FILE_VERSION,
    myId: myId.trim(),
  }
  if (publicKeyJwk?.trim() && privateKeyJwk?.trim()) {
    data.publicKeyJwk = publicKeyJwk.trim()
    data.privateKeyJwk = privateKeyJwk.trim()
  }
  if (peerKeys && typeof peerKeys === 'object' && !Array.isArray(peerKeys) && Object.keys(peerKeys).length > 0) {
    data.peerKeys = peerKeys
  }
  return data
}

/** Triggers download of account file. */
export function downloadAccountFile(data: AccountExport): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = FILENAME
  a.click()
  URL.revokeObjectURL(url)
}

/** Parses and validates account file JSON. Returns null if invalid. */
export function parseAccountFile(json: string): AccountExport | null {
  try {
    const o = JSON.parse(json) as unknown
    if (!o || typeof o !== 'object') return null
    const v = (o as { version?: unknown }).version
    const myId = (o as { myId?: unknown }).myId
    if (typeof myId !== 'string' || !myId.trim()) return null
    const data: AccountExport = {
      version: typeof v === 'number' ? v : ACCOUNT_FILE_VERSION,
      myId: myId.trim(),
    }
    const pub = (o as { publicKeyJwk?: unknown }).publicKeyJwk
    const priv = (o as { privateKeyJwk?: unknown }).privateKeyJwk
    if (typeof pub === 'string' && typeof priv === 'string' && pub.trim() && priv.trim()) {
      data.publicKeyJwk = pub.trim()
      data.privateKeyJwk = priv.trim()
    }
    const peerKeysRaw = (o as { peerKeys?: unknown }).peerKeys
    if (peerKeysRaw && typeof peerKeysRaw === 'object' && !Array.isArray(peerKeysRaw)) {
      const map: PeerKeysMap = {}
      for (const [k, v] of Object.entries(peerKeysRaw)) {
        if (typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()) {
          map[k.trim()] = v.trim()
        }
      }
      if (Object.keys(map).length > 0) data.peerKeys = map
    }
    return data
  } catch {
    return null
  }
}
