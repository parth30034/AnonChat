import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  sender: string;
  senderColor: string;
  content: string;
  isSystem: boolean;
  moderationScore?: number;
  isFlagged?: boolean;
  clusterId?: string;
  clusterLabel?: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    roomId:          { type: String, required: true, index: true },
    sender:          { type: String, required: true },
    senderColor:     { type: String, default: '' },
    content:         { type: String, required: true, maxlength: 500 },
    isSystem:        { type: Boolean, default: false },
    moderationScore: { type: Number },
    isFlagged:       { type: Boolean },
    clusterId:       { type: String },
    clusterLabel:    { type: String },
  },
  { timestamps: true }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
