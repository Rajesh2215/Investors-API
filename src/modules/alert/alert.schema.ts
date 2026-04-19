import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AlertDocument = Alert & Document;

@Schema({ timestamps: true })
export class Alert {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  thresholdValue: number;

  @Prop({ required: true, enum: ['above', 'below'] })
  direction: 'above' | 'below';

  @Prop({ required: true, enum: ['active', 'triggered'] })
  lastState: 'active' | 'triggered';

  @Prop({ default: () => new Date() })
  createdAt: Date;

  _id: Types.ObjectId;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
