# Environment Configuration Guide

## Overview
The stock API endpoint automatically uses different data sources based on the environment to ensure safe development and reliable production behavior.

## Data Source Logic

### Development Environment (`NODE_ENV=development`)
- **Always uses mock data** by default
- No real API calls are made
- Faster development and testing
- No API rate limits or costs

### Production Environment (`NODE_ENV=production`)
- **Uses real API data** by default
- Makes actual calls to Alpha Vantage API
- Requires valid API key for reliable operation
- Falls back to mock data only when API fails

## Environment Variables

### Core Configuration
```bash
NODE_ENV=development|production|test
```

### Mock Data Control
```bash
# Force mock data even in production (useful for testing)
FORCE_MOCK_DATA=true|false

# Alternative flag name (same functionality)
USE_MOCK_DATA=true|false
```

### API Configuration
```bash
# Alpha Vantage API Key
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

## Usage Examples

### Development Setup
```bash
# .env.local
NODE_ENV=development
ALPHA_VANTAGE_API_KEY=demo
FORCE_MOCK_DATA=false  # Optional, dev uses mock by default
```

### Production Setup
```bash
# .env.production
NODE_ENV=production
ALPHA_VANTAGE_API_KEY=your_real_api_key_here
FORCE_MOCK_DATA=false
```

### Testing with Mock Data in Production
```bash
# Useful for staging environments
NODE_ENV=production
FORCE_MOCK_DATA=true
```

## API Response Indicators

### Mock Data Response
```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "mockData": true,
  "environment": "development",
  "message": "Using mock data in development environment"
}
```

### Real Data Response
```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "earningsPerShare": 6.16
  // No mockData field = real data
}
```

## Available Mock Symbols
- AAPL (Apple Inc.)
- GOOGL (Alphabet Inc.)
- MSFT (Microsoft Corporation)
- IBM (International Business Machines)

## Best Practices

1. **Development**: Always use mock data to avoid API limits
2. **Production**: Use real API with valid key
3. **Staging**: Consider using `FORCE_MOCK_DATA=true` for consistent testing
4. **Testing**: Use mock data to ensure predictable test results

## Troubleshooting

### Getting Real Data in Development
If you need to test real API calls in development:
```bash
FORCE_MOCK_DATA=false
NODE_ENV=development
ALPHA_VANTAGE_API_KEY=your_real_api_key
```

### Forcing Mock Data in Production
For testing production builds with mock data:
```bash
FORCE_MOCK_DATA=true
```

### API Key Issues
- Demo key has strict rate limits
- Get a free key at: https://www.alphavantage.co/support/#api-key
- Production should never use the demo key