import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useProductStore } from '../../store/useProductStore';
import type { Product } from '../../../shared/ipc-api';
import { Layers, Plus, Search, Barcode, Trash2, Edit2, ArrowUpDown, Tag, Box, Filter, Download, MoreVertical } from 'lucide-react';

type SortField = 'name' | 'sku' | 'category' | 'selling_price' | 'current_stock';
type SortOrder = 'asc' | 'desc';

export default function InventoryView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { products, loadProducts, createProduct, updateProduct, deleteProduct } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', qr_code: '', category: 'Gold Jewellery' as any,
    weight: 0, net_weight: 0, gross_weight: 0, purity: '22K (916)', stone_weight: 0,
    making_charges: 0, making_charges_type: 'fixed' as 'fixed' | 'per_gram',
    hsn_code: '7113', gst_rate: 3.0, purchase_price: 0, selling_price: 0, current_stock: 1,
  });

  useEffect(() => {
    if (selectedCompany) loadProducts(selectedCompany.id);
  }, [selectedCompany]);

  const handleOpenCreate = () => {
    const defaultBarcode = `TAG-${Date.now()}`;
    setEditingProduct(null);
    setFormData({
      name: '', sku: `SKU-${Date.now().toString().slice(-6)}`, barcode: defaultBarcode, qr_code: defaultBarcode,
      category: 'Gold Jewellery', weight: 0, net_weight: 0, gross_weight: 0, purity: '22K (916)', stone_weight: 0,
      making_charges: 0, making_charges_type: 'fixed', hsn_code: '7113', gst_rate: 3.0, purchase_price: 0, selling_price: 0, current_stock: 1,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name, sku: prod.sku, barcode: prod.barcode || '', qr_code: prod.qr_code || '',
      category: prod.category, weight: prod.weight, net_weight: prod.net_weight, gross_weight: prod.gross_weight,
      purity: prod.purity || '', stone_weight: prod.stone_weight, making_charges: prod.making_charges,
      making_charges_type: prod.making_charges_type, hsn_code: prod.hsn_code || '', gst_rate: prod.gst_rate,
      purchase_price: prod.purchase_price, selling_price: prod.selling_price, current_stock: prod.current_stock,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      if (editingProduct) await updateProduct({ ...editingProduct, ...formData });
      else await createProduct({ company_id: selectedCompany.id, ...formData });
      setIsFormOpen(false);
    } catch (e) { alert('Error saving product.'); }
  };

  const processedProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode && p.barcode.includes(searchQuery)))
    .sort((a, b) => {
      let valA = a[sortField]; let valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      if (typeof valA === 'number' && typeof valB === 'number') return sortOrder === 'asc' ? valA - valB : valB - valA;
      return 0;
    });

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden transition-colors duration-200">
      {/* HEADER SECTION */}
      <div className="px-8 py-6 border-b border-border flex items-center justify-between shrink-0 bg-card shadow-sm text-card-foreground">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Inventory Stock Master
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage jewelry tags, purity settings, and stock valuation.</p>
        </div>
        {!isFormOpen && (
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-muted rounded-lg border border-border text-muted-foreground transition-all cursor-pointer">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={handleOpenCreate} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg shadow-premium hover:shadow-elevated transition-all active:scale-95 font-semibold text-sm cursor-pointer">
              <Plus className="h-4 w-4" /> Add Item Tag
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-8">
        {isFormOpen ? (
          <div className="max-w-4xl mx-auto w-full h-full min-h-0 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <form onSubmit={handleSubmit} className="surface-premium overflow-hidden flex flex-col h-full min-h-0 bg-card text-card-foreground">
              {/* STICKY FORM HEADER */}
              <div className="bg-secondary/40 px-6 py-4 border-b border-border flex justify-between items-center shrink-0 select-none">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  {editingProduct ? 'Edit Inventory Tag' : 'New Inventory Tag'}
                </h3>
                <span className="text-[10px] font-bold text-primary font-data uppercase tracking-widest">
                  {editingProduct ? 'SKU: ' + formData.sku : 'New Item Registration'}
                </span>
              </div>

              {/* SCROLLABLE FORM BODY */}
              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                {/* PRIMARY DETAILS */}
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-8">
                    <label className="erp-label">Description / Item Name *</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full font-bold text-base px-3 py-1.5 border border-border rounded-md text-foreground bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="erp-label">Category Group</label>
                    <select 
                      className="w-full font-bold px-3 py-1.5 border border-border rounded-md text-foreground bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer" 
                      value={formData.category} 
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      {['Gold Jewellery', 'Silver Jewellery', 'Diamond Jewellery', 'Platinum Jewellery', 'Coins', 'Custom'].map(cat => <option key={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                {/* WEIGHT PARAMETERS CARD */}
                <div className="bg-secondary/20 rounded-xl border border-border p-6 shadow-sm">
                  <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.2em] block mb-6 select-none">Weight Parameters (Grams)</span>
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <label className="erp-label">Gross Weight</label>
                      <input 
                        type="number" 
                        step="0.001" 
                        className="w-full text-right font-data text-lg font-bold px-3 py-1.5 border border-border rounded-md text-foreground bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                        value={formData.gross_weight || ''} 
                        onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })} 
                      />
                    </div>
                    <div>
                      <label className="erp-label">Net Weight</label>
                      <input 
                        type="number" 
                        step="0.001" 
                        className="w-full text-right font-data text-lg font-bold text-primary px-3 py-1.5 border border-border rounded-md bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                        value={formData.net_weight || ''} 
                        onChange={(e) => setFormData({ ...formData, net_weight: parseFloat(e.target.value) || 0 })} 
                      />
                    </div>
                    <div>
                      <label className="erp-label">Stone Weight</label>
                      <input 
                        type="number" 
                        step="0.001" 
                        className="w-full text-right font-data text-lg font-bold px-3 py-1.5 border border-border rounded-md text-foreground bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                        value={formData.stone_weight || ''} 
                        onChange={(e) => setFormData({ ...formData, stone_weight: parseFloat(e.target.value) || 0 })} 
                      />
                    </div>
                  </div>
                </div>

                {/* PRICING & STOCK */}
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-3">
                    <label className="erp-label">Purity (Karat)</label>
                    <input 
                      type="text" 
                      className="w-full font-bold px-3 py-1.5 border border-border rounded-md text-foreground bg-card focus:outline-none focus:border-primary" 
                      value={formData.purity} 
                      onChange={(e) => setFormData({ ...formData, purity: e.target.value })} 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="erp-label">Selling Price /g</label>
                    <input 
                      type="number" 
                      className="w-full text-right font-data font-bold px-3 py-1.5 border border-border rounded-md text-foreground bg-card focus:outline-none focus:border-primary" 
                      value={formData.selling_price || ''} 
                      onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="erp-label">Making Charge</label>
                    <input 
                      type="number" 
                      className="w-full text-right font-data font-bold px-3 py-1.5 border border-border rounded-md text-foreground bg-card focus:outline-none focus:border-primary" 
                      value={formData.making_charges || ''} 
                      onChange={(e) => setFormData({ ...formData, making_charges: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="erp-label">Initial Stock</label>
                    <input 
                      type="number" 
                      className="w-full text-right font-data font-bold px-3 py-1.5 border border-border rounded-md text-foreground bg-card focus:outline-none focus:border-primary" 
                      value={formData.current_stock} 
                      onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                </div>
              </div>

              {/* STICKY ACTION FOOTER */}
              <div className="bg-secondary/15 px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0 select-none">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)} 
                  className="px-6 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold rounded-lg text-xs uppercase cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-2 bg-primary text-primary-foreground font-extrabold rounded-lg text-xs uppercase shadow-premium hover:shadow-elevated hover:bg-primary/90 cursor-pointer transition-all active:scale-[0.98]"
                >
                  Save Inventory Item
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-6">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Filter by SKU, Tag, or Description..."
                    className="w-80 !pl-10 h-11 bg-secondary/30 border border-border rounded-lg text-sm text-foreground focus:bg-card focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="flex items-center gap-2 px-4 h-11 bg-secondary/50 border border-border rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                  <Filter className="h-4 w-4" /> Filters
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xxs font-bold text-muted-foreground uppercase tracking-widest bg-secondary px-3 py-1 rounded-full border border-border select-none">
                  Active SKU Count: {processedProducts.length}
                </span>
              </div>
            </div>

            {/* PRODUCT TABLE */}
            <div className="flex-1 erp-table-container shadow-sm">
              <table className="ag-grid-dense-table">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border">
                    <th className="w-[15%] cursor-pointer text-foreground/80 font-bold" onClick={() => { setSortField('sku'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>SKU Code</th>
                    <th className="w-[30%] cursor-pointer text-foreground/80 font-bold" onClick={() => { setSortField('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Description</th>
                    <th className="text-right text-foreground/80 font-bold">Weight (N/G)</th>
                    <th className="text-center text-foreground/80 font-bold">Purity</th>
                    <th className="text-right text-foreground/80 font-bold">Valuation</th>
                    <th className="text-center text-foreground/80 font-bold">Stock</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody className="bg-card text-foreground font-medium">
                  {processedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center opacity-25 bg-card">
                        <Box className="h-12 w-12 mx-auto mb-3" />
                        <p className="text-sm font-bold uppercase tracking-widest select-none">No Inventory Tags Found</p>
                      </td>
                    </tr>
                  ) : (
                    processedProducts.map((p) => (
                      <tr key={p.id} className="group hover:bg-muted/40 border-b border-border/40 bg-card">
                        <td>
                          <div className="flex flex-col">
                            <span className="font-data font-bold text-primary">{p.sku}</span>
                            <span className="text-[10px] text-muted-foreground font-data flex items-center gap-1"><Barcode className="h-3 w-3" /> {p.barcode}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{p.category}</span>
                          </div>
                        </td>
                        <td className="text-right font-data">
                          <span className="text-foreground">{p.net_weight.toFixed(3)}g</span>
                          <span className="text-muted-foreground/40 mx-1">/</span>
                          <span className="text-muted-foreground text-xs">{p.gross_weight.toFixed(3)}g</span>
                        </td>
                        <td className="text-center">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-bold">{p.purity}</span>
                        </td>
                        <td className="text-right font-data font-bold">₹{p.selling_price.toLocaleString()}</td>
                        <td className="text-center">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.current_stock <= 2 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                            {p.current_stock}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEdit(p)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-all cursor-pointer"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => deleteProduct(p.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
