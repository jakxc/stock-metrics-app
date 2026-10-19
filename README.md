# 📈 Stock Tracker App

A modern stock tracking application built with Next.js, Firebase, and real-time WebSocket integration for live stock price updates.

## ✨ Features

- **🔍 Stock Search**: Search for any US stock by symbol
- **📊 Financial Data**: View key metrics (EPS, Dividend, P/E Ratio, Growth)  
- **👤 User Authentication**: Firebase Auth with email/password
- **💾 Save Watchlists**: Save and manage your favorite stocks
- **⚡ Real-time Updates**: Live stock price feeds with WebSocket
- **🎨 Visual Indicators**: Price change animations and status indicators
- **📱 Responsive Design**: Works on desktop and mobile
- **🌙 Dark Mode Support**: Toggle between light and dark themes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase project (for authentication and database)
- Optional: Finnhub API key for real stock data

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd stocksapp
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env.local` and fill in your Firebase configuration:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
   # ... other Firebase config

   # WebSocket Configuration (already configured for local development)
   NEXT_PUBLIC_STOCK_WS_URL="ws://localhost:8080"

   # Optional: Real-time stock data
   FINNHUB_API_KEY="your_finnhub_api_key"  # Get free key at https://finnhub.io/
   ```

3. **Start the development servers**:
   ```bash
   # Start both WebSocket server and Next.js app
   npm run dev:all
   ```

   Or run separately:
   ```bash
   # Terminal 1: WebSocket server
   npm run websocket

   # Terminal 2: Next.js app  
   npm run dev
   ```

4. **Open your browser**:
   - App: http://localhost:3000
   - WebSocket Status: http://localhost:3001

## 🏗️ Architecture

### Frontend (Next.js)
- **App Router**: Uses Next.js 16.3.4 app directory structure
- **React Components**: TypeScript components with Tailwind CSS
- **Real-time Integration**: WebSocket client for live price updates
- **Authentication**: Firebase Auth integration
- **Database**: Firestore for saving user watchlists

### Backend Services
- **Stock API**: Alpha Vantage API for fundamental data
- **WebSocket Server**: Custom Node.js server for real-time prices
- **Health Monitoring**: HTTP endpoints for server monitoring

### Data Flow
```
User → Next.js App → Stock API (Alpha Vantage)
  ↓
Firebase (Auth + Firestore) 
  ↓  
WebSocket Server → Finnhub API → Real-time Updates
```

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run websocket` | Start WebSocket server for live prices |
| `npm run dev:all` | Start both servers concurrently |
| `npm run test:websocket` | Test WebSocket connectivity |
| `npm run build` | Build for production |
| `npm run start` | Start production server |

## 🔌 WebSocket Integration

The app includes a custom WebSocket server that provides real-time stock price updates:

### Features
- ✅ Real-time price feeds for saved stocks
- ✅ Automatic subscription management  
- ✅ Visual price change indicators
- ✅ Connection status monitoring
- ✅ Graceful error handling and reconnection
- ✅ Mock data fallback

### Configuration

The WebSocket integration is configured via environment variables:

```env
# WebSocket server URL (required)
NEXT_PUBLIC_STOCK_WS_URL="ws://localhost:8080"

# Optional: Finnhub API key for real stock data
FINNHUB_API_KEY="your_api_key_here"

# Server ports
WS_PORT=8080
HEALTH_PORT=3001
```

### Usage

1. **Start the WebSocket server**: `npm run websocket`
2. **Users log in and save stocks** - automatically subscribes to price feeds
3. **Live prices appear** in the saved stocks table with change indicators
4. **Connection status** is shown with a live indicator pill

For detailed setup instructions, see [WEBSOCKET_SETUP.md](./WEBSOCKET_SETUP.md).

## 🔧 API Endpoints

### Stock Data API
- `GET /api/stock/[symbol]` - Get stock financial data

### WebSocket Server
- `ws://localhost:8080` - WebSocket connection for live prices
- `http://localhost:3001/health` - Health check endpoint
- `http://localhost:3001/status` - Server status and statistics
- `http://localhost:3001/` - Status dashboard

## 🛠️ Development

### Project Structure
```
stocksapp/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── (auth)/           # Auth-related pages
├── lib/                   # Utilities and configuration
│   ├── firebase.ts       # Firebase config
│   ├── websocket-server.js # WebSocket server
│   └── http-server.js    # Health check server
├── scripts/              # Utility scripts
└── contexts/             # React contexts
```

### Key Components
- **StockSearch**: Main component with search, display, and WebSocket integration
- **Navigation**: Auth-aware navigation with login/logout
- **AuthContext**: Firebase authentication context provider

### WebSocket Message Protocol

**Client → Server:**
```json
{"type": "subscribe", "symbol": "AAPL"}
{"type": "unsubscribe", "symbol": "AAPL"}
```

**Server → Client:**
```json
{
  "type": "price_update",
  "symbol": "AAPL", 
  "price": 175.50,
  "change": 2.30,
  "changePct": 1.33
}
```

## 🚢 Deployment

### Option 1: Vercel (Next.js App) + Separate WebSocket Server

1. **Deploy Next.js to Vercel**:
   ```bash
   npm run build
   # Deploy to Vercel via their CLI or GitHub integration
   ```

2. **Deploy WebSocket server** to Heroku/Railway/DigitalOcean:
   ```bash
   # Update NEXT_PUBLIC_STOCK_WS_URL to your deployed WebSocket server
   NEXT_PUBLIC_STOCK_WS_URL="wss://your-websocket-server.herokuapp.com"
   ```

### Option 2: Full Stack Deployment

Deploy both services together on platforms like:
- Railway
- DigitalOcean App Platform  
- Heroku
- AWS/GCP

### Environment Variables for Production

```env
# Production WebSocket URL (use wss:// for SSL)
NEXT_PUBLIC_STOCK_WS_URL="wss://your-websocket-server.com"

# Real-time data API key  
FINNHUB_API_KEY="your_production_api_key"

# Firebase production config
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_prod_project"
# ... other Firebase production config
```

## 🧪 Testing

### Test WebSocket Connection
```bash
npm run test:websocket
```

### Manual Testing
1. Start servers: `npm run dev:all`
2. Open browser: http://localhost:3000
3. Register/login with test account
4. Search and save a stock (e.g., "AAPL")
5. Watch for live price updates in the table

### Health Monitoring
- Health check: `curl http://localhost:3001/health`
- Server stats: `curl http://localhost:3001/status`
- Dashboard: http://localhost:3001/

## 📚 Technologies Used

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, WebSocket (ws), Express-style HTTP server
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **APIs**: Alpha Vantage (stock data), Finnhub (real-time prices)
- **Development**: ESLint, Concurrently

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`  
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

**WebSocket not connecting:**
- Ensure WebSocket server is running: `npm run websocket`
- Check that `NEXT_PUBLIC_STOCK_WS_URL` is correct
- Verify no firewall blocking port 8080

**No live prices showing:**
- Must be logged in and have saved stocks
- Check browser console for WebSocket errors
- Verify connection status indicator

**API rate limits:**
- Demo API key has limited requests
- Get free Alpha Vantage API key
- App automatically falls back to mock data

### Getting Help

- Check the [WebSocket Setup Guide](./WEBSOCKET_SETUP.md)
- Review server logs for error messages
- Test connectivity with `npm run test:websocket`
- Open an issue for bugs or questions

---

**Happy Stock Tracking! 📈✨**