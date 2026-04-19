import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NavController } from './nav.controller';
import { NavService } from './nav.service';
import { PriceModule } from '../price/price.module';
import { HoldingModule } from '../holding/holding.module';
import { AssetModule } from '../asset/asset.module';
import { AlertModule } from '../alert/alert.module';
import { MongooseModule } from '@nestjs/mongoose';
import { NavSnapshotSchema } from './nav-snapshot.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PriceModule, 
    HoldingModule, 
    AssetModule, 
    AlertModule,
    MongooseModule.forFeature([{ name: 'NavSnapshot', schema: NavSnapshotSchema }])
  ],
  controllers: [NavController],
  providers: [NavService],
  exports: [NavService],
})
export class NavModule {}
