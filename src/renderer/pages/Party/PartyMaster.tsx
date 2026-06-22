import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useTabStore } from '../../store/useTabStore';
import { usePartyStore } from '../../store/usePartyStore';
import type { Party } from '../../../shared/ipc-api';
import { 
  Plus, 
  Search, 
  Printer, 
  Save, 
  Undo2, 
  Trash2, 
  LogOut, 
  Check, 
  User, 
  Camera, 
  ImageIcon, 
  Scissors 
} from 'lucide-react';

export default function PartyMasterView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const closeTab = useTabStore((state) => state.closeTab);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const { parties, loadParties, createParty, updateParty, deleteParty } = usePartyStore();

  // Split-screen states
  const [selectedRecord, setSelectedRecord] = useState<Party | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeFormTab, setActiveFormTab] = useState<'company' | 'other' | 'family'>('company');

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('45');
  const [groupName, setGroupName] = useState('ADMINISTRATIVE - EXPS');
  const [mobile, setMobile] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [acShort, setAcShort] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [city, setCity] = useState('AHMEDABAD');
  const [pinCode, setPinCode] = useState('');
  const [cityArea, setCityArea] = useState('BOPAL');
  const [gstNo, setGstNo] = useState('');
  const [gstType, setGstType] = useState('Local');
  const [panNo, setPanNo] = useState('');
  const [stateName, setStateName] = useState('Gujarat');
  const [district, setDistrict] = useState('');
  const [email, setEmail] = useState('');
  const [refBy, setRefBy] = useState('');

  // Opening Balance Fields
  const [openingAmount, setOpeningAmount] = useState('0.00');
  const [openingAmountType, setOpeningAmountType] = useState<'Dr' | 'Cr'>('Dr');
  const [openingGold, setOpeningGold] = useState('0.000');
  const [openingGoldType, setOpeningGoldType] = useState<'Dr' | 'Cr'>('Cr');
  const [openingSilver, setOpeningSilver] = useState('0.000');
  const [openingSilverType, setOpeningSilverType] = useState<'Dr' | 'Cr'>('Cr');
  const [lastVisit, setLastVisit] = useState('');
  const [ledgerDate, setLedgerDate] = useState('');

  // Family details mock state
  const [spouseName, setSpouseName] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [numChildren, setNumChildren] = useState('0');

  useEffect(() => {
    if (selectedCompany) {
      loadParties(selectedCompany.id);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (parties.length > 0 && !selectedRecord) {
      setSelectedRecord(parties[0]);
      populateForm(parties[0]);
    }
  }, [parties, selectedRecord]);

  const populateForm = (rec: Party | null) => {
    if (rec) {
      setCode(rec.code);
      setName(rec.name);
      setGroupId(rec.group_id || '45');
      setGroupName(rec.group_name || 'ADMINISTRATIVE - EXPS');
      setMobile(rec.mobile || '');
      setPhone(rec.phone || '');
      setContactPerson(rec.contact_person || '');
      setAcShort(rec.ac_short || '');
      setAddress1(rec.address1 || '');
      setAddress2(rec.address2 || '');
      setAddress3(rec.address3 || '');
      setCity(rec.city || 'AHMEDABAD');
      setPinCode(rec.pin_code || '');
      setCityArea(rec.city_area || 'BOPAL');
      setGstNo(rec.gst_no || '');
      setGstType(rec.gst_type || 'Local');
      setPanNo(rec.pan_no || '');
      setStateName(rec.state || 'Gujarat');
      setDistrict(rec.district || '');
      setEmail(rec.email || '');
      setRefBy(rec.ref_by || '');

      setOpeningAmount(String(rec.opening_amount || '0.00'));
      setOpeningAmountType(rec.opening_amount_type || 'Dr');
      setOpeningGold(String(rec.opening_gold || '0.000'));
      setOpeningGoldType(rec.opening_gold_type || 'Cr');
      setOpeningSilver(String(rec.opening_silver || '0.000'));
      setOpeningSilverType(rec.opening_silver_type || 'Cr');
      setLastVisit(rec.last_visit || '');
      setLedgerDate(rec.ledger_date || '');
    } else {
      setCode('');
      setName('');
      setGroupId('45');
      setGroupName('ADMINISTRATIVE - EXPS');
      setMobile('');
      setPhone('');
      setContactPerson('');
      setAcShort('');
      setAddress1('');
      setAddress2('');
      setAddress3('');
      setCity('AHMEDABAD');
      setPinCode('');
      setCityArea('BOPAL');
      setGstNo('');
      setGstType('Local');
      setPanNo('');
      setStateName('Gujarat');
      setDistrict('');
      setEmail('');
      setRefBy('');
      setOpeningAmount('0.00');
      setOpeningAmountType('Dr');
      setOpeningGold('0.000');
      setOpeningGoldType('Cr');
      setOpeningSilver('0.000');
      setOpeningSilverType('Cr');
      setLastVisit('');
      setLedgerDate('');
      setSpouseName('');
      setAnniversaryDate('');
      setNumChildren('0');
    }
  };

  const handleSelectRecord = (rec: Party) => {
    setSelectedRecord(rec);
    populateForm(rec);
  };

  const handleNewRecord = () => {
    setSelectedRecord(null);
    populateForm(null);
    setCode(String(Math.floor(100000 + Math.random() * 900000))); // Mock auto-code
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      alert('Please fill out the Account Name.');
      return;
    }
    if (!code.trim()) {
      alert('Please specify an Account Code.');
      return;
    }
    if (!selectedCompany) return;

    const payload = {
      company_id: selectedCompany.id,
      code: code.trim(),
      name: name.trim(),
      group_id: groupId,
      group_name: groupName,
      mobile: mobile.trim(),
      phone: phone.trim(),
      contact_person: contactPerson.trim(),
      ac_short: acShort.trim(),
      address1: address1.trim(),
      address2: address2.trim(),
      address3: address3.trim(),
      city,
      pin_code: pinCode.trim(),
      city_area: cityArea,
      gst_no: gstNo.trim(),
      gst_type: gstType,
      pan_no: panNo.trim(),
      state: stateName,
      district,
      email: email.trim(),
      ref_by: refBy.trim(),
      opening_amount: parseFloat(openingAmount) || 0.0,
      opening_amount_type: openingAmountType,
      opening_gold: parseFloat(openingGold) || 0.0,
      opening_gold_type: openingGoldType,
      opening_silver: parseFloat(openingSilver) || 0.0,
      opening_silver_type: openingSilverType,
      last_visit: lastVisit,
      ledger_date: ledgerDate
    };

    try {
      if (selectedRecord) {
        await updateParty({
          ...selectedRecord,
          ...payload
        });
        alert('Party registry details updated successfully.');
      } else {
        const created = await createParty(payload);
        setSelectedRecord(created);
        alert('New Party created successfully.');
      }
    } catch (err: any) {
      alert(`Error saving party: ${err.message || err}`);
    }
  };

  const handleCancel = () => {
    populateForm(selectedRecord);
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;

    if (confirm(`CAUTION: Permanently delete Party "${selectedRecord.name}" and all transaction links?`)) {
      try {
        await deleteParty(selectedRecord.id);
        alert('Party record removed successfully.');
        setSelectedRecord(null);
        populateForm(null);
      } catch (err) {
        alert('Error deleting party record.');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  // Search filter
  const filteredParties = parties.filter(p => {
    const q = globalFilter.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.mobile && p.mobile.includes(q));
  });

  return (
    <div className="p-3 bg-background text-foreground h-full overflow-hidden flex flex-col font-sans select-none no-print transition-colors duration-200">
      
      {/* 1. Main Split-Panel Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0 pb-2">
        
        {/* LEFT PANEL: Search List & Opening Balances (col-span-5) */}
        <div className="col-span-5 bg-card text-card-foreground border border-border rounded-lg shadow-sm flex flex-col overflow-hidden transition-colors duration-200">
          
          <div className="bg-secondary/40 px-3 py-1.5 border-b border-border flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider font-luxury text-foreground/80">Search Name - Mobile</span>
            <button
              onClick={handleNewRecord}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[9px] uppercase tracking-wider rounded-md shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Party</span>
            </button>
          </div>

          {/* Search box input */}
          <div className="p-2 border-b border-border bg-secondary/10 shrink-0">
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by code, name, or mobile..."
                className="bg-transparent border-none text-[11px] focus:outline-none w-full font-semibold select-text text-foreground placeholder:text-muted-foreground/45"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Table List */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs ag-grid-dense-table">
              <thead>
                <tr className="bg-secondary/40 border-b border-border sticky top-0 z-10 text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-2 text-center w-20">Code</th>
                  <th className="p-2">Name</th>
                  <th className="p-2 text-center w-28">Mobile</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-foreground font-data">
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-muted-foreground/50 italic font-sans">
                      No matching party records.
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((p) => {
                    const isSelected = selectedRecord?.id === p.id;
                    return (
                      <tr 
                        key={p.id}
                        onClick={() => handleSelectRecord(p)}
                        className={`cursor-pointer border-b border-border/40 transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-l-[3px] border-l-primary font-bold text-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <td className="p-1.5 text-center font-data text-primary">{p.code}</td>
                        <td className="p-1.5 font-sans font-bold text-foreground">{p.name}</td>
                        <td className="p-1.5 text-center font-data text-muted-foreground">{p.mobile || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Photo & Opening Balance Section */}
          <div className="p-3 border-t border-border bg-secondary/15 grid grid-cols-12 gap-3 shrink-0 select-none">
            
            {/* Photo Box Placeholder */}
            <div className="col-span-5 flex flex-col items-center justify-between">
              <div className="w-full h-28 border border-border rounded-lg bg-card flex flex-col items-center justify-center relative overflow-hidden shadow-inner group">
                {selectedRecord ? (
                  <div className="text-center p-2 text-muted-foreground">
                    <User className="h-9 w-9 mx-auto text-primary mb-1" />
                    <span className="text-[9px] font-sans block font-bold uppercase truncate max-w-full">{selectedRecord.name}</span>
                  </div>
                ) : (
                  <div className="text-center p-2 text-muted-foreground/60">
                    <User className="h-9 w-9 mx-auto mb-1 text-muted-foreground/40" />
                    <span className="text-[8px] font-sans block font-bold uppercase tracking-wider text-slate-450">No Image</span>
                  </div>
                )}
              </div>
              <div className="flex w-full gap-1 border border-border rounded-lg p-0.5 bg-card shadow-xs mt-1.5">
                <button type="button" className="flex-1 py-1 hover:bg-secondary flex items-center justify-center border border-transparent rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground" title="Capture Image">
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="flex-1 py-1 hover:bg-secondary flex items-center justify-center border border-transparent rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground" title="Select File">
                  <ImageIcon className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="flex-1 py-1 hover:bg-secondary flex items-center justify-center border border-transparent rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground" title="Crop Image">
                  <Scissors className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Opening Balance Fields */}
            <div className="col-span-7 space-y-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-primary uppercase block tracking-wider font-luxury border-b border-border pb-0.5">Opening Balance</span>
              
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-muted-foreground uppercase w-12 shrink-0">Amount</span>
                <input
                  type="number"
                  step="0.01"
                  className="!h-7 !px-2 !py-0.5 text-right font-data text-xs bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary flex-1 min-w-0 select-text"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
                <select
                  className="!h-7 !p-1 !w-12 font-bold text-[10px] bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer text-center"
                  value={openingAmountType}
                  onChange={(e) => setOpeningAmountType(e.target.value as any)}
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-muted-foreground uppercase w-12 shrink-0">Gold</span>
                <input
                  type="number"
                  step="0.001"
                  className="!h-7 !px-2 !py-0.5 text-right font-data text-xs bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary flex-1 min-w-0 select-text"
                  value={openingGold}
                  onChange={(e) => setOpeningGold(e.target.value)}
                />
                <select
                  className="!h-7 !p-1 !w-12 font-bold text-[10px] bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer text-center"
                  value={openingGoldType}
                  onChange={(e) => setOpeningGoldType(e.target.value as any)}
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-muted-foreground uppercase w-12 shrink-0">Silver</span>
                <input
                  type="number"
                  step="0.001"
                  className="!h-7 !px-2 !py-0.5 text-right font-data text-xs bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary flex-1 min-w-0 select-text"
                  value={openingSilver}
                  onChange={(e) => setOpeningSilver(e.target.value)}
                />
                <select
                  className="!h-7 !p-1 !w-12 font-bold text-[10px] bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer text-center"
                  value={openingSilverType}
                  onChange={(e) => setOpeningSilverType(e.target.value as any)}
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border mt-1">
                <div>
                  <label className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Last Visit</label>
                  <input
                    type="date"
                    className="!h-7 !px-2 !py-0.5 font-data text-[10px] bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary select-text w-full cursor-pointer"
                    value={lastVisit}
                    onChange={(e) => setLastVisit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Ledger Date</label>
                  <input
                    type="date"
                    className="!h-7 !px-2 !py-0.5 font-data text-[10px] bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary select-text w-full cursor-pointer"
                    value={ledgerDate}
                    onChange={(e) => setLedgerDate(e.target.value)}
                  />
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT PANEL: Party Details Input Form (col-span-7) */}
        <div className="col-span-7 bg-card text-card-foreground border border-border rounded-lg shadow-sm flex flex-col overflow-hidden transition-colors duration-200">
          
          {/* Main title bar */}
          <div className="bg-secondary/40 px-3 py-2 border-b border-border flex justify-between items-center shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider font-luxury text-primary">
              {selectedRecord ? `${selectedRecord.code} - ${selectedRecord.name}` : 'New Party Registration'}
            </span>
            <span className="text-[10px] font-bold text-primary font-data uppercase tracking-widest">Party Master Control</span>
          </div>

          {/* Form Area */}
          <div className="flex-1 overflow-y-auto p-3.5">
            <form onSubmit={handleSave} className="space-y-2.5">
              
              {/* TAB 1: Company Detail */}
              {activeFormTab === 'company' && (
                <div className="space-y-2">
                  
                  {/* Ac Code */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Ac Code</label>
                    <div className="col-span-4 flex gap-1">
                      <input 
                        type="text" 
                        required 
                        className="erp-input font-data text-amber-700 font-bold select-text" 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                      <button type="button" className="px-2 bg-slate-100 hover:bg-slate-200 border border-slate-350 text-[10px] font-extrabold rounded-[2px]">F1</button>
                    </div>
                    <div className="col-span-5 flex gap-1 justify-end select-none">
                      <button type="button" className="px-2 bg-slate-100 hover:bg-slate-200 border border-slate-350 text-[9px] font-extrabold rounded-[2px]">A</button>
                      <button type="button" className="px-2 bg-slate-100 hover:bg-slate-200 border border-slate-350 text-[9px] font-extrabold rounded-[2px]">D</button>
                      <button type="button" className="px-2 bg-slate-100 hover:bg-slate-200 border border-slate-350 text-[9px] font-extrabold rounded-[2px]">S</button>
                    </div>
                  </div>

                  {/* Ac Name */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Ac Name *</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        required 
                        placeholder="Account Registry Name"
                        className="erp-input font-bold select-text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Ac Group */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Ac Group</label>
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        className="erp-input font-data text-center select-text" 
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                      />
                    </div>
                    <div className="col-span-6">
                      <select 
                        className="erp-input font-bold" 
                        value={groupName}
                        onChange={(e) => {
                          setGroupName(e.target.value);
                          if (e.target.value === 'ADMINISTRATIVE - EXPS') setGroupId('45');
                          else if (e.target.value === 'Customer Ledger') setGroupId('10');
                          else if (e.target.value === 'Supplier Ledger') setGroupId('20');
                          else setGroupId('99');
                        }}
                      >
                        <option value="ADMINISTRATIVE - EXPS">ADMINISTRATIVE - EXPS</option>
                        <option value="Customer Ledger">Customer Ledger</option>
                        <option value="Supplier Ledger">Supplier Ledger</option>
                        <option value="Sundry Debtors">Sundry Debtors</option>
                        <option value="Sundry Creditors">Sundry Creditors</option>
                      </select>
                    </div>
                    <div className="col-span-1 text-right">
                      <button type="button" className="px-2 bg-slate-100 hover:bg-slate-200 border border-slate-350 text-[10px] font-extrabold rounded-[2px]">6</button>
                    </div>
                  </div>

                  {/* Mobile & Phone */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Mobile No</label>
                    <div className="col-span-4">
                      <input 
                        type="text" 
                        placeholder="Mobile Number"
                        className="erp-input font-data select-text" 
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                    </div>
                    <label className="col-span-1 text-[10px] font-bold text-slate-500 text-right pr-1 uppercase">Phone</label>
                    <div className="col-span-4">
                      <input 
                        type="text" 
                        placeholder="Landline"
                        className="erp-input font-data select-text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Con Person & Ac Short */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Con Person</label>
                    <div className="col-span-5">
                      <input 
                        type="text" 
                        placeholder="Contact Person Name"
                        className="erp-input select-text" 
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                      />
                    </div>
                    <label className="col-span-1 text-[10px] font-bold text-slate-500 text-right pr-1 uppercase">Short</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        placeholder="Short Tag"
                        className="erp-input select-text" 
                        value={acShort}
                        onChange={(e) => setAcShort(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Address 1 */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Address 1</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="Flat/Premises details"
                        className="erp-input select-text" 
                        value={address1}
                        onChange={(e) => setAddress1(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Address 2 */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Address 2</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="Building / Landmark details"
                        className="erp-input select-text" 
                        value={address2}
                        onChange={(e) => setAddress2(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Address 3 */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Address 3</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="Street / Sector details"
                        className="erp-input select-text" 
                        value={address3}
                        onChange={(e) => setAddress3(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* City & Pin Code */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">City</label>
                    <div className="col-span-4">
                      <select 
                        className="erp-input font-bold" 
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      >
                        <option value="AHMEDABAD">AHMEDABAD</option>
                        <option value="SURAT">SURAT</option>
                        <option value="RAJKOT">RAJKOT</option>
                        <option value="BARODA">BARODA</option>
                        <option value="MUMBAI">MUMBAI</option>
                      </select>
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-slate-500 text-right pr-1 uppercase">Pin Code</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        placeholder="380000"
                        className="erp-input font-data select-text" 
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* City Area */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">City Area</label>
                    <div className="col-span-9">
                      <select 
                        className="erp-input font-bold" 
                        value={cityArea}
                        onChange={(e) => setCityArea(e.target.value)}
                      >
                        <option value="BOPAL">BOPAL</option>
                        <option value="ISCON">ISCON</option>
                        <option value="VASTRAPUR">VASTRAPUR</option>
                        <option value="SATELLITE">SATELLITE</option>
                        <option value="GANDHINAGAR">GANDHINAGAR</option>
                      </select>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: Other Detail */}
              {activeFormTab === 'other' && (
                <div className="space-y-2">
                  
                  {/* GST No */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Gst No</label>
                    <div className="col-span-5">
                      <input 
                        type="text" 
                        placeholder="GSTIN Code"
                        className="erp-input font-data uppercase select-text" 
                        value={gstNo}
                        onChange={(e) => setGstNo(e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <select 
                        className="erp-input font-bold" 
                        value={gstType}
                        onChange={(e) => setGstType(e.target.value)}
                      >
                        <option value="Local">Local</option>
                        <option value="Out of State">Out of State</option>
                        <option value="Exempt/Consumer">Consumer</option>
                      </select>
                    </div>
                  </div>

                  {/* Pan No */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Pan No</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="PAN Card Number"
                        className="erp-input font-data uppercase select-text" 
                        value={panNo}
                        onChange={(e) => setPanNo(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* State & District */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">State</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        className="erp-input select-text" 
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">District</label>
                    <div className="col-span-9">
                      <select 
                        className="erp-input font-bold" 
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                      >
                        <option value="">-- Select District --</option>
                        <option value="Ahmedabad">Ahmedabad</option>
                        <option value="Surat">Surat</option>
                        <option value="Rajkot">Rajkot</option>
                        <option value="Vadodara">Vadodara</option>
                      </select>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Email</label>
                    <div className="col-span-9">
                      <input 
                        type="email" 
                        placeholder="username@domain.com"
                        className="erp-input font-data select-text" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Ref By */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Ref By</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="Reference details"
                        className="erp-input select-text" 
                        value={refBy}
                        onChange={(e) => setRefBy(e.target.value)}
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: Family Detail */}
              {activeFormTab === 'family' && (
                <div className="space-y-3">
                  
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Spouse Name</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="Spouse Name"
                        className="erp-input select-text" 
                        value={spouseName}
                        onChange={(e) => setSpouseName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Anniversary</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="DD/MM/YYYY"
                        className="erp-input font-data select-text" 
                        value={anniversaryDate}
                        onChange={(e) => setAnniversaryDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Children</label>
                    <div className="col-span-3">
                      <input 
                        type="number" 
                        className="erp-input text-center font-data select-text" 
                        value={numChildren}
                        onChange={(e) => setNumChildren(e.target.value)}
                      />
                    </div>
                  </div>

                </div>
              )}

            </form>
          </div>

          {/* Sub Tab Switcher Line */}
          <div className="bg-secondary/20 border-t border-border h-9 flex items-end px-3 select-none shrink-0 transition-colors">
            <div className="flex gap-0.5 h-full items-end">
              <button
                type="button"
                onClick={() => setActiveFormTab('company')}
                className={`px-4 h-7 rounded-t border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'company'
                    ? 'bg-card border-border border-t-primary border-t-2 border-b-card text-foreground font-extrabold z-10'
                    : 'bg-secondary/45 border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                Company Detail
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('other')}
                className={`px-4 h-7 rounded-t border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'other'
                    ? 'bg-card border-border border-t-primary border-t-2 border-b-card text-foreground font-extrabold z-10'
                    : 'bg-secondary/45 border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                Other Detail
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('family')}
                className={`px-4 h-7 rounded-t border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'family'
                    ? 'bg-card border-border border-t-primary border-t-2 border-b-card text-foreground font-extrabold z-10'
                    : 'bg-secondary/45 border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                Family Detl
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 2. BOTTOM ACTION BUTTONS TOOLBAR */}
      <footer className="bg-secondary/20 border border-border rounded-lg p-2 flex justify-end gap-3 shrink-0 shadow-sm select-none mt-2 transition-colors">
        
        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-card hover:bg-muted border border-border hover:border-border/80 rounded-md font-semibold uppercase shadow-xs transition-all text-xs active:scale-[0.98] cursor-pointer text-foreground animate-in duration-200"
        >
          <Printer className="h-4 w-4 text-slate-500" />
          <span>Print</span>
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border border-transparent rounded-md font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer animate-in duration-200"
        >
          <Save className="h-4 w-4" />
          <span>Save</span>
        </button>

        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-card hover:bg-muted border border-border hover:border-border/80 rounded-md font-semibold uppercase shadow-xs transition-all text-xs active:scale-[0.98] cursor-pointer text-foreground animate-in duration-200"
        >
          <Undo2 className="h-4 w-4 text-slate-500" />
          <span>Cancel</span>
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDeleteRecord}
          disabled={!selectedRecord}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive/30 rounded-md font-semibold uppercase shadow-xs transition-all text-xs active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:hover:bg-destructive/10 disabled:active:scale-100 animate-in duration-200"
        >
          <Trash2 className="h-4 w-4 text-rose-500" />
          <span>Delete</span>
        </button>

        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border rounded-md font-semibold uppercase shadow-xs transition-all text-xs active:scale-[0.98] cursor-pointer animate-in duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit</span>
        </button>

      </footer>

    </div>
  );
}
