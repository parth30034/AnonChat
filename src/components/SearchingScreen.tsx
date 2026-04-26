import { motion } from 'motion/react';
import { Search, Shield, Lock, X } from 'lucide-react';

interface SearchingScreenProps {
  onCancel: () => void;
  phase: 'searching' | 'handshake';
}

export default function SearchingScreen({ onCancel, phase }: SearchingScreenProps) {
  if (phase === 'handshake') {
    return (
      <div className="bg-secondary p-8 rounded-2xl shadow-2xl border border-accent/30 flex flex-col items-center text-center">
        <div className="relative mb-8">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 bg-highlight rounded-full blur-2xl"
          />
          <div className="relative bg-highlight p-6 rounded-full shadow-lg shadow-highlight/20">
            <Lock className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-text-main mb-2">Securing connection...</h2>
        <p className="text-text-dim text-sm mb-8 max-w-xs">
          Performing key exchange
        </p>

        <div className="flex items-center justify-center gap-2 text-highlight text-xs font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-highlight rounded-full animate-ping"></span>
          Establishing encrypted channel
        </div>

        <div className="mt-8 flex items-center gap-2 text-[10px] text-text-dim/50 uppercase tracking-tighter">
          <Shield className="w-3 h-3" />
          End-to-end encrypted
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary p-8 rounded-2xl shadow-2xl border border-accent/30 flex flex-col items-center text-center">
      <div className="relative mb-8">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-highlight rounded-full blur-2xl"
        />
        <div className="relative bg-highlight p-6 rounded-full shadow-lg shadow-highlight/20">
          <Search className="w-10 h-10 text-white animate-pulse" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-text-main mb-2">Finding a Partner...</h2>
      <p className="text-text-dim text-sm mb-8 max-w-xs">
        Matching you with someone anonymous for a safe one-to-one conversation.
      </p>

      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center justify-center gap-2 text-highlight text-xs font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-highlight rounded-full animate-ping"></span>
          Searching Public Pool
        </div>

        <button
          onClick={onCancel}
          className="mt-4 flex items-center justify-center gap-2 text-text-dim hover:text-highlight transition-colors text-sm font-semibold"
        >
          <X className="w-4 h-4" />
          Cancel Search
        </button>
      </div>

      <div className="mt-8 flex items-center gap-2 text-[10px] text-text-dim/50 uppercase tracking-tighter">
        <Shield className="w-3 h-3" />
        End-to-end anonymous encryption
      </div>
    </div>
  );
}
