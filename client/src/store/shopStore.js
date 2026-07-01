import { create } from 'zustand';
import { shopApi } from '../api/shop.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shop Store
// Wallet balance always comes back from the server after every mutation —
// this store never increments/decrements credits or tokens itself. Buying
// an item optimistically shows "pending" state, then trusts whatever the
// server's response says the new balance is.
// ─────────────────────────────────────────────────────────────────────────────

const useShopStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  catalog:        null,   // { credit_pack: [...], premium_pack: [...], ... }
  wallet:         { credits: 0, premiumCurrency: 0 },
  inventory:      [],
  equipped:       {},
  purchases:      [],
  purchasesMeta:  { total: 0, page: 1, limit: 20, totalPages: 1 },
  isLoading:      false,
  error:          null,
  lastPurchase:   null, // { item, wallet } — used for a brief success toast

  // ── Catalog ────────────────────────────────────────────────────────────────

  fetchCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await shopApi.getCatalog();
      set({ catalog: res.data.catalog, wallet: res.data.wallet, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: 'Failed to load shop catalog' });
    }
  },

  // ── Purchasing ─────────────────────────────────────────────────────────────
  // Sends ONLY itemId. The server is the sole authority on price, eligibility,
  // and balance — this function never assumes the purchase will succeed.

  buyItem: async (itemId) => {
    set({ error: null });
    try {
      const res = await shopApi.buyItem(itemId);
      set({
        wallet:       res.data.wallet,
        lastPurchase: res.data,
      });
      // Refresh catalog ownership flags + inventory so UI reflects new item
      get().fetchCatalog();
      get().fetchInventory();
      return { ok: true, item: res.data.item };
    } catch (err) {
      const message = err.response?.data?.message || 'Purchase failed';
      set({ error: message });
      return { ok: false, message };
    }
  },

  // ── Stripe checkout (real money) ──────────────────────────────────────────

  startCheckout: async (packId) => {
    set({ error: null });
    try {
      const res = await shopApi.createCheckout(packId);
      // Redirect the whole page to Stripe's hosted checkout
      window.location.href = res.data.checkoutUrl;
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to start checkout';
      set({ error: message });
      return { ok: false, message };
    }
  },

  verifyCheckout: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await shopApi.verifyCheckout(sessionId);
      if (res.data.status === 'completed') {
        set({ wallet: res.data.wallet, isLoading: false });
        return { ok: true, status: 'completed', purchase: res.data.purchase };
      }
      set({ isLoading: false });
      return { ok: true, status: res.data.status, message: res.data.message };
    } catch (err) {
      set({ isLoading: false, error: 'Failed to verify payment' });
      return { ok: false };
    }
  },

  // ── Inventory ──────────────────────────────────────────────────────────────

  fetchInventory: async () => {
    try {
      const res = await shopApi.getInventory();
      set({ inventory: res.data.inventory, equipped: res.data.equipped, wallet: res.data.wallet });
    } catch {
      set({ error: 'Failed to load inventory' });
    }
  },

  equipItem: async (itemId, slot) => {
    try {
      const res = await shopApi.equipItem(itemId, slot);
      set({ equipped: res.data.equipped });
      get().fetchInventory();
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to equip item';
      set({ error: message });
      return { ok: false, message };
    }
  },

  unequipItem: async (slot) => {
    try {
      const res = await shopApi.unequipItem(slot);
      set({ equipped: res.data.equipped });
      get().fetchInventory();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message };
    }
  },

  // ── Purchase history ───────────────────────────────────────────────────────

  fetchPurchaseHistory: async ({ page = 1, itemType } = {}) => {
    set({ isLoading: true });
    try {
      const res = await shopApi.getPurchaseHistory({ page, itemType });
      set({ purchases: res.data.purchases, purchasesMeta: res.data.meta, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to load purchase history' });
    }
  },

  clearError: () => set({ error: null }),
  clearLastPurchase: () => set({ lastPurchase: null }),
}));

export default useShopStore;
