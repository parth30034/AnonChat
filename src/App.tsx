/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AppState, User, Message } from './types';
import { generateRandomUsername, getRandomColor } from './utils/nameGenerator';
import JoinScreen from './components/JoinScreen';
import ChatScreen from './components/ChatScreen';
import SearchingScreen from './components/SearchingScreen';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<AppState>('join');
  const [user, setUser] = useState<User>({
    username: generateRandomUsername(),
    color: getRandomColor(),
  });
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isOneToOne, setIsOneToOne] = useState(false);

  const handleJoin = (name: string) => {
    if (name === 'Public Pool') {
      setView('searching');
      setIsOneToOne(true);
      
      // Simulate finding a partner
      setTimeout(() => {
        setRoomName('Stranger');
        setView('chat');
        const systemMsg: Message = {
          id: Date.now().toString(),
          sender: 'System',
          content: 'You are now chatting with a random stranger. Say hi!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: true,
        };
        setMessages([systemMsg]);
        setOnlineCount(2);
      }, 3000);
    } else {
      setRoomName(name);
      setIsOneToOne(false);
      setView('chat');
      
      // Mock system message
      const systemMsg: Message = {
        id: Date.now().toString(),
        sender: 'System',
        content: `You joined room: ${name}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      };
      setMessages([systemMsg]);
      setOnlineCount(Math.floor(Math.random() * 10) + 2);
    }
  };

  const handleLeave = () => {
    setView('join');
    setMessages([]);
    setRoomName('');
    setIsOneToOne(false);
  };

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: user.username,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      color: user.color,
    };
    setMessages(prev => [...prev, newMessage]);

    // Mock response for demo
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const response: Message = {
          id: (Date.now() + 1).toString(),
          sender: isOneToOne ? 'Stranger' : 'RandomStranger',
          content: isOneToOne ? 'Hello! Nice to meet you anonymously.' : 'Hey there! This is a mock response.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: getRandomColor(),
        };
        setMessages(prev => [...prev, response]);
      }, 2000);
    }, 1000);
  };

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
            <SearchingScreen onCancel={handleLeave} />
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
