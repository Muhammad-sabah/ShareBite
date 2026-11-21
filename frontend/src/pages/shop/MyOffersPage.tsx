import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Calendar, Eye, Package, PlusCircle } from 'lucide-react';
import { shopApi, parseApiError } from '../../services/api';
import { Offer } from '../../types';
import { formatIQD, formatPickupDateLabel } from '../../utils/format';
import { resolveImageUrl } from '../../utils/imageUrl';
import { CategoryBadge, DiscountBadge, StatusBadge } from '../../components/Badges';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

const STATUS_TABS = ['All', 'Active', 'Sold Out', 'Expired', 'Deactivated'] as const;

export const MyOffersPage: React.FC = () => {
  const { showToast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [deactivateTarget, setDeactivateTarget] = useState<Offer | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await shopApi.listOffers(statusFilter);
      setOffers(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast('error', parseApiError(err, 'Failed to load offers.').message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const res = await shopApi.deactivateOffer(deactivateTarget.id);
      showToast('success', res.message);
      setDeactivateTarget(null);
      await loadOffers();
    } catch (err) {
      showToast('error', parseApiError(err, 'Could not deactivate offer.').message);
      setDeactivateTarget(null);
      await loadOffers();
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">My Offers</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Monitor inventory, active reservation counts, or manage your active listings.
          </p>
        </div>

        <Link
          to="/shop/offers/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Offer</span>
        </Link>
      </div>

      {/* Status Filter Pills */}
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

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-[#E2E8F0] animate-pulse" />
          ))}
        </div>
      ) : (offers || []).length === 0 ? (
        <EmptyState
          icon={<Package className="w-7 h-7" />}
          title={statusFilter === 'All' ? 'No offers created yet' : `No ${statusFilter} offers`}
          description={
            statusFilter === 'All'
              ? 'Publish your first surplus food offer so customers in Sulaymaniyah can reserve it.'
              : 'There are currently no offers in this status.'
          }
          action={
            statusFilter === 'All' ? (
              <Link
                to="/shop/offers/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-bold hover:bg-[#105B60] transition shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Offer</span>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {(offers || []).map((offer) => {
            const canDeactivate = offer.status === 'Active' || offer.status === 'Sold Out';
            const activeCount = offer.active_reservation_count ?? 0;

            return (
              <div
                key={offer.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs hover:shadow-sm transition flex flex-col md:flex-row gap-5"
              >
                <img
                  src={resolveImageUrl(offer.image_url)}
                  alt={offer.food_name}
                  className="w-full md:w-36 h-36 md:h-28 rounded-xl object-cover bg-slate-50 border border-[#E2E8F0] shrink-0"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={offer.category} />
                        <span className="text-xs font-bold text-[#64748B]">{offer.offer_code}</span>
                        <DiscountBadge percent={offer.discount_percent} />
                      </div>
                      <StatusBadge status={offer.status} />
                    </div>

                    <h3 className="text-lg font-bold text-[#0F172A] truncate">{offer.food_name}</h3>
                    {offer.description && (
                      <p className="text-xs sm:text-sm text-[#64748B] line-clamp-1 mt-0.5">{offer.description}</p>
                    )}

                    <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs sm:text-sm">
                      <span className="font-black text-[#F57C00]">
                        {formatIQD(offer.discounted_price)}{' '}
                        <span className="font-normal text-[#94A3B8] line-through ml-1">
                          {formatIQD(offer.original_price)}
                        </span>
                      </span>
                      <span className="text-[#0F172A] font-semibold">
                        Stock: {offer.available_quantity} / {offer.original_quantity}
                      </span>
                      <span className="text-[#167C80] font-semibold bg-[#DFF2F0] px-2 py-0.5 rounded-md">
                        {activeCount} active reservation(s)
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#64748B]">
                        <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                        {formatPickupDateLabel(offer.pickup_date)}, {offer.pickup_start_time} – {offer.pickup_end_time}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-end gap-2.5">
                    <Link
                      to={`/shop/offers/${offer.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs sm:text-sm font-semibold text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80] transition"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </Link>

                    {canDeactivate && (
                      <button
                        type="button"
                        onClick={() => setDeactivateTarget(offer)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100 text-xs sm:text-sm font-semibold transition"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Deactivate</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permanent Deactivation Confirmation */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate Offer"
        message={
          deactivateTarget
            ? (deactivateTarget.active_reservation_count ?? 0) > 0
              ? `This offer has ${deactivateTarget.active_reservation_count} active reservation(s). They will remain valid.\n\nDeactivating "${deactivateTarget.food_name}" is permanent and removes it from the customer marketplace. Do you want to proceed?`
              : `Are you sure you want to deactivate "${deactivateTarget.food_name}"?\n\nThis action is permanent and cannot be undone.`
            : ''
        }
        confirmLabel="Yes, Deactivate Offer"
        cancelLabel="Keep Offer"
        isDanger
        isLoading={deactivating}
        onConfirm={() => void handleConfirmDeactivate()}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
};
