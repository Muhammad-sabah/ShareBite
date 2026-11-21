import React, { useEffect, useState } from 'react';
import {
  HeartHandshake,
  Gift,
  CheckCircle2,
  Users,
  MapPin,
  Truck,
  TrendingUp,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { AdminDonationOverview, DonationClaim, FoodDonation } from '../../types';

export const AdminDonationsPage: React.FC = () => {
  const [overview, setOverview] = useState<AdminDonationOverview | null>(null);
  const [recentDonations, setRecentDonations] = useState<FoodDonation[]>([]);
  const [recentClaims, setRecentClaims] = useState<DonationClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getDonationsOverview();
      setOverview(data.overview);
      setRecentDonations(data.recent_donations);
      setRecentClaims(data.recent_claims);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80]">
            Active
          </span>
        );
      case 'Fully Claimed':
      case 'Fulfilled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            {status}
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80] mb-2">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Platform Social Impact Metrics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
          Donation Oversight &amp; Audit
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
          Real-time metrics on food surplus donations, claimed meal assistance, and beneficiary
          fulfillments across all partner shops.
        </p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-3xl bg-white border border-[#E2E8F0] h-28 animate-pulse" />
          ))}
        </div>
      ) : overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <span>Active Donations</span>
              <Gift className="w-4 h-4 text-[#167C80]" />
            </div>
            <div className="text-2xl font-black text-[#167C80]">{overview.active_donations}</div>
            <div className="text-[11px] text-[#94A3B8]">
              {overview.total_donations} total listings
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <span>Meal Claims</span>
              <HeartHandshake className="w-4 h-4 text-[#F57C00]" />
            </div>
            <div className="text-2xl font-black text-[#F57C00]">{overview.total_claims}</div>
            <div className="text-[11px] text-[#94A3B8]">
              Reserved by approved beneficiaries
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <span>Fulfilled Packages</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {overview.fulfilled_claims}
            </div>
            <div className="text-[11px] text-[#94A3B8]">Delivered or picked up</div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <span>Beneficiaries</span>
              <Users className="w-4 h-4 text-[#167C80]" />
            </div>
            <div className="text-2xl font-black text-[#0F172A]">
              {overview.approved_beneficiaries}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold">
              {overview.pending_beneficiaries} pending reviews
            </div>
          </div>
        </div>
      )}

      {/* Two Columns: Recent Donations & Recent Claims */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Food Donations */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#167C80]" />
              <span>Recent Food Donations</span>
            </h2>
            <span className="text-xs text-[#64748B] font-semibold">
              {recentDonations.length} records
            </span>
          </div>

          {recentDonations.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-8 text-center">No donations created yet.</p>
          ) : (
            <div className="space-y-3">
              {recentDonations.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#0F172A]">{item.food_name}</span>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                    <div className="flex items-center gap-1 font-semibold text-[#0F172A]">
                      <MapPin className="w-3.5 h-3.5 text-[#F57C00]" />
                      <span>{item.shop_name}</span>
                    </div>
                    <span>•</span>
                    <span>
                      {item.available_quantity} / {item.quantity} available
                    </span>
                    <span>•</span>
                    <span>{item.category}</span>
                  </div>

                  <div className="text-[11px] text-[#94A3B8]">
                    Pickup: {item.pickup_date} ({item.pickup_start_time} - {item.pickup_end_time})
                    {item.is_delivery_available && ' • Delivery Option Available'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Claims Audit */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-[#167C80]" />
              <span>Beneficiary Claims Audit</span>
            </h2>
            <span className="text-xs text-[#64748B] font-semibold">
              {recentClaims.length} records
            </span>
          </div>

          {recentClaims.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-8 text-center">No claims made yet.</p>
          ) : (
            <div className="space-y-3">
              {recentClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#167C80]">
                        {claim.claim_code}
                      </span>
                      <span className="font-bold text-xs text-[#0F172A]">{claim.food_name}</span>
                    </div>
                    {getStatusBadge(claim.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                    <span>
                      Beneficiary: <strong>{claim.beneficiary_name}</strong>
                    </span>
                    <span>•</span>
                    <span>Shop: {claim.shop_name}</span>
                    <span>•</span>
                    <span className="font-semibold text-[#0F172A]">
                      Qty: {claim.quantity} meal(s)
                    </span>
                  </div>

                  {claim.delivery_requested && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Delivery requested: {claim.delivery_address_note || 'Address notes'}</span>
                    </div>
                  )}

                  {claim.status === 'Fulfilled' && claim.fulfillment_notes && (
                    <div className="text-[11px] text-emerald-800">
                      Handover note: {claim.fulfillment_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
