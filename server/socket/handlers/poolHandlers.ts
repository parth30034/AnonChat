import { Server, Socket } from 'socket.io';
import { matchQueue } from '../../services/poolService.js';
import type { JoinPoolPayload } from '../../types/socket.js';

export function registerPoolHandlers(io: Server, socket: Socket): void {
  socket.on('join_pool', (payload: JoinPoolPayload) => {
    const { username, color } = payload;
    matchQueue.enqueue(socket, username, color);
  });

  socket.on('cancel_pool', () => {
    matchQueue.dequeue(socket.id);
  });

  socket.on('leave_session', (payload: { roomId: string }) => {
    const { roomId } = payload;
    // Notify partner before leaving
    socket.to(roomId).emit('partner_left', { reason: 'left' });
    socket.leave(roomId);
  });
}
