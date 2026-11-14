import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useTabStore } from '../../store/useTabStore';
import type { Company } from '../../../shared/ipc-api';
import { 
  Building2, 
  Plus, 
  Printer, 
  Save, 
  Undo2, 
  Trash2, 
  LogOut,
  Search,
  Check,
  FolderOpen
} from 'lucide-react';
import { useDialog } from '../../components/ui/DialogProvider';

export default function CompanyView() {
  const { 
    companies, 
    selectedCompany, 
    loadCompanies, 
    setSelectedCompany, 
    createCompany, 
    updateCompany, 
    deleteCompany 
  } = useCompanyStore();
  const { showToast, showConfirm } = useDialog();

  const closeTab = useTabStore((state) => state.closeTab);
  const activeTabId = useTabStore((state) => state.activeTabId);

  // Split-screen states
  const [selectedRecord, setSelectedRecord] = useState<Company | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeFormTab, setActiveFormTab] = useState<'company' | 'tax' | 'bank'>('company');

  // Form Fields
  const [name, setName] = useState('');
  const [financialYearStart, setFinancialYearStart] = useState('2026-04-01');
  const [financialYearEnd, setFinancialYearEnd] = useState('2027-03-31');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [email, setEmail] = useState('');
  
  // Address Line Sub-splits (saved concatenated with \n in database)
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('24');
  const [stateName, setStateName] = useState('Gujarat');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('INDIA');

  // Phone Parameter Sub-splits (saved encoded in settings_json)
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobile2, setMobile2] = useState('');
  
  // Config Parameter Sub-splits (saved encoded in settings_json)
  const [workType, setWorkType] = useState('Retail');
  const [metalType, setMetalType] = useState('Gold');
  const [reportHeader, setReportHeader] = useState('Company');
  const [coType, setCoType] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  // Sync selected record on load or company updates
  useEffect(() => {
    if (companies.length > 0) {
      // Pick global company workspace first, fallback to first in list
      const target = companies.find((c) => c.id === selectedCompany?.id) || companies[0];
      setSelectedRecord(target);
      populateForm(target);
    } else {
      setSelectedRecord(null);
      populateForm(null);
    }
  }, [companies]);

  const populateForm = (comp: Company | null) => {
    if (comp) {
      setName(comp.name);
      setFinancialYearStart(comp.financial_year_start);
      setFinancialYearEnd(comp.financial_year_end);
      setGstin(comp.gstin || '');
      setPan(comp.pan || '');
      setBankName(comp.bank_name || '');
      setBankAccountNo(comp.bank_account_no || '');
      setBankIfsc(comp.bank_ifsc || '');
      setEmail(comp.email || '');
      
      const lines = (comp.address || '').split('\n');
      setAddress1(lines[0] || '');
      setAddress2(lines[1] || '');
      setAddress3(lines[2] || '');
      setCity(lines[3] || '');
      setStateName(lines[4] || '');
      setPinCode(lines[5] || '');
      setCountry(lines[6] || 'INDIA');
      
      setMobile(comp.phone || '');
      
      try {
        const settings = JSON.parse(comp.settings_json || '{}');
        setPhone(settings.phone || '');
        setPhone2(settings.phone2 || '');
        setMobile2(settings.mobile2 || '');
        setWorkType(settings.workType || 'Retail');
        setMetalType(settings.metalType || 'Gold');
        setReportHeader(settings.reportHeader || 'Company');
        setCoType(settings.coType || '');
        setStateCode(settings.stateCode || '24');
      } catch (err) {
        setPhone('');
        setPhone2('');
        setMobile2('');
        setWorkType('Retail');
        setMetalType('Gold');
        setReportHeader('Company');
        setCoType('');
        setStateCode('24');
      }
    } else {
      setName('');
      setFinancialYearStart('2026-04-01');
      setFinancialYearEnd('2027-03-31');
      setGstin('');
      setPan('');
      setBankName('');
      setBankAccountNo('');
      setBankIfsc('');
      setEmail('');
      setAddress1('');
      setAddress2('');
      setAddress3('');
      setCity('');
      setStateCode('24');
      setStateName('Gujarat');
      setPinCode('');
      setCountry('INDIA');
      setPhone('');
      setPhone2('');
      setMobile('');
      setMobile2('');
      setWorkType('Retail');
      setMetalType('Gold');
      setReportHeader('Company');
      setCoType('');
    }
  };

  const handleSelectRecord = (comp: Company) => {
    setSelectedRecord(comp);
    populateForm(comp);
  };

  const handleNewRecord = () => {
    setSelectedRecord(null);
    populateForm(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast('Please fill out the Company Name.', 'warning');
      return;
    }

    const joinedAddress = [
      address1.trim(),
      address2.trim(),
      address3.trim(),
      city.trim(),
      stateName.trim(),
      pinCode.trim(),
      country.trim()
    ].join('\n');

    const settings_json = JSON.stringify({
      phone,
      phone2,
      mobile2,
      workType,
      metalType,
      reportHeader,
      coType,
      stateCode
    });

    const payload = {
      name: name.trim(),
      financial_year_start: financialYearStart,
      financial_year_end: financialYearEnd,
      gstin: gstin.trim() || undefined,
      pan: pan.trim() || undefined,
      bank_name: bankName.trim() || undefined,
      bank_account_no: bankAccountNo.trim() || undefined,
      bank_ifsc: bankIfsc.trim() || undefined,
      address: joinedAddress,
      phone: mobile.trim() || undefined,
      email: email.trim() || undefined,
      settings_json
    };

    try {
      if (selectedRecord) {
        await updateCompany({
          ...selectedRecord,
          ...payload
        });
        showToast('Company details updated successfully.', 'success');
      } else {
        const created = await createCompany(payload);
        setSelectedRecord(created);
        showToast('New company workspace created successfully.', 'success');
      }
      loadCompanies();
    } catch (err) {
      showToast('Error saving company master record.', 'error');
    }
  };

  const handleCancel = () => {
    populateForm(selectedRecord);
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;
    
    if (selectedCompany && selectedCompany.id === selectedRecord.id) {
      showToast('Cannot delete the active workspace company. Switch company context in top panel first.', 'warning');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Delete Company',
      message: `CAUTION: Delete "${selectedRecord.name}" permanent database registers?`,
      variant: 'danger',
      confirmText: 'Delete',
    });

    if (confirmed) {
      try {
        await deleteCompany(selectedRecord.id);
        showToast('Company removed successfully.', 'success');
        loadCompanies();
      } catch (err) {
        showToast('Error deleting company record.', 'error');
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

  // Filter Left Panel List
  const filteredCompanies = companies.filter((comp) => {
    const q = globalFilter.toLowerCase();
    
    // Check code/index indicator
    const idxMatch = companies.indexOf(comp) !== -1 && String(companies.indexOf(comp) + 1).padStart(2, '0').includes(q);
    
    // Check name and GSTIN
    const matchesNameOrGst = comp.name.toLowerCase().includes(q) || 
      (comp.gstin && comp.gstin.toLowerCase().includes(q));
      
    // Check main phone column in DB
    const matchesPhone = comp.phone && comp.phone.toLowerCase().includes(q);
    
    // Check other phone / mobile numbers stored inside settings_json
    let matchesSettingsPhone = false;
    if (comp.settings_json) {
      try {
        const settings = JSON.parse(comp.settings_json);
        if (
          (settings.phone && String(settings.phone).toLowerCase().includes(q)) ||
          (settings.phone2 && String(settings.phone2).toLowerCase().includes(q)) ||
          (settings.mobile2 && String(settings.mobile2).toLowerCase().includes(q))
        ) {
          matchesSettingsPhone = true;
        }
      } catch (e) {
        // Safe check ignore
      }
    }
    
    return idxMatch || matchesNameOrGst || matchesPhone || matchesSettingsPhone;
  });

  return (
    <div className="p-3 bg-background text-foreground h-full overflow-hidden flex flex-col font-sans select-none">
      
      {/* 1. Split Panel Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0 pb-2">
        
        {/* LEFT PANEL: Search and Table Records (40% width) */}
        <div className="col-span-5 bg-card text-foreground border border-border rounded-none flex flex-col overflow-hidden">
          <div className="bg-secondary px-3 py-2 border-b border-border flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Company Directory</span>
            <button
              onClick={handleNewRecord}
              className="flex items-center gap-1 px-3 py-1 bg-[#FFC000] hover:bg-[#917300] text-black font-extrabold text-[9px] uppercase tracking-wider rounded-none transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3 stroke-[3]" />
              <span>New Company</span>
            </button>
          </div>

          {/* Search box input */}
          <div className="p-2 border-b border-border bg-secondary shrink-0">
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-none px-2 py-1 focus-within:border-[#FFC000]">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by code, name, GSTIN, or phone..."
                className="bg-transparent border-none text-[11px] focus:outline-none w-full font-semibold select-text text-foreground placeholder-muted-foreground uppercase"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Table list of companies */}
          <div className="flex-1 overflow-y-auto bg-card">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-secondary border-b border-border sticky top-0 z-10 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-2 border border-border text-center w-12">Code</th>
                  <th className="p-2 border border-border">Name</th>
                  <th className="p-2 border border-border text-center w-24">Workspace</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-foreground font-mono">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-[#7D7D7D] uppercase text-xs">
                      No matching company listings.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((comp, idx) => {
                    const isSelected = selectedRecord?.id === comp.id;
                    const isActiveWorkspace = selectedCompany?.id === comp.id;
                    const codeLabel = String(idx + 1).padStart(2, '0');
                    return (
                      <tr 
                        key={comp.id}
                        onClick={() => handleSelectRecord(comp)}
                        className={`cursor-pointer border-b border-border transition-colors ${
                          isSelected 
                            ? 'bg-[#FFC000]/15 text-[#FFC000] border-l-2 border-l-[#FFC000]' 
                            : 'hover:bg-secondary/40'
                        }`}
                      >
                        <td className="p-1.5 border border-border text-center font-mono">{codeLabel}</td>
                        <td className="p-1.5 border border-border font-sans font-bold text-foreground uppercase">{comp.name}</td>
                        <td className="p-1 border border-border text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            {isActiveWorkspace ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[9px] font-bold uppercase rounded-none" title="Active workspace context">
                                Active
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCompany(comp);
                                  }}
                                  className="px-2 py-0.5 bg-card hover:bg-secondary text-foreground border border-border rounded-none text-[8.5px] font-bold uppercase transition-colors"
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const confirmed = await showConfirm({
                                      title: 'Delete Company',
                                      message: `CAUTION: Delete "${comp.name}" permanent database registers?`,
                                      variant: 'danger',
                                      confirmText: 'Delete',
                                    });
                                    if (confirmed) {
                                      try {
                                        await deleteCompany(comp.id);
                                        showToast('Company removed successfully.', 'success');
                                        loadCompanies();
                                      } catch (err) {
                                        showToast('Error deleting company record.', 'error');
                                      }
                                    }
                                  }}
                                  className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-none transition-colors"
                                  title="Delete Company"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL: Form Details (60% width) */}
        <div className="col-span-7 bg-card text-foreground border border-border rounded-none flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="bg-secondary border-b border-border py-2 text-center shrink-0">
            <h1 className="text-xs font-black uppercase text-[#FFC000] tracking-widest font-mono">
              COMPANY MASTER & CREDENTIALS
            </h1>
          </div>

          {/* Form Zone */}
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSave} className="space-y-3">
              
              {activeFormTab === 'company' && (
                <div className="space-y-2.5">
                  {/* Co Code */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Co Code</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        disabled 
                        placeholder={selectedRecord ? 'Loaded' : 'New'} 
                        className="erp-input bg-muted/40 font-data border-border text-muted-foreground" 
                      />
                    </div>
                  </div>

                  {/* Co Name */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Co Name *</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        required
                        className="erp-input font-bold" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Address 1 */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Address 1</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        className="erp-input" 
                        value={address1}
                        onChange={(e) => setAddress1(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Address 2 */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Address 2</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        className="erp-input" 
                        value={address2}
                        onChange={(e) => setAddress2(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Address 3 */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Address 3</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        className="erp-input" 
                        value={address3}
                        onChange={(e) => setAddress3(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Country */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Country</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        className="erp-input font-bold" 
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* State */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">State</label>
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        placeholder="Code" 
                        className="erp-input font-data text-xs text-center" 
                        value={stateCode}
                        onChange={(e) => setStateCode(e.target.value)}
                      />
                    </div>
                    <div className="col-span-7">
                      <input 
                        type="text" 
                        placeholder="State Name" 
                        className="erp-input" 
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* City & Pin Code */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">City</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        className="erp-input" 
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-muted-foreground text-right pr-1 uppercase">Pin Code</label>
                    <div className="col-span-4">
                      <input 
                        type="text" 
                        className="erp-input font-data text-xs" 
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Phone No & Phone No2 */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Phone No</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        className="erp-input font-data text-xs" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-muted-foreground text-right pr-1 uppercase">Phone No2</label>
                    <div className="col-span-4">
                      <input 
                        type="text" 
                        className="erp-input font-data text-xs" 
                        value={phone2}
                        onChange={(e) => setPhone2(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Mobile No & Mobile No2 */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Mobile No</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        className="erp-input font-data text-xs" 
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-muted-foreground text-right pr-1 uppercase">Mobile No2</label>
                    <div className="col-span-4">
                      <input 
                        type="text" 
                        className="erp-input font-data text-xs" 
                        value={mobile2}
                        onChange={(e) => setMobile2(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Email</label>
                    <div className="col-span-9">
                      <input 
                        type="email" 
                        className="erp-input font-data text-xs" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Work Type & Metal Type */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Work Type</label>
                    <div className="col-span-3">
                      <select 
                        className="erp-input font-bold" 
                        value={workType}
                        onChange={(e) => setWorkType(e.target.value)}
                      >
                        <option>Retail</option>
                        <option>Wholesale</option>
                        <option>Manufacturing</option>
                        <option>Export</option>
                      </select>
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-muted-foreground text-right pr-1 uppercase">Metal Type</label>
                    <div className="col-span-4">
                      <select 
                        className="erp-input font-bold" 
                        value={metalType}
                        onChange={(e) => setMetalType(e.target.value)}
                      >
                        <option>Gold</option>
                        <option>Silver</option>
                        <option>Diamond</option>
                        <option>Multi-Metal</option>
                      </select>
                    </div>
                  </div>

                  {/* Report Header & Co Type */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Report Header</label>
                    <div className="col-span-3">
                      <select 
                        className="erp-input font-bold" 
                        value={reportHeader}
                        onChange={(e) => setReportHeader(e.target.value)}
                      >
                        <option>Company</option>
                        <option>Workspace</option>
                        <option>Billing Unit</option>
                      </select>
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-muted-foreground text-right pr-1 uppercase">Co Type</label>
                    <div className="col-span-4">
                      <input 
                        type="text" 
                        className="erp-input" 
                        value={coType}
                        onChange={(e) => setCoType(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'tax' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">GSTIN Code</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="22AAAAA0000A1Z5"
                        className="erp-input font-data uppercase" 
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">PAN Number</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="ABCDE1234F"
                        className="erp-input font-data uppercase" 
                        value={pan}
                        onChange={(e) => setPan(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">F.Y. Start</label>
                    <div className="col-span-9">
                      <input 
                        type="date" 
                        className="erp-input font-data text-xs" 
                        value={financialYearStart}
                        onChange={(e) => setFinancialYearStart(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">F.Y. End</label>
                    <div className="col-span-9">
                      <input 
                        type="date" 
                        className="erp-input font-data text-xs" 
                        value={financialYearEnd}
                        onChange={(e) => setFinancialYearEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'bank' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Bank Name</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="e.g. State Bank of India"
                        className="erp-input" 
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">Account No</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="Account Number"
                        className="erp-input font-data" 
                        value={bankAccountNo}
                        onChange={(e) => setBankAccountNo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-muted-foreground text-right pr-2 uppercase">IFSC Code</label>
                    <div className="col-span-9">
                      <input 
                        type="text" 
                        placeholder="SBIN0001234"
                        className="erp-input font-data uppercase" 
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>

          {/* Sub Tab Switcher Line */}
          <div className="bg-secondary border-t border-border h-9 flex items-end px-3 select-none shrink-0">
            <div className="flex gap-0.5 h-full items-end">
              <button
                type="button"
                onClick={() => setActiveFormTab('company')}
                className={`px-4 h-7 rounded-none border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'company'
                    ? 'bg-card border-t-[#FFC000] border-t-2 border-b-transparent text-[#FFC000] font-extrabold z-10 border-x-border'
                    : 'bg-secondary border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Company Detail
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('tax')}
                className={`px-4 h-7 rounded-none border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'tax'
                    ? 'bg-card border-t-[#FFC000] border-t-2 border-b-transparent text-[#FFC000] font-extrabold z-10 border-x-border'
                    : 'bg-secondary border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Tax Detail
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('bank')}
                className={`px-4 h-7 rounded-none border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'bank'
                    ? 'bg-card border-t-[#FFC000] border-t-2 border-b-transparent text-[#FFC000] font-extrabold z-10 border-x-border'
                    : 'bg-secondary border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Bank Detail
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 2. BOTTOM ACTION BUTTONS TOOLBAR */}
      <footer className="bg-card border border-border rounded-none p-2 flex justify-end gap-2 shrink-0">
        
        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-secondary border border-border rounded-none text-xs font-bold text-foreground uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Print</span>
        </button>

        {/* Save Button */}
        <button
          onClick={() => handleSave()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FFC000] hover:bg-[#917300] text-black border-none rounded-none text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Save className="h-3.5 w-3.5 stroke-[3]" />
          <span>Save (F2)</span>
        </button>

        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-secondary border border-border rounded-none text-xs font-bold text-foreground uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Cancel</span>
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDeleteRecord}
          disabled={!selectedRecord}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 disabled:opacity-30 rounded-none text-xs font-bold text-rose-500 uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          <span>Delete</span>
        </button>

        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-secondary border border-border rounded-none text-xs font-bold text-foreground uppercase tracking-wider transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Exit</span>
        </button>

      </footer>

    </div>
  );
}
