import { useState } from 'react';
import { User } from '../types';
import { Shield, RefreshCw, LogIn, Plus, Info, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface JoinScreenProps {
  user: User;
  onJoin: (roomName: string) => void;
  onRandomize: () => void;
}

export default function JoinScreen({ user, onJoin, onRandomize }: JoinScreenProps) {
  const [roomInput, setRoomInput] = useState('');

  const handleJoin = () => {
    if (roomInput.trim()) {
      onJoin(roomInput.trim());
    }
  };

  const handleCreateRoom = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onJoin(randomId);
  };

  return (
    <div className="bg-secondary p-8 rounded-2xl shadow-2xl border border-accent/30">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-highlight p-3 rounded-full mb-4 shadow-lg shadow-highlight/20">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text-main">AnonChat</h1>
        <p className="text-text-dim text-sm mt-1">Safe • Secure • Anonymous</p>
      </div>

      <div className="space-y-6">
        {/* Username Section */}
        <div className="bg-primary/50 p-4 rounded-xl border border-accent/20">
          <label className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2 block">
            Your Identity
          </label>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono font-medium" style={{ color: user.color }}>
              {user.username}
            </span>
            <motion.button
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              onClick={onRandomize}
              className="p-2 hover:bg-accent/50 rounded-lg transition-colors text-text-dim hover:text-highlight"
            >
              <RefreshCw className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Room Input Section */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2 block">
              Join a Room
            </label>
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Enter room name or ID"
              className="w-full bg-primary border border-accent/30 rounded-xl px-4 py-3 focus:outline-none focus:border-highlight/50 transition-colors text-text-main"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={!roomInput.trim()}
            className="w-full bg-highlight hover:bg-highlight/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-highlight/20"
          >
            <LogIn className="w-5 h-5" />
            Join Chat
          </button>

          <button
            onClick={() => onJoin('Public Pool')}
            className="w-full bg-primary border border-highlight/50 hover:bg-highlight/10 text-highlight font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Join Public Pool
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-accent/20"></div>
            <span className="flex-shrink mx-4 text-text-dim text-xs uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-accent/20"></div>
          </div>

          <button
            onClick={handleCreateRoom}
            className="w-full bg-accent/50 hover:bg-accent border border-accent text-text-main font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Room
          </button>
        </div>

        {/* Info Section */}
        <div className="flex items-start gap-3 bg-accent/10 p-4 rounded-xl border border-accent/10">
          <Info className="w-5 h-5 text-highlight flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-dim leading-relaxed">
            No logs, no tracking, fully anonymous. Your identity and messages are temporary and will be cleared when you leave.
          </p>
        </div>
      </div>
    </div>
  );
}
