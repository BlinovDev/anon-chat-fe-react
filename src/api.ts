import type { Message, CreateMessageBody } from './types'

const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

function wsUrl(userId: string): string {
  const u = new URL(base)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.pathname = '/ws'
  u.searchParams.set('user_id', userId)
  return u.toString()
}

export async function getDialog(myId: string, peerId: string): Promise<Message[]> {
  const url = `${base}/messages?sender_id=${encodeURIComponent(myId)}&recipient_id=${encodeURIComponent(peerId)}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`get dialog: ${r.status}`)
  return r.json()
}

export async function sendMessage(body: CreateMessageBody): Promise<Message> {
  const r = await fetch(`${base}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`send: ${r.status}`)
  return r.json()
}

export function connectWs(myId: string, onMessage: (msg: Message) => void): () => void {
  const ws = new WebSocket(wsUrl(myId))
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as Message
      onMessage(msg)
    } catch {
      // ignore malformed
    }
  }
  return () => ws.close()
}
