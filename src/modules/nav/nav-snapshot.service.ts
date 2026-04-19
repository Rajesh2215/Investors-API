import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NavSnapshotDocument, NavSnapshotSchema } from './nav-snapshot.schema';
import { NavService } from './nav.service';

@Injectable()
export class NavSnapshotService {
  private readonly logger = new Logger(NavSnapshotService.name);

  constructor(
    @InjectModel('NavSnapshot') private readonly navSnapshotModel: Model<NavSnapshotDocument>,
    private readonly navService: NavService,
  ) {}

  async createSnapshot(userId: string, nav: number): Promise<NavSnapshotDocument> {
    try {
      const snapshot = new this.navSnapshotModel({
        userId,
        nav,
        timestamp: new Date(),
      });

      const savedSnapshot = await snapshot.save();
      this.logger.log(`📸 NAV snapshot created for user ${userId}: ${nav} at ${new Date()}`);
      return savedSnapshot;
    } catch (error) {
      this.logger.error(`Failed to create NAV snapshot for user ${userId}:`, error);
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
      this.logger.error(`Failed to get NAV history for user ${userId}:`, error);
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
      this.logger.error(`Failed to get NAV history for user ${userId} by date range:`, error);
      throw error;
    }
  }

  async createSnapshotForAllUsers(): Promise<void> {
    try {
      // Get all users who have NAV data in Redis
      const userIds = await this.getAllUsersWithNav();
      
      for (const userId of userIds) {
        const nav = await this.navService.getLatestNav(userId);
        if (nav !== null) {
          await this.createSnapshot(userId, nav);
        }
      }
      
      this.logger.log(`📸 Created snapshots for ${userIds.length} users`);
    } catch (error) {
      this.logger.error('Failed to create snapshots for all users:', error);
    }
  }

  @Cron('*/1 * * * *') // Every 1 minute
async createScheduledSnapshots(): Promise<void> {
  try {
    this.logger.log('🕐 Starting scheduled NAV snapshot creation...');
    await this.createSnapshotForAllUsers();
  } catch (error) {
    this.logger.error('Failed to create scheduled snapshots:', error);
  }
}

private async getAllUsersWithNav(): Promise<string[]> {
    try {
      // Get all users who have NAV data in Redis
      // For now, return known users from the system
      // In a real implementation, you might scan Redis keys or maintain a user list
      
      // For demo purposes, return known users
      return ['69e4843bcf2b98e041c3fe97']; // Sample user ID
    } catch (error) {
      this.logger.error('Failed to get users with NAV:', error);
      return [];
    }
  }
}
