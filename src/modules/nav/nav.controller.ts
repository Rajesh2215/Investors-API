import { Controller, Get, NotFoundException, Res, Query } from '@nestjs/common';
import { UserId } from '../utils/user-id.decorator';
import { NavService } from './nav.service';
import { AlertService } from '../alert/alert.service';
import { PriceService } from '../price/price.service';

@Controller('nav')
export class NavController {
  constructor(
    private readonly navService: NavService,
    private readonly alertService: AlertService,
    private readonly priceService: PriceService,
  ) {}

  @Get()
  async getLatestNav(@UserId() userId: string) {
    const nav = await this.navService.getLatestNav(userId);
    
    // if (nav === null) {
    //   throw new NotFoundException(`NAV not found for user: ${userId}`);
    // }
    
    return {
      userId,
      nav: nav || null,
      timestamp: new Date(),
    };
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
        // Get current prices for initial response
        const prices = await this.getCurrentPrices();
        res.write(`data: ${JSON.stringify({ type: 'nav', userId, nav: initialNav, prices, timestamp: new Date() })}\n\n`);
      }
      console.log('-------')
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
}
