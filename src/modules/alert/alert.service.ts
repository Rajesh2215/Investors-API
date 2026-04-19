import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alert, AlertDocument } from './alert.schema';

export interface CreateAlertDto {
  thresholdValue: number;
  direction: 'above' | 'below';
}

export { Alert };

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(@InjectModel(Alert.name) private alertModel: Model<AlertDocument>) {}

  async create(createAlertDto: CreateAlertDto, userId: string): Promise<Alert> {
    try {
      const alert = new this.alertModel({
        userId,
        thresholdValue: createAlertDto.thresholdValue,
        direction: createAlertDto.direction,
        lastState: 'active', // Initial state - monitoring for threshold crossing
      });

      const savedAlert = await alert.save();
      this.logger.log(`Alert created for user ${userId}: ${createAlertDto.direction} ${createAlertDto.thresholdValue}`);
      
      return savedAlert;
    } catch (error) {
      this.logger.error(`Error creating alert:`, error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<Alert[]> {
    try {
      return this.alertModel.find({ userId }).sort({ createdAt: -1 }).exec();
    } catch (error) {
      this.logger.error(`Error finding alerts for user ${userId}:`, error);
      return [];
    }
  }

  async findOne(id: string): Promise<Alert | null> {
    try {
      return this.alertModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding alert:`, error);
      return null;
    }
  }

  async update(id: string, updateData: Partial<Alert>): Promise<Alert | null> {
    try {
      return this.alertModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    } catch (error) {
      this.logger.error(`Error updating alert:`, error);
      return null;
    }
  }

  async remove(id: string): Promise<Alert | null> {
    try {
      return this.alertModel.findByIdAndDelete(id).exec();
    } catch (error) {
      this.logger.error(`Error deleting alert:`, error);
      return null;
    }
  }

  // Method to check threshold crossing
  async checkThresholdCrossing(userId: string, currentNav: number): Promise<Alert[]> {
    try {
      const userAlerts = await this.findByUserId(userId);
      const triggeredAlerts: Alert[] = [];

      for (const alert of userAlerts) {
        const isCrossed = alert.direction === 'above' 
          ? currentNav > alert.thresholdValue
          : currentNav < alert.thresholdValue;

        const wasTriggered = alert.lastState === 'triggered';

        if (isCrossed && !wasTriggered) {
          // First time crossing - trigger alert
          await this.update(alert._id.toString(), { lastState: 'triggered' });
          triggeredAlerts.push(alert);
          this.logger.log(`🚨 Alert triggered for user ${userId}: ${alert.direction} threshold ${alert.thresholdValue}`);
        } else if (!isCrossed && wasTriggered) {
          // Reset alert state when no longer crossed
          await this.update(alert._id.toString(), { lastState: 'active' });
        }
      }

      return triggeredAlerts;
    } catch (error) {
      this.logger.error(`Error checking threshold crossing:`, error);
      return [];
    }
  }
}
