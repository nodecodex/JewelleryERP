import { create } from 'zustand';
import type { Party } from '../../shared/ipc-api';

interface PartyState {
  parties: Party[];
  isLoading: boolean;
  loadParties: (companyId: string) => Promise<void>;
  createParty: (party: Omit<Party, 'id'>) => Promise<Party>;
  updateParty: (party: Party) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;
}

export const usePartyStore = create<PartyState>((set, get) => ({
  parties: [],
  isLoading: false,

  loadParties: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getParties(companyId);
      set({ parties: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load parties:', e);
      set({ isLoading: false });
    }
  },

  createParty: async (party) => {
    const created = await (window as any).api.createParty(party);
    await get().loadParties(party.company_id);
    return created;
  },

  updateParty: async (party) => {
    await (window as any).api.updateParty(party);
    await get().loadParties(party.company_id);
  },

  deleteParty: async (id) => {
    const party = get().parties.find((p) => p.id === id);
    await (window as any).api.deleteParty(id);
    if (party) {
      await get().loadParties(party.company_id);
    }
  }
}));
