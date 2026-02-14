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
