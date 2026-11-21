import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  MapPin,
  Package,
  PlusCircle,
  Store,
  Tag,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { shopApi, parseApiError } from '../../services/api';
import { Reservation, ShopDashboardStats } from '../../types';
import { formatIQD } from '../../utils/format';
import { StatusBadge } from '../../components/Badges';
import { useToast } from '../../context/ToastContext';

export const ShopDashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<ShopDashboardStats | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([shopApi.getDashboard(), shopApi.listReservations('Active')])
      .then(([dash, resList]) => {
        if (!active) return;
        setStats(dash);
        setRecentReservations(Array.isArray(resList) ? resList.slice(0, 5) : []);
      })
      .catch((err) => {
        if (active) showToast('error', parseApiError(err, 'Failed to load dashboard.').message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white rounded-2xl border border-[#E2E8F0]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-[#E2E8F0]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFF2F0] text-[#167C80] text-xs font-bold mb-2 border border-[#55AAA5]/20">
            <Store className="w-3.5 h-3.5" />
            <span>{stats.shop.category}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">{stats.shop.shop_name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#64748B] mt-1.5">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#F57C00]" />
              {stats.shop.address}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#167C80]" />
              {stats.shop.contact_number}
            </span>
          </div>
        </div>

        <Link
          to="/shop/offers/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs shrink-0 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Offer</span>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Active Offers</span>
            <div className="w-9 h-9 rounded-xl bg-[#DFF2F0] text-[#167C80] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#167C80]">{stats.active_offers_count}</div>
          <p className="text-xs text-[#64748B] mt-1">Live in customer marketplace</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Pending Pickups</span>
            <div className="w-9 h-9 rounded-xl bg-[#FFF3E0] text-[#F57C00] flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#F57C00]">{stats.active_reservations_count}</div>
          <p className="text-xs text-[#64748B] mt-1">Active reservations awaiting pickup</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Total Offers</span>
            <div className="w-9 h-9 rounded-xl bg-[#F8FAF9] text-[#475569] border border-[#E2E8F0] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A]">{stats.total_offers_count}</div>
          <p className="text-xs text-[#64748B] mt-1">All historical &amp; active offers</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Total Reservations</span>
            <div className="w-9 h-9 rounded-xl bg-[#DFF2F0] text-[#167C80] flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#167C80]">{stats.total_reservations_count}</div>
          <p className="text-xs text-[#64748B] mt-1">Across all your surplus offers</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/shop/offers/new"
          className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:border-[#167C80] hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#DFF2F0] text-[#167C80] flex items-center justify-center mb-3">
            <PlusCircle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#167C80] transition">
            Publish Surplus Offer
          </h3>
          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
            List surplus items with original &amp; discounted IQD prices and a pickup window.
          </p>
        </Link>

        <Link
          to="/shop/offers"
          className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:border-[#167C80] hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF3E0] text-[#F57C00] flex items-center justify-center mb-3">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#167C80] transition">
            Manage My Offers
          </h3>
          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
            Track remaining stock, inspect active reservation counts, or deactivate offers.
          </p>
        </Link>

        <Link
          to="/shop/reservations"
          className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:border-[#167C80] hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#DFF2F0] text-[#167C80] flex items-center justify-center mb-3">
            <ClipboardList className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#167C80] transition">
            Verify Customer Pickups
          </h3>
          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
            View customer names, phone numbers, reservation codes, and cash amounts due.
          </p>
        </Link>
      </div>

      {/* Upcoming Active Pickups */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Active Pending Pickups</h2>
            <p className="text-xs text-[#64748B]">Customers scheduled to collect food &amp; pay cash at your shop</p>
          </div>
          <Link
            to="/shop/reservations"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#167C80] hover:text-[#105B60] transition"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {(recentReservations || []).length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">
            No pending active pickups right now.
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {(recentReservations || []).map((res) => (
              <div
                key={res.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAF9] transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-[#167C80] bg-[#DFF2F0] px-2.5 py-0.5 rounded-full border border-[#55AAA5]/20">
                      {res.reservation_code}
                    </span>
                    <StatusBadge status={res.status} />
                  </div>
                  <div className="text-sm font-bold text-[#0F172A]">
                    {res.food_name}{' '}
                    <span className="text-xs font-semibold text-[#64748B]">({res.quantity} unit)</span>
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    Customer: <strong className="text-[#0F172A]">{res.customer_name}</strong> • Phone:{' '}
                    <strong className="text-[#0F172A]">{res.customer_phone}</strong>
                  </div>
                </div>

                <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center">
                  <div className="text-xs text-[#64748B]">Cash to Collect</div>
                  <div className="text-base font-black text-[#167C80]">{formatIQD(res.total_price)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
