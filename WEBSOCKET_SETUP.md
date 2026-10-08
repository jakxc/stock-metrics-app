# WebSocket Live Stock Updates Setup

This document explains how to set up and use the live stock price WebSocket feature in your stocks app.

## Overview

The app now includes real-time stock price updates via WebSocket connection. When users save stocks to their watchlist, the app automatically subscribes to live price feeds and displays real-time price changes with visual indicators.

## Features

✅ **Real-time Price Updates**: Live price feeds for all saved stocks
✅ **Visual Indicators**: Green/red flash animations on price changes  
✅ **Connection Status**: Live indicator showing WebSocket connection status
✅ **Automatic Reconnection**: Handles connection drops gracefully
✅ **User-specific**: Only shows live prices for logged-in users' saved stocks
✅ **Mock Data Support**: Works with demo data when API limits are reached

## Quick Start

### 1. Start Both Servers

Run both the Next.js app and WebSocket server:

```bash
npm run dev:all
```

This starts:
- WebSocket server on `ws://localhost:8080`
- Next.js app on `http://localhost:3000`

### 2. Alternative: Run Separately

Start WebSocket server:
```bash
npm run websocket
```

In another terminal, start the Next.js app:
```bash
npm run dev
```

## Configuration Options

### Environment Variables

Add to your `.env.local` file:

```env
# WebSocket URL (required)
NEXT_PUBLIC_STOCK_WS_URL="ws://localhost:8080"

# Optional: Real-time data API key
FINNHUB_API_KEY="your_api_key_here"

# Optional: WebSocket server port
WS_PORT=8080
```

### Getting Real Data

1. **Sign up for free API key**: Visit [finnhub.io](https://finnhub.io/)
2. **Add to environment**: Set `FINNHUB_API_KEY` in `.env.local`
3. **Restart servers**: Run `npm run dev:all` again

Without an API key, the system uses realistic mock data.

## How It Works

### Client Side (React Component)

The `StockSearch` component:
- Connects to WebSocket server on mount
- Subscribes to symbols when stocks are saved
- Displays live prices in a dedicated column
- Shows connection status indicator
- Handles reconnections automatically

### Server Side (WebSocket Server)

The WebSocket server (`lib/websocket-server.js`):
- Connects to Finnhub for real-time data
- Falls back to mock data if API unavailable
- Manages client subscriptions
- Broadcasts price updates to all connected clients
- Handles graceful shutdowns

### Data Flow

1. User saves a stock → Client subscribes to symbol
2. Server receives subscription → Connects to data source
3. Price updates received → Broadcast to all clients
4. Client receives update → Updates UI with animation

## API Reference

### WebSocket Messages

**Client → Server:**

```json
// Subscribe to symbol
{
  "type": "subscribe",
  "symbol": "AAPL"
}

// Unsubscribe from symbol  
{
  "type": "unsubscribe",
  "symbol": "AAPL"
}
```

**Server → Client:**

```json
// Price update
{
  "type": "price_update",
  "symbol": "AAPL",
  "price": 175.50,
  "change": 2.30,
  "changePct": 1.33
}
```

## Deployment

### Production WebSocket Server

For production, you'll want to:

1. **Deploy WebSocket server** to a cloud provider (Heroku, Railway, etc.)
2. **Update WebSocket URL** in production environment:
   ```env
   NEXT_PUBLIC_STOCK_WS_URL="wss://your-websocket-server.herokuapp.com"
   ```
3. **Use SSL/TLS** (`wss://`) for secure connections
4. **Add API key** for real data in production environment

### Docker Support

Add to `Dockerfile` for the WebSocket server:

```dockerfile
# Add to existing Dockerfile
EXPOSE 8080
CMD ["node", "scripts/start-websocket.js"]
```

## Troubleshooting

### WebSocket Not Connecting

- Ensure WebSocket server is running (`npm run websocket`)
- Check console for connection errors
- Verify `NEXT_PUBLIC_STOCK_WS_URL` is correct
- Try refreshing the page

### No Live Prices Showing

- Save at least one stock to trigger subscriptions
- Check WebSocket connection status indicator
- Verify you're logged in (live prices only show for authenticated users)

### API Rate Limits

- The demo API key has limited requests
- Get your free Finnhub API key for higher limits
- Mock data is automatically used when limits are reached

## Development Tips

### Testing Subscriptions

Open browser dev tools and watch the Network tab → WS to see WebSocket messages in real-time.

### Customizing Price Updates

Modify `lib/websocket-server.js` to:
- Change update frequency
- Add more stock data points
- Integrate different data sources

### Adding More Visual Effects

Update the `LivePriceCell` component in `StockSearch.tsx` to add more animations or styling for price changes.

## Support

If you encounter issues:
1. Check the server logs for WebSocket connection errors
2. Verify environment variables are set correctly  
3. Ensure Firebase authentication is working
4. Check browser console for client-side errors