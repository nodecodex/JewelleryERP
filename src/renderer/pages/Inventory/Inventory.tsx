import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useProductStore } from '../../store/useProductStore';
import type { Product } from '../../../shared/ipc-api';
import { Layers, Plus, Search, Barcode, Trash2, Edit2, ArrowUpDown, Tag, Box, Filter, Download, MoreVertical } from 'lucide-react';
import { useDialog } from '../../components/ui/DialogProvider';

type SortField = 'name' | 'sku' | 'category' | 'selling_price' | 'current_stock';
type SortOrder = 'asc' | 'desc';

export default function InventoryView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { products, loadProducts, createProduct, updateProduct, deleteProduct } = useProductStore();
  const { showToast } = useDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', qr_code: '', category: 'Gold Jewellery' as any,
    weight: 0, tounch: 100, gross_weight: 0, purity: '22K', stone_weight: 0,
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
      category: 'Gold Jewellery', weight: 0, tounch: 100, gross_weight: 0, purity: '22K', stone_weight: 0,
      making_charges: 0, making_charges_type: 'fixed', hsn_code: '7113', gst_rate: 3.0, purchase_price: 0, selling_price: 0, current_stock: 1,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name, sku: prod.sku, barcode: prod.barcode || '', qr_code: prod.qr_code || '',
      category: prod.category, weight: prod.weight, tounch: prod.tounch || 100, gross_weight: prod.gross_weight,
      purity: prod.purity || '', stone_weight: prod.stone_weight, making_charges: prod.making_charges,
      making_charges_type: prod.making_charges_type, hsn_code: prod.hsn_code || '', gst_rate: prod.gst_rate,
      purchase_price: prod.purchase_price, selling_price: prod.selling_price, current_stock: prod.current_stock,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    const fine_weight = (formData.gross_weight - formData.stone_weight) * (formData.tounch / 100);
    const dataToSave = { ...formData, fine: fine_weight };

    try {
      if (editingProduct) await updateProduct({ ...editingProduct, ...dataToSave });
      else await createProduct({ company_id: selectedCompany.id, ...dataToSave });
      setIsFormOpen(false);
    } catch (e) { showToast('Error saving product.', 'error'); }
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
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      {/* HEADER SECTION */}
      <div className="px-4 py-2.5 border-b border-[#262626] flex items-center justify-between shrink-0 bg-[#181818]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#FFC000]" />
            INVENTORY STOCK MASTER
          </h2>
          <p className="text-[10px] text-[#7D7D7D] uppercase tracking-wider mt-0.5">Manage jewelry tags, purity, tounch ratio & live physical stock.</p>
        </div>
        {!isFormOpen && (
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-[#202020] rounded-none border border-white/40 text-white transition-all cursor-pointer">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleOpenCreate} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FFC000] text-black rounded-none hover:bg-[#917300] transition-colors font-extrabold text-xs uppercase tracking-wider cursor-pointer">
              <Plus className="h-3.5 w-3.5 stroke-[3]" /> Add Tag (Ins)
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-3 lg:p-3.5 bg-black">
        {isFormOpen ? (
          <div className="max-w-3xl mx-auto w-full h-full min-h-0 overflow-hidden flex flex-col">
            <form onSubmit={handleSubmit} className="overflow-hidden flex flex-col h-full min-h-0 bg-[#181818] border border-[#2c2c2c] rounded-none">
              {/* STICKY FORM HEADER */}
              <div className="bg-[#121212] px-4 py-3 border-b border-[#262626] flex justify-between items-center shrink-0 select-none">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#FFC000]" />
                  {editingProduct ? 'EDIT INVENTORY ITEM' : 'REGISTER NEW ITEM TAG'}
                </h3>
                <span className="text-[10px] font-mono font-bold text-[#FFC000] uppercase">
                  {editingProduct ? 'SKU: ' + formData.sku : 'NEW REGISTRATION'}
                </span>
              </div>

              {/* SCROLLABLE FORM BODY */}
              <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
                {/* PRIMARY DETAILS */}
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-3">
                    <label className="erp-label text-[10px]">Short Code</label>
                    <input
                      type="text"
                      placeholder="e.g. GR"
                      className="w-full h-8 px-2 font-mono font-bold border border-[#2c2c2c] rounded-none text-white bg-black focus:outline-none focus:border-[#FFC000] uppercase"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="erp-label text-[10px]">Description / Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full h-8 px-2 font-semibold border border-[#2c2c2c] rounded-none text-white bg-black focus:outline-none focus:border-[#FFC000]"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="erp-label text-[10px]">Category Group</label>
                    <select
                      className="w-full h-8 px-2 font-semibold border border-[#2c2c2c] rounded-none text-white bg-black focus:outline-none focus:border-[#FFC000] cursor-pointer"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      {['Gold Jewellery', 'Silver Jewellery', 'Diamond Jewellery', 'Platinum Jewellery', 'Coins', 'Custom'].map(cat => <option key={cat} className="bg-[#181818]">{cat}</option>)}
                    </select>
                  </div>
                </div>

                {/* WEIGHT & PURITY */}
                <div className="grid grid-cols-12 gap-2.5 bg-black/60 p-3 rounded-none border border-[#262626]">
                  <div className="col-span-3">
                    <label className="erp-label text-[10px]">Gross Wt (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full h-8 px-2 text-right font-mono border border-[#2c2c2c] rounded-none text-white bg-black focus:border-[#FFC000]"
                      value={formData.gross_weight || ''}
                      onChange={(e) => setFormData({ ...formData, gross_weight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="erp-label text-[10px]">Stone Wt (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full h-8 px-2 text-right font-mono border border-[#2c2c2c] rounded-none text-white bg-black focus:border-[#FFC000]"
                      value={formData.stone_weight || ''}
                      onChange={(e) => setFormData({ ...formData, stone_weight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="erp-label text-[10px]">Tounch %</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full h-8 px-2 text-right font-mono border border-[#2c2c2c] rounded-none text-white bg-black focus:border-[#FFC000]"
                      value={formData.tounch || ''}
                      onChange={(e) => setFormData({ ...formData, tounch: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="erp-label text-[10px]">Fine Wt (Calc)</label>
                    <input
                      type="number"
                      step="0.001"
                      readOnly
                      className="w-full h-8 px-2 text-right font-mono font-bold text-[#FFC000] border border-[#262626] rounded-none bg-black/80 cursor-not-allowed"
                      value={((formData.gross_weight - formData.stone_weight) * (formData.tounch / 100)).toFixed(3)}
                    />
                  </div>
                </div>

                {/* PRICING & STOCK */}
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-4">
                    <label className="erp-label text-[10px]">Purity Standard</label>
                    <select
                      className="w-full h-8 px-2 font-semibold border border-[#2c2c2c] rounded-none text-white bg-black focus:outline-none focus:border-[#FFC000] cursor-pointer"
                      value={formData.purity}
                      onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                    >
                      {['9K', '10K', '12K', '14K', '16K', '18K', '20K', '21K', '22K', '23K', '24K'].map(k => (
                        <option key={k} value={k} className="bg-[#181818]">{k}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="erp-label text-[10px]">Stone Charges (₹)</label>
                    <input
                      type="number"
                      className="w-full h-8 px-2 text-right font-mono border border-[#2c2c2c] rounded-none text-white bg-black focus:border-[#FFC000]"
                      value={formData.making_charges || ''}
                      onChange={(e) => setFormData({ ...formData, making_charges: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="erp-label text-[10px]">Stock Qty</label>
                    <input
                      type="number"
                      className="w-full h-8 px-2 text-right font-mono border border-[#2c2c2c] rounded-none text-white bg-black focus:border-[#FFC000]"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* STICKY ACTION FOOTER */}
              <div className="bg-[#121212] px-4 py-2.5 border-t border-[#262626] flex justify-end gap-2 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-1.5 bg-transparent border border-white/40 text-white hover:bg-white/10 font-bold rounded-none text-xs uppercase cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#FFC000] text-black font-extrabold rounded-none text-xs uppercase hover:bg-[#917300] cursor-pointer transition-colors"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-2.5">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-[#7D7D7D] group-focus-within:text-[#FFC000] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search SKU, Barcode, or Item..."
                    className="w-64 lg:w-80 pl-8 h-8 bg-black border border-[#2c2c2c] rounded-none text-xs text-white focus:outline-none focus:border-[#FFC000] transition-colors font-medium placeholder-[#7D7D7D]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="flex items-center gap-1.5 px-3 h-8 bg-transparent border border-white/40 rounded-none text-xs font-bold uppercase text-white hover:bg-white/10 transition-colors cursor-pointer">
                  <Filter className="h-3.5 w-3.5" /> Filter
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-[#7D7D7D] uppercase bg-[#181818] px-3 py-1.5 rounded-none border border-[#262626] select-none">
                  Total Items: {processedProducts.length}
                </span>
              </div>
            </div>

            {/* PRODUCT TABLE */}
            <div className="flex-1 erp-table-container rounded-none border border-[#262626] overflow-hidden bg-[#202020] flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="ag-grid-dense-table w-full text-xs">
                  <thead className="sticky top-0 bg-[#181818] z-10">
                    <tr className="border-b border-[#262626] text-[10.5px] uppercase tracking-wider text-[#7D7D7D]">
                      <th className="py-2.5 px-3 text-left w-[16%] cursor-pointer hover:text-white" onClick={() => { setSortField('sku'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>SKU Code</th>
                      <th className="py-2.5 px-3 text-left w-[32%] cursor-pointer hover:text-white" onClick={() => { setSortField('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Description</th>
                      <th className="py-2.5 px-3 text-right">Net Wt / Gross</th>
                      <th className="py-2.5 px-3 text-center">Purity</th>
                      <th className="py-2.5 px-3 text-right">Labour (₹)</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-2 text-center w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] font-medium text-white">
                    {processedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-14 text-center opacity-40 bg-[#202020] text-[#7D7D7D]">
                          <Box className="h-8 w-8 mx-auto mb-2 text-[#FFC000]" />
                          <p className="text-[11px] font-bold uppercase tracking-widest select-none text-white">No Inventory Tags Found</p>
                        </td>
                      </tr>
                    ) : (
                      processedProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#282828] transition-colors">
                          <td className="py-2 px-3">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-[#FFC000]">{p.sku}</span>
                              <span className="text-[9.5px] text-[#7D7D7D] font-mono flex items-center gap-0.5"><Barcode className="h-2.5 w-2.5" /> {p.barcode}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white uppercase">{p.name}</span>
                              <span className="text-[9.5px] text-[#7D7D7D] uppercase font-mono">{p.category}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">
                            <span className="text-white font-bold">{p.fine.toFixed(3)}g</span>
                            <span className="text-[#7D7D7D] mx-1">/</span>
                            <span className="text-[#7D7D7D] text-[11px]">{p.gross_weight.toFixed(3)}g</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 bg-[#FFC000]/10 text-[#FFC000] border border-[#FFC000]/30 rounded-none text-[9.5px] font-bold font-mono uppercase">{p.purity}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white tabular-nums">₹{p.making_charges.toLocaleString()}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-none text-[11px] font-mono font-bold tabular-nums border ${p.current_stock <= 2 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                              {p.current_stock}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleOpenEdit(p)} title="Edit" className="p-1 hover:bg-[#282828] rounded-none text-[#7D7D7D] hover:text-[#FFC000] transition-colors cursor-pointer"><Edit2 className="h-3.5 w-3.5" /></button>
                              <button onClick={() => deleteProduct(p.id)} title="Delete" className="p-1 hover:bg-rose-500/10 rounded-none text-[#7D7D7D] hover:text-rose-400 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
