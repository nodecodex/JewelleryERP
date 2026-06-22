import { create } from 'zustand';
import type { Company } from '../../shared/ipc-api';

interface CompanyState {
  companies: Company[];
  selectedCompany: Company | null;
  isLoading: boolean;
  loadCompanies: () => Promise<void>;
  setSelectedCompany: (company: Company | null) => void;
  createCompany: (company: Omit<Company, 'id'>) => Promise<Company>;
  updateCompany: (company: Company) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  selectedCompany: null,
  isLoading: false,

  loadCompanies: async () => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getCompanies();
      set({ companies: list, isLoading: false });
      
      // Auto-select first company if none is selected
      const currentSelected = get().selectedCompany;
      if (list.length > 0 && (!currentSelected || !list.find((c: Company) => c.id === currentSelected.id))) {
        set({ selectedCompany: list[0] });
      } else if (list.length === 0) {
        set({ selectedCompany: null });
      }
    } catch (e) {
      console.error('Failed to load companies:', e);
      set({ isLoading: false });
    }
  },

  setSelectedCompany: (company) => set({ selectedCompany: company }),

  createCompany: async (company) => {
    const created = await (window as any).api.createCompany(company);
    await get().loadCompanies();
    set({ selectedCompany: created });
    return created;
  },

  updateCompany: async (company) => {
    await (window as any).api.updateCompany(company);
    await get().loadCompanies();
    // Update currently selected company if it was modified
    const current = get().selectedCompany;
    if (current && current.id === company.id) {
      set({ selectedCompany: company });
    }
  },

  deleteCompany: async (id) => {
    await (window as any).api.deleteCompany(id);
    await get().loadCompanies();
  }
}));
