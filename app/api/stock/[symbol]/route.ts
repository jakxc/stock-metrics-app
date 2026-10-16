import { NextResponse } from 'next/server';
import axios from 'axios';
import { shouldUseMockData, getEnvironmentConfig, isDevelopment } from '@/lib/environment';

// Using Alpha Vantage API (free tier available)
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';
const REQUEST_TIMEOUT_MS = 8000;

interface StockData {
  symbol: string;
  companyName: string;
  earningsPerShare: number | null;
  dividendPerShare: number | null;
  peRatio: number | null;
  earningsGrowth: number | null;
}

interface AnnualEarning {
  fiscalDateEnding: string;
  reportedEPS: string;
}

// Mock data for common stocks when API is rate limited
const MOCK_DATA: Record<string, StockData> = {
  'AAPL': {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    earningsPerShare: 6.16,
    dividendPerShare: 0.96,
    peRatio: 30.52,
    earningsGrowth: 2.45,
  },
  'GOOGL': {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    earningsPerShare: 5.80,
    dividendPerShare: 0,
    peRatio: 26.95,
    earningsGrowth: 18.73,
  },
  'MSFT': {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    earningsPerShare: 11.86,
    dividendPerShare: 3.00,
    peRatio: 36.85,
    earningsGrowth: 9.52,
  },
  'IBM': {
    symbol: 'IBM',
    companyName: 'International Business Machines',
    earningsPerShare: 11.25,
    dividendPerShare: 6.73,
    peRatio: 20.88,
    earningsGrowth: 7.48,
  },
};

// Alpha Vantage returns 200 OK with a Note/Information field instead of a real
// HTTP error status when the key is rate limited or invalid.
function isRateLimitedResponse(data: any): boolean {
  return Boolean(data?.Note || data?.Information);
}

function mockResponse(upperSymbol: string, message: string) {
  return NextResponse.json({
    ...MOCK_DATA[upperSymbol],
    mockData: true,
    message,
  });
}

// Most recent two complete fiscal years' EPS, sorted descending by date.
function calculateEarningsGrowth(earnings: any): number | null {
  if (isRateLimitedResponse(earnings)) return null;

  const annualEarnings: AnnualEarning[] | undefined = earnings?.annualEarnings;
  if (!annualEarnings || annualEarnings.length < 2) return null;

  const sorted = [...annualEarnings].sort(
    (a, b) => new Date(b.fiscalDateEnding).getTime() - new Date(a.fiscalDateEnding).getTime()
  );

  const currentYearEPS = parseFloat(sorted[0].reportedEPS);
  const previousYearEPS = parseFloat(sorted[1].reportedEPS);

  if (isNaN(currentYearEPS) || isNaN(previousYearEPS) || previousYearEPS === 0) {
    return null;
  }

  return ((currentYearEPS - previousYearEPS) / Math.abs(previousYearEPS)) * 100;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  const config = getEnvironmentConfig();

  // In development or when forced, return mock data immediately
  if (shouldUseMockData()) {
    console.log(`[${config.environment.toUpperCase()}] Using mock data for ${upperSymbol}`);

    if (MOCK_DATA[upperSymbol]) {
      return NextResponse.json({
        ...MOCK_DATA[upperSymbol],
        mockData: true,
        ...config,
        message: isDevelopment()
          ? 'Using mock data in development environment'
          : 'Mock data forced via environment configuration',
      });
    }

    return NextResponse.json(
      {
        error: `Mock data not available for symbol: ${upperSymbol}`,
        availableSymbols: Object.keys(MOCK_DATA),
        mockData: true,
        ...config
      },
      { status: 404 }
    );
  }

  console.log(`[${config.environment.toUpperCase()}] Fetching real data for ${upperSymbol} using API key: ${API_KEY === 'demo' ? 'DEMO' : 'CUSTOM'}`);

  try {
    // Overview and earnings are independent — fetch in parallel instead of
    // sequentially to roughly halve latency. allSettled (not all) so a
    // failure on one call doesn't discard a successful result from the other.
    const [overviewResult, earningsResult] = await Promise.allSettled([
      axios.get(BASE_URL, {
        params: { function: 'OVERVIEW', symbol: upperSymbol, apikey: API_KEY },
        timeout: REQUEST_TIMEOUT_MS,
      }),
      axios.get(BASE_URL, {
        params: { function: 'EARNINGS', symbol: upperSymbol, apikey: API_KEY },
        timeout: REQUEST_TIMEOUT_MS,
      }),
    ]);

    if (overviewResult.status === 'rejected') {
      console.error('Error fetching stock overview:', overviewResult.reason?.message || overviewResult.reason);

      if (MOCK_DATA[upperSymbol]) {
        return mockResponse(upperSymbol, 'Using sample data due to an API error. Get a free API key at https://www.alphavantage.co/support/#api-key');
      }

      return NextResponse.json(
        { error: 'Failed to fetch stock data' },
        { status: 500 }
      );
    }

    const overview = overviewResult.value.data;

    if (isRateLimitedResponse(overview)) {
      if (MOCK_DATA[upperSymbol]) {
        return mockResponse(upperSymbol, 'Using sample data due to API rate limit. Get a free API key at https://www.alphavantage.co/support/#api-key');
      }

      return NextResponse.json(
        { error: 'API rate limit reached. Please try again later or use your own API key.' },
        { status: 429 }
      );
    }

    if (!overview.Symbol) {
      return NextResponse.json(
        { error: 'Stock symbol not found' },
        { status: 404 }
      );
    }

    // Earnings call is best-effort: if it failed or was rate limited, we
    // still return the overview data with earningsGrowth as null.
    const earnings = earningsResult.status === 'fulfilled' ? earningsResult.value.data : null;
    if (earningsResult.status === 'rejected') {
      console.warn('Error fetching earnings data:', earningsResult.reason?.message || earningsResult.reason);
    }

    const stockData: StockData = {
      symbol: overview.Symbol,
      companyName: overview.Name,
      earningsPerShare: overview.EPS ? parseFloat(overview.EPS) : null,
      dividendPerShare: overview.DividendPerShare ? parseFloat(overview.DividendPerShare) : null,
      peRatio: overview.PERatio && overview.PERatio !== 'None' ? parseFloat(overview.PERatio) : null,
      earningsGrowth: calculateEarningsGrowth(earnings),
    };

    return NextResponse.json(stockData);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
