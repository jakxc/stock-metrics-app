import { NextResponse } from 'next/server';
import axios from 'axios';

// Using Alpha Vantage API (free tier available)
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

// Mock data for common stocks when API is rate limited
const MOCK_DATA: Record<string, any> = {
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  try {
    // Fetch company overview for P/E ratio and EPS
    const overviewResponse = await axios.get(BASE_URL, {
      params: {
        function: 'OVERVIEW',
        symbol: upperSymbol,
        apikey: API_KEY,
      },
    });

    // Fetch earnings data for growth calculation
    const earningsResponse = await axios.get(BASE_URL, {
      params: {
        function: 'EARNINGS',
        symbol: upperSymbol,
        apikey: API_KEY,
      },
    });

    const overview = overviewResponse.data;
    const earnings = earningsResponse.data;

    // Check if data is valid
    if (overview.Note || overview.Information) {
      // Check if we have mock data for this symbol
      if (MOCK_DATA[upperSymbol]) {
        return NextResponse.json({
          ...MOCK_DATA[upperSymbol],
          mockData: true,
          message: 'Using sample data due to API rate limit. Get a free API key at https://www.alphavantage.co/support/#api-key',
        });
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

    // Calculate earnings growth (current year vs previous year)
    let earningsGrowth = null;

    // Check if earnings data was rate limited
    if (!earnings.Information && !earnings.Note && earnings.annualEarnings && earnings.annualEarnings.length > 0) {
      // Find the most recent two complete years of earnings
      // Sort by date descending to ensure we get the most recent years
      const sortedEarnings = [...earnings.annualEarnings].sort((a: any, b: any) => {
        return new Date(b.fiscalDateEnding).getTime() - new Date(a.fiscalDateEnding).getTime();
      });

      // Take the two most recent earnings entries
      if (sortedEarnings.length >= 2) {
        const currentYearEPS = parseFloat(sortedEarnings[0].reportedEPS);
        const previousYearEPS = parseFloat(sortedEarnings[1].reportedEPS);

        if (!isNaN(currentYearEPS) && !isNaN(previousYearEPS) && previousYearEPS !== 0) {
          earningsGrowth = ((currentYearEPS - previousYearEPS) / Math.abs(previousYearEPS)) * 100;
        }
      }
    }

    const stockData = {
      symbol: overview.Symbol,
      companyName: overview.Name,
      earningsPerShare: overview.EPS ? parseFloat(overview.EPS) : null,
      dividendPerShare: overview.DividendPerShare ? parseFloat(overview.DividendPerShare) : null,
      peRatio: overview.PERatio && overview.PERatio !== 'None' ? parseFloat(overview.PERatio) : null,
      earningsGrowth: earningsGrowth,
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