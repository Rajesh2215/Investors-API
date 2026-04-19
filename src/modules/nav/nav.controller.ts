import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { UserId } from '../utils/user-id.decorator';
import { NavService } from './nav.service';

@Controller('nav')
export class NavController {
  constructor(private readonly navService: NavService) {}

  @Get()
  async getLatestNav(@UserId() userId: string) {
    const nav = await this.navService.getLatestNav(userId);
    
    if (nav === null) {
      throw new NotFoundException(`NAV not found for user: ${userId}`);
    }
    
    return {
      userId,
      nav,
      timestamp: new Date(),
    };
  }
}
