# Project Investors Backend

A NestJS backend application for portfolio management with real-time NAV tracking.

## Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose
- **Cache**: Redis with ioredis
- **Validation**: class-validator & class-transformer
- **Configuration**: @nestjs/config

## Project Structure

```
src/
modules/
  user/          # User management
  asset/         # Asset management
  holding/       # Portfolio holdings
  alert/         # Alert system
  nav/           # Net Asset Value calculations
  price/         # Price data
  common/        # Shared utilities
  database/      # MongoDB connection
  redis/         # Redis connection
  utils/         # Helper functions
  config/        # Configuration schemas
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/project-investors
REDIS_HOST=localhost
REDIS_PORT=6379
```

4. Start development server:
```bash
npm run start:dev
```

## Features

### Real-time NAV Tracking
- **Live NAV Calculation**: Real-time portfolio value updates based on crypto price changes
- **NAV History**: Automatic snapshots every minute for historical tracking
- **Server-Sent Events**: Real-time streaming of NAV updates and alerts
- **Threshold Alerts**: Per-user alerts that trigger once when NAV crosses specified values

### Enhanced Data Responses
- **Asset Population**: All holding and trade responses include full asset details
- **Crypto Price Streaming**: NAV updates include current BTC/ETH/SOL prices
- **Alert State Management**: Clear 'active/triggered' states for proper alert lifecycle

### Alert System
- **One-time Triggering**: Alerts fire exactly once per threshold crossing
- **State Reset**: Alerts automatically reset when NAV moves back below threshold
- **Real-time Delivery**: Alerts delivered via SSE streams with market context

## API Endpoints

- `GET /health` - Health check endpoint

### User Management
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `GET /users/profile` - Get user profile

### Asset Management
- `GET /assets` - Get all assets
- `POST /assets` - Create new asset
- `GET /assets/:id` - Get specific asset

### Portfolio Holdings
- `GET /holdings` - Get user holdings (with populated asset data)
- `POST /holdings/trade` - Execute buy/sell trades (returns populated asset data)
- `GET /holdings/:id` - Get specific holding

### Alert System
- `POST /alerts` - Create threshold alert
- `GET /alerts/:userId` - Get user alerts
- `DELETE /alerts/:alertId` - Delete specific alert

### NAV Tracking
- `GET /nav` - Get latest NAV value
- `GET /nav/history` - Get NAV history snapshots
- `GET /nav/stream/:userId` - Real-time NAV streaming with Server-Sent Events
- `GET /nav/:userId` - Get user alerts (legacy endpoint)

### Price Data
- `GET /prices/latest` - Get latest crypto prices
- WebSocket: Real-time price updates from Binance

## Environment Variables

- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_DB` - Redis database number (default: 0)
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRES_IN` - JWT expiration time
- `FRONTEND_URL` - Frontend URL for CORS

## Scripts

- `npm run start:dev` - Start in development mode
- `npm run build` - Build for production
- `npm run start:prod` - Start production build
- `npm run test` - Run tests
- `npm run test:cov` - Run tests with coverage
