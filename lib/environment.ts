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
  return (
    isDevelopment() ||
    process.env.FORCE_MOCK_DATA === 'true' ||
    process.env.USE_MOCK_DATA === 'true'
  );
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    environment: getCurrentEnvironment(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: isTest(),
    useMockData: shouldUseMockData(),
    apiKey: process.env.ALPHA_VANTAGE_API_KEY,
    hasValidApiKey: Boolean(process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo'),
  };
}