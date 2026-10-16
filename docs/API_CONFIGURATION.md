# API Configuration Guide

This guide explains how to configure the stock app to use real API data versus mock data in different environments.

## Overview

The app has two main data sources:
1. **REST API** - Stock fundamentals (EPS, P/E ratio, etc.) via Alpha Vantage
2. **WebSocket** - Real-time price updates via Finnhub

## Environment Variables

### Core API Configuration

```bash
# Use real APIs in development (default: false)
USE_REAL_API=true

# Force mock data even in production (default: false)
FORCE_MOCK_DATA=false

# Alpha Vantage API key for stock fundamentals
ALPHA_VANTAGE_API_KEY=your_key_here

# Finnhub API key for real-time prices
FINNHUB_API_KEY=your_key_here
```

## Configuration Scenarios

### 1. Development with Real APIs (Recommended for Testing)

```bash
USE_REAL_API=true
FORCE_MOCK_DATA=false
ALPHA_VANTAGE_API_KEY=your_actual_api_key
FINNHUB_API_KEY=your_actual_api_key
```

**Result**: Uses real API calls in development environment.

### 2. Development with Mock Data (Default)

```bash
USE_REAL_API=false
# or don't set USE_REAL_API at all
```

**Result**: Uses mock data in development (faster, no API limits).

### 3. Production with Real APIs (Default)

```bash
# Production automatically uses real APIs
ALPHA_VANTAGE_API_KEY=your_production_api_key
FINNHUB_API_KEY=your_production_api_key
```

**Result**: Uses real API calls in production.

### 4. Force Mock Data Everywhere

```bash
FORCE_MOCK_DATA=true
```

**Result**: Uses mock data in all environments (useful for demos).

## Getting API Keys

### Alpha Vantage (Stock Fundamentals)
1. Visit: https://www.alphavantage.co/support/#api-key
2. Sign up for a free account
3. Copy your API key
4. Free tier: 25 requests per day, 5 per minute

### Finnhub (Real-time Prices)
1. Visit: https://finnhub.io/
2. Sign up for a free account
3. Get your API token from the dashboard
4. Free tier: 60 calls per minute

## Testing Your Configuration

### Quick Configuration Check
```bash
npm run test:api-config
```

This shows your current environment settings and recommendations.

### Test Real API Calls
```bash
# Start the development server first
npm run dev

# Then in another terminal:
npm run test:real-api
```

This makes actual API calls to verify everything is working.

### Test WebSocket Connection
```bash
npm run test:websocket
```

## Development Commands

```bash
# Start with real APIs
npm run dev:real

# Start with mock data  
npm run dev:mock

# Start everything (Next.js + WebSocket server)
npm run dev:all
```

## Troubleshooting

### "Still getting mock data in development"
- Check that `USE_REAL_API=true` in your `.env.local`
- Verify your API keys are set and not 'demo'
- Run `npm run test:api-config` to check configuration

### "API rate limit reached"
- You're likely using the demo API key
- Get your own free API key from Alpha Vantage
- The demo key only allows 25 requests per day

### "WebSocket using mock data"
- Check that `FINNHUB_API_KEY` is set in `.env.local`
- Verify it's not set to 'demo'
- The WebSocket server logs will show if it's connected to Finnhub

### "Error: ECONNREFUSED"
- The development server isn't running
- Start it with `npm run dev`
- The API endpoints are only available when the Next.js server is running

## Configuration Logic

The app determines whether to use mock data with this logic:

1. If `FORCE_MOCK_DATA=true` → Always use mock data
2. If `USE_REAL_API=true` in development → Use real APIs
3. If in production → Use real APIs (default)
4. If in development without `USE_REAL_API=true` → Use mock data

## API Response Format

Both mock and real APIs return the same data structure:

```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "earningsPerShare": 6.16,
  "dividendPerShare": 0.96,
  "peRatio": 30.52,
  "earningsGrowth": 2.45,
  "mockData": false,
  "message": "Using real API data"
}
```

The `mockData` field indicates whether the response came from mock data (`true`) or real APIs (`false`).