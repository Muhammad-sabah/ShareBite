export type UserRole = 'customer' | 'shop_owner';

export type FoodCategory = 'Bakery' | 'Restaurant' | 'Café' | 'Grocery' | 'Other';

export const FOOD_CATEGORIES: FoodCategory[] = [
  'Bakery',
  'Restaurant',
  'Café',
  'Grocery',
  'Other',
];

export type OfferStatus = 'Active' | 'Sold Out' | 'Expired' | 'Deactivated';

export type ReservationStatus = 'Active' | 'Cancelled' | 'Expired';

export interface ShopProfile {
  id: number;
  shop_name: string;
  category: FoodCategory;
  contact_number: string;
  address: string;
  description: string;
}

export interface UserProfile {
  id: number;
  role: UserRole;
  username: string;
  full_name: string;
  phone_number: string;
  shop?: ShopProfile;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface Offer {
  id: number;
  offer_code: string;
  shop_id: number;
  shop_name: string;
  shop_address: string;
  shop_category: FoodCategory;
  food_name: string;
  description: string;
  category: FoodCategory;
  image_url: string;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  original_quantity: number;
  available_quantity: number;
  pickup_date: string;
  pickup_start_time: string;
  pickup_end_time: string;
  pickup_end_at: string;
  status: OfferStatus;
  active_reservation_count?: number;
  created_at: string;
}

export interface Reservation {
  id: number;
  reservation_code: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  offer_id: number;
  offer_code: string;
  food_name: string;
  offer_image_url: string;
  category: FoodCategory;
  shop_id: number;
  shop_name: string;
  shop_address: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  pickup_date: string;
  pickup_start_time: string;
  pickup_end_time: string;
  pickup_end_at: string;
  status: ReservationStatus;
  created_at: string;
}

export interface ShopDashboardStats {
  shop: ShopProfile;
  active_offers_count: number;
  total_offers_count: number;
  active_reservations_count: number;
  total_reservations_count: number;
}

export interface ApiErrorPayload {
  error: string;
  field?: string;
}

