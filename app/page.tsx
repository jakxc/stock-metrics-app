import StockSearch from './components/StockSearch';

export default function Home() {
  return (
    <div className="flex-1">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            Stocks Financial Data
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-300">
            Search for any US stock to view its key financial metrics
          </p>
        </div>
        <StockSearch />
        <div className="mt-12 text-center text-md text-zinc-600 dark:text-zinc-500">
          <p>
            Data includes: Earnings Per Share (EPS), Dividend Per Share,
            Price-to-Earnings (P/E) Ratio, and Year-over-Year Earnings Growth
          </p>
        </div>
      </main>
    </div>
  );
}