'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface StockData {
  symbol: string;
  companyName: string;
  earningsPerShare: number | null;
  dividendPerShare: number | null;
  peRatio: number | null;
  earningsGrowth: number | null;
  mockData?: boolean;
  message?: string;
}

interface SavedSearch {
  id: string;
  symbol: string;
  companyName: string;
  earningsPerShare: number | null;
  dividendPerShare: number | null;
  peRatio: number | null;
  earningsGrowth: number | null;
  savedAt: Timestamp;
}

// ── Live price state per symbol ────────────────────────────────────────────────
interface LivePrice {
  price: number;
  change: number;      // absolute change from open
  changePct: number;   // % change from open
  direction: 'up' | 'down' | 'flat';
}

// ── Webhook payload shape ──────────────────────────────────────────────────────
// Expected from your WebSocket server:
// { type: 'price_update', symbol: string, price: number, change: number, changePct: number }
interface WebhookPayload {
  type: 'price_update';
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

const WS_URL = process.env.NEXT_PUBLIC_STOCK_WS_URL ?? 'wss://your-price-feed.example.com';
const RECONNECT_DELAY_MS = 3000;
const FLASH_DURATION_MS = 1200;

export default function StockSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Live price state ─────────────────────────────────────────────────────────
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [flashSymbols, setFlashSymbols] = useState<Record<string, 'up' | 'down'>>({});
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const isDev = process.env.NODE_ENV === 'development';

  // ── Mock data ────────────────────────────────────────────────────────────────
  const MOCK_SAVED_SEARCHES: SavedSearch[] = [
    {
      id: 'mock-1',
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      earningsPerShare: 6.42,
      dividendPerShare: 0.96,
      peRatio: 28.5,
      earningsGrowth: 12.4,
      savedAt: { toDate: () => new Date('2024-01-15T10:30:00') } as any,
    },
    {
      id: 'mock-2',
      symbol: 'GOOGL',
      companyName: 'Alphabet Inc.',
      earningsPerShare: 5.8,
      dividendPerShare: null,
      peRatio: 24.1,
      earningsGrowth: -2.3,
      savedAt: { toDate: () => new Date('2024-01-14T09:00:00') } as any,
    },
  ];

  const MOCK_USER = { uid: 'dev-user-123', email: 'dev@localhost' } as User;

  // ── Flash helper — triggers a row highlight then clears it ───────────────────
  const triggerFlash = useCallback((symbol: string, direction: 'up' | 'down') => {
    // Clear any existing flash timer for this symbol
    if (flashTimersRef.current[symbol]) {
      clearTimeout(flashTimersRef.current[symbol]);
    }
    setFlashSymbols((prev) => ({ ...prev, [symbol]: direction }));
    flashTimersRef.current[symbol] = setTimeout(() => {
      setFlashSymbols((prev) => {
        const next = { ...prev };
        delete next[symbol];
        return next;
      });
    }, FLASH_DURATION_MS);
  }, []);

  // ── Apply an incoming price update ──────────────────────────────────────────
  const applyPriceUpdate = useCallback((payload: WebhookPayload) => {
    const { symbol, price, change, changePct } = payload;
    const direction: LivePrice['direction'] =
      changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';

    setLivePrices((prev) => ({
      ...prev,
      [symbol]: { price, change, changePct, direction },
    }));

    if (direction !== 'flat') triggerFlash(symbol, direction);
  }, [triggerFlash]);

  // ── Dev mode: simulate webhook messages every 2s ─────────────────────────────
  useEffect(() => {
    if (!isDev) return;
    setWsStatus('connected');

    // Seed some starting prices for mock symbols
    const BASE_PRICES: Record<string, number> = {
      AAPL: 211.45,
      GOOGL: 178.30,
    };

    const openPrices = { ...BASE_PRICES };
    const currentPrices = { ...BASE_PRICES };

    const interval = setInterval(() => {
      const symbols = Object.keys(openPrices);
      symbols.forEach((symbol) => {
        const movePct = (Math.random() - 0.48) * 0.6;
        const prev = currentPrices[symbol];
        const next = Math.max(1, parseFloat((prev * (1 + movePct / 100)).toFixed(2)));
        currentPrices[symbol] = next;
        const change = parseFloat((next - openPrices[symbol]).toFixed(2));
        const changePct = parseFloat(((change / openPrices[symbol]) * 100).toFixed(2));
        applyPriceUpdate({ type: 'price_update', symbol, price: next, change, changePct });
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isDev, applyPriceUpdate]);

  // ── Send subscribe/unsubscribe message to WebSocket ──────────────────────────
  const wsSend = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ── Connect WebSocket (production) ───────────────────────────────────────────
  const connectWs = useCallback(() => {
    if (isDev) return;
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }

    setWsStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      // Re-subscribe to all symbols we were tracking
      subscribedSymbolsRef.current.forEach((symbol) => {
        wsSend({ type: 'subscribe', symbol });
      });
    };

    ws.onmessage = (event) => {
      try {
        const payload: WebhookPayload = JSON.parse(event.data);
        if (payload.type === 'price_update') applyPriceUpdate(payload);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      // Auto-reconnect after delay
      reconnectTimerRef.current = setTimeout(connectWs, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [isDev, applyPriceUpdate, wsSend]);

  // ── Start WebSocket on mount (production only) ───────────────────────────────
  useEffect(() => {
    if (isDev) return;
    connectWs();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isDev, connectWs]);

  // ── Subscribe/unsubscribe as saved searches change ───────────────────────────
  useEffect(() => {
    if (isDev) return;

    const newSymbols = new Set(savedSearches.map((s) => s.symbol));
    const prev = subscribedSymbolsRef.current;

    // Subscribe to newly added symbols
    newSymbols.forEach((symbol) => {
      if (!prev.has(symbol)) {
        wsSend({ type: 'subscribe', symbol });
      }
    });

    // Unsubscribe from removed symbols and clear their prices
    prev.forEach((symbol) => {
      if (!newSymbols.has(symbol)) {
        wsSend({ type: 'unsubscribe', symbol });
        setLivePrices((p) => {
          const next = { ...p };
          delete next[symbol];
          return next;
        });
      }
    });

    subscribedSymbolsRef.current = newSymbols;
  }, [savedSearches, isDev, wsSend]);

  // ── Cleanup flash timers on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(flashTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // ── Auth listener ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDev) {
      setUser(MOCK_USER);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // ── Saved searches listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (isDev) {
      setSavedSearches(MOCK_SAVED_SEARCHES);
      return;
    }
    if (!user) {
      setSavedSearches([]);
      return;
    }
    const q = query(
      collection(db, 'savedSearches'),
      where('userId', '==', user.uid),
      orderBy('savedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const searches = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as SavedSearch[];
      setSavedSearches(searches);
    });
    return () => unsubscribe();
  }, [user]);

  // ── Search ───────────────────────────────────────────────────────────────────
  const searchStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setError('Please enter a stock symbol');
      return;
    }
    setLoading(true);
    setError('');
    setStockData(null);
    setSaveSuccess(false);
    try {
      const response = await axios.get(`/api/stock/${searchTerm.toUpperCase()}`);
      setStockData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !stockData) return;
    if (isDev) {
      setSavedSearches((prev) => [
        {
          id: `mock-${Date.now()}`,
          symbol: stockData.symbol,
          companyName: stockData.companyName,
          earningsPerShare: stockData.earningsPerShare,
          dividendPerShare: stockData.dividendPerShare,
          peRatio: stockData.peRatio,
          earningsGrowth: stockData.earningsGrowth,
          savedAt: { toDate: () => new Date() } as any,
        },
        ...prev,
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'savedSearches'), {
        userId: user.uid,
        symbol: stockData.symbol,
        companyName: stockData.companyName,
        earningsPerShare: stockData.earningsPerShare,
        dividendPerShare: stockData.dividendPerShare,
        peRatio: stockData.peRatio,
        earningsGrowth: stockData.earningsGrowth,
        savedAt: serverTimestamp(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setError('Failed to save search. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (isDev) {
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'savedSearches', id));
    } catch {
      setError('Failed to delete saved search.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Load saved search ────────────────────────────────────────────────────────
  const handleLoadSaved = (saved: SavedSearch) => {
    setStockData({
      symbol: saved.symbol,
      companyName: saved.companyName,
      earningsPerShare: saved.earningsPerShare,
      dividendPerShare: saved.dividendPerShare,
      peRatio: saved.peRatio,
      earningsGrowth: saved.earningsGrowth,
    });
    setSearchTerm(saved.symbol);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatGrowth = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const growthColor = (value: number | null) => {
    if (value === null) return 'text-gray-900 dark:text-white';
    return value > 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  };

  const formatDate = (ts: Timestamp) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const alreadySaved = stockData
    ? savedSearches.some((s) => s.symbol === stockData.symbol)
    : false;

  // ── WebSocket status pill ────────────────────────────────────────────────────
  const WsStatusPill = () => {
    const map = {
      connected:    { dot: 'bg-green-500 animate-pulse', text: 'Live',         label: 'text-green-600 dark:text-green-400' },
      connecting:   { dot: 'bg-yellow-400 animate-pulse', text: 'Connecting…', label: 'text-yellow-600 dark:text-yellow-400' },
      disconnected: { dot: 'bg-gray-400',                 text: 'Offline',     label: 'text-gray-500 dark:text-gray-400' },
    }[wsStatus];
    return (
      <span className={`flex items-center gap-1.5 text-xs font-medium ${map.label}`}>
        <span className={`inline-block w-2 h-2 rounded-full ${map.dot}`} />
        {map.text}
      </span>
    );
  };

  // ── Live price cell ──────────────────────────────────────────────────────────
  const LivePriceCell = ({ symbol }: { symbol: string }) => {
    const live = livePrices[symbol];
    const flash = flashSymbols[symbol];

    const flashClass = flash === 'up'
      ? 'bg-green-100 dark:bg-green-900/40'
      : flash === 'down'
      ? 'bg-red-100 dark:bg-red-900/40'
      : '';

    if (!live) {
      return (
        <td className="px-4 py-3 text-right text-gray-400 dark:text-gray-500 text-xs">
          —
        </td>
      );
    }

    const changeClass = live.direction === 'up'
      ? 'text-green-600 dark:text-green-400'
      : live.direction === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-500 dark:text-gray-400';

    return (
      <td className={`px-4 py-3 text-right transition-colors duration-300 ${flashClass}`}>
        <div className="font-semibold text-gray-900 dark:text-white text-sm">
          ${live.price.toFixed(2)}
        </div>
        <div className={`text-xs font-medium ${changeClass}`}>
          {live.changePct >= 0 ? '+' : ''}{live.changePct.toFixed(2)}%
        </div>
      </td>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-10">

      {/* ── Search form ── */}
      <form onSubmit={searchStock} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter stock symbol (e.g., AAPL, GOOGL)"
            className="flex-1 px-4 py-2 border border-zinc-400 rounded-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* ── Error ── */}
      {error && (
        <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-600 dark:text-red-200">
          {error}
        </div>
      )}

      {/* ── Stock result card ── */}
      {stockData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {stockData.mockData && stockData.message && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
              {stockData.message}
            </div>
          )}

          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {stockData.companyName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {stockData.symbol}
              </p>
              {/* Show live price if this symbol is already saved and streaming */}
              {livePrices[stockData.symbol] && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    ${livePrices[stockData.symbol].price.toFixed(2)}
                  </span>
                  <span className={`text-sm font-medium ${
                    livePrices[stockData.symbol].direction === 'up'
                      ? 'text-green-600 dark:text-green-400'
                      : livePrices[stockData.symbol].direction === 'down'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500'
                  }`}>
                    {livePrices[stockData.symbol].changePct >= 0 ? '+' : ''}
                    {livePrices[stockData.symbol].changePct.toFixed(2)}%
                  </span>
                  <WsStatusPill />
                </div>
              )}
            </div>

            {user && (
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving || alreadySaved}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : alreadySaved ? '✓ Already Saved' : '+ Save Search'}
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Saved successfully!
                  </span>
                )}
              </div>
            )}

            {!user && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                <a href="/login" className="text-sky-600 hover:underline">Log in</a>{' '}
                to save searches
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
                Earnings Per Share (EPS)
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stockData.earningsPerShare !== null ? `$${stockData.earningsPerShare.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
                Dividend Per Share
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stockData.dividendPerShare !== null ? `$${stockData.dividendPerShare.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">P/E Ratio</h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stockData.peRatio !== null ? stockData.peRatio.toFixed(2) : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
                Earnings Growth (YoY)
              </h3>
              <p className={`text-2xl font-semibold ${growthColor(stockData.earningsGrowth)}`}>
                {formatGrowth(stockData.earningsGrowth)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved searches table ── */}
      {user && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Saved Searches
            </h2>
            {savedSearches.length > 0 && <WsStatusPill />}
          </div>

          {savedSearches.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
              No saved searches yet. Search for a stock and click &quot;+ Save Search&quot;.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg shadow">
              <table className="w-full text-sm text-left bg-white dark:bg-gray-800">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3 text-right">EPS</th>
                    <th className="px-4 py-3 text-right">Dividend</th>
                    <th className="px-4 py-3 text-right">P/E</th>
                    <th className="px-4 py-3 text-right">Growth</th>
                    {/* ── New live price column ── */}
                    <th className="px-4 py-3 text-right">Live price</th>
                    <th className="px-4 py-3">Saved at</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {savedSearches.map((saved) => (
                    <tr
                      key={saved.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleLoadSaved(saved)}
                          className="font-bold text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {saved.symbol}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[160px] truncate">
                        {saved.companyName}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                        {saved.earningsPerShare !== null ? `$${saved.earningsPerShare.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                        {saved.dividendPerShare !== null ? `$${saved.dividendPerShare.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                        {saved.peRatio !== null ? saved.peRatio.toFixed(2) : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${growthColor(saved.earningsGrowth)}`}>
                        {formatGrowth(saved.earningsGrowth)}
                      </td>

                      {/* ── Live price cell — flashes green/red on update ── */}
                      <LivePriceCell symbol={saved.symbol} />

                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(saved.savedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(saved.id)}
                          disabled={deletingId === saved.id}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                        >
                          {deletingId === saved.id ? 'Deleting...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}