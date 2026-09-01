import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, Archive, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Product } from '../types';
import { useMenu } from '../hooks/useMenu';
import { daysUntilPurge, purgeCountdownLabel, RECYCLE_BIN_RETENTION_DAYS } from '../utils/recycleBin';

interface RecycleBinManagerProps {
  onBack: () => void;
}

/** Below this many days left, the row is styled as urgent. */
const URGENT_THRESHOLD_DAYS = 7;

/** Date an item was binned, in the admin's locale. */
function binnedOn(product: Product): string {
  if (!product.deleted_at) return 'Unknown date';

  const parsed = new Date(product.deleted_at);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';

  return parsed.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The Recently Deleted bin.
 *
 * Deliberately offers no "delete forever" control: a recovery surface that can
 * itself destroy data defeats its own purpose. Items leave only by being
 * restored, or by ageing past the retention window.
 */
export default function RecycleBinManager({ onBack }: RecycleBinManagerProps) {
  const { fetchDeletedProducts, restoreProduct } = useMenu();
  const [binned, setBinned] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBin = async () => {
    const items = await fetchDeletedProducts();
    setBinned(items);
    setLoading(false);
  };

  // Loaded once on mount; a restore refreshes it explicitly below.
  useEffect(() => {
    loadBin();
  }, []);

  const handleRestore = async (product: Product) => {
    setRestoringId(product.id);
    setError(null);

    const result = await restoreProduct(product.id);

    if (result.success) {
      await loadBin();
    } else {
      // Leave the product in place so the admin can retry.
      setError(result.error ?? `Could not restore "${product.name}".`);
    }

    setRestoringId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
      <header className="bg-white shadow-md border-b-4 border-navy-900">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-2 h-12 md:h-14">
            <button
              onClick={onBack}
              className="text-gray-700 hover:text-gold-600 transition-colors flex items-center gap-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs md:text-sm">Dashboard</span>
            </button>
            <h1 className="text-sm md:text-base font-bold text-navy-900">Recently Deleted</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 md:py-6">
        <div className="flex items-start gap-3 mb-4 md:mb-6 rounded-lg md:rounded-xl border border-navy-700/30 bg-white shadow-lg p-4 md:p-5">
          <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-gold-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm md:text-base font-semibold text-navy-900">
              {loading
                ? 'Checking the bin…'
                : `${binned.length} product${binned.length === 1 ? '' : 's'} recoverable`}
            </p>
            <p className="text-xs md:text-sm text-gray-600 mt-0.5">
              Deleted products are kept for {RECYCLE_BIN_RETENTION_DAYS} days with their stock and
              sizes intact. Restoring one puts it straight back on the shop.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-gold-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm font-medium">Loading the bin…</p>
          </div>
        )}

        {!loading && binned.length === 0 && (
          <div className="text-center py-14 rounded-lg md:rounded-xl border border-dashed border-navy-700/30 bg-white">
            <Archive className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm md:text-base font-semibold text-navy-900">Nothing in the bin</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Every product you have deleted lands here first, so nothing is ever lost.
            </p>
          </div>
        )}

        {!loading && binned.length > 0 && (
          <ul className="space-y-2 md:space-y-3">
            {binned.map((product) => {
              const daysLeft = daysUntilPurge(product);
              const isUrgent = daysLeft !== null && daysLeft <= URGENT_THRESHOLD_DAYS;

              return (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-lg md:rounded-xl border border-navy-700/30 bg-white shadow-sm hover:shadow-md transition-shadow p-3 md:p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm md:text-base font-semibold text-navy-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Deleted {binnedOn(product)} · {product.stock_quantity} in stock
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <span
                      className={`text-[11px] md:text-xs font-medium px-2 py-1 rounded-full ${
                        isUrgent
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {purgeCountdownLabel(product)}
                    </span>

                    <button
                      onClick={() => handleRestore(product)}
                      disabled={restoringId === product.id}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-black px-2.5 md:px-3 py-1.5 rounded-md font-semibold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-900"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {restoringId === product.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
