import { create } from 'zustand';
import type { Tax } from '../../shared/ipc-api';

interface TaxState {
  taxes: Tax[];
  isLoading: boolean;
  loadTaxes: (companyId: string) => Promise<void>;
  createTax: (tax: Omit<Tax, 'id'>) => Promise<Tax>;
  updateTax: (tax: Tax) => Promise<void>;
  deleteTax: (id: string) => Promise<void>;
}

export const useTaxStore = create<TaxState>((set, get) => ({
  taxes: [],
  isLoading: false,

  loadTaxes: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getTaxes(companyId);
      set({ taxes: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load taxes:', e);
      set({ isLoading: false });
    }
  },

  createTax: async (tax) => {
    const created = await (window as any).api.createTax(tax);
    await get().loadTaxes(tax.company_id);
    return created;
  },

  updateTax: async (tax) => {
    await (window as any).api.updateTax(tax);
    await get().loadTaxes(tax.company_id);
  },

  deleteTax: async (id) => {
    const tax = get().taxes.find((t) => t.id === id);
    await (window as any).api.deleteTax(id);
    if (tax) {
      await get().loadTaxes(tax.company_id);
    }
  }
}));
