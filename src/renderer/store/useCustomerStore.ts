import { create } from 'zustand';
import type { Customer } from '../../shared/ipc-api';

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  loadCustomers: (companyId: string) => Promise<void>;
  createCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  updateCustomer: (customer: Customer) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: false,

  loadCustomers: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getCustomers(companyId);
      set({ customers: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load customers:', e);
      set({ isLoading: false });
    }
  },

  createCustomer: async (customer) => {
    const created = await (window as any).api.createCustomer(customer);
    await get().loadCustomers(customer.company_id);
    return created;
  },

  updateCustomer: async (customer) => {
    await (window as any).api.updateCustomer(customer);
    await get().loadCustomers(customer.company_id);
  }
}));
