import { create } from 'zustand';
import type { PartyWiseLabour } from '../../shared/ipc-api';

interface LabourState {
  isLoading: boolean;
  getPartyWiseLabour: (companyId: string, partyId: string) => Promise<PartyWiseLabour[]>;
  savePartyWiseLabour: (
    companyId: string,
    partyId: string,
    entries: Omit<PartyWiseLabour, 'id' | 'company_id' | 'party_id'>[]
  ) => Promise<void>;
  deletePartyWiseLabour: (companyId: string, partyId: string) => Promise<void>;
}

export const useLabourStore = create<LabourState>((set) => ({
  isLoading: false,

  getPartyWiseLabour: async (companyId, partyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getPartyWiseLabour(companyId, partyId);
      set({ isLoading: false });
      return list;
    } catch (e) {
      console.error('Failed to get party wise labour:', e);
      set({ isLoading: false });
      return [];
    }
  },

  savePartyWiseLabour: async (companyId, partyId, entries) => {
    set({ isLoading: true });
    try {
      await (window as any).api.savePartyWiseLabour(companyId, partyId, entries);
      set({ isLoading: false });
    } catch (e) {
      console.error('Failed to save party wise labour:', e);
      set({ isLoading: false });
      throw e;
    }
  },

  deletePartyWiseLabour: async (companyId, partyId) => {
    set({ isLoading: true });
    try {
      await (window as any).api.deletePartyWiseLabour(companyId, partyId);
      set({ isLoading: false });
    } catch (e) {
      console.error('Failed to delete party wise labour:', e);
      set({ isLoading: false });
      throw e;
    }
  }
}));
