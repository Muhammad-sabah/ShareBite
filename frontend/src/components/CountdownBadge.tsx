import React from 'react';
import { Clock } from 'lucide-react';
import { CountdownResult } from '../utils/format';

interface CountdownBadgeProps {
  countdown: CountdownResult;
  compact?: boolean;
}

export const CountdownBadge: React.FC<CountdownBadgeProps> = ({ countdown, compact = false }) => {
  const colorClass =
    countdown.urgency === 'expired' || countdown.urgency === 'critical'
      ? 'text-rose-600 bg-rose-50 border-rose-200 font-bold'
      : countdown.urgency === 'warning'
      ? 'text-[#E65100] bg-[#FFF3E0] border-[#FFE0B2] font-semibold'
      : 'text-[#167C80] bg-[#DFF2F0] border-[#55AAA5]/30 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm'
      } ${colorClass}`}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{countdown.label}</span>
    </span>
  );
};
