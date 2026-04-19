import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AssetDocument = Asset & Document;

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  symbol: string;

  @Prop({ required: true })
  baseCrypto: string;

  @Prop({ required: true, type: Number })
  priceMultiplier: number;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
