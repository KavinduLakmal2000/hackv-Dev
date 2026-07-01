import api from './axiosInstance.js';

export const shopApi = {
  getCatalog: () =>
    api.get('/shop/catalog').then((r) => r.data),

  // Buy a cosmetic/credit-pack with premium currency.
  // ONLY itemId is ever sent — price is resolved server-side.
  buyItem: (itemId) =>
    api.post('/shop/buy', { itemId }).then((r) => r.data),

  // Real-money premium pack — creates a Stripe Checkout session.
  createCheckout: (packId) =>
    api.post('/shop/checkout', { packId }).then((r) => r.data),

  verifyCheckout: (sessionId) =>
    api.get('/shop/checkout/verify', { params: { sessionId } }).then((r) => r.data),

  getInventory: () =>
    api.get('/shop/inventory').then((r) => r.data),

  equipItem: (itemId, slot) =>
    api.post('/shop/equip', { itemId, slot }).then((r) => r.data),

  unequipItem: (slot) =>
    api.post('/shop/unequip', { slot }).then((r) => r.data),

  getPurchaseHistory: ({ page = 1, limit = 20, itemType } = {}) =>
    api.get('/shop/purchases', { params: { page, limit, itemType } }).then((r) => r.data),
};
