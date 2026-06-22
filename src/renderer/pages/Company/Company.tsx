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
      alert('Please fill out the Company Name.');
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
        alert('Company details updated successfully.');
      } else {
        const created = await createCompany(payload);
        setSelectedRecord(created);
        alert('New company workspace created successfully.');
      }
      loadCompanies();
    } catch (err) {
      alert('Error saving company master record.');
    }
  };

  const handleCancel = () => {
    populateForm(selectedRecord);
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;
    
    if (selectedCompany && selectedCompany.id === selectedRecord.id) {
      alert('Cannot delete the active workspace company. Switch company context in top panel first.');
      return;
    }

    if (confirm(`CAUTION: Delete "${selectedRecord.name}" permanent database registers?`)) {
      try {
        await deleteCompany(selectedRecord.id);
        alert('Company removed successfully.');
        loadCompanies();
      } catch (err) {
        alert('Error deleting company record.');
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
    <div className="p-3 bg-[#eef1f6] h-full overflow-hidden flex flex-col font-sans select-none">
      
      {/* 1. Split Panel Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0 pb-2">
        
        {/* LEFT PANEL: Search and Table Records (40% width) */}
        <div className="col-span-5 bg-white border border-slate-350 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider font-luxury">SEARCH RECORD</span>
            <button
              onClick={handleNewRecord}
              className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-[2px] border border-amber-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>New Company</span>
            </button>
          </div>

          {/* Search box input */}
          <div className="p-2 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-[2px] px-2 py-1 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code, name, GSTIN, or phone..."
                className="bg-transparent border-none text-[11px] focus:outline-none w-full font-semibold select-text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Table list of companies */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-2 border border-slate-200 text-center w-12">Code</th>
                  <th className="p-2 border border-slate-200">Name</th>
                  <th className="p-2 border border-slate-200 text-center w-24">Workspace</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-700 font-data">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-400 italic font-sans">
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
                        className={`cursor-pointer border-b border-slate-150 transition-colors ${
                          isSelected 
                            ? 'bg-rose-100/75 text-rose-900 border-l-[3px] border-l-amber-500' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-1.5 border border-slate-200 text-center font-data">{codeLabel}</td>
                        <td className="p-1.5 border border-slate-200 font-sans font-bold text-slate-800">{comp.name}</td>
                        <td className="p-1 border border-slate-200 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            {isActiveWorkspace ? (
                              <span className="inline-flex items-center justify-center p-0.5 bg-emerald-500/10 text-emerald-600 rounded-full" title="Active workspace context">
                                <Check className="h-3 w-3" />
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCompany(comp);
                                  }}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-500 hover:text-white border border-slate-300 rounded-[2px] text-[8.5px] font-bold uppercase transition-colors"
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`CAUTION: Delete "${comp.name}" permanent database registers?`)) {
                                      try {
                                        await deleteCompany(comp.id);
                                        alert('Company removed successfully.');
                                        loadCompanies();
                                      } catch (err) {
                                        alert('Error deleting company record.');
                                      }
                                    }
                                  }}
                                  className="p-0.5 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-slate-300 hover:border-rose-300 rounded-[2px] transition-colors"
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
        <div className="col-span-7 bg-white border border-slate-350 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          
          {/* Header styled orange */}
          <div className="bg-amber-500/15 border-b border-amber-500/30 py-2 text-center shrink-0">
            <h1 className="text-sm font-extrabold uppercase text-amber-700 tracking-widest font-luxury">
              Company Master
            </h1>
          </div>

          {/* Form Zone */}
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSave} className="space-y-3">
              
              {activeFormTab === 'company' && (
                <div className="space-y-2.5">
                  {/* Co Code */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Co Code</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        disabled 
                        placeholder={selectedRecord ? 'Loaded' : 'New'} 
                        className="erp-input bg-slate-50 font-data border-slate-300 text-slate-500" 
                      />
                    </div>
                  </div>

                  {/* Co Name */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Co Name *</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Address 1</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Address 2</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Address 3</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Country</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">State</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">City</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        className="erp-input" 
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-slate-500 text-right pr-1 uppercase">Pin Code</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Phone No</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        className="erp-input font-data text-xs" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-slate-500 text-right pr-1 uppercase">Phone No2</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Mobile No</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        className="erp-input font-data text-xs" 
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                    </div>
                    <label className="col-span-2 text-[10px] font-bold text-slate-500 text-right pr-1 uppercase">Mobile No2</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Email</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Work Type</label>
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
                    <label className="col-span-2 text-[10px] font-bold text-slate-500 text-right pr-1 uppercase">Metal Type</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Report Header</label>
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
                    <label className="col-span-2 text-[10px] font-bold text-slate-500 text-right pr-1 uppercase">Co Type</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">GSTIN Code</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">PAN Number</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">F.Y. Start</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">F.Y. End</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Bank Name</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">Account No</label>
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
                    <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-2 uppercase">IFSC Code</label>
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
          <div className="bg-slate-100 border-t border-slate-300 h-9 flex items-end px-3 select-none shrink-0">
            <div className="flex gap-0.5 h-full items-end">
              <button
                type="button"
                onClick={() => setActiveFormTab('company')}
                className={`px-4 h-7 rounded-t border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'company'
                    ? 'bg-white border-slate-350 border-t-amber-500 border-t-2 border-b-white text-slate-800 font-extrabold z-10'
                    : 'bg-slate-200 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                Company Detail
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('tax')}
                className={`px-4 h-7 rounded-t border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'tax'
                    ? 'bg-white border-slate-350 border-t-amber-500 border-t-2 border-b-white text-slate-800 font-extrabold z-10'
                    : 'bg-slate-200 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                Tax Detail
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('bank')}
                className={`px-4 h-7 rounded-t border-t border-x cursor-pointer text-[10px] uppercase font-bold tracking-wider relative top-[1px] ${
                  activeFormTab === 'bank'
                    ? 'bg-white border-slate-350 border-t-amber-500 border-t-2 border-b-white text-slate-800 font-extrabold z-10'
                    : 'bg-slate-200 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                Bank Detail
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 2. BOTTOM ACTION BUTTONS TOOLBAR */}
      <footer className="bg-slate-100 border border-slate-350 rounded-[2px] p-1.5 flex justify-end gap-2.5 shrink-0 shadow-sm">
        
        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <Printer className="h-4 w-4 text-slate-500" />
          <span>Print</span>
        </button>

        {/* Save Button */}
        <button
          onClick={() => handleSave()}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <Save className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-700">Save</span>
        </button>

        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <Undo2 className="h-4 w-4 text-amber-600" />
          <span className="text-amber-700">Cancel</span>
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDeleteRecord}
          disabled={!selectedRecord}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-rose-50 border border-slate-300 disabled:opacity-40 disabled:hover:bg-white rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <Trash2 className="h-4 w-4 text-rose-500" />
          <span className="text-rose-600">Delete</span>
        </button>

        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <LogOut className="h-4 w-4 text-slate-600" />
          <span>Exit</span>
        </button>

      </footer>

    </div>
  );
}
