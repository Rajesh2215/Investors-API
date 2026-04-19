import { Schema, Document } from 'mongoose';

export interface NavSnapshotDocument extends Document {
  userId: string;
  nav: number;
  timestamp: Date;
}

export const NavSnapshotSchema = new Schema<NavSnapshotDocument>({
  userId: { type: String, required: true, index: true },
  nav: { type: Number, required: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
});

// Create compound index for efficient queries
NavSnapshotSchema.index({ userId: 1, timestamp: -1 });
