import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './asset.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetService {
  constructor(@InjectModel(Asset.name) private assetModel: Model<AssetDocument>) {}

  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    const createdAsset = new this.assetModel(createAssetDto);
    return createdAsset.save();
  }

  async findAll(): Promise<Asset[]> {
    return this.assetModel.find().exec();
  }

  async findOne(id: string): Promise<Asset | null> {
    return this.assetModel.findById(id).exec();
  }

  async findBySymbol(symbol: string): Promise<Asset | null> {
    return this.assetModel.findOne({ symbol }).exec();
  }

  async findByBaseCrypto(baseCrypto: string): Promise<Asset[]> {
    return this.assetModel.find({ baseCrypto }).exec();
  }

  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<Asset | null> {
    return this.assetModel
      .findByIdAndUpdate(id, updateAssetDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Asset | null> {
    return this.assetModel.findByIdAndDelete(id).exec();
  }
}
