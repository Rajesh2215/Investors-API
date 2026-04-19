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
import { TradeDto } from './dto/trade.dto';
import { Holding } from './holding.schema';

@Controller('holdings')
export class HoldingController {
  constructor(
    private readonly holdingService: HoldingService,
    private readonly transactionService: TransactionService,
  ) {}

  @Post('trade')
  async trade(@Body() tradeDto: TradeDto, @UserId() userId: string): Promise<Holding> {
    try {
      const { assetId, type, quantity } = tradeDto;

      // Create transaction record first
      await this.transactionService.create({
        userId,
        assetId,
        type,
        quantity,
        priceAtExecution: null, // Will be implemented later
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
