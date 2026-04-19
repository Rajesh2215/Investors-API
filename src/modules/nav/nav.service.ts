import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { PriceService, PriceUpdate } from '../price/price.service';
import { HoldingService } from '../holding/holding.service';
import { AssetService } from '../asset/asset.service';
import { AlertService } from '../alert/alert.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NavSnapshotDocument } from './nav-snapshot.schema';
import { Cron } from '@nestjs/schedule';
import { Subject, Observable } from 'rxjs';

export interface NavUpdate {
  userId: string;
  nav: number;
  prices: { symbol: string; price: number }[];
  timestamp: Date;
}

export interface AlertUpdate {
  type: 'alert';
  userId: string;
  thresholdValue: number;
  direction: 'above' | 'below';
  currentNav: number;
  timestamp: Date;
}

export interface NavEvent {
  type: 'nav' | 'alert';
  userId: string;
  nav?: number;
  prices?: { symbol: string; price: number }[];
  thresholdValue?: number;
  direction?: 'above' | 'below';
  currentNav?: number;
  timestamp: Date;
}

@Injectable()
export class NavService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly DIRTY_USERS_KEY = 'nav:dirtyUsers';
  private readonly NAV_KEY_PREFIX = 'nav:';
  private readonly THROTTLE_MS = 500; // 500ms throttle
  
  private navUpdates$ = new Subject<NavEvent>();
  private recalculationTimeout: NodeJS.Timeout | null = null;
  private isRecalculating = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly priceService: PriceService,
    private readonly holdingService: HoldingService,
    private readonly assetService: AssetService,
    private readonly alertService: AlertService,
    @InjectModel('NavSnapshot') private readonly navSnapshotModel: Model<NavSnapshotDocument>,
  ) {
    super();
  }

  async onModuleInit() {
    console.log('Initializing NAV service...');
    await this.listenToPriceUpdates();
    this.scheduleNavRecalculation();
  }

  async onModuleDestroy() {
    console.log('Destroying NAV service...');
    if (this.recalculationTimeout) {
      clearTimeout(this.recalculationTimeout);
    }
  }

  private listenToPriceUpdates() {
    this.priceService.on('priceUpdate', async (priceUpdate: PriceUpdate) => {
      console.log(`📈 Price update received: ${priceUpdate.symbol} = $${priceUpdate.price}`);
      await this.handlePriceUpdate(priceUpdate);
    });
  }

  private async handlePriceUpdate(priceUpdate: PriceUpdate) {
    try {
      // Find all MATs linked to this crypto
      const assets = await this.assetService.findByBaseCrypto(priceUpdate.symbol);
      const affectedUserIds = new Set<string>();

      for (const asset of assets) {
        // Find users who hold this asset
        const holdings = await this.holdingService.findByAssetId((asset as any)._id.toString());
        
        for (const holding of holdings) {
          affectedUserIds.add(holding.userId);
        }
      }

      if (affectedUserIds.size > 0) {
        console.log(`👥 Adding ${affectedUserIds.size} users to dirty set for ${priceUpdate.symbol} update`);
        await this.addUsersToDirtySet(Array.from(affectedUserIds));
        
        // Trigger throttled recalculation
        this.scheduleNavRecalculation();
      }
    } catch (error) {
      console.error('Error handling price update:', error);
    }
  }

  private async addUsersToDirtySet(userIds: string[]) {
    try {
      await this.redis.sadd(this.DIRTY_USERS_KEY, ...userIds);
      await this.redis.expire(this.DIRTY_USERS_KEY, 60); // Expire after 1 minute
    } catch (error) {
      console.error('Error adding users to dirty set:', error);
    }
  }

  private async getDirtyUsers(): Promise<string[]> {
    try {
      const users = await this.redis.smembers(this.DIRTY_USERS_KEY);
      return users;
    } catch (error) {
      console.error('Error getting dirty users:', error);
      return [];
    }
  }

  private async clearDirtyUsers(userIds: string[]) {
    try {
      await this.redis.srem(this.DIRTY_USERS_KEY, ...userIds);
    } catch (error) {
      console.error('Error clearing dirty users:', error);
    }
  }

  private scheduleNavRecalculation() {
    if (this.isRecalculating) {
      return; // Already recalculating
    }

    // Clear existing timeout and set new one
    if (this.recalculationTimeout) {
      clearTimeout(this.recalculationTimeout);
    }

    this.recalculationTimeout = setTimeout(() => {
      this.recalculateNavForDirtyUsers();
    }, this.THROTTLE_MS);
  }

  private async recalculateNavForDirtyUsers() {
    if (this.isRecalculating) {
      return; // Prevent concurrent recalculations
    }

    this.isRecalculating = true;
    
    try {
      const dirtyUsers = await this.getDirtyUsers();
      console.log("🚀 ~ NavService ~ recalculateNavForDirtyUsers ~ dirtyUsers:", dirtyUsers)
      
      if (dirtyUsers.length === 0) {
        console.log('📊 No dirty users to process');
        this.isRecalculating = false;
        return;
      }

      console.log(`🧮 Recalculating NAV for ${dirtyUsers.length} users...`);
      
      // Process in batches to avoid overwhelming Redis
      const batchSize = 50;
      for (let i = 0; i < dirtyUsers.length; i += batchSize) {
        const batch = dirtyUsers.slice(i, i + batchSize);
        await this.recalculateNavForBatch(batch);
      }

      // Clear processed users from dirty set
      await this.clearDirtyUsers(dirtyUsers);
      
      console.log(`✅ NAV recalculation completed for ${dirtyUsers.length} users`);
    } catch (error) {
      console.error('Error in NAV recalculation:', error);
    } finally {
      this.isRecalculating = false;
    }
  }

  private async recalculateNavForBatch(userIds: string[]) {
    for (const userId of userIds) {
      try {
        const nav = await this.calculateUserNav(userId);
        if (nav !== null) {
          await this.storeNavInRedis(userId, nav);
          this.emitNavUpdate(userId, nav);
        }
      } catch (error) {
        console.error(`Error calculating NAV for user ${userId}:`, error);
      }
    }
  }

  private async calculateUserNav(userId: string): Promise<number | null> {
    try {
      // Get user's holdings
      const holdings = await this.holdingService.findByUserId(userId);
      
      if (holdings.length === 0) {
        return 0; // No holdings = NAV = 0
      }

      let totalNav = 0;

      for (const holding of holdings) {
        // Get asset details to find price multiplier
        const asset = await this.assetService.findOne(holding.assetId);
        if (!asset) {
          console.warn(`Asset not found for holding: ${holding.assetId}`);
          continue;
        }

        // Get latest price for the base crypto
        const cryptoPrice = await this.priceService.getLatestPrice(asset.baseCrypto);
        if (cryptoPrice === null) {
          console.warn(`Price not found for crypto: ${asset.baseCrypto}`);
          continue;
        }

        // Calculate NAV for this holding: quantity × (cryptoPrice × priceMultiplier)
        const holdingNav = holding.quantity * cryptoPrice * asset.priceMultiplier;
        totalNav += holdingNav;
        
        console.log(`💰 ${userId} ${asset.symbol}: ${holding.quantity} × ${cryptoPrice} × ${asset.priceMultiplier} = ${holdingNav}`);
      }

      return totalNav;
    } catch (error) {
      console.error(`Error calculating NAV for user ${userId}:`, error);
      return null;
    }
  }

  private async storeNavInRedis(userId: string, nav: number) {
    try {
      const key = `${this.NAV_KEY_PREFIX}${userId}`;
      await this.redis.set(key, nav.toString(), 'EX', 3600); // Expire after 1 hour
    } catch (error) {
      console.error(`Error storing NAV for user ${userId}:`, error);
    }
  }

  private async emitNavUpdate(userId: string, nav: number) {
    // Get current crypto prices
    const prices = await this.getCurrentPrices();
    
    const navUpdate: NavEvent = {
      type: 'nav',
      userId,
      nav,
      prices,
      timestamp: new Date(),
    };

    this.navUpdates$.next(navUpdate);
    this.emit('navUpdate', navUpdate);
    
    // Check threshold crossing and trigger alerts
    const triggeredAlerts = await this.alertService.checkThresholdCrossing(userId, nav);
    
    // Emit alert events to SSE stream
    for (const alert of triggeredAlerts) {
      const alertUpdate: NavEvent = {
        type: 'alert',
        userId: alert.userId,
        thresholdValue: alert.thresholdValue,
        direction: alert.direction,
        currentNav: nav,
        prices,
        timestamp: new Date(),
      };
      
      this.navUpdates$.next(alertUpdate);
      this.emit('alertUpdate', alertUpdate);
    }
  }

  private async getCurrentPrices(): Promise<{ symbol: string; price: number }[]> {
    try {
      const symbols = ['BTC', 'ETH', 'SOL'];
      const prices = [];
      
      for (const symbol of symbols) {
        const price = await this.priceService.getLatestPrice(symbol);
        if (price !== null) {
          prices.push({ symbol, price });
        }
      }
      
      return prices;
    } catch (error) {
      console.error('Error getting current prices:', error);
      return [];
    }
  }

  // Public API methods
  async getLatestNav(userId: string): Promise<number | null> {
    try {
      const key = `${this.NAV_KEY_PREFIX}${userId}`;
      const nav = await this.redis.get(key);
      return nav ? parseFloat(nav) : null;
    } catch (error) {
      console.error(`Error getting NAV for user ${userId}:`, error);
      return null;
    }
  }

  getNavUpdates(): Observable<NavEvent> {
    return this.navUpdates$.asObservable();
  }

  // NAV Snapshot Methods
  async createSnapshot(userId: string, nav: number): Promise<NavSnapshotDocument> {
    try {
      const snapshot = new this.navSnapshotModel({
        userId,
        nav,
        timestamp: new Date(),
      });

      const savedSnapshot = await snapshot.save();
      console.log(`\ud83d\udcf8 NAV snapshot created for user ${userId}: ${nav} at ${new Date()}`);
      return savedSnapshot;
    } catch (error) {
      console.error(`Failed to create NAV snapshot for user ${userId}:`, error);
      throw error;
    }
  }

  async getNavHistory(userId: string, limit: number = 100): Promise<NavSnapshotDocument[]> {
    try {
      return await this.navSnapshotModel
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      console.error(`Failed to get NAV history for user ${userId}:`, error);
      throw error;
    }
  }

  async getNavHistoryByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<NavSnapshotDocument[]> {
    try {
      return await this.navSnapshotModel
        .find({
          userId,
          timestamp: { $gte: startDate, $lte: endDate },
        })
        .sort({ timestamp: -1 })
        .exec();
    } catch (error) {
      console.error(`Failed to get NAV history for user ${userId} by date range:`, error);
      throw error;
    }
  }

  @Cron('*/1 * * * *') // Every 1 minute
  async createScheduledSnapshots(): Promise<void> {
    try {
      console.log('\ud83d\udd50 Starting scheduled NAV snapshot creation...');
      await this.createSnapshotForAllUsers();
    } catch (error) {
      console.error('Failed to create scheduled snapshots:', error);
    }
  }

  private async createSnapshotForAllUsers(): Promise<void> {
    try {
      // Get all users who have NAV data in Redis
      const userIds = await this.getAllUsersWithNav();
      
      for (const userId of userIds) {
        const nav = await this.getLatestNav(userId);
        if (nav !== null) {
          await this.createSnapshot(userId, nav);
        }
      }
      
      console.log(`\ud83d\udcf8 Created snapshots for ${userIds.length} users`);
    } catch (error) {
      console.error('Failed to create snapshots for all users:', error);
    }
  }

  private async getAllUsersWithNav(): Promise<string[]> {
    try {
      // For demo purposes, return known users from the system
      // In a real implementation, you might scan Redis keys or maintain a user list
      return ['69e4843bcf2b98e041c3fe97']; // Sample user ID
    } catch (error) {
      console.error('Failed to get users with NAV:', error);
      return [];
    }
  }
}
