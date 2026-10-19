const WebSocket = require('ws');
const HealthCheckServer = require('./http-server');

class StockWebSocketServer {
  constructor(port = 8080, healthPort = 3001) {
    this.port = port;
    this.healthPort = healthPort;
    this.wss = null;
    this.clients = new Set();
    this.healthServer = new HealthCheckServer(healthPort);
    this.subscribedSymbols = new Set();
    this.finnhubWs = null;
    this.stockPrices = new Map(); // Cache current prices
    this.intervals = new Map(); // Store intervals for each symbol

    // Finnhub API key - you can get a free one at https://finnhub.io/
    this.finnhubApiKey = process.env.FINNHUB_API_KEY || 'demo';
    this.finnhubWsUrl = `wss://ws.finnhub.io?token=${this.finnhubApiKey}`;

    // Fallback mock data for demo purposes
    this.mockPrices = {
      'AAPL': 175.50,
      'GOOGL': 142.80,
      'MSFT': 378.90,
      'TSLA': 248.20,
      'NVDA': 875.30,
      'AMZN': 155.40,
      'META': 488.60,
      'IBM': 195.80
    };
  }

  start() {
    // Create WebSocket server
    this.wss = new WebSocket.Server({ port: this.port });
    console.log(`Stock WebSocket server started on port ${this.port}`);

    // Start health check server
    this.healthServer.start(this);

    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      this.clients.add(ws);

      // Send current prices to new client
      for (const [symbol, data] of this.stockPrices) {
        ws.send(JSON.stringify({
          type: 'price_update',
          symbol,
          ...data
        }));
      }

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(data);
        } catch (error) {
          console.error('Invalid message format:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);

        // If no clients, we can stop some processing
        if (this.clients.size === 0) {
          this.stopAllMockUpdates();
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Try to connect to Finnhub for real data
    this.connectToFinnhub();
  }

  connectToFinnhub() {
    if (this.finnhubApiKey === 'demo') {
      console.log('Using demo/mock data. Get a free Finnhub API key at https://finnhub.io/');
      return;
    }

    try {
      this.finnhubWs = new WebSocket(this.finnhubWsUrl);

      this.finnhubWs.on('open', () => {
        console.log('Connected to Finnhub WebSocket');
        // Subscribe to all currently tracked symbols
        for (const symbol of this.subscribedSymbols) {
          this.subscribeTo(symbol);
        }
      });

      this.finnhubWs.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'trade') {
            this.handleFinnhubTradeData(message.data);
          }
        } catch (error) {
          console.error('Error parsing Finnhub message:', error);
        }
      });

      this.finnhubWs.on('error', (error) => {
        console.error('Finnhub WebSocket error:', error);
        this.finnhubWs = null;
      });

      this.finnhubWs.on('close', () => {
        console.log('Finnhub WebSocket closed');
        this.finnhubWs = null;
        // Try to reconnect after 5 seconds
        setTimeout(() => this.connectToFinnhub(), 5000);
      });
    } catch (error) {
      console.error('Failed to connect to Finnhub:', error);
    }
  }

  handleClientMessage(message) {
    const { type, symbol } = message;

    switch (type) {
      case 'subscribe':
        this.subscribeToSymbol(symbol);
        break;
      case 'unsubscribe':
        this.unsubscribeFromSymbol(symbol);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }

  subscribeToSymbol(symbol) {
    if (!symbol || this.subscribedSymbols.has(symbol)) return;

    console.log(`Subscribing to ${symbol}`);
    this.subscribedSymbols.add(symbol);

    // If connected to Finnhub, subscribe there
    if (this.finnhubWs && this.finnhubWs.readyState === WebSocket.OPEN) {
      this.subscribeTo(symbol);
    } else {
      // Use mock data
      this.startMockUpdatesFor(symbol);
    }
  }

  unsubscribeFromSymbol(symbol) {
    if (!this.subscribedSymbols.has(symbol)) return;

    console.log(`Unsubscribing from ${symbol}`);
    this.subscribedSymbols.delete(symbol);

    // Unsubscribe from Finnhub
    if (this.finnhubWs && this.finnhubWs.readyState === WebSocket.OPEN) {
      this.finnhubWs.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }

    // Stop mock updates
    if (this.intervals.has(symbol)) {
      clearInterval(this.intervals.get(symbol));
      this.intervals.delete(symbol);
    }

    // Remove from cache
    this.stockPrices.delete(symbol);
  }

  subscribeTo(symbol) {
    if (this.finnhubWs && this.finnhubWs.readyState === WebSocket.OPEN) {
      this.finnhubWs.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  startMockUpdatesFor(symbol) {
    if (this.intervals.has(symbol)) return;

    // Initialize with base price
    let basePrice = this.mockPrices[symbol] || 100;
    let openPrice = basePrice;
    let currentPrice = basePrice;

    // Update every 2-5 seconds with realistic price movements
    const interval = setInterval(() => {
      // Generate realistic price movement (-0.5% to +0.5%)
      const changePercent = (Math.random() - 0.5) * 1.0; // -0.5% to +0.5%
      const priceChange = currentPrice * (changePercent / 100);
      currentPrice = Math.max(0.01, currentPrice + priceChange);

      // Calculate change from open
      const absoluteChange = currentPrice - openPrice;
      const percentChange = (absoluteChange / openPrice) * 100;

      const priceData = {
        price: Math.round(currentPrice * 100) / 100, // Round to 2 decimals
        change: Math.round(absoluteChange * 100) / 100,
        changePct: Math.round(percentChange * 100) / 100
      };

      // Cache the price
      this.stockPrices.set(symbol, priceData);

      // Broadcast to all clients
      this.broadcast({
        type: 'price_update',
        symbol,
        ...priceData
      });
    }, 2000 + Math.random() * 3000); // Random interval 2-5 seconds

    this.intervals.set(symbol, interval);
  }

  handleFinnhubTradeData(trades) {
    for (const trade of trades) {
      const symbol = trade.s;
      const price = trade.p;

      if (!this.subscribedSymbols.has(symbol)) continue;

      // Get previous price for change calculation
      const cached = this.stockPrices.get(symbol);
      const openPrice = cached?.openPrice || price;

      const absoluteChange = price - openPrice;
      const percentChange = (absoluteChange / openPrice) * 100;

      const priceData = {
        price: Math.round(price * 100) / 100,
        change: Math.round(absoluteChange * 100) / 100,
        changePct: Math.round(percentChange * 100) / 100,
        openPrice
      };

      this.stockPrices.set(symbol, priceData);

      // Broadcast to clients
      this.broadcast({
        type: 'price_update',
        symbol,
        price: priceData.price,
        change: priceData.change,
        changePct: priceData.changePct
      });
    }
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  stopAllMockUpdates() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  stop() {
    console.log('Stopping WebSocket server...');

    // Close Finnhub connection
    if (this.finnhubWs) {
      this.finnhubWs.close();
    }

    // Stop all mock updates
    this.stopAllMockUpdates();

    // Stop health check server
    if (this.healthServer) {
      this.healthServer.stop();
    }

    // Close all client connections
    this.clients.forEach(client => {
      client.close();
    });

    // Close the server
    if (this.wss) {
      this.wss.close(() => {
        console.log('WebSocket server stopped');
      });
    }
  }
}

// Start server if run directly
if (require.main === module) {
  const port = process.env.WS_PORT || 8080;
  const server = new StockWebSocketServer(port);
  server.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    server.stop();
    process.exit(0);
  });
}

module.exports = StockWebSocketServer;