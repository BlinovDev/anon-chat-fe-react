import { useState, useEffect } from 'react'
import { getStoredMyId, getStoredPeerKeys } from './storage'
import type { StartForm } from './types'

interface AddChatPageProps {
  onStart: (form: StartForm) => void
  myPublicKey?: string
  onBack: () => void
}

export function AddChatPage({ onStart, myPublicKey, onBack }: AddChatPageProps) {
  const [peerId, setPeerId] = useState('')
  const [peerPublicKeyJwk, setPeerPublicKeyJwk] = useState('')

  useEffect(() => {
    const peerKeys = getStoredPeerKeys()
    const key = peerId.trim()
    if (key && peerKeys[key]) {
      setPeerPublicKeyJwk(peerKeys[key])
    }
  }, [peerId])

  const myId = getStoredMyId()
  const canStart = Boolean(myId.trim() && peerId.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canStart) return
    onStart({
      myId: myId.trim(),
      peerId: peerId.trim(),
      peerPublicKeyJwk: peerPublicKeyJwk.trim() || undefined,
      myPublicKeyJwk: myPublicKey,
    })
  }

  return (
    <div className="add-chat-page">
      <header className="page-header">
        <button type="button" onClick={onBack}>
          ← Back
        </button>
        <h1>Add new chat</h1>
      </header>
      {!myId.trim() && (
        <p className="form-hint">Set your UUID in Profile first, then add a peer to chat with.</p>
      )}
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Peer UUID
          <input
            type="text"
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
            placeholder="e.g. user-b-uuid"
          />
        </label>
        <label>
          Peer public key (JWK)
          <textarea
            value={peerPublicKeyJwk}
            onChange={(e) => setPeerPublicKeyJwk(e.target.value)}
            placeholder='{"kty":"EC",...} — optional for unencrypted'
            rows={3}
          />
        </label>
        <div className="form-actions">
          <button type="button" onClick={onBack}>
            Cancel
          </button>
          <button type="submit" disabled={!canStart}>
            Start messaging
          </button>
        </div>
      </form>
    </div>
  )
}
