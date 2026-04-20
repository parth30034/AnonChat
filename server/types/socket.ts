// ─── Client → Server payloads ───────────────────────────────────────────────

export interface JoinRoomPayload {
  roomId: string;
  username: string;
  color: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface SendMessagePayload {
  roomId: string;
  content: string;
  username: string;
  color: string;
}

export interface UserTypingPayload {
  roomId: string;
  username: string;
  isTyping: boolean;
}

export interface JoinPoolPayload {
  username: string;
  color: string;
}

// ─── Server → Client payloads ────────────────────────────────────────────────

export interface MessageDto {
  id: string;
  sender: string;
  senderColor: string;
  content: string;
  timestamp: string;   // "HH:MM"
  isSystem: boolean;
  isFlagged?: boolean;
  clusterId?: string;
  clusterLabel?: string;
}

export interface MessageBlockedPayload {
  reason?: string;
}

export interface ClusterUpdatePayload {
  messageId: string;
  clusterId: string;
  clusterLabel: string;
}

export interface RoomJoinedPayload {
  roomId: string;
  messages: MessageDto[];
  onlineCount: number;
  roomType: 'group' | 'pool';
}

export interface UserJoinedPayload {
  username: string;
  count: number;
}

export interface UserLeftPayload {
  username: string;
  count: number;
}

export interface UserTypingBroadcast {
  username: string;
  isTyping: boolean;
}

export interface PoolMatchedPayload {
  roomId: string;
  partnerUsername: string;
  partnerColor: string;
}

export interface ErrorPayload {
  code: 'ROOM_FULL' | 'MESSAGE_TOO_LONG' | 'ALREADY_IN_QUEUE' | 'ROOM_NOT_FOUND';
  message: string;
}
