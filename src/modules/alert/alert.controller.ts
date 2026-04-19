import { Controller, Post, Get, Param, NotFoundException, Body } from '@nestjs/common';
import { UserId } from '../utils/user-id.decorator';
import { AlertService } from './alert.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Post()
  async createAlert(@UserId() userId: string, @Body() createAlertDto: CreateAlertDto) {
    try {
      const alert = await this.alertService.create(createAlertDto, userId);
      return {
        message: 'Alert created successfully',
        alert,
      };
    } catch (error) {
      throw new NotFoundException('Failed to create alert');
    }
  }

  @Get(':userId')
  async getUserAlerts(@UserId() userId: string) {
    try {
      const alerts = await this.alertService.findByUserId(userId);
      return {
        userId,
        alerts,
        count: alerts.length,
      };
    } catch (error) {
      throw new NotFoundException('Failed to retrieve alerts');
    }
  }
}
