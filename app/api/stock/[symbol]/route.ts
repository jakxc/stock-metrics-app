import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { shouldUseMockData, getEnvironmentConfig, isDevelopment } from '@/lib/environment';

// Suppress the one-time stdout survey notice yahoo-finance2 prints on first use.
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface StockData {
  symbol: string;
  companyName: string;
  earningsPerShare: number | null;
  dividendPerShare: number | null;
  peRatio: number | null;
  earningsGrowth: number | null;
}

// Mock data for common stocks when the Yahoo Finance lookup fails
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

function mockResponse(upperSymbol: string, message: string) {
  return NextResponse.json({
    ...MOCK_DATA[upperSymbol],
    mockData: true,
    message,
  });
}

// Trailing YoY EPS growth: most recent two complete fiscal years' actual
// diluted EPS, from fundamentalsTimeSeries' annual `financials` module.
// Actual-vs-actual (not an analyst estimate) — same convention as the
// previous Alpha Vantage-based calculation.
function calculateEarningsGrowth(
  annualFinancials: { date: Date; dilutedEPS?: number | null }[] | undefined
): number | null {
  if (!annualFinancials || annualFinancials.length < 2) return null;

  const sorted = [...annualFinancials].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const currentYearEPS = sorted[0].dilutedEPS;
  const previousYearEPS = sorted[1].dilutedEPS;

  if (
    currentYearEPS == null ||
    previousYearEPS == null ||
    isNaN(currentYearEPS) ||
    isNaN(previousYearEPS) ||
    previousYearEPS === 0
  ) {
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

  console.log(`[${config.environment.toUpperCase()}] Fetching real data for ${upperSymbol} via Yahoo Finance`);

  try {
    const result = await yahooFinance.quoteSummary(upperSymbol, {
      modules: ['price', 'defaultKeyStatistics', 'summaryDetail'],
    });

    const companyName = result.price?.longName || result.price?.shortName;

    if (!companyName) {
      if (MOCK_DATA[upperSymbol]) {
        return mockResponse(upperSymbol, 'Using sample data — this symbol was not found on Yahoo Finance.');
      }

      return NextResponse.json(
        { error: 'Stock symbol not found' },
        { status: 404 }
      );
    }

    const earningsPerShare = result.defaultKeyStatistics?.trailingEps ?? null;
    const dividendPerShare = result.summaryDetail?.dividendRate ?? null;
    const peRatio = result.summaryDetail?.trailingPE ?? null;

    // Annual EPS history is a separate, best-effort call: if it fails we
    // still return the rest of the stock data with earningsGrowth as null.
    let earningsGrowth: number | null = null;
    try {
      const annualFinancials = await yahooFinance.fundamentalsTimeSeries(upperSymbol, {
        period1: '2018-01-01',
        module: 'financials',
        type: 'annual',
      });
      earningsGrowth = calculateEarningsGrowth(annualFinancials);
    } catch (growthError) {
      const message = growthError instanceof Error ? growthError.message : String(growthError);
      console.warn('Error fetching annual EPS history:', message);
    }

    const stockData: StockData = {
      symbol: upperSymbol,
      companyName,
      earningsPerShare,
      dividendPerShare,
      peRatio,
      earningsGrowth,
    };

    return NextResponse.json(stockData);
  } catch (error) {
    // yahoo-finance2 throws on an unknown symbol as well as on network/HTTP errors.
    const message = error instanceof Error ? error.message : String(error);
    const isUnknownSymbol = /not found|No data found|Quote not found/i.test(message);

    if (isUnknownSymbol) {
      return NextResponse.json(
        { error: 'Stock symbol not found' },
        { status: 404 }
      );
    }

    console.error('Error fetching stock data from Yahoo Finance:', message);

    if (MOCK_DATA[upperSymbol]) {
      return mockResponse(upperSymbol, 'Using sample data due to an API error.');
    }

    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
