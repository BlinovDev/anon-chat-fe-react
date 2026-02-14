import { useState, useRef, useEffect } from 'react'
import type { Message } from './types'

interface ChatPageProps {
  myId: string
  peerId: string
  messages: Message[]
  onSend: (text: string) => void
  onBack: () => void
}

export function ChatPage({ myId, peerId, messages, onSend, onBack }: ChatPageProps) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = input.trim()
    if (!t) return
    onSend(t)
    setInput('')
  }

  return (
    <div className="chat-page">
      <header>
        <button type="button" onClick={onBack}>
          ← Back
        </button>
        <span>Chat with {peerId}</span>
      </header>
      <div className="messages" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`message ${m.sender_id === myId ? 'sent' : 'received'}`}
          >
            <div className="message-body">{m.payload}</div>
            <div className="message-meta">
              {new Date(m.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          autoComplete="off"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
