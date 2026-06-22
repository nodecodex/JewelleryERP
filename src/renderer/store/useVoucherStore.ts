import { create } from 'zustand';
import type { JournalEntry, JournalItem, Account } from '../../shared/ipc-api';

interface VoucherState {
  vouchers: JournalEntry[];
  accounts: Account[];
  isLoading: boolean;
  loadVouchers: (companyId: string) => Promise<void>;
  loadAccounts: (companyId: string) => Promise<void>;
  createVoucher: (voucher: Omit<JournalEntry, 'id'>, items: Omit<JournalItem, 'id' | 'journal_entry_id'>[]) => Promise<JournalEntry>;
  createAccount: (account: Omit<Account, 'id' | 'current_balance'>) => Promise<Account>;
}

export const useVoucherStore = create<VoucherState>((set, get) => ({
  vouchers: [],
  accounts: [],
  isLoading: false,

  loadVouchers: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getVouchers(companyId);
      set({ vouchers: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load vouchers:', e);
      set({ isLoading: false });
    }
  },

  loadAccounts: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getAccounts(companyId);
      set({ accounts: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load accounts:', e);
      set({ isLoading: false });
    }
  },

  createVoucher: async (voucher, items) => {
    const created = await (window as any).api.createVoucher(voucher, items);
    await get().loadVouchers(voucher.company_id);
    await get().loadAccounts(voucher.company_id);
    return created;
  },

  createAccount: async (account) => {
    const created = await (window as any).api.createAccount(account);
    await get().loadAccounts(account.company_id);
    return created;
  }
}));
