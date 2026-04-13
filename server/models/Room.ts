import mongoose, { Document, Schema } from 'mongoose';

export interface IMember {
  socketId: string;
  username: string;
  color: string;
}

export interface IRoom extends Document {
  roomId: string;
  type: 'group' | 'pool';
  members: IMember[];
  isActive: boolean;
  maxMembers: number;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    socketId: { type: String, required: true },
    username: { type: String, required: true },
    color:    { type: String, required: true },
  },
  { _id: false }
);

const RoomSchema = new Schema<IRoom>(
  {
    roomId:     { type: String, required: true, unique: true, index: true },
    type:       { type: String, enum: ['group', 'pool'], required: true },
    members:    { type: [MemberSchema], default: [] },
    isActive:   { type: Boolean, default: true, index: true },
    maxMembers: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
