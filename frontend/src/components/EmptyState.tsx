import React from 'react';
import { Utensils } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center max-w-xl mx-auto shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-[#DFF2F0] text-[#167C80] flex items-center justify-center mx-auto mb-4 shadow-xs">
        {icon || <Utensils className="w-7 h-7" />}
      </div>
      <h3 className="text-lg font-bold text-[#0F172A] mb-1.5">{title}</h3>
      <p className="text-sm text-[#64748B] leading-relaxed mb-5">{description}</p>
      {action}
    </div>
  );
};

export const OfferGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden animate-pulse">
          <div className="aspect-[16/10] bg-slate-100" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <div className="h-6 bg-slate-200 rounded w-24" />
              <div className="h-9 bg-slate-200 rounded-xl w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
