import { create } from 'zustand';
import type { DailyRate } from '../../shared/ipc-api';

interface RateState {
  rates: DailyRate[];
  currentRates: DailyRate | null;
  isLoading: boolean;
  loadRates: (companyId: string) => Promise<void>;
  saveRates: (
    companyId: string,
    gold24k: number,
    gold22k: number,
    gold18k: number,
    silver: number,
    ratesJson?: string,
    employee?: string,
    rateDate?: string
  ) => Promise<DailyRate>;
}

export const useRateStore = create<RateState>((set, get) => ({
  rates: [],
  currentRates: null,
  isLoading: false,

  loadRates: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getDailyRates(companyId);
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRates = list.find((r: DailyRate) => r.rate_date === todayStr) || null;
      
      set({
        rates: list,
        currentRates: todayRates,
        isLoading: false
      });
    } catch (e) {
      console.error('Failed to load daily rates:', e);
      set({ isLoading: false });
    }
  },

  saveRates: async (companyId, gold24k, gold22k, gold18k, silver, ratesJson, employee, rateDate) => {
    const targetDate = rateDate || new Date().toISOString().split('T')[0];
    const payload = {
      company_id: companyId,
      rate_date: targetDate,
      gold_rate_24k: gold24k,
      gold_rate_22k: gold22k,
      gold_rate_18k: gold18k,
      silver_rate: silver,
      rates_json: ratesJson,
      employee: employee
    };

    const saved = await (window as any).api.saveDailyRates(payload);
    await get().loadRates(companyId);
    return saved;
  }
}));
