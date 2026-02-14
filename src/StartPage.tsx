import { useState } from 'react'

export interface StartForm {
  myId: string
  peerId: string
  myPublicKeyJwk?: string
  peerPublicKeyJwk?: string
}

interface StartPageProps {
  onStart: (form: StartForm) => void
  onCreateKeyPair?: () => Promise<string>
  myPublicKey?: string
}

export function StartPage({ onStart, onCreateKeyPair, myPublicKey }: StartPageProps) {
  const [myId, setMyId] = useState('')
  const [peerId, setPeerId] = useState('')
  const [peerPublicKeyJwk, setPeerPublicKeyJwk] = useState('')
  const [copyDone, setCopyDone] = useState(false)

  const handleStart = () => {
    if (!myId.trim() || !peerId.trim()) return
    onStart({
      myId: myId.trim(),
      peerId: peerId.trim(),
      peerPublicKeyJwk: peerPublicKeyJwk.trim() || undefined,
      myPublicKeyJwk: myPublicKey,
    })
  }

  const handleCopyKey = async () => {
    if (!myPublicKey) return
    await navigator.clipboard.writeText(myPublicKey)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 1500)
  }

  return (
    <div className="start-page">
      <h1>Anon Chat</h1>
      <div className="form">
        <label>
          My UUID
          <input
            type="text"
            value={myId}
            onChange={(e) => setMyId(e.target.value)}
            placeholder="e.g. user-a-uuid"
          />
        </label>
        <label>
          Peer UUID
          <input
            type="text"
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
            placeholder="e.g. user-b-uuid"
          />
        </label>
        {onCreateKeyPair && (
          <>
            <div className="key-row">
              <button type="button" onClick={onCreateKeyPair}>
                Create encryption key pair
              </button>
              {myPublicKey && (
                <button type="button" onClick={handleCopyKey}>
                  {copyDone ? 'Copied' : 'Copy my public key'}
                </button>
              )}
            </div>
            {myPublicKey && (
              <label className="key-display">
                My public key (JWK)
                <textarea readOnly value={myPublicKey} rows={3} />
              </label>
            )}
            <label>
              Peer public key (JWK)
              <textarea
                value={peerPublicKeyJwk}
                onChange={(e) => setPeerPublicKeyJwk(e.target.value)}
                placeholder='{"kty":"EC",...}'
                rows={3}
              />
            </label>
          </>
        )}
        <button type="button" onClick={handleStart} disabled={!myId.trim() || !peerId.trim()}>
          Start messaging
        </button>
      </div>
    </div>
  )
}
