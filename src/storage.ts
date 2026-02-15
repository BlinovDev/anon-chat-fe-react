const MY_ID_KEY = 'anon_chat_my_id'
const PEER_KEYS_KEY = 'anon_chat_peer_keys'

export function getStoredMyId(): string {
  try {
    return localStorage.getItem(MY_ID_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setStoredMyId(myId: string): void {
  try {
    if (myId.trim()) {
      localStorage.setItem(MY_ID_KEY, myId.trim())
    }
  } catch {
    // ignore
  }
}

export type PeerKeysMap = Record<string, string>

export function getStoredPeerKeys(): PeerKeysMap {
  try {
    const raw = localStorage.getItem(PEER_KEYS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as PeerKeysMap
    }
    return {}
  } catch {
    return {}
  }
}

export function setStoredPeerKey(peerId: string, peerPublicKeyJwk: string): void {
  try {
    const peerIdTrim = peerId.trim()
    const jwkTrim = peerPublicKeyJwk.trim()
    if (!peerIdTrim || !jwkTrim) return
    const map = getStoredPeerKeys()
    map[peerIdTrim] = jwkTrim
    localStorage.setItem(PEER_KEYS_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

/** Removes a single peer from stored peer keys. */
export function removeStoredPeerKey(peerId: string): void {
  try {
    const key = peerId.trim()
    if (!key) return
    const map = getStoredPeerKeys()
    delete map[key]
    localStorage.setItem(PEER_KEYS_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

/** Replaces all stored peer keys (e.g. when restoring from account file). */
export function setStoredPeerKeys(peerKeys: PeerKeysMap): void {
  try {
    if (peerKeys && typeof peerKeys === 'object' && !Array.isArray(peerKeys)) {
      localStorage.setItem(PEER_KEYS_KEY, JSON.stringify(peerKeys))
    }
  } catch {
    // ignore
  }
}

/** Clears UUID and saved peer keys from localStorage. */
export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(MY_ID_KEY)
    localStorage.removeItem(PEER_KEYS_KEY)
  } catch {
    // ignore
  }
}
