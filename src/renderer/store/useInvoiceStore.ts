import { create } from 'zustand';
import type { SalesInvoice, SalesItem } from '../../shared/ipc-api';
import { useCompanyStore } from './useCompanyStore';

interface InvoiceState {
  invoices: SalesInvoice[];
  isLoading: boolean;
  loadInvoices: (companyId: string) => Promise<void>;
  createInvoice: (invoice: Omit<SalesInvoice, 'id'>, items: Omit<SalesItem, 'id' | 'sales_invoice_id'>[]) => Promise<SalesInvoice>;
  deleteInvoice: (id: string) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  isLoading: false,

  loadInvoices: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getInvoices(companyId);
      set({ invoices: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load invoices:', e);
      set({ isLoading: false });
    }
  },

  createInvoice: async (invoice, items) => {
    const created = await (window as any).api.createInvoice(invoice, items);
    await get().loadInvoices(invoice.company_id);
    return created;
  },

  deleteInvoice: async (id) => {
    await (window as any).api.deleteInvoice(id);
    const companyId = useCompanyStore.getState().selectedCompany?.id;
    if (companyId) {
      await get().loadInvoices(companyId);
    }
  }
}));
