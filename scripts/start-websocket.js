#!/usr/bin/env node

const StockWebSocketServer = require('../lib/websocket-server');

// Configuration
const PORT = process.env.WS_PORT || 8080;
const HEALTH_PORT = process.env.HEALTH_PORT || 3001;

console.log('Starting Stock WebSocket Server...');
console.log(`Server will run on port ${PORT}`);
console.log(`Connect your client to: ws://localhost:${PORT}`);

if (process.env.FINNHUB_API_KEY) {
  console.log('Using Finnhub API for real-time data');
} else {
  console.log('Using mock data (set FINNHUB_API_KEY for real data)');
  console.log('Get a free API key at: https://finnhub.io/');
}

// Create and start server
const server = new StockWebSocketServer(PORT, HEALTH_PORT);
server.start();

console.log('\n📈 WebSocket server is ready!');
console.log('   - Clients can subscribe to stock symbols');
console.log('   - Real-time price updates will be broadcast');
console.log(`   - Health check: http://localhost:${HEALTH_PORT}/health`);
console.log(`   - Status page: http://localhost:${HEALTH_PORT}/`);
console.log('   - Press Ctrl+C to stop\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  server.stop();
  setTimeout(() => {
    console.log('Server stopped');
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  server.stop();
  process.exit(0);
});