import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  Clock,
  MapPin,
  Truck,
  HeartHandshake,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUrl';
import { beneficiaryApi, parseApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FoodDonation } from '../../types';

export const DonationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [donation, setDonation] = useState<FoodDonation | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimQuantity, setClaimQuantity] = useState<number>(1);
  const [deliveryRequested, setDeliveryRequested] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchDonation = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await beneficiaryApi.getDonation(Number(id));
        setDonation(data);
      } catch {
        setErrorMsg('Donation not found or no longer available.');
      } finally {
        setLoading(false);
      }
    };
    void fetchDonation();
  }, [id]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donation) return;

    if (claimQuantity < 1 || claimQuantity > donation.available_quantity) {
      setErrorMsg(`Please select a quantity between 1 and ${donation.available_quantity}.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await beneficiaryApi.claimDonation(donation.id, {
        quantity: claimQuantity,
        delivery_requested: deliveryRequested,
        delivery_address_note: deliveryRequested ? deliveryNote.trim() : undefined,
      });

      showToast(
        'success',
        `Claim confirmed! Code: ${res.claim.claim_code}. You can find it under My Claims.`
      );
      navigate('/my-claims', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, 'Could not reserve donation. It may have just been claimed.');
      setErrorMsg(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#DFF2F0] border-t-[#167C80] rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#64748B]">Loading donation details...</p>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-[#0F172A]">Donation Not Found</h1>
        <p className="text-sm text-[#64748B] mt-1 mb-6">
          This donation may have expired or already been fully claimed by other families.
        </p>
        <Link
          to="/donations"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Donations</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/donations"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#167C80] mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Browse Donations</span>
      </Link>

      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left: Image & Highlights */}
        <div className="relative min-h-[300px] md:min-h-full bg-slate-100">
          <img
            src={resolveImageUrl(donation.image_url, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80')}
            alt={donation.food_name}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#167C80] text-white shadow-md">
            100% FREE DONATION
          </span>
          <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-[#0F172A] shadow-xs">
            {donation.category}
          </span>
        </div>

        {/* Right: Info & Claim Form */}
        <div className="p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#167C80] mb-1">
              <Gift className="w-4 h-4" />
              <span>Surplus Food Assistance</span>
            </div>

            <h1 className="text-2xl font-black text-[#0F172A] mb-2">{donation.food_name}</h1>
            <p className="text-sm text-[#64748B] mb-5">
              {donation.description || 'Wholesome surplus meal package provided by our partner shop.'}
            </p>

            {/* Shop & Pickup Specs */}
            <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-2.5 mb-6 text-xs text-[#475569]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#F57C00] shrink-0" />
                <div>
                  <strong className="text-[#0F172A]">{donation.shop_name}</strong>
                  <div className="text-[#64748B]">{donation.shop_address}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#167C80] shrink-0" />
                <div>
                  <span className="font-semibold text-[#0F172A]">Pickup Window:</span>{' '}
                  {donation.pickup_date} from {donation.pickup_start_time} to {donation.pickup_end_time}
                </div>
              </div>

              {donation.is_delivery_available && (
                <div className="flex items-start gap-2 text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Delivery Option Available:</span>{' '}
                    {donation.delivery_notes || 'Arranged directly between beneficiary and donor shop outside the platform.'}
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                {errorMsg}
              </div>
            )}

            {/* Claim Reservation Form */}
            {donation.available_quantity > 0 ? (
              <form onSubmit={handleClaim} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-[#0F172A]">Select Quantity</label>
                    <span className="text-xs text-[#64748B]">
                      Max available: <strong>{donation.available_quantity}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={donation.available_quantity}
                      value={claimQuantity}
                      onChange={(e) =>
                        setClaimQuantity(
                          Math.min(
                            donation.available_quantity,
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        )
                      }
                      className="w-24 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-center font-bold text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    />
                    <span className="text-xs text-[#64748B]">meal package(s)</span>
                  </div>
                </div>

                {donation.is_delivery_available && (
                  <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0F172A]">
                      <input
                        type="checkbox"
                        checked={deliveryRequested}
                        onChange={(e) => setDeliveryRequested(e.target.checked)}
                        className="rounded border-[#E2E8F0] text-[#167C80] focus:ring-[#167C80]"
                      />
                      <span>Request delivery assistance (manual arrangement)</span>
                    </label>

                    {deliveryRequested && (
                      <input
                        type="text"
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        placeholder="Drop-off address note or telephone instructions"
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#167C80]"
                      />
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>{submitting ? 'Confirming Claim...' : 'Reserve Food Donation'}</span>
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-100 text-center text-xs font-semibold text-[#64748B]">
                This donation has been fully claimed.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#F1F5F9] text-[11px] text-[#94A3B8] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#167C80] shrink-0" />
            <span>
              Claiming reserves meals instantly and produces a unique claim code for pickup.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
