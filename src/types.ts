export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
  isOwn?: boolean;
  color?: string;
}

export interface User {
  username: string;
  color: string;
}

// Session states:
// join       → landing screen
// searching  → waiting in pool queue
// handshake  → matched, waiting for partner public key
// chat       → encrypted session active
// ended      → partner left, session over
export type AppState = 'join' | 'searching' | 'handshake' | 'chat' | 'ended';

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  sender: string;
  color: string;
}
