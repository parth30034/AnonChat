/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, User, Message, EncryptedPayload } from './types';
import { generateRandomUsername, getRandomColor } from './utils/nameGenerator';
import JoinScreen from './components/JoinScreen';
import ChatScreen from './components/ChatScreen';
import SearchingScreen from './components/SearchingScreen';
import { motion, AnimatePresence } from 'motion/react';
import { connectSocket, disconnectSocket } from './lib/socket';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  clearCryptoSession,
} from './lib/crypto';
import type { Socket } from 'socket.io-client';

function cleanupSessionListeners(socket: Socket) {
  socket.off('public_key_receive');
  socket.off('encrypted_message');
  socket.off('partner_left');
  socket.off('user_typing');
  socket.off('pool_matched');
}

export default function App() {
  const [view, setView]               = useState<AppState>('join');
  const [user]                        = useState<User>({
    username: generateRandomUsername(),
    color: getRandomColor(),
  });
  const [roomId, setRoomId]           = useState('');
  const [messages, setMessages]       = useState<Message[]>([]);
  const [isTyping, setIsTyping]       = useState(false);
  const [sessionEndReason, setSessionEndReason] = useState<string>('');

  const socketRef    = useRef<Socket | null>(null);
  const keyPairRef   = useRef<CryptoKeyPair | null>(null);
  const sharedKeyRef = useRef<CryptoKey | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const endSessionRef = useRef<(reason: string) => void>(() => {});

  useEffect(() => {
    endSessionRef.current = (reason: string) => {
      if (socketRef.current) {
        cleanupSessionListeners(socketRef.current);
      }
      clearCryptoSession();
      sharedKeyRef.current  = null;
      keyPairRef.current    = null;
      sessionIdRef.current  = null;
      setSessionEndReason(reason);
      setView('ended');
    };
  });

  function systemMsg(content: string): Message {
    return {
      id: Date.now().toString(),
      sender: 'System',
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit'
      }),
      isSystem: true,
    };
  }

  const handleJoinPool = useCallback(async () => {
    setView('searching');
    const socket = connectSocket();
    socketRef.current = socket;

    const sessionId = crypto.randomUUID();
    sessionIdRef.current = sessionId;

    function isSessionStale() {
      return sessionIdRef.current !== sessionId;
    }

    keyPairRef.current = await generateKeyPair();

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      endSessionRef.current('Connection failed. Please try again.');
    });

    socket.once('pool_matched', async (payload: {
      roomId: string;
      partnerUsername: string;
      partnerColor: string;
    }) => {
      if (isSessionStale()) return;

      const currentRoomId = payload.roomId;
      setRoomId(currentRoomId);
      setMessages([systemMsg('Matched! Establishing secure connection...')]);
      setView('handshake');

      await new Promise(resolve => setTimeout(resolve, 800));

      if (isSessionStale()) return;

      const pubKey = await exportPublicKey(keyPairRef.current!.publicKey);

      if (isSessionStale()) return;

      socket.emit('public_key_announce', {
        roomId: currentRoomId,
        publicKey: pubKey,
      });

      const handshakeTimeout = setTimeout(() => {
        if (isSessionStale()) return;
        socket.off('public_key_receive');
        endSessionRef.current(
          'Secure handshake timed out. Partner may have disconnected.'
        );
      }, 10000);

      socket.once('public_key_receive', async (data: { publicKey: JsonWebKey }) => {
        clearTimeout(handshakeTimeout);

        if (isSessionStale()) return;

        const theirKey = await importPublicKey(data.publicKey);

        if (isSessionStale()) return;

        sharedKeyRef.current = await deriveSharedKey(
          keyPairRef.current!.privateKey,
          theirKey
        );

        if (isSessionStale()) return;

        setMessages([systemMsg('🔒 Secure session established. Messages are end-to-end encrypted.')]);
        setView('chat');

        socket.on('encrypted_message', async (p: EncryptedPayload) => {
          if (isSessionStale()) return;
          if (!sharedKeyRef.current) return;
          try {
            const plaintext = await decryptMessage(
              sharedKeyRef.current,
              p.iv,
              p.ciphertext
            );
            setMessages((prev: Message[]) => [...prev, {
              id: crypto.randomUUID(),
              sender: p.sender,
              content: plaintext,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
              }),
              isOwn: false,
              color: p.color,
            }]);
          } catch {
            console.error('Decryption failed — key mismatch or corrupted payload');
          }
        });

        socket.on('user_typing', (p: { username: string; isTyping: boolean }) => {
          if (p.username !== user.username) setIsTyping(p.isTyping);
        });
      });
    });

    socket.on('partner_left', (data: { reason: string }) => {
      const msg = data.reason === 'disconnect'
        ? 'Your partner lost connection. Session ended.'
        : 'Your partner left. Session ended.';
      endSessionRef.current(msg);
    });

    socket.emit('join_pool', { username: user.username, color: user.color });
  }, [user]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!socketRef.current || !sharedKeyRef.current || !roomId) return;
    if (sessionIdRef.current === null) return;

    const payload = await encryptMessage(sharedKeyRef.current, content);

    console.log('Sending encrypted message to room', roomId);
    socketRef.current.emit('encrypted_message', {
      roomId,
      ...payload,
      sender: user.username,
      color: user.color,
    });

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender: user.username,
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit'
      }),
      isOwn: true,
      color: user.color,
    }]);
  }, [roomId, user]);

  const handleTyping = useCallback((typing: boolean) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit('user_typing', {
      roomId,
      username: user.username,
      isTyping: typing,
    });
  }, [roomId, user.username]);

  const handleLeave = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('leave_session', { roomId });
    }
    if (socketRef.current) {
      cleanupSessionListeners(socketRef.current);
    }
    clearCryptoSession();
    disconnectSocket();
    socketRef.current    = null;
    sharedKeyRef.current = null;
    keyPairRef.current   = null;
    sessionIdRef.current = null;
    setView('join');
    setMessages([]);
    setRoomId('');
  }, [roomId]);

  const handleCancelSearch = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('cancel_pool');
      cleanupSessionListeners(socketRef.current);
    }
    clearCryptoSession();
    disconnectSocket();
    socketRef.current    = null;
    keyPairRef.current   = null;
    sessionIdRef.current = null;
    setView('join');
  }, []);

  const handleNewSession = useCallback(() => {
    clearCryptoSession();
    disconnectSocket();
    socketRef.current    = null;
    sharedKeyRef.current = null;
    keyPairRef.current   = null;
    sessionIdRef.current = null;
    setMessages([]);
    setRoomId('');
    setView('join');
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-0 md:p-4 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'join' && (
          <motion.div key="join"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
            <JoinScreen user={user} onJoinPool={handleJoinPool} />
          </motion.div>
        )}
        {(view === 'searching' || view === 'handshake') && (
          <motion.div key="searching"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }} className="w-full max-w-md">
            <SearchingScreen
              onCancel={handleCancelSearch}
              phase={view === 'handshake' ? 'handshake' : 'searching'}
            />
          </motion.div>
        )}
        {view === 'chat' && (
          <motion.div key="chat"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full h-full md:h-[800px] max-w-5xl">
            <ChatScreen
              user={user}
              messages={messages}
              isTyping={isTyping}
              onLeave={handleLeave}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
            />
          </motion.div>
        )}
        {view === 'ended' && (
          <motion.div key="ended"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
            <SessionEndedScreen
              reason={sessionEndReason}
              onNewSession={handleNewSession}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SessionEndedScreen({
  reason, onNewSession
}: { reason: string; onNewSession: () => void }) {
  return (
    <div className="bg-secondary p-8 rounded-2xl shadow-2xl border border-accent/30 flex flex-col items-center text-center gap-6">
      <div className="text-4xl">🔒</div>
      <div>
        <h2 className="text-xl font-bold text-text-main mb-2">Session Ended</h2>
        <p className="text-text-dim text-sm">{reason}</p>
        <p className="text-text-dim text-xs mt-2">All messages have been cleared from memory.</p>
      </div>
      <button
        onClick={onNewSession}
        className="bg-highlight hover:bg-highlight/90 text-white font-bold py-3 px-8 rounded-xl transition-all"
      >
        Start New Session
      </button>
    </div>
  );
}
