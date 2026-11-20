import React, { useCallback, useEffect, useState } from 'react';
import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { marketplaceApi, parseApiError } from '../../services/api';
import { FOOD_CATEGORIES, Offer } from '../../types';
import { OfferCard } from '../../components/OfferCard';
import { EmptyState, OfferGridSkeleton } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const MarketplacePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('ending_soon');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await marketplaceApi.listOffers({
        search: debouncedSearch || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        sort: sortBy,
      });
      setOffers(list);
    } catch (err) {
      showToast('error', parseApiError(err, 'Failed to load food offers.').message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, sortBy, showToast]);

  useEffect(() => {
    void fetchOffers();
  }, [fetchOffers]);

  const categories = ['All', ...FOOD_CATEGORIES];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#167C80]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
              ShareBite Marketplace
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
            Browse Food Offers
          </h1>
          <p className="text-sm sm:text-base text-[#64748B] mt-1">
            Discover surplus food from local shops in Sulaymaniyah. Reserve online, pay cash in IQD at pickup.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-semibold text-[#475569] bg-white px-3.5 py-2 rounded-xl border border-[#E2E8F0] shadow-2xs">
            {loading ? 'Loading...' : `${offers.length} offer${offers.length === 1 ? '' : 's'} available`}
          </span>
          <button
            type="button"
            onClick={() => void fetchOffers()}
            className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#167C80] hover:border-[#167C80] hover:bg-[#DFF2F0]/30 transition shadow-2xs"
            title="Refresh offers"
            aria-label="Refresh offers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 mb-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by food item, bakery or café name, or address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80] transition"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-[#64748B]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort offers"
              className="px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80] transition cursor-pointer"
            >
              <option value="ending_soon">Ending Soonest</option>
              <option value="discount_desc">Highest Discount (%)</option>
              <option value="price_asc">Lowest Price (IQD)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-[#F1F5F9]">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? 'bg-[#167C80] text-white shadow-xs'
                    : 'bg-[#F8FAF9] text-[#475569] hover:bg-[#DFF2F0] hover:text-[#167C80] border border-[#E2E8F0]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <OfferGridSkeleton count={6} />
      ) : offers.length === 0 ? (
        <EmptyState
          title="No food offers found"
          description={
            debouncedSearch || selectedCategory !== 'All'
              ? 'Try adjusting your search keywords or resetting your category filter.'
              : 'All surplus food offers have currently been reserved or ended. Please check back later!'
          }
          action={
            (debouncedSearch || selectedCategory !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSelectedCategory('All');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-semibold hover:bg-[#105B60] transition shadow-xs"
              >
                Reset Filters
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} readOnlyRole={user?.role === 'shop_owner'} />
          ))}
        </div>
      )}
    </div>
  );
};
