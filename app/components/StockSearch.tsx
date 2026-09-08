'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import firebaseApp from '@/lib/firebase';
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
  getFirestore,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

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

  const isDev = process.env.NODE_ENV === 'development';

  // ── Mock saved searches for dev ────────────────────────────────────────────
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

  // ── Mock user for dev ──────────────────────────────────────────────────────
  const MOCK_USER = { uid: 'dev-user-123', email: 'dev@localhost' } as User;

// ── Auth listener ──────────────────────────────────────────────────────────
useEffect(() => {
  if (isDev) {
    setUser(MOCK_USER);
    return;
  }

  let unsubscribe: () => void;

  const init = async () => {
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
      setUser(firebaseUser);
    });
  };

  init();
  return () => unsubscribe?.();
}, []);

// ── Saved searches listener ────────────────────────────────────────────────
useEffect(() => {
  if (isDev) {
    setSavedSearches(MOCK_SAVED_SEARCHES);
    return;
  }

  if (!user || !db) {
    setSavedSearches([]);
    return;
  }

  let unsubscribe: () => void;

  const init = async () => {
    const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
    const q = query(
      collection(db, 'savedSearches'),
      where('userId', '==', user.uid),
      orderBy('savedAt', 'desc')
    );
    unsubscribe = onSnapshot(q, (snapshot) => {
      const searches = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SavedSearch[];
      setSavedSearches(searches);
    });
  };

  init();
  return () => unsubscribe?.();
}, [user]);

  // ── Search ─────────────────────────────────────────────────────────────────
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

  const handleSave = async () => {
    if (!user || !stockData) return;

    if (isDev) {
      // Just prepend to local state in dev, no Firebase write
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
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
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
    } catch (err) {
      setError('Failed to save search. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDev) {
      // Just remove from local state in dev
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      return;
    }

    setDeletingId(id);
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db!, 'savedSearches', id));
    } catch (err) {
      setError('Failed to delete saved search.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Load a saved search back into the search bar ───────────────────────────
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

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  // ── Already saved check ────────────────────────────────────────────────────
  const alreadySaved = stockData
    ? savedSearches.some((s) => s.symbol === stockData.symbol)
    : false;

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
            </div>

            {/* Save button — only for logged-in users */}
            {user && (
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving || alreadySaved}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {saving
                    ? 'Saving...'
                    : alreadySaved
                    ? '✓ Already Saved'
                    : '+ Save Search'}
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Saved successfully!
                  </span>
                )}
              </div>
            )}

            {/* Prompt to log in if not authenticated */}
            {!user && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                <a href="/login" className="text-sky-600 hover:underline">
                  Log in
                </a>{' '}
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
                {stockData.earningsPerShare !== null
                  ? `$${stockData.earningsPerShare.toFixed(2)}`
                  : 'N/A'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
                Dividend Per Share
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stockData.dividendPerShare !== null
                  ? `$${stockData.dividendPerShare.toFixed(2)}`
                  : 'N/A'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
                P/E Ratio
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stockData.peRatio !== null
                  ? stockData.peRatio.toFixed(2)
                  : 'N/A'}
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

      {/* ── Saved searches table — only for logged-in users ── */}
      {user && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Saved Searches
          </h2>

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
                    <th className="px-4 py-3">Saved At</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {savedSearches.map((saved) => (
                    <tr
                      key={saved.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {/* Symbol — clickable to reload */}
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
                        {saved.earningsPerShare !== null
                          ? `$${saved.earningsPerShare.toFixed(2)}`
                          : '—'}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                        {saved.dividendPerShare !== null
                          ? `$${saved.dividendPerShare.toFixed(2)}`
                          : '—'}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                        {saved.peRatio !== null ? saved.peRatio.toFixed(2) : '—'}
                      </td>

                      <td className={`px-4 py-3 text-right font-medium ${growthColor(saved.earningsGrowth)}`}>
                        {formatGrowth(saved.earningsGrowth)}
                      </td>

                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(saved.savedAt)}
                      </td>

                      {/* Delete button */}
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