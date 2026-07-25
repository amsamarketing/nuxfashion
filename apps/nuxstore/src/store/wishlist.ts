import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistItem {
  id: string;
  name: string;
  nameAr: string;
  image: string;
  price: number;
  originalPrice?: number;
  slug: string;
}

interface WishlistStore {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => set((s) => ({ items: [...s.items, item] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      toggle: (item) => {
        if (get().has(item.id)) get().remove(item.id);
        else get().add(item);
      },
      has: (id) => get().items.some((i) => i.id === id),
    }),
    { name: 'nuxstore-wishlist' }
  )
);
