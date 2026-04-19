import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './transaction.schema';

@Injectable()
export class TransactionService {
  constructor(@InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>) {}

  async create(transactionData: {
    userId: string;
    assetId: string;
    type: string;
    quantity: number;
    priceAtExecution?: number | null;
  }): Promise<Transaction> {
    const createdTransaction = new this.transactionModel(transactionData);
    return createdTransaction.save();
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    return this.transactionModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUserIdAndAssetId(userId: string, assetId: string): Promise<Transaction[]> {
    return this.transactionModel
      .find({ userId, assetId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Transaction | null> {
    return this.transactionModel.findById(id).exec();
  }
}
