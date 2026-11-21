import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Gift,
  Clock,
  MapPin,
  Truck,
  HeartHandshake,
  AlertCircle,
  PackageCheck,
  Search,
} from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUrl';
import { beneficiaryApi } from '../../services/api';
import { FOOD_CATEGORIES, FoodDonation } from '../../types';

export const DonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const loadDonations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await beneficiaryApi.listDonations(
        selectedCategory !== 'All' ? { category: selectedCategory } : undefined
      );
      setDonations(data);
    } catch {
      setError('Unable to load food donations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDonations();
  }, [selectedCategory]);

  const filtered = donations.filter((d) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.food_name.toLowerCase().includes(term) ||
      d.shop_name.toLowerCase().includes(term) ||
      d.shop_address.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-r from-[#167C80] to-[#105B60] text-white shadow-md mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80] mb-3">
              <Gift className="w-3.5 h-3.5" />
              <span>Community Food Assistance</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              Free Food Surplus Donations
            </h1>
            <p className="text-sm text-white/80 mt-1 max-w-xl">
              100% free surplus food donated by our partner restaurants, bakeries, and markets.
              Reserve meals for your household with dignity and ease.
            </p>
          </div>
          <Link
            to="/my-claims"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#167C80] text-sm font-bold hover:bg-[#DFF2F0] transition shadow-xs shrink-0"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>View My Claims</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {['All', ...FOOD_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#167C80] text-white shadow-xs'
                  : 'bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:min-w-[300px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search food or shop..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80]"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Donation Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-5 animate-pulse space-y-4"
            >
              <div className="h-44 bg-slate-100 rounded-2xl" />
              <div className="h-5 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0] p-8">
          <PackageCheck className="w-12 h-12 text-[#167C80] mx-auto mb-3 opacity-60" />
          <h2 className="text-lg font-bold text-[#0F172A]">No Active Food Donations</h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto">
            There are currently no active food donations matching your selection. Please check back
            soon as partner shops frequently add donations throughout the day.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((donation) => (
            <div
              key={donation.id}
              className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
            >
              {/* Image & Free Badge */}
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                <img
                  src={resolveImageUrl(donation.image_url, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80')}
                  alt={donation.food_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#167C80] text-white shadow-xs">
                  FREE DONATION
                </span>
                <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/95 text-[#0F172A] backdrop-blur-xs">
                  {donation.category}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h2 className="text-lg font-bold text-[#0F172A] leading-tight line-clamp-1">
                      {donation.food_name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80] shrink-0">
                      {donation.available_quantity} available
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B] line-clamp-2 mb-3">
                    {donation.description || 'Nutritious surplus meal package prepared with care.'}
                  </p>

                  <div className="space-y-1.5 text-xs text-[#475569] mb-4">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#F57C00] shrink-0" />
                      <strong className="text-[#0F172A]">{donation.shop_name}</strong>
                      <span className="text-[#94A3B8]">•</span>
                      <span className="truncate">{donation.shop_address}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#167C80] shrink-0" />
                      <span>
                        Pickup: {donation.pickup_date} ({donation.pickup_start_time} - {donation.pickup_end_time})
                      </span>
                    </div>

                    {donation.is_delivery_available ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <Truck className="w-3.5 h-3.5 shrink-0" />
                        <span>Delivery available upon direct arrangement</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#64748B]">
                        <PackageCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>On-site pickup required</span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  to={`/donations/${donation.id}`}
                  className="w-full text-center py-2.5 px-4 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs"
                >
                  View Details &amp; Reserve
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
