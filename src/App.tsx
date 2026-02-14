import { useState, useEffect, useCallback } from 'react'
import { getDialog, sendMessage, connectWs } from './api'
import { StartPage, type StartForm } from './StartPage'
import { ChatPage } from './ChatPage'
import {
  generateKeyPair,
  getMyPublicKeyJwk,
  getStoredPrivateKeyJwk,
  decryptIfNeeded,
  encryptIfNeeded,
} from './crypto'
import type { Message } from './types'
import './App.css'

export default function App() {
  const [inChat, setInChat] = useState(false)
  const [myId, setMyId] = useState('')
  const [peerId, setPeerId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [myPrivateJwk, setMyPrivateJwk] = useState<string | null>(null)
  const [peerPublicJwk, setPeerPublicJwk] = useState<string | null>(null)
  const [myPublicKey, setMyPublicKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateKeyPair = useCallback(async () => {
    setError(null)
    try {
      const { publicKeyJwk } = await generateKeyPair()
      setMyPublicKey(publicKeyJwk)
      return publicKeyJwk
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Key generation failed')
      return ''
    }
  }, [])

  useEffect(() => {
    if (!inChat) getMyPublicKeyJwk().then(setMyPublicKey)
  }, [inChat])

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
        setError('Create encryption key pair first')
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
      setMessages(list)
      setInChat(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start')
    }
  }, [])

  useEffect(() => {
    if (!inChat || !myId) return
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
  }, [inChat, myId, peerId, myPrivateJwk, peerPublicJwk])

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

  const handleBack = useCallback(() => {
    setInChat(false)
    setMessages([])
    setMyPrivateJwk(null)
    setPeerPublicJwk(null)
    setError(null)
  }, [])

  return (
    <div className="app">
      {error && <div className="error">{error}</div>}
      {inChat ? (
        <ChatPage
          myId={myId}
          peerId={peerId}
          messages={messages}
          onSend={handleSend}
          onBack={handleBack}
        />
      ) : (
        <StartPage
          onStart={handleStart}
          onCreateKeyPair={handleCreateKeyPair}
          myPublicKey={myPublicKey ?? undefined}
        />
      )}
    </div>
  )
}
