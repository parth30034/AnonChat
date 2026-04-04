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

export type AppState = 'join' | 'searching' | 'chat';
