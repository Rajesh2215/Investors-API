import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Subject, Observable } from 'rxjs';

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: Date;
}

@Injectable()
export class PriceService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private ws: WebSocket | null = null; // ✅ single connection instead of map
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;

  private priceUpdates$ = new Subject<PriceUpdate>();
  private readonly symbols = ['BTC', 'ETH', 'SOL'];

  // ✅ FIXED endpoint
  private readonly BINANCE_WS_URL = 'wss://stream.binance.com:9443/stream';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async onModuleInit() {
    console.log('Initializing Price service...');
    this.connectToBinance();
  }

  async onModuleDestroy() {
    console.log('Destroying Price service...');
    this.disconnectFromBinance();
  }

  private connectToBinance() {
    try {
      const streams = this.symbols
        .map(symbol => `${symbol.toLowerCase()}usdt@ticker`)
        .join('/');

      const wsUrl = `${this.BINANCE_WS_URL}?streams=${streams}`;

      console.log(`Connecting to Binance WebSocket: ${wsUrl}`);

      // ✅ Clean previous connection
      if (this.ws) {
        this.ws.removeAllListeners();
        this.ws.terminate();
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('✅ Connected to Binance WebSocket');
        this.reconnectAttempts = 0;
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        this.handleWebSocketMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.scheduleReconnect();
      });

      this.ws.on('close', () => {
        console.log('⚠️ WebSocket closed');
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  private disconnectFromBinance() {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  private handleWebSocketMessage(data: WebSocket.RawData) {
    try {
      const message = JSON.parse(data.toString());

      // ✅ Binance multi-stream format: { stream, data }
      if (message.data) {
        this.processPriceUpdate(message.data);
      } else {
        this.processPriceUpdate(message);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  private async processPriceUpdate(data: any) {
    if (data.e === '24hrTicker') {
      const symbol = data.s.replace('USDT', '');
      const price = parseFloat(data.c);

      const priceUpdate: PriceUpdate = {
        symbol,
        price,
        timestamp: new Date(),
      };

      await this.storePriceInRedis(symbol, price);

      this.emit('priceUpdate', priceUpdate);
      this.priceUpdates$.next(priceUpdate);

      console.log(`💰 ${symbol}: $${price}`);
    }
  }

  private async storePriceInRedis(symbol: string, price: number) {
    try {
      const key = `price:${symbol}`;
      await this.redis.set(key, price.toString(), 'EX', 3600);
    } catch (error) {
      console.error(`Redis error (${symbol}):`, error);
    }
  }

  // ✅ smarter reconnection (exponential backoff)
  private scheduleReconnect() {
    if (this.reconnectTimeout) return; // prevent multiple timers

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`🔄 Reconnecting in ${delay / 1000}s...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connectToBinance();
    }, delay);
  }

  // ---------------- PUBLIC API ----------------

  async getLatestPrice(symbol: string): Promise<number | null> {
    try {
      const price = await this.redis.get(`price:${symbol}`);
      return price ? parseFloat(price) : null;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      return null;
    }
  }

  async getLatestPrices(symbols: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    try {
      const keys = symbols.map(s => `price:${s}`);
      const results = await this.redis.mget(...keys);

      results.forEach((price, i) => {
        if (price) {
          prices.set(symbols[i], parseFloat(price));
        }
      });
    } catch (error) {
      console.error('Error getting multiple prices:', error);
    }

    return prices;
  }

  getPriceUpdates(): Observable<PriceUpdate> {
    return this.priceUpdates$.asObservable();
  }

  getSupportedSymbols(): string[] {
    return [...this.symbols];
  }
}