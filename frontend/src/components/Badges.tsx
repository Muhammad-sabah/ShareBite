import React from 'react';
import { OfferStatus, ReservationStatus } from '../types';

export const StatusBadge: React.FC<{ status: OfferStatus | ReservationStatus | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    Active: 'bg-[#167C80] text-white',
    'Sold Out': 'bg-[#F57C00] text-white',
    Expired: 'bg-slate-400 text-white',
    Deactivated: 'bg-slate-500 text-white',
    Cancelled: 'bg-rose-500 text-white',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
        styles[status] || 'bg-slate-500 text-white'
      }`}
    >
      {status}
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DFF2F0] text-[#167C80] border border-[#55AAA5]/25">
      {category}
    </span>
  );
};

export const DiscountBadge: React.FC<{ percent: number }> = ({ percent }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-[#F57C00] text-white shadow-xs tracking-tight">
      -{percent}%
    </span>
  );
};
