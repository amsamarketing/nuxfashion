import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  nameAr: string;
  image: string;
  price: number;
  originalPrice?: number;
  qty: number;
  size?: string;
  color?: string;
  sku: string;
  stock: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  coupon: string | null;
  discount: number;
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  get subtotal(): number;
  get vat(): number;
  get total(): number;
  get itemCount(): number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      coupon: null,
      discount: 0,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.variantId === item.variantId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, qty: Math.min(i.qty + (item.qty || 1), i.stock) }
                  : i
              ),
              isOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, qty: item.qty || 1 }],
            isOpen: true,
          };
        });
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        })),

      clearCart: () => set({ items: [], coupon: null, discount: 0 }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      applyCoupon: (code, discount) => set({ coupon: code, discount }),

      get subtotal() {
        return get().items.reduce((sum, i) => sum + i.price * i.qty, 0);
      },
      get vat() {
        return get().subtotal * 0.15;
      },
      get total() {
        const sub = get().subtotal;
        const disc = get().discount;
        const vat = get().vat;
        const shipping = sub > 200 ? 0 : 25;
        return sub - disc + vat + shipping;
      },
      get itemCount() {
        return get().items.reduce((sum, i) => sum + i.qty, 0);
      },
    }),
    { name: 'nuxstore-cart' }
  )
);
