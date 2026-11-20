import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Banknote, Calendar, CheckCircle2, MapPin, Store, ArrowRight, ShoppingBag } from 'lucide-react';
import { customerApi, parseApiError } from '../../services/api';
import { Reservation } from '../../types';
import { formatIQD, formatPickupDateLabel } from '../../utils/format';

export const ReservationConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const stateReservation = (location.state as { reservation?: Reservation } | null)?.reservation;

  const [reservation, setReservation] = useState<Reservation | null>(stateReservation || null);
  const [loading, setLoading] = useState(!stateReservation);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stateReservation) return;
    const numId = Number(id);
    if (!numId) {
      setError('Invalid reservation ID.');
      setLoading(false);
      return;
    }

    customerApi
      .getReservation(numId)
      .then((res) => setReservation(res))
      .catch((err) => setError(parseApiError(err, 'Unable to load reservation details.').message))
      .finally(() => setLoading(false));
  }, [id, stateReservation]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-sm text-[#64748B]">
        Loading reservation confirmation...
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-xs">
          <p className="text-sm text-rose-600 font-semibold mb-4">{error || 'Reservation not found.'}</p>
          <Link
            to="/my-reservations"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-semibold hover:bg-[#105B60] transition"
          >
            Go to My Reservations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 sm:p-10 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-[#DFF2F0] text-[#167C80] flex items-center justify-center mx-auto mb-4 shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#167C80] mb-1 tracking-tight">
          Reservation Confirmed!
        </h1>
        <p className="text-sm text-[#64748B] mb-5">
          Show this Reservation Code when collecting your food at the shop.
        </p>

        {/* Code Highlight Box */}
        <div className="inline-block px-5 py-2 rounded-2xl bg-[#DFF2F0] text-[#167C80] border border-[#55AAA5]/30 font-black text-lg tracking-wider mb-7 shadow-xs">
          Reservation Code: {reservation.reservation_code}
        </div>

        {/* Summary Card */}
        <div className="bg-[#F8FAF9] rounded-2xl border border-[#E2E8F0] p-5 text-left space-y-3 mb-6">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#64748B]">Food Item</span>
            <span className="font-bold text-[#0F172A] text-right">{reservation.food_name}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#64748B]">Quantity</span>
            <span className="font-bold text-[#0F172A]">{reservation.quantity} unit(s)</span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#64748B]">Shop</span>
            <span className="font-bold text-[#167C80] flex items-center gap-1.5">
              <Store className="w-4 h-4" />
              {reservation.shop_name}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#64748B]">Address</span>
            <span className="font-semibold text-[#0F172A] flex items-center gap-1.5 text-right">
              <MapPin className="w-4 h-4 text-[#F57C00] shrink-0" />
              {reservation.shop_address}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#64748B]">Pickup Window</span>
            <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#94A3B8] shrink-0" />
              {formatPickupDateLabel(reservation.pickup_date)}, {reservation.pickup_start_time} – {reservation.pickup_end_time}
            </span>
          </div>

          <div className="border-t border-[#E2E8F0] pt-3 flex justify-between gap-4 items-baseline">
            <span className="text-sm font-bold text-[#0F172A]">Total Cash Due at Pickup</span>
            <span className="text-xl font-black text-[#167C80]">
              {formatIQD(reservation.total_price)}
            </span>
          </div>
        </div>

        {/* Reminder Pill */}
        <div className="rounded-xl bg-[#FFF8EE] border border-[#FFE0B2] p-3.5 mb-7 text-xs font-medium text-[#8D4E00] flex items-center gap-2 text-left">
          <Banknote className="w-4 h-4 text-[#F57C00] shrink-0" />
          <span>Remember to bring cash in Iraqi Dinar (IQD). Payment is completed directly at the counter.</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/my-reservations"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs"
          >
            <span>View My Reservations</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#167C80] text-[#167C80] hover:bg-[#DFF2F0] text-sm font-semibold transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse More Offers</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
