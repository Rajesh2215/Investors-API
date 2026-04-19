import { Module } from '@nestjs/common';
import { NavController } from './nav.controller';
import { NavService } from './nav.service';
import { PriceModule } from '../price/price.module';
import { HoldingModule } from '../holding/holding.module';
import { AssetModule } from '../asset/asset.module';
import { AlertModule } from '../alert/alert.module';

@Module({
  imports: [PriceModule, HoldingModule, AssetModule, AlertModule],
  controllers: [NavController],
  providers: [NavService],
  exports: [NavService],
})
export class NavModule {}
