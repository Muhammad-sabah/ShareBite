import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ClipboardList, MapPin, Store, Eye, XCircle, Banknote, X } from 'lucide-react';
import { customerApi, parseApiError } from '../../services/api';
import { Reservation } from '../../types';
import { formatIQD, formatPickupDateLabel, computeCountdown } from '../../utils/format';
import { StatusBadge } from '../../components/Badges';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

export const MyReservationsPage: React.FC = () => {
  const { showToast } = useToast();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<Reservation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await customerApi.listReservations();
      setReservations(list);
    } catch (err) {
      showToast('error', parseApiError(err, 'Failed to load your reservations.').message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const canCancel = (res: Reservation): boolean => {
    if (res.status !== 'Active') return false;
    const cd = computeCountdown(res.pickup_end_at, res.pickup_date, res.pickup_end_time);
    return !cd.isExpired;
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const resp = await customerApi.cancelReservation(cancelTarget.id);
      showToast('success', resp.message);
      setCancelTarget(null);
      setSelectedDetail(null);
      await loadReservations();
    } catch (err) {
      showToast('error', parseApiError(err, 'Could not cancel reservation.').message);
      setCancelTarget(null);
      await loadReservations();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#167C80]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
              Customer Pickups
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
            My Reservations
          </h1>
          <p className="text-sm sm:text-base text-[#64748B] mt-1">
            Track your reserved surplus meals and pickup codes. Active pickups appear at the top.
          </p>
        </div>
        <Link
          to="/marketplace"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs"
        >
          Browse Offers
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 animate-pulse h-36" />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-7 h-7" />}
          title="No reservations yet"
          description="You haven't reserved any surplus food yet. Explore available offers from Sulaymaniyah shops to make your first reservation!"
          action={
            <Link
              to="/marketplace"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-semibold hover:bg-[#105B60] transition shadow-xs"
            >
              Browse Available Offers
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {reservations.map((res) => {
            const cancellable = canCancel(res);
            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row gap-5"
              >
                <img
                  src={res.offer_image_url || '/images/food/other-default.svg'}
                  alt={res.food_name}
                  className="w-full sm:w-32 h-32 sm:h-28 rounded-xl object-cover bg-slate-50 border border-[#E2E8F0] shrink-0"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-black text-[#167C80] bg-[#DFF2F0] px-3 py-1 rounded-full border border-[#55AAA5]/25">
                        Code: {res.reservation_code}
                      </span>
                      <StatusBadge status={res.status} />
                    </div>

                    <h3 className="text-lg font-bold text-[#0F172A] truncate">
                      {res.food_name}{' '}
                      <span className="text-sm font-semibold text-[#64748B]">
                        (Qty: {res.quantity})
                      </span>
                    </h3>

                    <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm text-[#475569]">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#167C80]">
                        <Store className="w-4 h-4 text-[#167C80]" />
                        {res.shop_name}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                        <MapPin className="w-4 h-4 text-[#F57C00]" />
                        {res.shop_address}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                        <Calendar className="w-4 h-4 text-[#94A3B8]" />
                        {formatPickupDateLabel(res.pickup_date)}, {res.pickup_start_time} – {res.pickup_end_time}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-[#94A3B8] mr-2">
                        {formatIQD(res.unit_price)} / unit
                      </span>
                      <span className="text-base font-black text-[#167C80]">
                        Total: {formatIQD(res.total_price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDetail(res)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs sm:text-sm font-semibold text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80] transition"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>

                      {cancellable && (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(res)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-semibold transition"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reservation Detail Modal */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-black text-[#167C80] bg-[#DFF2F0] px-3.5 py-1 rounded-full border border-[#55AAA5]/25">
                  {selectedDetail.reservation_code}
                </span>
                <StatusBadge status={selectedDetail.status} />
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-xl font-extrabold text-[#0F172A] mb-4">{selectedDetail.food_name}</h2>

            <div className="bg-[#F8FAF9] rounded-2xl border border-[#E2E8F0] p-4 space-y-2.5 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Shop</span>
                <span className="font-bold text-[#167C80]">{selectedDetail.shop_name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#64748B] shrink-0">Pickup Address</span>
                <span className="font-medium text-[#0F172A] text-right">{selectedDetail.shop_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Pickup Window</span>
                <span className="font-medium text-[#0F172A]">
                  {formatPickupDateLabel(selectedDetail.pickup_date)} ({selectedDetail.pickup_start_time} – {selectedDetail.pickup_end_time})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Quantity Reserved</span>
                <span className="font-bold text-[#0F172A]">{selectedDetail.quantity} unit(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Unit Price</span>
                <span className="font-semibold text-[#0F172A]">{formatIQD(selectedDetail.unit_price)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0] text-base">
                <span className="font-bold text-[#0F172A]">Total Cash at Shop</span>
                <span className="font-black text-[#167C80]">{formatIQD(selectedDetail.total_price)}</span>
              </div>
            </div>

            {selectedDetail.status === 'Active' && (
              <div className="flex items-center gap-2 rounded-xl bg-[#FFF8EE] border border-[#FFE0B2] px-3.5 py-2.5 text-xs font-semibold text-[#8D4E00] mb-5">
                <Banknote className="w-4 h-4 text-[#F57C00] shrink-0" />
                <span>Pay in cash (IQD) when collecting your food order at {selectedDetail.shop_name}.</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              {canCancel(selectedDetail) && (
                <button
                  type="button"
                  onClick={() => setCancelTarget(selectedDetail)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition"
                >
                  Cancel Reservation
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#0F172A] hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel Reservation"
        message={
          cancelTarget
            ? `Are you sure you want to cancel your reservation for "${cancelTarget.food_name}" (${cancelTarget.reservation_code})?\n\nThe reserved quantity (${cancelTarget.quantity} unit(s)) will be returned to the shop's available stock.`
            : ''
        }
        confirmLabel="Yes, Cancel Reservation"
        cancelLabel="Keep Reservation"
        isDanger
        isLoading={cancelling}
        onConfirm={() => void handleConfirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};
