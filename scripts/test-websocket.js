#!/usr/bin/env node

const WebSocket = require('ws');

// Configuration
const WS_URL = process.env.NEXT_PUBLIC_STOCK_WS_URL || 'ws://localhost:8080';
const TEST_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT'];

console.log('🧪 Testing WebSocket Connection...');
console.log(`🔗 Connecting to: ${WS_URL}`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');

  // Subscribe to test symbols
  TEST_SYMBOLS.forEach(symbol => {
    console.log(`📈 Subscribing to ${symbol}`);
    ws.send(JSON.stringify({
      type: 'subscribe',
      symbol: symbol
    }));
  });

  // Test for 30 seconds then disconnect
  setTimeout(() => {
    console.log('\n⏰ Test completed, unsubscribing...');

    TEST_SYMBOLS.forEach(symbol => {
      ws.send(JSON.stringify({
        type: 'unsubscribe',
        symbol: symbol
      }));
    });

    setTimeout(() => {
      ws.close();
    }, 1000);
  }, 30000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    if (message.type === 'price_update') {
      const { symbol, price, change, changePct } = message;
      const direction = changePct >= 0 ? '🟢' : '🔴';
      const changeStr = changePct >= 0 ? `+${changePct}%` : `${changePct}%`;

      console.log(`${direction} ${symbol}: $${price} (${changeStr})`);
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('close', () => {
  console.log('🔌 Disconnected from WebSocket server');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.log('\n💡 Make sure the WebSocket server is running:');
  console.log('   npm run websocket');
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted, closing connection...');
  ws.close();
});