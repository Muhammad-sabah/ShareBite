import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Calendar, MapPin, Package, Store, AlertCircle } from 'lucide-react';
import { shopApi, parseApiError } from '../../services/api';
import { Offer } from '../../types';
import { formatIQD, formatPickupDateLabel } from '../../utils/format';
import { CategoryBadge, DiscountBadge, StatusBadge } from '../../components/Badges';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

export const ShopOfferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    const numId = Number(id);
    if (!numId) {
      setError('Invalid offer ID.');
      setLoading(false);
      return;
    }

    shopApi
      .getOfferDetail(numId)
      .then((data) => setOffer(data))
      .catch((err) => setError(parseApiError(err, 'Failed to load offer details.').message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDeactivate = async () => {
    if (!offer) return;
    setDeactivating(true);
    try {
      const res = await shopApi.deactivateOffer(offer.id);
      setOffer(res.offer);
      setConfirmOpen(false);
      showToast('success', res.message);
    } catch (err) {
      showToast('error', parseApiError(err, 'Could not deactivate offer.').message);
      setConfirmOpen(false);
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 h-64 animate-pulse" />;
  }

  if (error || !offer) {
    return (
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#0F172A] mb-4">{error || 'Offer not found.'}</p>
        <Link to="/shop/offers" className="text-sm font-bold text-[#167C80] hover:underline">
          ← Back to My Offers
        </Link>
      </div>
    );
  }

  const canDeactivate = offer.status === 'Active' || offer.status === 'Sold Out';
  const activeRes = offer.active_reservation_count ?? 0;

  return (
    <div className="space-y-6">
      <Link
        to="/shop/offers"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#167C80] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Offers</span>
      </Link>

      <div className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 bg-[#F8FAF9] p-6 border-b lg:border-b-0 lg:border-r border-[#E2E8F0]">
            <img
              src={offer.image_url || '/images/food/other-default.svg'}
              alt={offer.food_name}
              className="w-full aspect-[16/11] rounded-2xl object-cover bg-white border border-[#E2E8F0] mb-4"
            />
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2 text-sm shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                <Store className="w-4 h-4 text-[#167C80]" />
                <span>{offer.shop_name}</span>
              </div>
              <div className="flex items-center gap-2 text-[#64748B]">
                <MapPin className="w-4 h-4 text-[#F57C00]" />
                <span>{offer.shop_address}</span>
              </div>
              <div className="flex items-center gap-2 text-[#64748B]">
                <Calendar className="w-4 h-4 text-[#94A3B8]" />
                <span>
                  {formatPickupDateLabel(offer.pickup_date)} ({offer.pickup_start_time} – {offer.pickup_end_time})
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#64748B]">{offer.offer_code}</span>
                  <CategoryBadge category={offer.category} />
                  <DiscountBadge percent={offer.discount_percent} />
                </div>
                <StatusBadge status={offer.status} />
              </div>

              <h1 className="text-2xl font-extrabold text-[#0F172A] mb-2">{offer.food_name}</h1>
              <p className="text-sm text-[#475569] leading-relaxed mb-6">
                {offer.description || 'No additional description provided.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Discounted Price</div>
                  <div className="text-base font-black text-[#F57C00] mt-0.5">
                    {formatIQD(offer.discounted_price)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Original Price</div>
                  <div className="text-base font-semibold text-[#94A3B8] line-through mt-0.5">
                    {formatIQD(offer.original_price)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Remaining Stock</div>
                  <div className="text-base font-bold text-[#0F172A] mt-0.5 flex items-center gap-1">
                    <Package className="w-4 h-4 text-[#167C80]" />
                    <span>
                      {offer.available_quantity} / {offer.original_quantity}
                    </span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#DFF2F0] border border-[#55AAA5]/25">
                  <div className="text-xs text-[#167C80] font-semibold">Active Reservations</div>
                  <div className="text-base font-black text-[#167C80] mt-0.5">{activeRes}</div>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#94A3B8]">
                Historical records are preserved for audit accuracy. Deactivation is permanent.
              </div>
              {canDeactivate && (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-sm font-semibold transition"
                >
                  <Ban className="w-4 h-4" />
                  <span>Deactivate Offer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate Offer"
        message={
          activeRes > 0
            ? `This offer has ${activeRes} active reservation(s). They will remain valid.\n\nDeactivating this offer permanently removes it from the customer marketplace. Do you want to proceed?`
            : `Are you sure you want to permanently deactivate "${offer.food_name}"?`
        }
        confirmLabel="Yes, Deactivate Offer"
        cancelLabel="Cancel"
        isDanger
        isLoading={deactivating}
        onConfirm={() => void handleDeactivate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
