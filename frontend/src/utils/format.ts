import { FoodCategory } from '../types';

/**
 * Formats an integer amount in Iraqi Dinar with comma thousand separators (e.g. "5,000 IQD").
 */
export function formatIQD(amount: number): string {
  const safe = Math.round(Number.isFinite(amount) ? amount : 0);
  return `${safe.toLocaleString('en-US')} IQD`;
}

export interface CountdownResult {
  isExpired: boolean;
  totalSeconds: number;
  label: string;
  urgency: 'normal' | 'warning' | 'critical' | 'expired';
}

/**
 * Computes pure UI countdown display from pickup_end_at ISO timestamp or pickupDate + pickupEndTime.
 */
export function computeCountdown(pickupEndAtIso?: string, pickupDate?: string, pickupEndTime?: string): CountdownResult {
  let endMs = Number.NaN;
  if (pickupEndAtIso) {
    endMs = Date.parse(pickupEndAtIso);
  }
  if (Number.isNaN(endMs) && pickupDate && pickupEndTime) {
    endMs = Date.parse(`${pickupDate}T${pickupEndTime}:00`);
  }

  if (Number.isNaN(endMs)) {
    return { isExpired: true, totalSeconds: 0, label: 'Expired', urgency: 'expired' };
  }

  const diffSec = Math.floor((endMs - Date.now()) / 1000);
  if (diffSec <= 0) {
    return { isExpired: true, totalSeconds: 0, label: 'Expired', urgency: 'expired' };
  }

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  let label = '';
  if (days > 0) {
    label = `${days}d ${hours}h ${pad(minutes)}m remaining`;
  } else if (hours > 0) {
    label = `${hours}h ${pad(minutes)}m ${pad(seconds)}s remaining`;
  } else if (minutes > 0) {
    label = `${minutes}m ${pad(seconds)}s remaining`;
  } else {
    label = `${seconds}s remaining`;
  }

  let urgency: CountdownResult['urgency'] = 'normal';
  if (diffSec < 1800) {
    urgency = 'critical'; // < 30 min
  } else if (diffSec < 3600) {
    urgency = 'warning'; // 30-60 min
  }

  return {
    isExpired: false,
    totalSeconds: diffSec,
    label,
    urgency,
  };
}

export function formatPickupDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.slice(0, 10);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(today.getTime() + 86400000);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  if (clean === todayStr) return 'Today';
  if (clean === tomorrowStr) return 'Tomorrow';
  return clean;
}

export function todayDateInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface PresetFoodImage {
  label: string;
  category: FoodCategory;
  url: string;
}

export const PRESET_FOOD_IMAGES: PresetFoodImage[] = [
  { label: 'Croissant Box', category: 'Bakery', url: '/images/food/croissant.svg' },
  { label: 'Cake Slices', category: 'Bakery', url: '/images/food/cake.svg' },
  { label: 'Latte & Pastry', category: 'Café', url: '/images/food/latte-pastry.svg' },
  { label: 'Sandwich Box', category: 'Café', url: '/images/food/sandwich.svg' },
  { label: 'Shawarma Combo', category: 'Restaurant', url: '/images/food/shawarma.svg' },
  { label: 'Meal Platter', category: 'Restaurant', url: '/images/food/meal-box.svg' },
  { label: 'Grocery Basket', category: 'Grocery', url: '/images/food/grocery-default.svg' },
  { label: 'Surplus Box', category: 'Other', url: '/images/food/other-default.svg' },
];

