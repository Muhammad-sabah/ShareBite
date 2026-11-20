import axios, { AxiosError } from 'axios';
import {
  ApiErrorPayload,
  AuthResponse,
  Offer,
  Reservation,
  ShopDashboardStats,
  ShopProfile,
  UserProfile,
  UserRole,
} from '../types';

const TOKEN_KEY = 'sharebite_auth_token';
const LEGACY_TOKEN_KEY = 'baqaya_auth_token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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

  async me(): Promise<UserProfile> {
    const { data } = await apiClient.get<{ user: UserProfile }>('/auth/me');
    return data.user;
  },
};

// ---- Marketplace / Public Offers API ----

export const marketplaceApi = {
  async listOffers(params?: { search?: string; category?: string; sort?: string }): Promise<Offer[]> {
    const { data } = await apiClient.get<{ offers: Offer[] }>('/offers', { params });
    return data.offers;
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
    return data.reservations;
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

// ---- Shop Owner API ----

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
    return data.offers;
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
    return data.reservations;
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

