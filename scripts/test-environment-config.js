#!/usr/bin/env node

/**
 * Test script to verify environment-based configuration
 */

// Simulate different environments
const testEnvironments = [
  {
    name: 'Development (default)',
    env: { NODE_ENV: 'development' }
  },
  {
    name: 'Production (normal)',
    env: { NODE_ENV: 'production', FORCE_MOCK_DATA: 'false' }
  },
  {
    name: 'Production (forced mock)',
    env: { NODE_ENV: 'production', FORCE_MOCK_DATA: 'true' }
  },
  {
    name: 'Test environment',
    env: { NODE_ENV: 'test' }
  }
];

async function testEnvironmentConfig() {
  console.log('🧪 Testing Environment Configuration\n');

  for (const testCase of testEnvironments) {
    console.log(`📋 Testing: ${testCase.name}`);

    // Set environment variables
    const originalEnv = {};
    for (const [key, value] of Object.entries(testCase.env)) {
      originalEnv[key] = process.env[key];
      process.env[key] = value;
    }

    try {
      // Clear module cache to get fresh imports
      delete require.cache[require.resolve('../lib/environment.ts')];

      // Import and test the configuration
      const {
        getCurrentEnvironment,
        isDevelopment,
        isProduction,
        shouldUseMockData,
        getEnvironmentConfig
      } = require('../lib/environment.ts');

      const config = getEnvironmentConfig();

      console.log(`   Environment: ${getCurrentEnvironment()}`);
      console.log(`   Is Development: ${isDevelopment()}`);
      console.log(`   Is Production: ${isProduction()}`);
      console.log(`   Use Mock Data: ${shouldUseMockData()}`);
      console.log(`   Expected Behavior: ${shouldUseMockData() ? '🔧 Mock Data' : '🌐 Real API'}`);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } finally {
      // Restore original environment
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }

    console.log('');
  }

  console.log('✅ Environment configuration test completed!');
  console.log('\n📚 Summary:');
  console.log('   • Development: Always uses mock data');
  console.log('   • Production: Uses real API (unless FORCE_MOCK_DATA=true)');
  console.log('   • Test: Uses mock data');
  console.log('   • FORCE_MOCK_DATA=true: Forces mock data in any environment');
}

// Run the test
testEnvironmentConfig().catch(console.error);