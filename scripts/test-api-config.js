#!/usr/bin/env node

/**
 * Test script to verify API configuration
 * Run this to check if your environment is set up correctly for real API calls
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Import the environment configuration
const { getEnvironmentConfig } = require('../lib/environment.ts');

function testApiConfiguration() {
  console.log('Testing API Configuration\n');

  const config = getEnvironmentConfig();

  console.log(`Environment: ${config.environment}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`USE_REAL_API: ${process.env.USE_REAL_API || 'undefined'}`);
  console.log(`FORCE_MOCK_DATA: ${process.env.FORCE_MOCK_DATA || 'undefined'}`);
  console.log(`ALPHA_VANTAGE_API_KEY: ${process.env.ALPHA_VANTAGE_API_KEY ? (process.env.ALPHA_VANTAGE_API_KEY === 'demo' ? 'demo' : 'set') : 'not set'}`);
  console.log(`FINNHUB_API_KEY: ${process.env.FINNHUB_API_KEY ? (process.env.FINNHUB_API_KEY === 'demo' ? 'demo' : 'set') : 'not set'}`);

  console.log('\n📊 Configuration Analysis:');
  console.log(`Will use mock data: ${config.useMockData ? 'YES' : 'NO'}`);
  console.log(`Has valid Alpha Vantage key: ${config.hasValidApiKey ? 'YES' : 'NO'}`);
  console.log(`Can use real REST API data: ${config.canUseRealData ? 'YES' : 'NO'}`);

  const finnhubValid = process.env.FINNHUB_API_KEY && process.env.FINNHUB_API_KEY !== 'demo';
  console.log(`Can use real WebSocket data: ${finnhubValid ? 'YES' : 'NO'}`);

  console.log('\n💡 Recommendations:');

  if (config.useMockData && process.env.USE_REAL_API !== 'true') {
    console.log('• To use real APIs in development, set USE_REAL_API=true in your .env.local file');
  }

  if (!config.hasValidApiKey) {
    console.log('• Get a free Alpha Vantage API key at: https://www.alphavantage.co/support/#api-key');
    console.log('• Update ALPHA_VANTAGE_API_KEY in your .env.local file');
  }

  if (!finnhubValid) {
    console.log('• Get a free Finnhub API key at: https://finnhub.io/');
    console.log('• Update FINNHUB_API_KEY in your .env.local file for real-time data');
  }

  if (config.canUseRealData && finnhubValid) {
    console.log('🎉 Configuration looks good! You can use real API data.');
  }

  console.log('\n📝 Current .env.local settings for API testing:');
  console.log('USE_REAL_API=true');
  console.log('FORCE_MOCK_DATA=false');
  console.log(`ALPHA_VANTAGE_API_KEY=${process.env.ALPHA_VANTAGE_API_KEY || 'your_api_key_here'}`);
  console.log(`FINNHUB_API_KEY=${process.env.FINNHUB_API_KEY || 'your_finnhub_api_key_here'}`);
}

if (require.main === module) {
  testApiConfiguration();
}

module.exports = testApiConfiguration;