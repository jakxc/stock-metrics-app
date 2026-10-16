/**
 * Environment configuration utilities
 */

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type Environment = typeof ENVIRONMENTS[keyof typeof ENVIRONMENTS];

/**
 * Get the current environment
 */
export function getCurrentEnvironment(): Environment {
  return (process.env.NODE_ENV as Environment) || ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === ENVIRONMENTS.PRODUCTION;
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return getCurrentEnvironment() === ENVIRONMENTS.TEST;
}

/**
 * Check if mock data should be used
 */
export function shouldUseMockData(): boolean {
  // Force mock data if explicitly set
  if (process.env.FORCE_MOCK_DATA === 'true' || process.env.USE_MOCK_DATA === 'true') {
    return true;
  }

  // Use real data in development if USE_REAL_API is set to true
  if (isDevelopment() && process.env.USE_REAL_API === 'true') {
    return false;
  }

  // Default to mock data in development (unless USE_REAL_API is true)
  return isDevelopment();
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const useMockData = shouldUseMockData();
  const hasValidApiKey = Boolean(process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo');

  return {
    environment: getCurrentEnvironment(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: isTest(),
    useMockData,
    useRealApi: process.env.USE_REAL_API === 'true',
    forceMockData: process.env.FORCE_MOCK_DATA === 'true',
    apiKey: process.env.ALPHA_VANTAGE_API_KEY,
    hasValidApiKey,
    canUseRealData: !useMockData && hasValidApiKey,
  };
}