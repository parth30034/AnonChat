import { Server, Socket } from 'socket.io';
import { Message } from '../../models/Message.js';
import { joinGroupRoom, leaveRoom } from '../../services/roomService.js';
import { classifyMessage } from '../../services/moderationService.js';
import { assignToCluster, generateLabel, getClusterLabel } from '../../services/clusterService.js';
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

    // ── 1. Moderation check ────────────────────────────────────────────────
    const moderation = await classifyMessage(content);

    if (moderation.action === 'block') {
      socket.emit('message_blocked', { reason: moderation.reason });
      return;
    }

    const isFlagged = moderation.action === 'warn';

    // ── 2. Persist message ─────────────────────────────────────────────────
    const msg = await Message.create({
      roomId,
      sender: username,
      senderColor: color,
      content: content.trim(),
      isSystem: false,
      moderationScore: moderation.score,
      isFlagged,
    });

    const msgId = (msg._id as object).toString();

    const dto = {
      id: msgId,
      sender: msg.sender,
      senderColor: msg.senderColor,
      content: msg.content,
      timestamp: msg.createdAt.toTimeString().slice(0, 5),
      isSystem: false,
      isFlagged,
    };

    // ── 3. Broadcast ───────────────────────────────────────────────────────
    io.to(roomId).emit('receive_message', dto);

    // ── 4. Background: embed + cluster (fire-and-forget) ──────────────────
    assignToCluster(roomId, content.trim())
      .then(async (assignment) => {
        if (!assignment) return;

        // If label was just generated / updated, fetch final label
        let label = assignment.clusterLabel;
        if (assignment.isNewCluster || assignment.clusterLabel === 'New Topic') {
          // Wait briefly for label generation (already triggered inside assignToCluster)
          await new Promise((r) => setTimeout(r, 100));
          label = getClusterLabel(roomId, assignment.clusterId);
        }

        // Persist cluster info on message
        await Message.findByIdAndUpdate(msgId, {
          clusterId: assignment.clusterId,
          clusterLabel: label,
        });

        io.to(roomId).emit('cluster_update', {
          messageId: msgId,
          clusterId: assignment.clusterId,
          clusterLabel: label,
        });

        // Re-emit with updated label if async label generation finished
        if (assignment.isNewCluster) {
          const finalLabel = await generateLabel(roomId, assignment.clusterId);
          if (finalLabel && finalLabel !== label) {
            await Message.findByIdAndUpdate(msgId, { clusterLabel: finalLabel });
            io.to(roomId).emit('cluster_update', {
              messageId: msgId,
              clusterId: assignment.clusterId,
              clusterLabel: finalLabel,
            });
          }
        }
      })
      .catch(() => {});
  });

  socket.on('user_typing', (payload: UserTypingPayload) => {
    const { roomId, username, isTyping } = payload;
    socket.to(roomId).emit('user_typing', { username, isTyping });
  });
}
