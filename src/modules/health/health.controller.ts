import { Controller, Get } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.module';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';

@Controller()
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongooseConnection: Connection,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  @Get('health')
  async getHealth() {
    const mongoStatus = this.mongooseConnection.readyState === 1 ? 'connected' : 'disconnected';
    const redisStatus = this.redisClient.status === 'ready' ? 'connected' : 'disconnected';

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus,
        redis: redisStatus,
      },
    };
  }
}
