import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HoldingController } from './holding.controller';
import { HoldingService } from './holding.service';
import { Holding, HoldingSchema } from './holding.schema';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Holding.name, schema: HoldingSchema }]),
    TransactionModule,
  ],
  controllers: [HoldingController],
  providers: [HoldingService],
  exports: [HoldingService],
})
export class HoldingModule {}
