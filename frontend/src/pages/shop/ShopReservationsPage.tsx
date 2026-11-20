import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Eye, Phone, Search, User, X } from 'lucide-react';
import { shopApi, parseApiError } from '../../services/api';
import { Reservation } from '../../types';
import { formatIQD, formatPickupDateLabel } from '../../utils/format';
import { StatusBadge } from '../../components/Badges';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

const STATUS_TABS = ['All', 'Active', 'Cancelled', 'Expired'] as const;

export const ShopReservationsPage: React.FC = () => {
  const { showToast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reservation | null>(null);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await shopApi.listReservations(statusFilter);
      setReservations(list);
    } catch (err) {
      showToast('error', parseApiError(err, 'Failed to load shop reservations.').message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reservations;
    return reservations.filter(
      (r) =>
        r.reservation_code.toLowerCase().includes(q) ||
        (r.customer_name || '').toLowerCase().includes(q) ||
        (r.customer_phone || '').toLowerCase().includes(q) ||
        r.food_name.toLowerCase().includes(q)
    );
  }, [reservations, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">Customer Reservations</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Verify customer identities and cash amounts due when customers arrive to pick up their food.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
                  active
                    ? 'bg-[#167C80] text-white shadow-xs'
                    : 'bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#DFF2F0] hover:text-[#167C80]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, customer, phone..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80]"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] h-56 animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-7 h-7" />}
          title="No matching reservations"
          description={
            statusFilter === 'All' && !searchQuery
              ? 'No customer reservations have been placed for your shop offers yet.'
              : 'Try adjusting your status tab or search term.'
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAF9] text-xs font-bold uppercase text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Customer Name</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Offer</th>
                  <th className="px-5 py-3.5">Qty</th>
                  <th className="px-5 py-3.5">Cash Due</th>
                  <th className="px-5 py-3.5">Pickup Window</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((res) => (
                  <tr key={res.id} className="hover:bg-[#F8FAF9] transition">
                    <td className="px-5 py-4 font-black text-[#167C80]">{res.reservation_code}</td>
                    <td className="px-5 py-4 font-semibold text-[#0F172A]">{res.customer_name}</td>
                    <td className="px-5 py-4 text-[#475569] font-mono text-xs">{res.customer_phone}</td>
                    <td className="px-5 py-4 font-medium text-[#0F172A]">{res.food_name}</td>
                    <td className="px-5 py-4 font-bold text-[#0F172A]">{res.quantity}</td>
                    <td className="px-5 py-4 font-black text-[#167C80]">{formatIQD(res.total_price)}</td>
                    <td className="px-5 py-4 text-xs text-[#64748B]">
                      {formatPickupDateLabel(res.pickup_date)}, {res.pickup_start_time} – {res.pickup_end_time}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={res.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(res)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80] transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-[#F1F5F9]">
            {filtered.map((res) => (
              <div key={res.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#167C80] bg-[#DFF2F0] px-2.5 py-0.5 rounded-full border border-[#55AAA5]/25">
                    {res.reservation_code}
                  </span>
                  <StatusBadge status={res.status} />
                </div>

                <div className="font-bold text-[#0F172A] text-base">{res.food_name}</div>

                <div className="text-xs text-[#475569] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#167C80]" />
                    <span>Customer: <strong className="text-[#0F172A]">{res.customer_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#167C80]" />
                    <span>Phone: {res.customer_phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B]">Quantity: {res.quantity} • </span>
                    <span className="text-sm font-black text-[#167C80]">
                      {formatIQD(res.total_price)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(res)}
                    className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80]"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservation Verification Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#167C80] bg-[#DFF2F0] px-3.5 py-1 rounded-full border border-[#55AAA5]/25">
                  Code: {selected.reservation_code}
                </span>
                <StatusBadge status={selected.status} />
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-xl font-extrabold text-[#0F172A] mb-4">
              Pickup Verification Details
            </h2>

            <div className="bg-[#F8FAF9] rounded-2xl border border-[#E2E8F0] p-4 space-y-2.5 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Customer Name</span>
                <span className="font-bold text-[#0F172A]">{selected.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Customer Phone</span>
                <span className="font-mono text-[#0F172A] font-semibold">{selected.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Food Item</span>
                <span className="font-medium text-[#0F172A]">{selected.food_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Quantity</span>
                <span className="font-bold text-[#0F172A]">{selected.quantity} unit(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Unit Price</span>
                <span className="font-medium text-[#0F172A]">{formatIQD(selected.unit_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Pickup Window</span>
                <span className="font-medium text-[#0F172A]">
                  {formatPickupDateLabel(selected.pickup_date)}, {selected.pickup_start_time} – {selected.pickup_end_time}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0] text-base">
                <span className="font-bold text-[#0F172A]">Cash Due to Collect</span>
                <span className="font-black text-[#167C80]">{formatIQD(selected.total_price)}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-bold hover:bg-[#105B60] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
