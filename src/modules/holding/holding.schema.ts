import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HoldingDocument = Holding & Document;

@Schema({ timestamps: true })
export class Holding {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Asset' })
  assetId: string;

  @Prop({ required: true, type: Number, min: 0 })
  quantity: number;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const HoldingSchema = SchemaFactory.createForClass(Holding);

// Create compound index for unique user-asset combination
HoldingSchema.index({ userId: 1, assetId: 1 }, { unique: true });
