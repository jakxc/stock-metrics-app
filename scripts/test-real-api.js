#!/usr/bin/env node

/**
 * Test script to verify that real API calls are working
 * This will make actual API calls to test the configuration
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testRealApiCall() {
  console.log('Testing Real API Calls\n');

  // Test the local stock API endpoint
  const testSymbol = 'AAPL';
  const apiUrl = `http://localhost:3000/api/stock/${testSymbol}`;

  console.log(`Testing: ${apiUrl}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`USE_REAL_API: ${process.env.USE_REAL_API}`);

  try {
    console.log('\n Making API call...');
    const response = await axios.get(apiUrl, {
      timeout: 30000 // 30 second timeout
    });

    console.log('API Response received!');
    console.log('\nResponse Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Check if it's mock or real data
    if (response.data.mockData) {
      console.log('\nStill receiving mock data. Check your configuration.');
    } else {
      console.log('\nSuccess! Receiving real API data.');
    }

  } catch (error) {
    console.error('Error making API call:');

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else if (error.request) {
      console.error('No response received - is the development server running?');
      console.error('Start the server with: npm run dev');
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testAlphaVantageDirectly() {
  console.log('\n🔗 Testing Alpha Vantage API directly\n');

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey || apiKey === 'demo') {
    console.log('Using demo API key - limited to 25 requests per day');
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`;

  try {
    console.log('📡 Making direct Alpha Vantage API call...');
    const response = await axios.get(url, { timeout: 10000 });

    console.log('✅ Direct API Response received!');
    console.log('\n📊 Alpha Vantage Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.Note || response.data.Information) {
      console.log('\nAPI rate limit or other issue detected');
    } else {
      console.log('\nDirect Alpha Vantage API working correctly!');
    }

  } catch (error) {
    console.error('Error with direct Alpha Vantage API call:');
    console.error('Error:', error.message);
  }
}

async function runTests() {
  console.log('Real API Test Suite\n');
  console.log('This will test both your local API endpoint and the external Alpha Vantage API\n');

  await testRealApiCall();
  console.log('\n' + '='.repeat(50) + '\n');
  await testAlphaVantageDirectly();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testRealApiCall, testAlphaVantageDirectly };