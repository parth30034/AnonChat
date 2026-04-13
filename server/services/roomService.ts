import { Server, Socket } from 'socket.io';
import { Room, IRoom } from '../models/Room.js';
import { Message } from '../models/Message.js';
import type { MessageDto, RoomJoinedPayload } from '../types/socket.js';

function formatTimestamp(date: Date): string {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}

function toDto(msg: InstanceType<typeof Message>): MessageDto {
  return {
    id: (msg._id as object).toString(),
    sender: msg.sender,
    senderColor: msg.senderColor,
    content: msg.content,
    timestamp: formatTimestamp(msg.createdAt),
    isSystem: msg.isSystem,
  };
}

async function saveSystemMessage(roomId: string, text: string): Promise<MessageDto> {
  const msg = await Message.create({
    roomId,
    sender: 'System',
    senderColor: '',
    content: text,
    isSystem: true,
  });
  return toDto(msg);
}

async function getRecentMessages(roomId: string): Promise<MessageDto[]> {
  const msgs = await Message.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return msgs.reverse().map((m) => ({
    id: (m._id as object).toString(),
    sender: m.sender,
    senderColor: m.senderColor,
    content: m.content,
    timestamp: formatTimestamp(new Date(m.createdAt as Date)),
    isSystem: m.isSystem,
  }));
}

// ─── Group Room ──────────────────────────────────────────────────────────────

export async function joinGroupRoom(
  io: Server,
  socket: Socket,
  roomId: string,
  username: string,
  color: string
): Promise<void> {
  // Find or create room
  let room: IRoom | null = await Room.findOne({ roomId });

  if (!room) {
    room = await Room.create({
      roomId,
      type: 'group',
      maxMembers: 10,
      members: [],
      isActive: true,
    });
  }

  if (!room.isActive) {
    // Reactivate an empty room someone is rejoining by name
    room.isActive = true;
  }

  if (room.members.length >= room.maxMembers) {
    socket.emit('error', { code: 'ROOM_FULL', message: 'This room is full (max 10 users).' });
    return;
  }

  // Add member
  room.members.push({ socketId: socket.id, username, color });
  await room.save();

  await socket.join(roomId);

  const history = await getRecentMessages(roomId);
  const payload: RoomJoinedPayload = {
    roomId,
    messages: history,
    onlineCount: room.members.length,
    roomType: 'group',
  };
  socket.emit('room_joined', payload);

  // Broadcast join to others, then save system message
  const systemMsg = await saveSystemMessage(roomId, `${username} joined the room`);
  io.to(roomId).emit('receive_message', systemMsg);
  io.to(roomId).emit('user_joined', { username, count: room.members.length });
}

// ─── Create Pool Room (called from MatchQueue) ────────────────────────────────

export async function createPoolRoom(
  io: Server,
  roomId: string,
  entry1: { socketId: string; username: string; color: string },
  entry2: { socketId: string; username: string; color: string }
): Promise<void> {
  await Room.create({
    roomId,
    type: 'pool',
    maxMembers: 2,
    members: [
      { socketId: entry1.socketId, username: entry1.username, color: entry1.color },
      { socketId: entry2.socketId, username: entry2.username, color: entry2.color },
    ],
    isActive: true,
  });

  // Join both sockets to the room
  const s1 = io.sockets.sockets.get(entry1.socketId);
  const s2 = io.sockets.sockets.get(entry2.socketId);
  if (s1) await s1.join(roomId);
  if (s2) await s2.join(roomId);

  // Save and send the welcome system message
  const systemMsg = await saveSystemMessage(roomId, "You are now connected with a stranger. Say hi!");
  io.to(roomId).emit('receive_message', systemMsg);
}

// ─── Leave Room ──────────────────────────────────────────────────────────────

export async function leaveRoom(
  io: Server,
  socket: Socket,
  roomId: string
): Promise<{ wasPool: boolean; remainingMembers: { socketId: string; username: string; color: string }[] }> {
  const room = await Room.findOne({ roomId });
  if (!room) return { wasPool: false, remainingMembers: [] };

  const memberIndex = room.members.findIndex((m) => m.socketId === socket.id);
  if (memberIndex === -1) return { wasPool: false, remainingMembers: [] };

  const { username } = room.members[memberIndex];
  room.members.splice(memberIndex, 1);

  if (room.members.length === 0) {
    room.isActive = false;
  }
  await room.save();

  socket.leave(roomId);

  const systemMsg = await saveSystemMessage(roomId, `${username} left the room`);
  io.to(roomId).emit('receive_message', systemMsg);
  io.to(roomId).emit('user_left', { username, count: room.members.length });

  return {
    wasPool: room.type === 'pool',
    remainingMembers: room.members as { socketId: string; username: string; color: string }[],
  };
}

// ─── Disconnect cleanup ───────────────────────────────────────────────────────

export async function leaveAllRooms(
  io: Server,
  socket: Socket
): Promise<void> {
  const rooms = await Room.find({ 'members.socketId': socket.id, isActive: true });
  for (const room of rooms) {
    const result = await leaveRoom(io, socket, room.roomId);
    if (result.wasPool) {
      // Notify the remaining pool partner
      for (const member of result.remainingMembers) {
        io.to(member.socketId).emit('partner_left');
      }
    }
  }
}
