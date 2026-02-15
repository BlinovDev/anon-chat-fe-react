import { useState, useEffect, useRef } from 'react'
import { getStoredMyId, setStoredMyId, getStoredPeerKeys, setStoredPeerKeys } from './storage'
import { generateKeyPair, getMyPublicKeyJwk, getStoredPrivateKeyJwk, importKeyPair } from './crypto'
import {
  buildAccountExport,
  downloadAccountFile,
  parseAccountFile,
} from './accountExport'

interface ProfilePageProps {
  onBack: () => void
  onKeyPairChanged?: (publicKeyJwk: string | null) => void
}

export function ProfilePage({ onBack, onKeyPairChanged }: ProfilePageProps) {
  const [myId, setMyId] = useState('')
  const [myPublicKey, setMyPublicKey] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMyId(getStoredMyId())
    getMyPublicKeyJwk().then((key) => {
      setMyPublicKey(key)
      onKeyPairChanged?.(key)
    })
  }, [])

  const handleMyIdBlur = () => {
    const trimmed = myId.trim()
    if (trimmed) setStoredMyId(trimmed)
  }

  const handleCreateKeyPair = async () => {
    setKeyError(null)
    try {
      const { publicKeyJwk } = await generateKeyPair()
      setMyPublicKey(publicKeyJwk)
      onKeyPairChanged?.(publicKeyJwk)
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : 'Key generation failed')
    }
  }

  const handleCopyKey = async () => {
    if (!myPublicKey) return
    await navigator.clipboard.writeText(myPublicKey)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 1500)
  }

  const handleExportAccount = async () => {
    setKeyError(null)
    const storedMyId = getStoredMyId()
    if (!storedMyId.trim()) {
      setKeyError('Set your UUID first to export')
      return
    }
    try {
      const [publicKeyJwk, privateKeyJwk] = await Promise.all([
        getMyPublicKeyJwk(),
        getStoredPrivateKeyJwk(),
      ])
      const peerKeys = getStoredPeerKeys()
      const data = buildAccountExport(
        storedMyId,
        publicKeyJwk ?? null,
        privateKeyJwk ?? null,
        peerKeys
      )
      downloadAccountFile(data)
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  const handleImportAccountFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyError(null)
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const data = parseAccountFile(text)
      if (!data) {
        setKeyError('Invalid account file. Need at least myId.')
        return
      }
      setStoredMyId(data.myId)
      setMyId(data.myId)
      if (data.peerKeys) setStoredPeerKeys(data.peerKeys)
      if (data.publicKeyJwk && data.privateKeyJwk) {
        await importKeyPair(data.publicKeyJwk, data.privateKeyJwk)
        setMyPublicKey(data.publicKeyJwk)
        onKeyPairChanged?.(data.publicKeyJwk)
      } else {
        const key = await getMyPublicKeyJwk()
        setMyPublicKey(key)
        onKeyPairChanged?.(key ?? null)
      }
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  return (
    <div className="profile-page">
      <header className="page-header">
        <button type="button" onClick={onBack}>
          ← Back
        </button>
        <h1>Profile</h1>
      </header>
      <div className="form">
        <label>
          My UUID
          <input
            type="text"
            value={myId}
            onChange={(e) => setMyId(e.target.value)}
            onBlur={handleMyIdBlur}
            placeholder="e.g. user-a-uuid"
          />
        </label>
        <p className="form-hint">Your UUID is stored locally and used to identify you in chats.</p>

        <section className="profile-section">
          <h2 className="profile-section-title">Account backup</h2>
          <div className="account-backup-row">
            <button
              type="button"
              onClick={handleExportAccount}
              disabled={!myId.trim()}
              title={!myId.trim() ? 'Set your UUID first' : 'Download account file (UUID + key pair)'}
            >
              Export account to file
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Restore UUID and key pair from a previously exported file"
            >
              Import account from file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportAccountFile}
              className="hidden-file-input"
              aria-label="Choose account file"
            />
          </div>
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">Encryption key pair</h2>
          {keyError && <div className="error">{keyError}</div>}
          <div className="key-row">
            <button type="button" onClick={handleCreateKeyPair}>
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
              My public key (JWK) — share this with peers for encrypted chats
              <textarea readOnly value={myPublicKey} rows={3} />
            </label>
          )}
        </section>
      </div>
    </div>
  )
}
