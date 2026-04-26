import { Server, Socket } from 'socket.io';
import { registerPoolHandlers } from './handlers/poolHandlers.js';
import { registerSessionHandlers } from './handlers/sessionHandlers.js';
import { matchQueue } from '../services/poolService.js';

export function registerSocketHandlers(io: Server): void {
  matchQueue.init(io);

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    registerPoolHandlers(io, socket);
    registerSessionHandlers(io, socket);

    // 'disconnecting' fires before the socket leaves its rooms —
    // socket.rooms is still populated here, so we can notify partners.
    socket.on('disconnecting', () => {
      matchQueue.dequeue(socket.id);
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue; // skip the default self-room
        socket.to(roomId).emit('partner_left', { reason: 'disconnect' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
