import { useState, useEffect, useCallback } from 'react'
import { getDialog, sendMessage, connectWs } from './api'
import { StartPage } from './StartPage'
import { AddChatPage } from './AddChatPage'
import { ProfilePage } from './ProfilePage'
import { ChatPage } from './ChatPage'
import {
  getMyPublicKeyJwk,
  getStoredPrivateKeyJwk,
  decryptIfNeeded,
  encryptIfNeeded,
} from './crypto'
import { getStoredMyId, setStoredMyId, setStoredPeerKey } from './storage'
import type { Message } from './types'
import type { StartForm } from './types'
import './App.css'

type View = 'start' | 'add-chat' | 'profile' | 'chat'

export default function App() {
  const [view, setView] = useState<View>('start')
  const [myId, setMyId] = useState('')
  const [peerId, setPeerId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [myPrivateJwk, setMyPrivateJwk] = useState<string | null>(null)
  const [peerPublicJwk, setPeerPublicJwk] = useState<string | null>(null)
  const [myPublicKey, setMyPublicKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (view !== 'chat') {
      getMyPublicKeyJwk().then(setMyPublicKey)
    }
  }, [view])

  const handleStart = useCallback(async (form: StartForm) => {
    setError(null)
    setMyId(form.myId)
    setPeerId(form.peerId)
    const useEncryption = Boolean(form.peerPublicKeyJwk?.trim())
    let priv: string | null = null
    const peerPub = form.peerPublicKeyJwk?.trim() ?? null
    if (useEncryption) {
      priv = await getStoredPrivateKeyJwk()
      if (!priv) {
        setError('Create encryption key pair in Profile first')
        return
      }
      setMyPrivateJwk(priv)
      setPeerPublicJwk(peerPub)
    } else {
      setMyPrivateJwk(null)
      setPeerPublicJwk(null)
    }
    try {
      const raw = await getDialog(form.myId, form.peerId)
      const list =
        useEncryption && priv && peerPub
          ? await Promise.all(
              raw.map((m) =>
                decryptIfNeeded(m.payload, priv!, peerPub).then((p) => ({ ...m, payload: p }))
              )
            )
          : raw
      setStoredMyId(form.myId)
      if (peerPub) setStoredPeerKey(form.peerId, peerPub)
      setMessages(list)
      setView('chat')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start')
    }
  }, [])

  const handleJoinChat = useCallback(
    (peerId: string, peerPublicKeyJwk: string) => {
      const storedMyId = getStoredMyId()
      if (!storedMyId.trim()) return
      handleStart({
        myId: storedMyId.trim(),
        peerId,
        peerPublicKeyJwk,
        myPublicKeyJwk: myPublicKey ?? undefined,
      })
    },
    [handleStart, myPublicKey]
  )

  useEffect(() => {
    if (view !== 'chat' || !myId) return
    const priv = myPrivateJwk
    const peerPub = peerPublicJwk
    const close = connectWs(myId, (msg) => {
      if (
        (msg.sender_id === myId && msg.recipient_id === peerId) ||
        (msg.sender_id === peerId && msg.recipient_id === myId)
      ) {
        decryptIfNeeded(msg.payload, priv ?? undefined, peerPub ?? undefined).then((p) =>
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, payload: p }]
          )
        )
      }
    })
    return close
  }, [view, myId, peerId, myPrivateJwk, peerPublicJwk])

  const handleSend = useCallback(
    async (text: string) => {
      if (!myId || !peerId) return
      setError(null)
      try {
        const payload = await encryptIfNeeded(
          text,
          myPrivateJwk ?? undefined,
          peerPublicJwk ?? undefined
        )
        const created = await sendMessage({
          sender_id: myId,
          recipient_id: peerId,
          payload,
        })
        setMessages((prev) =>
          prev.some((m) => m.id === created.id) ? prev : [...prev, { ...created, payload: text }]
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Send failed')
      }
    },
    [myId, peerId, myPrivateJwk, peerPublicJwk]
  )

  const handleBackFromChat = useCallback(() => {
    setView('start')
    setMessages([])
    setMyPrivateJwk(null)
    setPeerPublicJwk(null)
    setError(null)
  }, [])

  return (
    <div className="app">
      {error && <div className="error">{error}</div>}
      {view === 'chat' && (
        <ChatPage
          myId={myId}
          peerId={peerId}
          messages={messages}
          onSend={handleSend}
          onBack={handleBackFromChat}
        />
      )}
      {view === 'start' && (
        <StartPage
          onJoinChat={handleJoinChat}
          onAddNewChat={() => { setError(null); setView('add-chat') }}
          onOpenProfile={() => { setError(null); setView('profile') }}
        />
      )}
      {view === 'add-chat' && (
        <AddChatPage
          onStart={handleStart}
          myPublicKey={myPublicKey ?? undefined}
          onBack={() => { setError(null); setView('start') }}
        />
      )}
      {view === 'profile' && (
        <ProfilePage
          onBack={() => { setError(null); setView('start') }}
          onKeyPairChanged={(key) => setMyPublicKey(key)}
        />
      )}
    </div>
  )
}
