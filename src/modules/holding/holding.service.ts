import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Holding, HoldingDocument } from './holding.schema';
import { TradeDto, TradeType } from './dto/trade.dto';

@Injectable()
export class HoldingService {
  constructor(@InjectModel(Holding.name) private holdingModel: Model<HoldingDocument>) {}

  async executeTrade(userId: string, tradeDto: TradeDto): Promise<Holding> {
    const { assetId, quantity, type } = tradeDto;

    // Find existing holding
    const existingHolding = await this.holdingModel.findOne({ userId, assetId });

    if (type === TradeType.BUY) {
      return this.handleBuy(userId, assetId, quantity, existingHolding);
    } else if (type === TradeType.SELL) {
      return this.handleSell(userId, assetId, quantity, existingHolding);
    } else {
      throw new BadRequestException('Invalid trade type');
    }
  }

  private async handleBuy(
    userId: string,
    assetId: string,
    quantity: number,
    existingHolding: HoldingDocument | null,
  ): Promise<Holding> {
    if (existingHolding) {
      // Update existing holding
      existingHolding.quantity += quantity;
      existingHolding.updatedAt = new Date();
      const savedHolding = await existingHolding.save();
      return this.holdingModel.findById(savedHolding._id).populate('assetId').exec() as Promise<Holding>;
    } else {
      // Create new holding
      const newHolding = new this.holdingModel({
        userId,
        assetId,
        quantity,
        updatedAt: new Date(),
      });
      const savedHolding = await newHolding.save();
      return this.holdingModel.findById(savedHolding._id).populate('assetId').exec() as Promise<Holding>;
    }
  }

  private async handleSell(
    userId: string,
    assetId: string,
    quantity: number,
    existingHolding: HoldingDocument | null,
  ): Promise<Holding> {
    if (!existingHolding) {
      throw new BadRequestException('No holding found for this asset');
    }

    if (existingHolding.quantity < quantity) {
      throw new BadRequestException('Insufficient quantity to sell');
    }

    existingHolding.quantity -= quantity;
    existingHolding.updatedAt = new Date();

    // If quantity becomes 0, remove the holding record entirely
    if (existingHolding.quantity === 0) {
      await this.holdingModel.deleteOne({ userId, assetId });
      // Return the holding with populated asset before deletion
      return this.holdingModel.findById(existingHolding._id).populate('assetId').exec() as Promise<Holding>;
    } else {
      const savedHolding = await existingHolding.save();
      return this.holdingModel.findById(savedHolding._id).populate('assetId').exec() as Promise<Holding>;
    }
  }

  async findByUserId(userId: string): Promise<Holding[]> {
    return this.holdingModel.find({ userId }).populate('assetId').exec();
  }

  async findByUserIdAndAssetId(userId: string, assetId: string): Promise<Holding | null> {
    return this.holdingModel.findOne({ userId, assetId }).populate('assetId').exec();
  }

  async findOne(id: string): Promise<Holding | null> {
    return this.holdingModel.findById(id).populate('assetId').exec();
  }

  async findByAssetId(assetId: string): Promise<Holding[]> {
    return this.holdingModel.find({ assetId }).populate('assetId').exec();
  }
}
