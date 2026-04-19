import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AlertDocument = Alert & Document;

@Schema({ timestamps: true })
export class Alert {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  thresholdValue: number;

  @Prop({ required: true, enum: ['above', 'below'] })
  direction: 'above' | 'below';

  @Prop({ required: true, enum: ['above', 'below'] })
  lastState: 'above' | 'below';

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
