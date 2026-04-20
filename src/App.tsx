/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, User, Message } from './types';
import { generateRandomUsername, getRandomColor } from './utils/nameGenerator';
import JoinScreen from './components/JoinScreen';
import ChatScreen from './components/ChatScreen';
import SearchingScreen from './components/SearchingScreen';
import { motion, AnimatePresence } from 'motion/react';
import { connectSocket, disconnectSocket } from './lib/socket';
import type { Socket } from 'socket.io-client';

interface MessageDto {
  id: string;
  sender: string;
  senderColor: string;
  content: string;
  timestamp: string;
  isSystem: boolean;
  isFlagged?: boolean;
  clusterId?: string;
  clusterLabel?: string;
}

export default function App() {
  const [view, setView] = useState<AppState>('join');
  const [user, setUser] = useState<User>({
    username: generateRandomUsername(),
    color: getRandomColor(),
  });
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isOneToOne, setIsOneToOne] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [blockedToast, setBlockedToast] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dtoToMessage(dto: MessageDto, myUsername: string): Message {
    return {
      id: dto.id,
      sender: dto.sender,
      content: dto.content,
      timestamp: dto.timestamp,
      isSystem: dto.isSystem,
      isOwn: !dto.isSystem && dto.sender === myUsername,
      color: dto.senderColor || undefined,
      isFlagged: dto.isFlagged,
      clusterId: dto.clusterId,
      clusterLabel: dto.clusterLabel,
    };
  }

  // Attach socket listeners when entering chat view
  useEffect(() => {
    if (view !== 'chat' || !socketRef.current) return;

    const socket = socketRef.current;
    const username = user.username;

    const onReceiveMessage = (dto: MessageDto) => {
      setMessages((prev) => [...prev, dtoToMessage(dto, username)]);
    };

    const onUserTyping = (payload: { username: string; isTyping: boolean }) => {
      if (payload.username !== username) {
        setIsTyping(payload.isTyping);
      }
    };

    const onUserJoined = (payload: { username: string; count: number }) => {
      setOnlineCount(payload.count);
    };

    const onUserLeft = (payload: { username: string; count: number }) => {
      setOnlineCount(payload.count);
    };

    const onPartnerLeft = () => {
      setPartnerLeft(true);
      const sysMsg: Message = {
        id: Date.now().toString(),
        sender: 'System',
        content: 'Your chat partner has left.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      };
      setMessages((prev) => [...prev, sysMsg]);
    };

    const onMessageBlocked = (payload: { reason?: string }) => {
      const label = payload.reason
        ? `Message blocked: ${payload.reason}`
        : 'Message blocked by safety filter.';
      setBlockedToast(label);
      setTimeout(() => setBlockedToast(null), 4000);
    };

    const onClusterUpdate = (payload: { messageId: string; clusterId: string; clusterLabel: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId
            ? { ...m, clusterId: payload.clusterId, clusterLabel: payload.clusterLabel }
            : m,
        ),
      );
    };

    socket.on('receive_message', onReceiveMessage);
    socket.on('user_typing', onUserTyping);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('partner_left', onPartnerLeft);
    socket.on('message_blocked', onMessageBlocked);
    socket.on('cluster_update', onClusterUpdate);

    return () => {
      socket.off('receive_message', onReceiveMessage);
      socket.off('user_typing', onUserTyping);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('partner_left', onPartnerLeft);
      socket.off('message_blocked', onMessageBlocked);
      socket.off('cluster_update', onClusterUpdate);
    };
  }, [view, user.username]);

  const handleJoin = (name: string) => {
    const socket = connectSocket();
    socketRef.current = socket;

    if (name === 'Public Pool') {
      setIsOneToOne(true);
      setView('searching');
      setPartnerLeft(false);

      socket.once('pool_matched', (payload: { roomId: string; partnerUsername: string; partnerColor: string }) => {
        setRoomId(payload.roomId);
        setRoomName('Stranger');
        setMessages([]);
        setOnlineCount(2);
        setView('chat');
      });

      socket.emit('join_pool', { username: user.username, color: user.color });
    } else {
      setIsOneToOne(false);
      setPartnerLeft(false);

      socket.once('room_joined', (payload: {
        roomId: string;
        messages: MessageDto[];
        onlineCount: number;
        roomType: string;
      }) => {
        setRoomId(payload.roomId);
        setRoomName(name);
        setMessages(payload.messages.map((dto) => dtoToMessage(dto, user.username)));
        setOnlineCount(payload.onlineCount);
        setView('chat');
      });

      socket.emit('join_room', { roomId: name, username: user.username, color: user.color });
    }
  };

  const handleLeave = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('leave_room', { roomId });
    }
    disconnectSocket();
    socketRef.current = null;
    setView('join');
    setMessages([]);
    setRoomId('');
    setRoomName('');
    setIsOneToOne(false);
    setPartnerLeft(false);
    setIsTyping(false);
  }, [roomId]);

  const handleCancelSearch = () => {
    if (socketRef.current) {
      socketRef.current.emit('cancel_pool');
      socketRef.current.off('pool_matched');
    }
    disconnectSocket();
    socketRef.current = null;
    setView('join');
    setIsOneToOne(false);
  };

  const handleSendMessage = (content: string) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit('send_message', {
      roomId,
      content,
      username: user.username,
      color: user.color,
    });
  };

  const handleTyping = useCallback((typing: boolean) => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('user_typing', {
      roomId,
      username: user.username,
      isTyping: typing,
    });

    if (typing) {
      // Reset the stop-typing timer
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('user_typing', {
          roomId,
          username: user.username,
          isTyping: false,
        });
      }, 2000);
    }
  }, [roomId, user.username]);

  const randomizeUser = () => {
    setUser({
      username: generateRandomUsername(),
      color: getRandomColor(),
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-0 md:p-4 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <JoinScreen
              user={user}
              onJoin={handleJoin}
              onRandomize={randomizeUser}
            />
          </motion.div>
        )}

        {view === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md"
          >
            <SearchingScreen onCancel={handleCancelSearch} />
          </motion.div>
        )}

        {view === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full h-full md:h-[800px] max-w-5xl"
          >
            <ChatScreen
              user={user}
              roomName={roomName}
              messages={messages}
              isTyping={isTyping}
              onlineCount={onlineCount}
              onLeave={handleLeave}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              partnerLeft={partnerLeft}
              isOneToOne={isOneToOne}
              blockedToast={blockedToast}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
