import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-a2d2.up.railway.app/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('store_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Storefront (public — no auth needed) ──────────────────────────────────────
// Matches existing NuxFashion API endpoints exactly

export const storefrontApi = {
  /** Returns store config, banners, settings, payment_methods */
  getConfig: () => api.get('/storefront/config').then(r => r.data),

  /** Returns { products, categories }
   *  Accepts optional ?search= and ?category= (id or slug) */
  getCatalog: (params?: { search?: string; category?: string }) =>
    api.get('/storefront/catalog', { params }).then(r => r.data),

  /** Single product by id */
  getProduct: (id: string) =>
    api.get(`/storefront/products/${id}`).then(r => r.data),

  trackOrder: (order_number:string,phone:string) =>
    api.get('/storefront/track',{params:{order_number,phone}}).then(r=>r.data),

  /** Place an order
   *  DTO: { customer_name, phone, email?, city, address, district?, postal_code?,
   *         notes?, coupon_code?, payment_method, lines:[{variant_id,quantity}] } */
  checkout: (dto: CheckoutDto) =>
    api.post('/storefront/checkout', dto).then(r => r.data),
};

export interface CheckoutDto {
  customer_name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  district?: string;
  postal_code?: string;
  notes?: string;
  coupon_code?: string;
  /** 'cash_on_delivery' | 'bank_transfer' */
  payment_method: 'cash_on_delivery' | 'bank_transfer';
  lines: { variant_id: string; quantity: number }[];
}

export interface CheckoutResult {
  order_number: string;
  status: string;
  payment_method: string;
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
  estimated_delivery?: string;
}

// ── Wishlist + Cart ───────────────────────────────────────────────────────────
// Persisted in localStorage via Zustand — no server calls needed
// (upgrade later to server-side if customer accounts are added)

// ── Admin storefront (requires ERP JWT) ───────────────────────────────────────
export const storefrontAdminApi = {
  getContent: () => api.get('/storefront/admin/content').then(r => r.data),
  updateSettings: (body: Record<string, any>) =>
    api.patch('/storefront/admin/settings', body).then(r => r.data),
  createBanner: (body: Record<string, any>) =>
    api.post('/storefront/admin/banners', body).then(r => r.data),
  updateBanner: (id: string, body: Record<string, any>) =>
    api.patch(`/storefront/admin/banners/${id}`, body).then(r => r.data),
  deleteBanner: (id: string) =>
    api.delete(`/storefront/admin/banners/${id}`).then(r => r.data),
};
