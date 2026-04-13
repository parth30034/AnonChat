import { Server, Socket } from 'socket.io';
import { Message } from '../../models/Message.js';
import { joinGroupRoom, leaveRoom } from '../../services/roomService.js';
import type {
  JoinRoomPayload,
  LeaveRoomPayload,
  SendMessagePayload,
  UserTypingPayload,
} from '../../types/socket.js';

export function registerRoomHandlers(io: Server, socket: Socket): void {
  socket.on('join_room', async (payload: JoinRoomPayload) => {
    const { roomId, username, color } = payload;
    await joinGroupRoom(io, socket, roomId, username, color);
  });

  socket.on('leave_room', async (payload: LeaveRoomPayload) => {
    const { roomId } = payload;
    const result = await leaveRoom(io, socket, roomId);
    if (result.wasPool) {
      for (const member of result.remainingMembers) {
        io.to(member.socketId).emit('partner_left');
      }
    }
  });

  socket.on('send_message', async (payload: SendMessagePayload) => {
    const { roomId, content, username, color } = payload;

    if (content.length > 500) {
      socket.emit('error', { code: 'MESSAGE_TOO_LONG', message: 'Message cannot exceed 500 characters.' });
      return;
    }

    const msg = await Message.create({
      roomId,
      sender: username,
      senderColor: color,
      content: content.trim(),
      isSystem: false,
    });

    const dto = {
      id: (msg._id as object).toString(),
      sender: msg.sender,
      senderColor: msg.senderColor,
      content: msg.content,
      timestamp: msg.createdAt.toTimeString().slice(0, 5),
      isSystem: false,
    };

    io.to(roomId).emit('receive_message', dto);
  });

  socket.on('user_typing', (payload: UserTypingPayload) => {
    const { roomId, username, isTyping } = payload;
    // Broadcast to everyone in the room except the sender
    socket.to(roomId).emit('user_typing', { username, isTyping });
  });
}
