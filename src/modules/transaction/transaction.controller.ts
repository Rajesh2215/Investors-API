import { Controller, Get, NotFoundException } from '@nestjs/common';
import { UserId } from '../utils/user-id.decorator';
import { TransactionService } from './transaction.service';
import { Transaction } from './transaction.schema';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  async findUserTransactions(@UserId() userId: string): Promise<Transaction[]> {
    return this.transactionService.findByUserId(userId);
  }
}
