import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  PlusCircle,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Phone,
} from 'lucide-react';
import { donorShopApi, parseApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DonationClaim, FoodDonation } from '../../types';

export const ShopDonationsPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'donations' | 'claims'>('donations');
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [claims, setClaims] = useState<DonationClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Fulfillment dialog state
  const [fulfillingClaim, setFulfillingClaim] = useState<DonationClaim | null>(null);
  const [fulfillNotes, setFulfillNotes] = useState('');
  const [submittingFulfill, setSubmittingFulfill] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [donationsData, claimsData] = await Promise.all([
        donorShopApi.listDonations(),
        donorShopApi.listClaims(),
      ]);
      setDonations(donationsData);
      setClaims(claimsData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCancelDonation = async (donationId: number) => {
    if (!window.confirm('Are you sure you want to cancel this donation listing?')) return;
    try {
      await donorShopApi.cancelDonation(donationId);
      showToast('info', 'Donation listing cancelled.');
      await loadData();
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to cancel donation.');
      showToast('error', parsed.message);
    }
  };

  const handleConfirmFulfillment = async () => {
    if (!fulfillingClaim) return;
    setSubmittingFulfill(true);
    try {
      await donorShopApi.fulfillClaim(fulfillingClaim.id, fulfillNotes.trim() || undefined);
      showToast('success', `Claim ${fulfillingClaim.claim_code} marked as fulfilled!`);
      setFulfillingClaim(null);
      setFulfillNotes('');
      await loadData();
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to fulfill claim.');
      showToast('error', parsed.message);
    } finally {
      setSubmittingFulfill(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80]">
            Active
          </span>
        );
      case 'Fully Claimed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            Fully Claimed
          </span>
        );
      case 'Fulfilled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            Fulfilled
          </span>
        );
      case 'Expired':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            Expired
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
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#167C80] text-white shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80] mb-2">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Community Impact Donor Portal</span>
          </div>
          <h1 className="text-2xl font-black">Food Surplus Donations</h1>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
            Donate edible unsold food for free to verified local beneficiaries and help reduce waste in your city.
          </p>
        </div>
        <Link
          to="/shop/donations/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#167C80] text-sm font-bold hover:bg-[#DFF2F0] transition shadow-xs shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Donate Surplus Food</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('donations')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === 'donations'
              ? 'bg-[#167C80] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
          }`}
        >
          My Donation Listings ({donations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === 'claims'
              ? 'bg-[#167C80] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
          }`}
        >
          Beneficiary Claims ({claims.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-6 animate-pulse h-32"
            />
          ))}
        </div>
      ) : activeTab === 'donations' ? (
        donations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0] p-8">
            <PackageCheck className="w-12 h-12 text-[#167C80] mx-auto mb-3 opacity-60" />
            <h2 className="text-lg font-bold text-[#0F172A]">No Donations Created Yet</h2>
            <p className="text-sm text-[#64748B] mt-1 mb-6 max-w-md mx-auto">
              Give back to the community by listing surplus bread, meals, or groceries for verified beneficiaries.
            </p>
            <Link
              to="/shop/donations/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-bold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Donation</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {donations.map((donation) => (
              <div
                key={donation.id}
                className="bg-white rounded-3xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(donation.status)}
                    <span className="text-xs font-semibold text-[#64748B]">
                      {donation.category}
                    </span>
                    <span className="text-xs font-bold text-[#167C80] bg-[#DFF2F0] px-2 py-0.5 rounded-full">
                      {donation.available_quantity} / {donation.quantity} left
                    </span>
                  </div>

                  <h2 className="text-lg font-black text-[#0F172A]">{donation.food_name}</h2>
                  <p className="text-xs text-[#64748B] line-clamp-1">{donation.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#167C80]" />
                      <span>
                        Pickup: {donation.pickup_date} ({donation.pickup_start_time} -{' '}
                        {donation.pickup_end_time})
                      </span>
                    </div>
                    {donation.is_delivery_available && (
                      <div className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Delivery possible ({donation.delivery_notes || 'Manual'})</span>
                      </div>
                    )}
                  </div>
                </div>

                {donation.status === 'Active' && (
                  <button
                    type="button"
                    onClick={() => handleCancelDonation(donation.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition shrink-0"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Donation</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : claims.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0] p-8">
          <HeartHandshake className="w-12 h-12 text-[#167C80] mx-auto mb-3 opacity-60" />
          <h2 className="text-lg font-bold text-[#0F172A]">No Beneficiary Claims Yet</h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto">
            When approved beneficiaries reserve your food donations, their claim codes and pickup
            details will appear here for fulfillment confirmation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-[#F8FAF9] border border-[#167C80]/30 text-[#167C80]">
                    CODE: {claim.claim_code}
                  </span>
                  {getStatusBadge(claim.status)}
                  <span className="text-xs font-bold text-[#0F172A]">
                    {claim.quantity} package(s)
                  </span>
                </div>

                <h2 className="text-base font-bold text-[#0F172A]">{claim.food_name}</h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                  <div className="font-semibold text-[#0F172A]">
                    Beneficiary: {claim.beneficiary_name} ({claim.beneficiary_type || 'Family'})
                  </div>
                  <div className="flex items-center gap-1 text-[#64748B]">
                    <Phone className="w-3.5 h-3.5 text-[#167C80]" />
                    <span>{claim.beneficiary_phone}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#64748B]">
                    <Clock className="w-3.5 h-3.5 text-[#167C80]" />
                    <span>
                      Pickup: {claim.pickup_date} ({claim.pickup_start_time} -{' '}
                      {claim.pickup_end_time})
                    </span>
                  </div>
                </div>

                {claim.delivery_requested && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>
                      Delivery requested by beneficiary: {claim.delivery_address_note || 'Address notes'}
                    </span>
                  </div>
                )}

                {claim.status === 'Fulfilled' && claim.fulfillment_notes && (
                  <div className="text-xs text-emerald-700 font-medium">
                    Fulfillment note: {claim.fulfillment_notes}
                  </div>
                )}
              </div>

              {claim.status === 'Active' && (
                <button
                  type="button"
                  onClick={() => {
                    setFulfillingClaim(claim);
                    setFulfillNotes('');
                  }}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-xs font-bold transition shadow-xs shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Fulfillment</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fulfillment Modal */}
      {fulfillingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#167C80]" />
              <span>Confirm Food Handover</span>
            </h3>

            <p className="text-xs text-[#64748B]">
              Please verify that the beneficiary presents Claim Code{' '}
              <strong className="font-mono text-[#167C80]">{fulfillingClaim.claim_code}</strong>.
            </p>

            <div className="p-3 rounded-2xl bg-[#F8FAF9] text-xs space-y-1">
              <div>
                <strong>Food:</strong> {fulfillingClaim.food_name} ({fulfillingClaim.quantity} packages)
              </div>
              <div>
                <strong>Beneficiary:</strong> {fulfillingClaim.beneficiary_name} (
                {fulfillingClaim.beneficiary_phone})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Fulfillment Notes (Optional)
              </label>
              <input
                type="text"
                value={fulfillNotes}
                onChange={(e) => setFulfillNotes(e.target.value)}
                placeholder="e.g. Handed over at front counter"
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFulfillingClaim(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFulfillment}
                disabled={submittingFulfill}
                className="px-5 py-2 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-xs font-bold transition shadow-xs disabled:opacity-60"
              >
                {submittingFulfill ? 'Marking Fulfilled...' : 'Confirm Handover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
