import { Controller, Get, NotFoundException, Res, Query } from '@nestjs/common';
import { UserId } from '../utils/user-id.decorator';
import { NavService } from './nav.service';
import { AlertService } from '../alert/alert.service';

@Controller('nav')
export class NavController {
  constructor(
    private readonly navService: NavService,
    private readonly alertService: AlertService,
  ) {}

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

  @Get('history')
  async getNavHistory(@UserId() userId: string, @Query('limit') limit?: number) {
    try {
      const history = await this.navService.getNavHistory(userId, limit || 100);
      return {
        userId,
        history,
        count: history.length,
      };
    } catch (error) {
      throw new NotFoundException('Failed to retrieve NAV history');
    }
  }

  @Get('stream/:userId')
  async streamNavUpdates(@UserId() userId: string, @Res() res: any) {
    try {
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Get initial NAV and send it
      const initialNav = await this.navService.getLatestNav(userId);
      if (initialNav !== null) {
        res.write(`data: ${JSON.stringify({ type: 'nav', userId, nav: initialNav, timestamp: new Date() })}\n\n`);
      }

      // Subscribe to NAV updates
      const navSubscription = this.navService.getNavUpdates().subscribe({
        next: (navUpdate) => {
          if (navUpdate.userId === userId) {
            res.write(`data: ${JSON.stringify(navUpdate)}\n\n`);
          }
        },
        error: (error) => {
          console.error('SSE error:', error);
        },
        complete: () => {
          console.log('SSE stream completed');
        },
      });

      // Handle client disconnect
      res.on('close', () => {
        console.log(`SSE client disconnected for user ${userId}`);
        navSubscription.unsubscribe();
      });

      // Handle connection errors
      res.on('error', (error) => {
        console.error('SSE connection error:', error);
        navSubscription.unsubscribe();
      });

    } catch (error) {
      console.error('Error setting up SSE stream:', error);
      res.status(500).json({ error: 'Failed to establish stream' });
    }
  }
}
