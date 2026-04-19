import { IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  name: string;

  @IsString()
  symbol: string;

  @IsString()
  baseCrypto: string;

  @IsNumber()
  @Min(0.001)
  @Max(1000)
  priceMultiplier: number;
}
