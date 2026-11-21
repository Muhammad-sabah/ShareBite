import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  Clock,
  MapPin,
  Truck,
  XCircle,
  Gift,
} from 'lucide-react';
import { beneficiaryApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DonationClaim } from '../../types';

export const MyClaimsPage: React.FC = () => {
  const { showToast } = useToast();
  const [claims, setClaims] = useState<DonationClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await beneficiaryApi.listClaims();
      setClaims(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClaims();
  }, []);

  const handleCancelClaim = async (claimId: number) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? The food will be released to other families.')) {
      return;
    }

    setCancellingId(claimId);
    try {
      await beneficiaryApi.cancelClaim(claimId);
      showToast('info', 'Donation claim cancelled and food quantity released.');
      await loadClaims();
    } catch {
      showToast('error', 'Could not cancel claim. It may already be fulfilled.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80]">
            Ready for Pickup
          </span>
        );
      case 'Fulfilled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            Fulfilled
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-[#167C80]" />
            <span>My Donation Reservations</span>
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Present your unique Claim Code at the donor shop to collect your reserved meals.
          </p>
        </div>
        <Link
          to="/donations"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-xs sm:text-sm font-bold transition shadow-xs"
        >
          <Gift className="w-4 h-4" />
          <span>Browse More Donations</span>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-6 animate-pulse h-36"
            />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0] p-8">
          <HeartHandshake className="w-12 h-12 text-[#167C80] mx-auto mb-3 opacity-60" />
          <h2 className="text-lg font-bold text-[#0F172A]">No Donation Claims Yet</h2>
          <p className="text-sm text-[#64748B] mt-1 mb-6 max-w-md mx-auto">
            You have not reserved any surplus food donations yet. Browse available listings to claim free meals for your family.
          </p>
          <Link
            to="/donations"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-bold shadow-xs hover:bg-[#105B60] transition"
          >
            <span>Browse Active Donations</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              {/* Left: Claim Code & Details */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="px-3 py-1 rounded-xl bg-[#F8FAF9] border border-[#167C80]/30 text-xs font-mono font-bold text-[#167C80]">
                    CODE: {claim.claim_code}
                  </div>
                  {getStatusBadge(claim.status)}
                  <span className="text-xs font-bold text-[#0F172A]">
                    {claim.quantity} meal package{claim.quantity > 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-black text-[#0F172A]">{claim.food_name}</h2>
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#F57C00] shrink-0" />
                    <strong className="text-[#0F172A]">{claim.shop_name}</strong>
                    <span>•</span>
                    <span>{claim.shop_address}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#167C80]" />
                    <span>
                      Pickup: {claim.pickup_date} ({claim.pickup_start_time} - {claim.pickup_end_time})
                    </span>
                  </div>

                  {claim.delivery_requested && (
                    <div className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Delivery requested ({claim.delivery_address_note || 'Manual coordination'})</span>
                    </div>
                  )}
                </div>

                {claim.status === 'Fulfilled' && claim.fulfillment_notes && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium">
                    Fulfillment note: {claim.fulfillment_notes}
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              {claim.status === 'Active' && (
                <div className="w-full md:w-auto flex md:flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCancelClaim(claim.id)}
                    disabled={cancellingId === claim.id}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{cancellingId === claim.id ? 'Cancelling...' : 'Cancel Reservation'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
