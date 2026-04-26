// ─── Client → Server payloads ───────────────────────────────────────────────

export interface JoinPoolPayload {
  username: string;
  color: string;
}

// ─── Server → Client payloads ────────────────────────────────────────────────

export interface PoolMatchedPayload {
  roomId: string;
  partnerUsername: string;
  partnerColor: string;
}

export interface ErrorPayload {
  code: 'ALREADY_IN_QUEUE';
  message: string;
}

export interface AnnouncePublicKeyPayload {
  roomId: string;
  publicKey: JsonWebKey;
}

export interface ReceivePublicKeyPayload {
  publicKey: JsonWebKey;
}

export interface PartnerLeftPayload {
  reason: 'disconnect' | 'left';
}
