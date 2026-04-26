import { User } from '../types';
import { Shield, Info, Users } from 'lucide-react';

interface JoinScreenProps {
  user: User;
  onJoinPool: () => void;
}

export default function JoinScreen({ user, onJoinPool }: JoinScreenProps) {
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
        {/* Identity display */}
        <div className="bg-primary/50 p-4 rounded-xl border border-accent/20">
          <label className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2 block">
            Your Identity
          </label>
          <span className="text-xl font-mono font-medium" style={{ color: user.color }}>
            {user.username}
          </span>
        </div>

        {/* Find a stranger */}
        <button
          onClick={onJoinPool}
          className="w-full bg-highlight hover:bg-highlight/90 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-highlight/20 text-lg"
        >
          <Users className="w-5 h-5" />
          Find a Stranger
        </button>

        {/* Info note */}
        <div className="flex items-start gap-3 bg-accent/10 p-4 rounded-xl border border-accent/10">
          <Info className="w-5 h-5 text-highlight flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-dim leading-relaxed">
            No logs, no tracking, fully anonymous. Messages are end-to-end encrypted and cleared when you leave.
          </p>
        </div>
      </div>
    </div>
  );
}
