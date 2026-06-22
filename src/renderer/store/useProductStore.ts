import { create } from 'zustand';
import type { Product } from '../../shared/ipc-api';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  loadProducts: (companyId: string) => Promise<void>;
  createProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,

  loadProducts: async (companyId) => {
    set({ isLoading: true });
    try {
      const list = await (window as any).api.getProducts(companyId);
      set({ products: list, isLoading: false });
    } catch (e) {
      console.error('Failed to load products:', e);
      set({ isLoading: false });
    }
  },

  createProduct: async (product) => {
    const created = await (window as any).api.createProduct(product);
    await get().loadProducts(product.company_id);
    return created;
  },

  updateProduct: async (product) => {
    await (window as any).api.updateProduct(product);
    await get().loadProducts(product.company_id);
  },

  deleteProduct: async (id) => {
    // Find product to get company_id
    const prod = get().products.find((p) => p.id === id);
    await (window as any).api.deleteProduct(id);
    if (prod) {
      await get().loadProducts(prod.company_id);
    }
  }
}));
