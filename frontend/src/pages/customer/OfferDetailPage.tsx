import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  MapPin,
  Minus,
  Package,
  Plus,
  Store,
  AlertCircle,
} from 'lucide-react';
import { customerApi, marketplaceApi, parseApiError } from '../../services/api';
import { Offer } from '../../types';
import { formatIQD, formatPickupDateLabel } from '../../utils/format';
import { useCountdown } from '../../hooks/useCountdown';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CategoryBadge, DiscountBadge, StatusBadge } from '../../components/Badges';
import { CountdownBadge } from '../../components/CountdownBadge';

export const OfferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [quantity, setQuantity] = useState<number>(1);
  const [reserveError, setReserveError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const numId = Number(id);
    if (!numId) {
      setLoadError('Invalid offer ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    marketplaceApi
      .getOffer(numId)
      .then((data) => {
        if (active) {
          setOffer(data);
          setQuantity(1);
        }
      })
      .catch((err) => {
        if (active) setLoadError(parseApiError(err, 'Offer not found.').message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const countdown = useCountdown(offer?.pickup_end_at, offer?.pickup_date, offer?.pickup_end_time);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 animate-pulse space-y-4">
          <div className="h-64 bg-slate-100 rounded-2xl" />
          <div className="h-8 bg-slate-200 rounded w-1/2" />
          <div className="h-5 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (loadError || !offer) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-xs">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">Offer Unavailable</h2>
          <p className="text-sm text-[#64748B] mb-6">{loadError || 'This food offer could not be found.'}</p>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-semibold hover:bg-[#105B60] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </Link>
        </div>
      </div>
    );
  }

  const isAvailable =
    offer.status === 'Active' && offer.available_quantity > 0 && !countdown.isExpired;
  const totalPrice = Math.max(1, quantity) * offer.discounted_price;
  const totalSavings = Math.max(1, quantity) * (offer.original_price - offer.discounted_price);

  const handleQtyChange = (next: number) => {
    setReserveError('');
    if (Number.isNaN(next) || next < 1) {
      setQuantity(1);
      return;
    }
    if (next > offer.available_quantity) {
      setQuantity(offer.available_quantity);
      return;
    }
    setQuantity(Math.floor(next));
  };

  const handleReserve = async () => {
    setReserveError('');
    if (!user) {
      navigate('/login', { state: { role: 'customer', from: `/offers/${offer.id}` } });
      return;
    }

    if (quantity < 1 || !Number.isInteger(quantity)) {
      setReserveError('Please enter a valid quantity (1 or more).');
      return;
    }

    setSubmitting(true);
    try {
      const reservation = await customerApi.createReservation(offer.id, quantity);
      showToast('success', `Reservation ${reservation.reservation_code} confirmed!`);
      navigate(`/reservations/confirmed/${reservation.id}`, {
        state: { reservation },
      });
    } catch (err) {
      const parsed = parseApiError(err, 'Could not complete reservation.');
      setReserveError(parsed.message);
      // Refresh offer state in case stock changed or expired concurrently
      try {
        const refreshed = await marketplaceApi.getOffer(offer.id);
        setOffer(refreshed);
      } catch {
        // ignore secondary refresh failure
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#167C80] mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </Link>

      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Image & Metadata */}
          <div className="lg:col-span-6 bg-[#F8FAF9] p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E2E8F0]">
            <div>
              <div className="relative aspect-[16/11] rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] mb-5 shadow-2xs">
                <img
                  src={offer.image_url || '/images/food/other-default.svg'}
                  alt={offer.food_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <CategoryBadge category={offer.category} />
                  <StatusBadge status={countdown.isExpired && offer.status === 'Active' ? 'Expired' : offer.status} />
                </div>
                <div className="absolute top-3 right-3">
                  <DiscountBadge percent={offer.discount_percent} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                  <Store className="w-4 h-4 text-[#167C80] shrink-0" />
                  <span>{offer.shop_name}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-[#475569]">
                  <MapPin className="w-4 h-4 text-[#F57C00] shrink-0 mt-0.5" />
                  <span>{offer.shop_address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#475569]">
                  <Calendar className="w-4 h-4 text-[#94A3B8] shrink-0" />
                  <span>
                    Pickup: {formatPickupDateLabel(offer.pickup_date)} ({offer.pickup_start_time} – {offer.pickup_end_time})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#FFF8EE] border border-[#FFE0B2] px-4 py-3 text-xs font-semibold text-[#8D4E00]">
              <Banknote className="w-4 h-4 text-[#F57C00] shrink-0" />
              <span>In-person pickup only. Payment is made in cash (IQD) at the shop counter.</span>
            </div>
          </div>

          {/* Right Details & Reservation Form */}
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-[#94A3B8] tracking-wider uppercase">
                Offer {offer.offer_code}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#167C80] bg-[#DFF2F0] px-2.5 py-1 rounded-full border border-[#55AAA5]/20">
                <Package className="w-3.5 h-3.5" />
                <span>{offer.available_quantity} unit(s) available</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mb-2">{offer.food_name}</h1>

            {offer.description && (
              <p className="text-sm text-[#475569] leading-relaxed mb-5">{offer.description}</p>
            )}

            {/* Pricing Section */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-black text-[#F57C00]">
                {formatIQD(offer.discounted_price)}
              </span>
              <span className="text-base text-[#94A3B8] line-through">
                {formatIQD(offer.original_price)}
              </span>
              <span className="text-xs font-bold text-[#167C80] bg-[#DFF2F0] px-2 py-0.5 rounded-md">
                Save {formatIQD(offer.original_price - offer.discounted_price)} / unit
              </span>
            </div>

            {/* Live Countdown */}
            <div className="mb-6">
              <CountdownBadge countdown={countdown} />
            </div>

            {/* Reservation Box */}
            <div className="mt-auto rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] p-5 space-y-4">
              {user?.role === 'shop_owner' ? (
                <div className="text-sm text-[#475569] bg-white p-4 rounded-xl border border-[#E2E8F0]">
                  You are signed in as a <strong>Shop Owner</strong>. To reserve items as a customer, please sign in with a customer account.
                </div>
              ) : !isAvailable ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">
                    {countdown.isExpired || offer.status === 'Expired'
                      ? 'This offer has expired and is no longer accepting reservations.'
                      : offer.status === 'Sold Out' || offer.available_quantity === 0
                      ? 'This offer is currently sold out.'
                      : 'This offer is no longer available.'}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-semibold text-sm cursor-not-allowed"
                  >
                    Reservation Unavailable
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label htmlFor="reserve-qty" className="block text-sm font-bold text-[#0F172A]">
                        Select Quantity
                      </label>
                      <span className="text-xs text-[#64748B]">Max {offer.available_quantity} unit(s)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(quantity - 1)}
                        disabled={quantity <= 1}
                        className="w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80] transition disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        id="reserve-qty"
                        type="number"
                        min={1}
                        max={offer.available_quantity}
                        value={quantity}
                        onChange={(e) => handleQtyChange(Number(e.target.value))}
                        className="w-16 h-9 text-center rounded-xl border border-[#E2E8F0] bg-white text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80]"
                      />
                      <button
                        type="button"
                        onClick={() => handleQtyChange(quantity + 1)}
                        disabled={quantity >= offer.available_quantity}
                        className="w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80] transition disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[#64748B]">Total Cash Due at Shop</div>
                      <div className="text-xl font-extrabold text-[#167C80]">{formatIQD(totalPrice)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#64748B]">Total Savings</div>
                      <div className="text-sm font-bold text-[#F57C00]">{formatIQD(totalSavings)}</div>
                    </div>
                  </div>

                  {reserveError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-rose-700">
                      {reserveError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleReserve}
                    disabled={submitting || !isAvailable}
                    className="w-full py-3.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white font-bold text-sm sm:text-base transition shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {submitting
                      ? 'Confirming Reservation...'
                      : user
                      ? 'Confirm Reservation'
                      : 'Login as Customer to Reserve'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
