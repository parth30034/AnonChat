import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import { createPoolRoom } from './roomService.js';

interface QueueEntry {
  socketId: string;
  username: string;
  color: string;
  joinedAt: number;
}

class MatchQueue {
  private queue: Map<string, QueueEntry> = new Map();
  private io: Server | null = null;

  init(io: Server): void {
    this.io = io;
  }

  enqueue(socket: Socket, username: string, color: string): void {
    if (this.queue.has(socket.id)) {
      socket.emit('error', { code: 'ALREADY_IN_QUEUE', message: 'You are already in the queue.' });
      return;
    }
    this.queue.set(socket.id, { socketId: socket.id, username, color, joinedAt: Date.now() });
    socket.emit('pool_searching');
    this.tryMatch();
  }

  dequeue(socketId: string): void {
    this.queue.delete(socketId);
  }

  private async tryMatch(): Promise<void> {
    if (!this.io) return;

    const entries = [...this.queue.values()].sort((a, b) => a.joinedAt - b.joinedAt);
    if (entries.length < 2) return;

    const [entry1, entry2] = entries;
    this.queue.delete(entry1.socketId);
    this.queue.delete(entry2.socketId);

    const roomId = randomUUID();
    await createPoolRoom(this.io, roomId, entry1, entry2);

    // Notify each user of the match
    this.io.to(entry1.socketId).emit('pool_matched', {
      roomId,
      partnerUsername: entry2.username,
      partnerColor: entry2.color,
    });
    this.io.to(entry2.socketId).emit('pool_matched', {
      roomId,
      partnerUsername: entry1.username,
      partnerColor: entry1.color,
    });
  }
}

// Singleton
export const matchQueue = new MatchQueue();
