import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class PriceTestService implements OnModuleInit {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleInit() {
    console.log('PriceTestService initialized - testing Redis connection...');
    await this.testRedisConnection();
  }

  private async testRedisConnection() {
    try {
      await this.redis.set('test:price:btc', '50000');
      const value = await this.redis.get('test:price:btc');
      console.log('Redis test successful:', value);
      
      // Clean up
      await this.redis.del('test:price:btc');
    } catch (error) {
      console.error('Redis test failed:', error);
    }
  }

  async setTestPrice(symbol: string, price: number) {
    try {
      const key = `price:${symbol}`;
      await this.redis.set(key, price.toString());
      console.log(`Set test price: ${symbol} = $${price}`);
    } catch (error) {
      console.error(`Error setting test price for ${symbol}:`, error);
    }
  }

  async getTestPrice(symbol: string): Promise<number | null> {
    try {
      const key = `price:${symbol}`;
      const price = await this.redis.get(key);
      return price ? parseFloat(price) : null;
    } catch (error) {
      console.error(`Error getting test price for ${symbol}:`, error);
      return null;
    }
  }
}
