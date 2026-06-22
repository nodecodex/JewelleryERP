import { create } from 'zustand';
import type { ItemStockLimit, ItemStockLimitDetail } from '../../shared/ipc-api';

interface ItStkLimitState {
  limits: ItemStockLimit[];
  isLoading: boolean;
  loadLimits: (companyId: string) => Promise<void>;
  saveLimit: (
    companyId: string,
    limit: { id?: string; item_code: string; item_name: string },
    details: Omit<ItemStockLimitDetail, 'id' | 'limit_id'>[]
  ) => Promise<void>;
  deleteLimit: (id: string, companyId: string) => Promise<void>;
}

export const useItStkLimitStore = create<ItStkLimitState>((set, get) => ({
  limits: [],
  isLoading: false,

  loadLimits: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getItemStockLimits(companyId);
      set({ limits: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load item stock limits:', e);
      set({ isLoading: false });
    }
  },

  saveLimit: async (companyId, limit, details) => {
    set({ isLoading: true });
    try {
      await (window as any).api.saveItemStockLimit(companyId, limit, details);
      await get().loadLimits(companyId);
      set({ isLoading: false });
    } catch (e) {
      console.error('Failed to save item stock limit:', e);
      set({ isLoading: false });
      throw e;
    }
  },

  deleteLimit: async (id, companyId) => {
    set({ isLoading: true });
    try {
      await (window as any).api.deleteItemStockLimit(id);
      await get().loadLimits(companyId);
      set({ isLoading: false });
    } catch (e) {
      console.error('Failed to delete item stock limit:', e);
      set({ isLoading: false });
      throw e;
    }
  }
}));
