import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { UserId } from '../utils/user-id.decorator';
import { HoldingService } from './holding.service';
import { TransactionService } from '../transaction/transaction.service';
import { AssetService } from '../asset/asset.service';
import { PriceService } from '../price/price.service';
import { TradeDto } from './dto/trade.dto';
import { Holding } from './holding.schema';

@Controller('holdings')
export class HoldingController {
  constructor(
    private readonly holdingService: HoldingService,
    private readonly transactionService: TransactionService,
    private readonly assetService: AssetService,
    private readonly priceService: PriceService,
  ) {}

  @Post('trade')
  async trade(@Body() tradeDto: TradeDto, @UserId() userId: string): Promise<Holding> {
    try {
      const { assetId, type, quantity } = tradeDto;

      // Get asset by ID to find baseCrypto symbol
      const asset = await this.assetService.findOne(assetId);
      if (!asset) {
        throw new BadRequestException('Asset not found');
      }

      // Get price from Redis using baseCrypto symbol
      const price = await this.priceService.getLatestPrice(asset.baseCrypto);
      if (price === null) {
        throw new BadRequestException(`Price not available for ${asset.baseCrypto}`);
      }

      // Create transaction record first with price from Redis
      await this.transactionService.create({
        userId,
        assetId,
        type,
        quantity,
        priceAtExecution: price,
      });

      // Update holdings
      return await this.holdingService.executeTrade(userId, tradeDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Trade execution failed');
    }
  }

  @Get()
  async findUserHoldings(@UserId() userId: string): Promise<Holding[]> {
    return this.holdingService.findByUserId(userId);
  }
}
