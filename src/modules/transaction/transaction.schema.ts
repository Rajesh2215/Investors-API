import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  assetId: string;

  @Prop({ required: true, enum: ['BUY', 'SELL'] })
  type: string;

  @Prop({ required: true, type: Number, min: 0 })
  quantity: number;

  @Prop({ type: Number, default: null })
  priceAtExecution: number | null;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
