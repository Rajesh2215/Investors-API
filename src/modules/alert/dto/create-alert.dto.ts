import { IsNumber, IsEnum, IsString, IsPositive } from 'class-validator';

export class CreateAlertDto {
  @IsNumber()
  @IsPositive()
  thresholdValue: number;

  @IsEnum(['above', 'below'])
  @IsString()
  direction: 'above' | 'below';
}
