import { Server, Socket } from 'socket.io';
import { registerRoomHandlers } from './handlers/roomHandlers.js';
import { registerPoolHandlers } from './handlers/poolHandlers.js';
import { leaveAllRooms } from '../services/roomService.js';
import { matchQueue } from '../services/poolService.js';

export function registerSocketHandlers(io: Server): void {
  // Give the MatchQueue access to the io instance
  matchQueue.init(io);

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    registerRoomHandlers(io, socket);
    registerPoolHandlers(io, socket);

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Remove from pool queue if waiting
      matchQueue.dequeue(socket.id);
      // Leave all active rooms gracefully
      await leaveAllRooms(io, socket);
    });
  });
}
