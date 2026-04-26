import { Server, Socket } from 'socket.io';
import type { AnnouncePublicKeyPayload } from '../../types/socket.js';

export function registerSessionHandlers(io: Server, socket: Socket): void {

  socket.on('public_key_announce', (payload: AnnouncePublicKeyPayload) => {
    const { roomId, publicKey } = payload;

    // Relay this socket's public key to everyone else in the room.
    // socket.to() sends to all in roomId EXCEPT the sender.
    socket.to(roomId).emit('public_key_receive', { publicKey });
  });

  socket.on('encrypted_message', (payload: {
    roomId: string;
    iv: string;
    ciphertext: string;
    sender: string;
    color: string;
  }) => {
    // Relay to everyone in room except sender
    socket.to(payload.roomId).emit('encrypted_message', {
      iv: payload.iv,
      ciphertext: payload.ciphertext,
      sender: payload.sender,
      color: payload.color,
    });
  });

}
