import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  sender: string;
  senderColor: string;
  content: string;
  isSystem: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    roomId:      { type: String, required: true, index: true },
    sender:      { type: String, required: true },
    senderColor: { type: String, default: '' },
    content:     { type: String, required: true, maxlength: 500 },
    isSystem:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
