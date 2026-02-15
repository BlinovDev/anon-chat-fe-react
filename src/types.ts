export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  payload: string
  created_at: string
}

export interface CreateMessageBody {
  sender_id: string
  recipient_id: string
  payload: string
}

export interface StartForm {
  myId: string
  peerId: string
  myPublicKeyJwk?: string
  peerPublicKeyJwk?: string
}
