import axios, { AxiosError } from 'axios';
import {
  AdminDonationOverview,
  ApiErrorPayload,
  AuthResponse,
  BeneficiaryProfile,
  DonationClaim,
  FoodCategory,
  FoodDonation,
  Offer,
  Reservation,
  ShopDashboardStats,
  ShopProfile,
  UserProfile,
  UserRole,
} from '../types';

const TOKEN_KEY = 'sharebite_auth_token';
const LEGACY_TOKEN_KEY = 'baqaya_auth_token';

const defaultApiUrl =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : 'https://sharebite-1eho.onrender.com/api';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}

export interface ParsedApiError {
  message: string;
  field?: string;
  status?: number;
}

export function parseApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): ParsedApiError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<ApiErrorPayload>;
    const data = axErr.response?.data;
    if (data && typeof data.error === 'string' && data.error.trim() !== '') {
      return {
        message: data.error,
        field: data.field,
        status: axErr.response?.status,
      };
    }
    if (axErr.code === 'ERR_NETWORK') {
      return { message: 'Unable to reach ShareBite server. Please ensure the backend is running.' };
    }
  }
  if (err instanceof Error && err.message) {
    return { message: err.message };
  }
  return { message: fallback };
}

// ---- Auth API ----

export const authApi = {
  async login(payload: { role: UserRole; username: string; password: string }): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async registerCustomer(payload: {
    full_name: string;
    phone_number: string;
    username: string;
    password: string;
  }): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register/customer', payload);
    return data;
  },

  async registerShopOwner(payload: {
    owner_name: string;
    shop_name: string;
    category: string;
    contact_number: string;
    address: string;
    username: string;
    password: string;
  }): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register/shop-owner', payload);
    return data;
  },

  async registerBeneficiary(payload: {
    full_name: string;
    phone_number: string;
    username: string;
    password: string;
    organization_name?: string;
    beneficiary_type: string;
    family_member_count: number;
    address: string;
    id_document_ref?: string;
    notes?: string;
  }): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register/beneficiary', payload);
    return data;
  },

  async me(): Promise<UserProfile> {
    const { data } = await apiClient.get<{ user: UserProfile }>('/auth/me');
    return data.user;
  },
};

// ---- Marketplace / Public Offers API ----

export const marketplaceApi = {
  async listOffers(params?: { search?: string; category?: string; sort?: string }): Promise<Offer[]> {
    const { data } = await apiClient.get<{ offers: Offer[] }>('/offers', { params });
    return data?.offers ?? [];
  },

  async getOffer(id: number): Promise<Offer> {
    const { data } = await apiClient.get<{ offer: Offer }>(`/offers/${id}`);
    return data.offer;
  },
};

// ---- Customer Reservations API ----

export const customerApi = {
  async createReservation(offerId: number, quantity: number): Promise<Reservation> {
    const { data } = await apiClient.post<{ reservation: Reservation }>('/customer/reservations', {
      offer_id: offerId,
      quantity,
    });
    return data.reservation;
  },

  async listReservations(): Promise<Reservation[]> {
    const { data } = await apiClient.get<{ reservations: Reservation[] }>('/customer/reservations');
    return data?.reservations ?? [];
  },

  async getReservation(id: number): Promise<Reservation> {
    const { data } = await apiClient.get<{ reservation: Reservation }>(`/customer/reservations/${id}`);
    return data.reservation;
  },

  async cancelReservation(id: number): Promise<{ reservation: Reservation; message: string }> {
    const { data } = await apiClient.post<{ reservation: Reservation; message: string }>(
      `/customer/reservations/${id}/cancel`
    );
    return data;
  },
};

// ---- Shop Owner Commercial API ----

export const shopApi = {
  async getDashboard(): Promise<ShopDashboardStats> {
    const { data } = await apiClient.get<ShopDashboardStats>('/shop/dashboard');
    return data;
  },

  async updateProfile(payload: {
    contact_number: string;
    address: string;
    description: string;
  }): Promise<ShopProfile> {
    const { data } = await apiClient.put<{ shop: ShopProfile }>('/shop/profile', payload);
    return data.shop;
  },

  async listOffers(status?: string): Promise<Offer[]> {
    const params = status && status !== 'All' ? { status } : undefined;
    const { data } = await apiClient.get<{ offers: Offer[] }>('/shop/offers', { params });
    return data?.offers ?? [];
  },

  async getOfferDetail(id: number): Promise<Offer> {
    const { data } = await apiClient.get<{ offer: Offer }>(`/shop/offers/${id}`);
    return data.offer;
  },

  async createOffer(payload: {
    food_name: string;
    description: string;
    category: string;
    image_url: string;
    original_price: number;
    discounted_price: number;
    available_quantity: number;
    pickup_date: string;
    pickup_start_time: string;
    pickup_end_time: string;
  }): Promise<{ offer: Offer; message: string }> {
    const { data } = await apiClient.post<{ offer: Offer; message: string }>('/shop/offers', payload);
    return data;
  },

  async deactivateOffer(id: number): Promise<{ offer: Offer; message: string }> {
    const { data } = await apiClient.post<{ offer: Offer; message: string }>(`/shop/offers/${id}/deactivate`);
    return data;
  },

  async listReservations(status?: string): Promise<Reservation[]> {
    const params = status && status !== 'All' ? { status } : undefined;
    const { data } = await apiClient.get<{ reservations: Reservation[] }>('/shop/reservations', { params });
    return data?.reservations ?? [];
  },

  async getReservationDetail(id: number): Promise<Reservation> {
    const { data } = await apiClient.get<{ reservation: Reservation }>(`/shop/reservations/${id}`);
    return data.reservation;
  },

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await apiClient.post<{ image_url: string }>('/shop/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.image_url;
  },
};

// ---- Shop Owner / Donor Food Donation API ----

export const donorShopApi = {
  async listDonations(): Promise<FoodDonation[]> {
    const { data } = await apiClient.get<{ donations: FoodDonation[] }>('/shop/donations');
    return data?.donations ?? [];
  },

  async getDonation(id: number): Promise<FoodDonation> {
    const { data } = await apiClient.get<{ donation: FoodDonation }>(`/shop/donations/${id}`);
    return data.donation;
  },

  async createDonation(payload: {
    food_name: string;
    description: string;
    category: FoodCategory;
    quantity: number;
    image_url?: string;
    pickup_date: string;
    pickup_start_time: string;
    pickup_end_time: string;
    is_delivery_available: boolean;
    delivery_notes?: string;
  }): Promise<{ donation: FoodDonation; message: string }> {
    const { data } = await apiClient.post<{ donation: FoodDonation; message: string }>('/shop/donations', payload);
    return data;
  },

  async cancelDonation(id: number): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/shop/donations/${id}/cancel`);
    return data;
  },

  async listClaims(status?: string): Promise<DonationClaim[]> {
    const params = status && status !== 'All' ? { status } : undefined;
    const { data } = await apiClient.get<{ claims: DonationClaim[] }>('/shop/donations/claims', { params });
    return data?.claims ?? [];
  },

  async fulfillClaim(id: number, notes?: string): Promise<{ claim: DonationClaim; message: string }> {
    const { data } = await apiClient.post<{ claim: DonationClaim; message: string }>(
      `/shop/donations/claims/${id}/fulfill`,
      { fulfillment_notes: notes }
    );
    return data;
  },
};

// ---- Beneficiary API ----

export const beneficiaryApi = {
  async getProfile(): Promise<BeneficiaryProfile> {
    const { data } = await apiClient.get<{ beneficiary: BeneficiaryProfile }>('/beneficiary/profile');
    return data.beneficiary;
  },

  async listDonations(params?: { category?: string }): Promise<FoodDonation[]> {
    const { data } = await apiClient.get<{ donations: FoodDonation[] }>('/beneficiary/donations', { params });
    return data?.donations ?? [];
  },

  async getDonation(id: number): Promise<FoodDonation> {
    const { data } = await apiClient.get<{ donation: FoodDonation }>(`/beneficiary/donations/${id}`);
    return data.donation;
  },

  async claimDonation(
    donationId: number,
    payload: {
      quantity: number;
      delivery_requested?: boolean;
      delivery_address_note?: string;
    }
  ): Promise<{ claim: DonationClaim; message: string }> {
    const { data } = await apiClient.post<{ claim: DonationClaim; message: string }>(
      `/beneficiary/donations/${donationId}/claim`,
      payload
    );
    return data;
  },

  async listClaims(): Promise<DonationClaim[]> {
    const { data } = await apiClient.get<{ claims: DonationClaim[] }>('/beneficiary/claims');
    return data?.claims ?? [];
  },

  async cancelClaim(id: number): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/beneficiary/claims/${id}/cancel`);
    return data;
  },
};

// ---- Admin API ----

export const adminApi = {
  async listBeneficiaries(status?: string): Promise<BeneficiaryProfile[]> {
    const params = status && status !== 'All' ? { status } : undefined;
    const { data } = await apiClient.get<{ beneficiaries: BeneficiaryProfile[] }>('/admin/beneficiaries', { params });
    return data?.beneficiaries ?? [];
  },

  async verifyBeneficiary(
    id: number,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string
  ): Promise<{ beneficiary: BeneficiaryProfile; message: string }> {
    const { data } = await apiClient.post<{ beneficiary: BeneficiaryProfile; message: string }>(
      `/admin/beneficiaries/${id}/verify`,
      {
        status,
        rejection_reason: rejectionReason,
      }
    );
    return data;
  },

  async createBeneficiaryReferral(payload: {
    full_name: string;
    phone_number: string;
    username: string;
    password: string;
    organization_name?: string;
    beneficiary_type: string;
    family_member_count: number;
    address: string;
    partner_name: string;
    notes?: string;
  }): Promise<{ beneficiary: BeneficiaryProfile; message: string }> {
    const { data } = await apiClient.post<{ beneficiary: BeneficiaryProfile; message: string }>(
      '/admin/beneficiaries/referral',
      payload
    );
    return data;
  },

  async getDonationsOverview(): Promise<{
    overview: AdminDonationOverview;
    recent_donations: FoodDonation[];
    recent_claims: DonationClaim[];
  }> {
    const { data } = await apiClient.get<{
      overview: AdminDonationOverview;
      recent_donations: FoodDonation[];
      recent_claims: DonationClaim[];
    }>('/admin/donations/overview');
    return data;
  },

  async listAllDonations(params?: { status?: string; category?: string }): Promise<FoodDonation[]> {
    const { data } = await apiClient.get<{ donations: FoodDonation[] }>('/admin/donations', { params });
    return data?.donations ?? [];
  },
};
