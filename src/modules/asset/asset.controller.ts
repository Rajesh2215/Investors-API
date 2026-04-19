import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AssetService } from './asset.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset } from './asset.schema';

@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  async create(@Body() createAssetDto: CreateAssetDto): Promise<Asset> {
    try {
      return await this.assetService.create(createAssetDto);
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Asset with this name or symbol already exists');
      }
      throw error;
    }
  }

  @Get()
  async findAll(): Promise<Asset[]> {
    return this.assetService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Asset> {
    const asset = await this.assetService.findOne(id);
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  @Get('symbol/:symbol')
  async findBySymbol(@Param('symbol') symbol: string): Promise<Asset> {
    const asset = await this.assetService.findBySymbol(symbol);
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  @Get('base/:baseCrypto')
  async findByBaseCrypto(@Param('baseCrypto') baseCrypto: string): Promise<Asset[]> {
    return this.assetService.findByBaseCrypto(baseCrypto);
  }
}
