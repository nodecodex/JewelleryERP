import { create } from 'zustand';

export interface Tab {
  id: string;
  title: string;
  type: string; // e.g. 'dashboard', 'billing', 'inventory', 'ledgers', 'vouchers', 'settings'
  params?: any;
  allowMultiple?: boolean;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string;
  addTab: (tab: Omit<Tab, 'id'> & { id?: string }) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  clearTabs: () => void;
}

export const useTabStore = create<TabState>((set) => ({
  tabs: [{ id: 'dashboard', title: 'Dashboard', type: 'dashboard' }],
  activeTabId: 'dashboard',

  addTab: (newTab) =>
    set((state) => {
      const id = newTab.id || `${newTab.type}-${Date.now()}`;
      
      // Check if tab already exists. If allowMultiple is enabled, skip type matching check.
      const exists = state.tabs.find((t) => 
        t.id === id || 
        (!newTab.allowMultiple && t.type === newTab.type && JSON.stringify(t.params) === JSON.stringify(newTab.params))
      );
      if (exists) {
        return { activeTabId: exists.id };
      }

      return {
        tabs: [...state.tabs, { ...newTab, id }],
        activeTabId: id,
      };
    }),

  closeTab: (id) =>
    set((state) => {
      // Don't close the dashboard
      if (id === 'dashboard') return {};

      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === id) {
        // Find index of closed tab
        const closedIndex = state.tabs.findIndex((t) => t.id === id);
        // Focus previous tab or next tab
        const nextActive = newTabs[closedIndex - 1] || newTabs[closedIndex];
        newActiveId = nextActive ? nextActive.id : 'dashboard';
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),
  clearTabs: () => set({ tabs: [{ id: 'dashboard', title: 'Dashboard', type: 'dashboard' }], activeTabId: 'dashboard' }),
}));
