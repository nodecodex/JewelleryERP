import { create } from 'zustand';
import type { PurchaseVoucher, PurchaseItem, PurchaseTag, PurchaseDiamond } from '../../shared/ipc-api';

interface PurchaseState {
  vouchers: PurchaseVoucher[];
  isLoading: boolean;
  loadVouchers: (companyId: string) => Promise<void>;
  createVoucher: (
    voucher: Omit<PurchaseVoucher, 'id'>,
    items: Omit<PurchaseItem, 'id' | 'voucher_id'>[],
    tags: Omit<PurchaseTag, 'id' | 'voucher_id' | 'purchase_item_id'>[],
    diamonds: Omit<PurchaseDiamond, 'id' | 'voucher_id' | 'purchase_tag_id'>[]
  ) => Promise<PurchaseVoucher>;
  updateVoucher: (
    voucher: PurchaseVoucher,
    items: Omit<PurchaseItem, 'id' | 'voucher_id'>[],
    tags: Omit<PurchaseTag, 'id' | 'voucher_id' | 'purchase_item_id'>[],
    diamonds: Omit<PurchaseDiamond, 'id' | 'voucher_id' | 'purchase_tag_id'>[]
  ) => Promise<void>;
  deleteVoucher: (id: string) => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  vouchers: [],
  isLoading: false,

  loadVouchers: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getPurchaseVouchers(companyId);
      set({ vouchers: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load purchase vouchers:', e);
      set({ isLoading: false });
    }
  },

  createVoucher: async (voucher, items, tags, diamonds) => {
    const created = await (window as any).api.createPurchaseVoucher(voucher, items, tags, diamonds);
    await get().loadVouchers(voucher.company_id);
    return created;
  },

  updateVoucher: async (voucher, items, tags, diamonds) => {
    await (window as any).api.updatePurchaseVoucher(voucher, items, tags, diamonds);
    await get().loadVouchers(voucher.company_id);
  },

  deleteVoucher: async (id) => {
    const v = get().vouchers.find((item) => item.id === id);
    await (window as any).api.deletePurchaseVoucher(id);
    if (v) {
      await get().loadVouchers(v.company_id);
    }
  }
}));
