import { create } from 'zustand';
import type { TagOpeningVoucher, TagOpeningItem, TagOpeningAccessory } from '../../shared/ipc-api';

interface TagOpeningState {
  vouchers: TagOpeningVoucher[];
  isLoading: boolean;
  loadVouchers: (companyId: string) => Promise<void>;
  createVoucher: (
    voucher: Omit<TagOpeningVoucher, 'id'>,
    items: Omit<TagOpeningItem, 'id' | 'voucher_id'>[],
    accessories: Omit<TagOpeningAccessory, 'id' | 'voucher_id'>[]
  ) => Promise<TagOpeningVoucher>;
  updateVoucher: (
    voucher: TagOpeningVoucher,
    items: Omit<TagOpeningItem, 'id' | 'voucher_id'>[],
    accessories: Omit<TagOpeningAccessory, 'id' | 'voucher_id'>[]
  ) => Promise<void>;
  deleteVoucher: (id: string) => Promise<void>;
}

export const useTagOpeningStore = create<TagOpeningState>((set, get) => ({
  vouchers: [],
  isLoading: false,

  loadVouchers: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getTagOpeningVouchers(companyId);
      set({ vouchers: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load tag opening vouchers:', e);
      set({ isLoading: false });
    }
  },

  createVoucher: async (voucher, items, accessories) => {
    const created = await (window as any).api.createTagOpeningVoucher(voucher, items, accessories);
    await get().loadVouchers(voucher.company_id);
    return created;
  },

  updateVoucher: async (voucher, items, accessories) => {
    await (window as any).api.updateTagOpeningVoucher(voucher, items, accessories);
    await get().loadVouchers(voucher.company_id);
  },

  deleteVoucher: async (id) => {
    const v = get().vouchers.find((item) => item.id === id);
    await (window as any).api.deleteTagOpeningVoucher(id);
    if (v) {
      await get().loadVouchers(v.company_id);
    }
  }
}));
