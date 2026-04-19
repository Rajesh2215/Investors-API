import { Module } from '@nestjs/common';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { PriceTestService } from './price.test';

@Module({
  controllers: [PriceController],
  providers: [PriceService, PriceTestService],
  exports: [PriceService],
})
export class PriceModule {}
