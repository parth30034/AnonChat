import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Message } from '../types';
import { LogOut, Copy, Send, Smile, AlertCircle, ShieldAlert, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatScreenProps {
  user: User;
  roomName: string;
  messages: Message[];
  isTyping: boolean;
  onlineCount: number;
  isOneToOne: boolean;
  partnerLeft: boolean;
  blockedToast?: string | null;
  onLeave: () => void;
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

const TOPIC_PALETTE = [
  '#4ecca3', '#45b7d1', '#ff9f43', '#a29bfe',
  '#fd79a8', '#e94560', '#00cec9', '#fab1a0',
];

function topicColor(clusterId: string): string {
  let h = 0;
  for (const c of clusterId) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return TOPIC_PALETTE[Math.abs(h) % TOPIC_PALETTE.length];
}

export default function ChatScreen({
  user,
  roomName,
  messages,
  isTyping,
  onlineCount,
  isOneToOne,
  partnerLeft,
  blockedToast,
  onLeave,
  onSendMessage,
  onTyping,
}: ChatScreenProps) {
  const [input, setInput] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping]);

  // Derive unique active topics from messages
  const activeTopics = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; count: number }>();
    for (const msg of messages) {
      if (!msg.clusterId || !msg.clusterLabel || msg.isSystem) continue;
      if (seen.has(msg.clusterId)) {
        seen.get(msg.clusterId)!.count++;
      } else {
        seen.set(msg.clusterId, { id: msg.clusterId, label: msg.clusterLabel, count: 1 });
      }
    }
    return [...seen.values()].sort((a, b) => b.count - a.count);
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && input.length <= 500) {
      onSendMessage(input.trim());
      setInput('');
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      onTyping(false);
    } else if (input.length > 500) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInput(e.target.value);
    onTyping(true);
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => onTyping(false), 2000);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomName);
  };

  const isPool = isOneToOne || roomName === 'Stranger';

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
              {isPool ? 'Chatting with Stranger' : roomName}
              {isPool ? (
                <span className="text-[10px] bg-highlight/20 text-highlight px-2 py-0.5 rounded-full border border-highlight/30 uppercase tracking-widest">1-on-1</span>
              ) : (
                <button
                  onClick={copyRoomId}
                  className="p-1 hover:bg-accent/50 rounded transition-colors text-text-dim"
                  title="Copy room ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-text-dim">
              <span className={`w-2 h-2 rounded-full ${partnerLeft ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
              {isPool
                ? partnerLeft ? 'Partner disconnected' : 'Private Session'
                : `${onlineCount} online`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTopics.length > 0 && (
            <button
              onClick={() => setShowTopics((v) => !v)}
              className={`p-2 rounded-lg transition-colors text-text-dim hover:text-highlight ${showTopics ? 'bg-highlight/10 text-highlight' : ''}`}
              title="Toggle topic view"
            >
              <Tags className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-text-dim uppercase tracking-widest">Identity</span>
            <span className="text-sm font-mono font-medium" style={{ color: user.color }}>{user.username}</span>
          </div>
        </div>
      </header>

      {/* Active Topics Bar */}
      <AnimatePresence>
        {showTopics && activeTopics.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-accent/20 bg-primary/40"
          >
            <div className="px-4 py-2 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase tracking-widest text-text-dim font-bold mr-1">Topics</span>
              {activeTopics.map((t) => (
                <span
                  key={t.id}
                  className="text-xs px-2 py-0.5 rounded-full font-medium border"
                  style={{
                    color: topicColor(t.id),
                    borderColor: `${topicColor(t.id)}40`,
                    backgroundColor: `${topicColor(t.id)}15`,
                  }}
                >
                  {t.label} <span className="opacity-60">·{t.count}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div className="max-w-[85%] md:max-w-[70%]">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span
                      className="text-xs font-bold font-mono"
                      style={{ color: msg.color }}
                    >
                      {msg.sender} {msg.isOwn && <span className="text-text-dim font-normal">(You)</span>}
                    </span>
                    <span className="text-[10px] text-text-dim">{msg.timestamp}</span>
                    {msg.isFlagged && (
                      <span title="Flagged by safety filter" className="text-yellow-400">
                        <ShieldAlert className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className={`
                    px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.isFlagged
                      ? msg.isOwn
                        ? 'bg-yellow-500/80 text-white rounded-tr-none'
                        : 'bg-yellow-900/30 text-text-main rounded-tl-none border border-yellow-600/30'
                      : msg.isOwn
                        ? 'bg-highlight text-white rounded-tr-none'
                        : 'bg-accent/50 text-text-main rounded-tl-none border border-accent/30'}
                  `}>
                    {msg.content}
                  </div>
                  {msg.clusterLabel && msg.clusterId && (
                    <div className={`mt-1 px-1 ${msg.isOwn ? 'text-right' : 'text-left'}`}>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                        style={{
                          color: topicColor(msg.clusterId),
                          borderColor: `${topicColor(msg.clusterId)}40`,
                          backgroundColor: `${topicColor(msg.clusterId)}15`,
                        }}
                      >
                        {msg.clusterLabel}
                      </span>
                    </div>
                  )}
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
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <footer className="p-4 bg-primary/50 border-t border-accent/30">
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-end gap-2">
            <div className="flex-grow relative">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={partnerLeft ? 'Your partner has left this chat.' : 'Type your message...'}
                disabled={partnerLeft}
                rows={1}
                className="w-full bg-primary border border-accent/30 rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:border-highlight/50 transition-colors text-text-main resize-none max-h-32 custom-scrollbar disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ height: 'auto' }}
              />
              <button className="absolute right-3 bottom-3 p-1.5 text-text-dim hover:text-highlight transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || partnerLeft}
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

      {/* Length error toast */}
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

      {/* Moderation blocked toast */}
      <AnimatePresence>
        {blockedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 z-50 max-w-xs text-center"
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{blockedToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
