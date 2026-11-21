export type UserRole = 'customer' | 'shop_owner' | 'admin' | 'beneficiary';

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

export type BeneficiaryType = 'Individual' | 'Family' | 'Charity';

export type BeneficiaryVerificationStatus = 'Pending' | 'Approved' | 'Rejected';

export type FoodDonationStatus = 'Active' | 'Fully Claimed' | 'Expired' | 'Cancelled';

export type ClaimStatus = 'Active' | 'Fulfilled' | 'Cancelled' | 'Expired';

export interface ShopProfile {
  id: number;
  shop_name: string;
  category: FoodCategory;
  contact_number: string;
  address: string;
  description: string;
}

export interface BeneficiaryProfile {
  id: number;
  user_id: number;
  organization_name?: string;
  beneficiary_type: BeneficiaryType;
  family_member_count: number;
  address: string;
  phone_number: string;
  id_document_ref?: string;
  notes?: string;
  verification_status: BeneficiaryVerificationStatus;
  verified_at?: string;
  verified_by?: number;
  rejection_reason?: string;
  is_partner_referral: boolean;
  partner_name?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    phone_number: string;
  };
}

export interface UserProfile {
  id: number;
  role: UserRole;
  username: string;
  full_name: string;
  phone_number: string;
  shop?: ShopProfile;
  beneficiary?: BeneficiaryProfile;
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

export interface FoodDonation {
  id: number;
  shop_id: number;
  shop_name: string;
  shop_address: string;
  food_name: string;
  description: string;
  category: FoodCategory;
  quantity: number;
  available_quantity: number;
  image_url: string;
  pickup_date: string;
  pickup_start_time: string;
  pickup_end_time: string;
  pickup_end_at: string;
  is_delivery_available: boolean;
  delivery_notes?: string;
  status: FoodDonationStatus;
  created_at: string;
  active_claims_count?: number;
}

export interface DonationClaim {
  id: number;
  claim_code: string;
  donation_id: number;
  food_name: string;
  donation_image_url: string;
  category: FoodCategory;
  shop_id: number;
  shop_name: string;
  shop_address: string;
  beneficiary_id: number;
  beneficiary_name: string;
  beneficiary_phone: string;
  beneficiary_type?: BeneficiaryType;
  quantity: number;
  pickup_date: string;
  pickup_start_time: string;
  pickup_end_time: string;
  pickup_end_at: string;
  delivery_requested: boolean;
  delivery_address_note?: string;
  status: ClaimStatus;
  fulfilled_at?: string;
  fulfillment_notes?: string;
  created_at: string;
}

export interface AdminDonationOverview {
  total_donations: number;
  active_donations: number;
  total_claims: number;
  fulfilled_claims: number;
  pending_beneficiaries: number;
  approved_beneficiaries: number;
  rejected_beneficiaries: number;
}

export interface ShopDashboardStats {
  shop: ShopProfile;
  active_offers_count: number;
  total_offers_count: number;
  active_reservations_count: number;
  total_reservations_count: number;
  active_donations_count?: number;
  total_donations_count?: number;
}

export interface ApiErrorPayload {
  error: string;
  field?: string;
}
