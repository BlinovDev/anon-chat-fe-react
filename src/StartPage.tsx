import { useState, useRef, useCallback } from 'react'
import { getStoredMyId, getStoredPeerKeys, removeStoredPeerKey, clearAllLocalData } from './storage'
import { clearStoredKeyPair } from './crypto'

interface StartPageProps {
  onJoinChat: (peerId: string, peerPublicKeyJwk: string) => void
  onAddNewChat: () => void
  onOpenProfile: () => void
}

const HOVER_DELAY_MS = 5000
const DELETE_HOVER_MS = 3000

export function StartPage({ onJoinChat, onAddNewChat, onOpenProfile }: StartPageProps) {
  const [showClearData, setShowClearData] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deletePeerId, setDeletePeerId] = useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const savedPeers = Object.entries(getStoredPeerKeys())
  const myId = getStoredMyId()
  const canJoin = Boolean(myId.trim())

  const handleTitleMouseEnter = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setShowClearData(true), HOVER_DELAY_MS)
  }, [])

  const handleTitleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setShowClearData(false)
  }, [])

  const handleClearAllData = useCallback(async () => {
    clearAllLocalData()
    await clearStoredKeyPair()
    window.location.reload()
  }, [])

  const handleJoin = (peerId: string, peerPublicKeyJwk: string) => {
    if (!canJoin) return
    onJoinChat(peerId, peerPublicKeyJwk)
  }

  const handlePeerMouseEnter = useCallback((peerId: string) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    deleteTimerRef.current = setTimeout(() => setDeletePeerId(peerId), DELETE_HOVER_MS)
  }, [])

  const handlePeerMouseLeave = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current)
      deleteTimerRef.current = null
    }
    setDeletePeerId(null)
  }, [])

  const handleDeletePeer = useCallback((peerId: string) => {
    removeStoredPeerKey(peerId)
    setDeletePeerId(null)
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="start-page">
      <header className="start-page-header">
        <div
          className="start-page-title-wrap"
          onMouseEnter={handleTitleMouseEnter}
          onMouseLeave={handleTitleMouseLeave}
        >
          <h1>Anon Chat</h1>
          {showClearData && (
            <button
              type="button"
              className="clear-data-btn"
              onClick={handleClearAllData}
              title="Clear all local data (UUID, saved chats, key pair) and reload"
            >
              Clear all data
            </button>
          )}
        </div>
        <div className="start-page-header-actions">
          <button
            type="button"
            onClick={onAddNewChat}
            className="header-icon-btn"
            title="Add new chat"
            aria-label="Add new chat"
          >
            <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onOpenProfile}
            className="header-icon-btn"
            title="Profile"
            aria-label="Open profile"
          >
            <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
          </button>
        </div>
      </header>
      {savedPeers.length > 0 ? (
        <section className="saved-peers" key={refreshKey}>
          <h2 className="saved-peers-title">Saved chats</h2>
          <ul className="saved-peers-list">
            {savedPeers.map(([peerId, peerPublicKeyJwk]) => (
              <li
                key={peerId}
                className="saved-peer-item"
                onMouseEnter={() => handlePeerMouseEnter(peerId)}
                onMouseLeave={handlePeerMouseLeave}
              >
                <span className="saved-peer-id" title={peerId}>
                  {peerId}
                </span>
                {deletePeerId === peerId ? (
                  <button
                    type="button"
                    className="saved-peer-delete"
                    onClick={() => handleDeletePeer(peerId)}
                    title={`Remove ${peerId} from saved chats`}
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    type="button"
                    className="saved-peer-join"
                    onClick={() => handleJoin(peerId, peerPublicKeyJwk)}
                    disabled={!canJoin}
                    title={!canJoin ? 'Set your UUID in Profile first' : `Join chat with ${peerId}. Hover 3s for Delete.`}
                  >
                    Join
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="saved-peers-empty">No saved chats yet.</p>
      )}
    </div>
  )
}
