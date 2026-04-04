import { User, Message } from '../types';
import { LogOut, Copy, Users, Send, Smile, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';

interface ChatScreenProps {
  user: User;
  roomName: string;
  messages: Message[];
  isTyping: boolean;
  onlineCount: number;
  onLeave: () => void;
  onSendMessage: (content: string) => void;
}

export default function ChatScreen({
  user,
  roomName,
  messages,
  isTyping,
  onlineCount,
  onLeave,
  onSendMessage
}: ChatScreenProps) {
  const [input, setInput] = useState('');
  const [showToast, setShowToast] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (input.trim() && input.length <= 500) {
      onSendMessage(input.trim());
      setInput('');
    } else if (input.length > 500) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomName);
    // Could add a "Copied!" tooltip here
  };

  return (
    <div className="flex flex-col h-full bg-secondary md:rounded-2xl shadow-2xl border border-accent/30 overflow-hidden relative">
      {/* Header */}
      <header className="bg-primary/80 backdrop-blur-md p-4 border-b border-accent/30 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onLeave}
            className="p-2 hover:bg-highlight/10 rounded-lg text-text-dim hover:text-highlight transition-colors"
            title="Leave Room"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
              {roomName === 'Stranger' ? 'Chatting with Stranger' : roomName}
              {roomName === 'Stranger' ? (
                <span className="text-[10px] bg-highlight/20 text-highlight px-2 py-0.5 rounded-full border border-highlight/30 uppercase tracking-widest">1-on-1</span>
              ) : (
                <button 
                  onClick={copyRoomId}
                  className="p-1 hover:bg-accent/50 rounded transition-colors text-text-dim"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-text-dim">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {roomName === 'Stranger' ? 'Private Session' : `${onlineCount} online`}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-text-dim uppercase tracking-widest">Identity</span>
            <span className="text-sm font-mono font-medium" style={{ color: user.color }}>{user.username}</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${msg.isSystem ? 'items-center my-4' : msg.isOwn ? 'items-end' : 'items-start'}`}
            >
              {msg.isSystem ? (
                <span className="text-xs italic text-text-dim bg-accent/20 px-3 py-1 rounded-full border border-accent/10">
                  {msg.content}
                </span>
              ) : (
                <div className={`max-w-[85%] md:max-w-[70%]`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span 
                      className="text-xs font-bold font-mono" 
                      style={{ color: msg.color }}
                    >
                      {msg.sender} {msg.isOwn && <span className="text-text-dim font-normal">(You)</span>}
                    </span>
                    <span className="text-[10px] text-text-dim">{msg.timestamp}</span>
                  </div>
                  <div className={`
                    px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.isOwn 
                      ? 'bg-highlight text-white rounded-tr-none' 
                      : 'bg-accent/50 text-text-main rounded-tl-none border border-accent/30'}
                  `}>
                    {msg.content}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-text-dim italic px-1"
            >
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-text-dim rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-text-dim rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1 h-1 bg-text-dim rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              Someone is typing...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <footer className="p-4 bg-primary/50 border-t border-accent/30">
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-end gap-2">
            <div className="flex-grow relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className="w-full bg-primary border border-accent/30 rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:border-highlight/50 transition-colors text-text-main resize-none max-h-32 custom-scrollbar"
                style={{ height: 'auto' }}
              />
              <button className="absolute right-3 bottom-3 p-1.5 text-text-dim hover:text-highlight transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-highlight hover:bg-highlight/90 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3.5 rounded-2xl transition-all shadow-lg shadow-highlight/20 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className={`mt-2 flex justify-between items-center px-1 text-[10px] uppercase tracking-widest font-bold ${input.length > 500 ? 'text-highlight' : 'text-text-dim'}`}>
            <span>{input.length > 500 ? 'Message too long' : ''}</span>
            <span>{input.length}/500</span>
          </div>
        </div>
      </footer>

      {/* Error Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-highlight text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 z-50"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Message exceeds 500 characters</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Socket.io connection placeholders */}
      {/* 
        useEffect(() => {
          const socket = io(SERVER_URL);
          
          socket.on('connect', () => setStatus('connected'));
          
          socket.on('receive_message', (message) => {
            setMessages(prev => [...prev, message]);
          });
          
          socket.on('user_typing', ({ username, isTyping }) => {
            if (username !== user.username) setIsTyping(isTyping);
          });

          return () => socket.disconnect();
        }, []);

        const sendMessage = (content) => {
          socket.emit('send_message', { roomId, content, username: user.username });
        };
      */}
    </div>
  );
}
