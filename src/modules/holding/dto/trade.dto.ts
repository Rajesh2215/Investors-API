import { IsString, IsNumber, Min, IsEnum } from 'class-validator';

export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export class TradeDto {
  @IsString()
  assetId: string;

  @IsNumber()
  @Min(0.00000001)
  quantity: number;

  @IsEnum(TradeType)
  type: TradeType;
}
