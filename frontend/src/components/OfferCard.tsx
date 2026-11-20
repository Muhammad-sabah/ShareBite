import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Package, Store, Clock, ArrowRight } from 'lucide-react';
import { Offer } from '../types';
import { formatIQD, formatPickupDateLabel } from '../utils/format';
import { useCountdown } from '../hooks/useCountdown';
import { CategoryBadge, DiscountBadge } from './Badges';

interface OfferCardProps {
  offer: Offer;
  readOnlyRole?: boolean;
}

export const OfferCard: React.FC<OfferCardProps> = ({ offer, readOnlyRole = false }) => {
  const countdown = useCountdown(offer.pickup_end_at, offer.pickup_date, offer.pickup_end_time);
  const isUnavailable = countdown.isExpired || offer.status !== 'Active' || offer.available_quantity <= 0;

  return (
    <article className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#55AAA5]/50 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
      {/* Image Header */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        <img
          src={offer.image_url || '/images/food/other-default.svg'}
          alt={offer.food_name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <CategoryBadge category={offer.category} />
        </div>
        <div className="absolute top-3 right-3">
          <DiscountBadge percent={offer.discount_percent} />
        </div>
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold text-[#0F172A] border border-[#E2E8F0] flex items-center gap-1 shadow-xs">
          <Package className="w-3.5 h-3.5 text-[#167C80]" />
          <span>{offer.available_quantity} left</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="text-base sm:text-lg font-bold text-[#0F172A] group-hover:text-[#167C80] transition leading-snug line-clamp-1 mb-1">
            {offer.food_name}
          </h3>
          {offer.description && (
            <p className="text-xs sm:text-sm text-[#64748B] line-clamp-2 leading-relaxed">
              {offer.description}
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-xs sm:text-sm text-[#475569] mb-4">
          <div className="flex items-center gap-1.5 font-medium text-[#167C80]">
            <Store className="w-4 h-4 text-[#167C80] shrink-0" />
            <span className="truncate">{offer.shop_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <MapPin className="w-4 h-4 text-[#F57C00] shrink-0" />
            <span className="truncate">{offer.shop_address}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <Calendar className="w-4 h-4 text-[#94A3B8] shrink-0" />
            <span>
              {formatPickupDateLabel(offer.pickup_date)}, {offer.pickup_start_time} – {offer.pickup_end_time}
            </span>
          </div>
        </div>

        {/* Expiration status line */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] mb-4 bg-[#F8FAF9] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]">
          <Clock className="w-3.5 h-3.5 text-[#167C80] shrink-0" />
          <span className={countdown.isExpired ? 'text-rose-600 font-semibold' : ''}>
            {countdown.isExpired ? 'Pickup window closed' : `Expires in ${countdown.label}`}
          </span>
        </div>

        {/* Pricing + Action CTA */}
        <div className="mt-auto pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#94A3B8] line-through">{formatIQD(offer.original_price)}</div>
            <div className="text-lg font-extrabold text-[#F57C00]">{formatIQD(offer.discounted_price)}</div>
          </div>

          {isUnavailable ? (
            <button
              type="button"
              disabled
              className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs sm:text-sm font-semibold cursor-not-allowed"
            >
              {countdown.isExpired ? 'Expired' : 'Unavailable'}
            </button>
          ) : (
            <Link
              to={`/offers/${offer.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-xs sm:text-sm font-semibold transition shadow-xs active:scale-95"
            >
              <span>{readOnlyRole ? 'View Offer' : 'Reserve'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};
