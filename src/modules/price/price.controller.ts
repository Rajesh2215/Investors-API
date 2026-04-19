import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PriceService } from './price.service';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get()
  async getLatestPrices() {
    const symbols = this.priceService.getSupportedSymbols();
    const prices = await this.priceService.getLatestPrices(symbols);
    
    return {
      symbols,
      prices: Object.fromEntries(prices),
      timestamp: new Date(),
    };
  }

  @Get(':symbol')
  async getLatestPrice(@Param('symbol') symbol: string) {
    const price = await this.priceService.getLatestPrice(symbol.toUpperCase());
    
    if (price === null) {
      throw new NotFoundException(`Price not found for symbol: ${symbol}`);
    }
    
    return {
      symbol: symbol.toUpperCase(),
      price,
      timestamp: new Date(),
    };
  }

  @Get('supported/symbols')
  getSupportedSymbols() {
    return {
      symbols: this.priceService.getSupportedSymbols(),
    };
  }
}
