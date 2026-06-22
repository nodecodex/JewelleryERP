import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useTabStore } from '../../store/useTabStore';
import type { User } from '../../../shared/ipc-api';
import { 
  Shield, 
  UserPlus, 
  Printer, 
  Save, 
  Undo2, 
  Trash2, 
  LogOut, 
  Check, 
  UserCheck 
} from 'lucide-react';

interface PermissionRight {
  view: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
}

const PERMISSION_ITEMS = [
  { sr: 1, menu: 'Master', submenu: 'Point Mast' },
  { sr: 2, menu: 'Master', submenu: 'Size' },
  { sr: 3, menu: 'Master', submenu: 'Diamond' },
  { sr: 4, menu: 'Master', submenu: 'Design' },
  { sr: 5, menu: 'Master', submenu: 'Ledger Master' },
  { sr: 6, menu: 'Master', submenu: 'Account Group' },
  { sr: 7, menu: 'Master', submenu: 'Location' },
  { sr: 8, menu: 'Master', submenu: 'Trade Master' },
  { sr: 9, menu: 'Master', submenu: 'Year Create' },
  { sr: 10, menu: 'Transaction', submenu: 'Purchase' },
  { sr: 11, menu: 'Transaction', submenu: 'Purchase Rtn' },
  { sr: 12, menu: 'Transaction', submenu: 'Sales Order' },
  { sr: 13, menu: 'Transaction', submenu: 'Sales' },
  { sr: 14, menu: 'Transaction', submenu: 'Sales Return' },
  { sr: 15, menu: 'Transaction', submenu: 'Wh Sales' },
  { sr: 16, menu: 'Transaction', submenu: 'Cash Received' },
  { sr: 17, menu: 'Transaction', submenu: 'Cash Payment' },
  { sr: 18, menu: 'Transaction', submenu: 'Bank Received' },
  { sr: 19, menu: 'Transaction', submenu: 'Bank Payment' },
  { sr: 20, menu: 'Transaction', submenu: 'Contra Entry' },
  { sr: 21, menu: 'Transaction', submenu: 'Rate Cut' },
  { sr: 22, menu: 'Transaction', submenu: 'Stock Out' },
  { sr: 23, menu: 'Other', submenu: 'Karigar' },
  { sr: 24, menu: 'Other', submenu: 'Scheme' },
  { sr: 25, menu: 'Other', submenu: 'Dhiran' },
  { sr: 26, menu: 'Reports', submenu: 'Day Book' },
  { sr: 27, menu: 'Reports', submenu: 'Ledger Reports' },
  { sr: 28, menu: 'Reports', submenu: 'Profit & Loss' },
  { sr: 29, menu: 'Reports', submenu: 'Balance Sheet' },
  { sr: 30, menu: 'Reports', submenu: 'GST Log' },
];

export default function UsersView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const closeTab = useTabStore((state) => state.closeTab);
  const activeTabId = useTabStore((state) => state.activeTabId);

  // Users Lists
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Form input states
  const [newUsername, setNewUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userRole, setUserRole] = useState<'Admin' | 'Manager' | 'Accountant' | 'Salesman'>('Salesman');

  // Permission rights grid state
  const [permissions, setPermissions] = useState<Record<string, PermissionRight>>({});

  useEffect(() => {
    if (selectedCompany) {
      loadUsers();
    }
  }, [selectedCompany]);

  // Load permissions when selected user changes
  useEffect(() => {
    if (selectedUserId) {
      const activeUser = users.find(u => u.id === selectedUserId);
      if (activeUser) {
        try {
          const rights = JSON.parse(activeUser.permissions_json || '{}');
          // Map to standard items
          const initialPermissions: Record<string, PermissionRight> = {};
          PERMISSION_ITEMS.forEach(item => {
            const key = `${item.menu}_${item.submenu}`;
            initialPermissions[key] = rights[key] || { view: false, edit: false, delete: false, print: false };
          });
          setPermissions(initialPermissions);
        } catch (e) {
          clearPermissions();
        }
      }
    } else {
      clearPermissions();
    }
  }, [selectedUserId, users]);

  const loadUsers = async () => {
    if (!selectedCompany) return;
    try {
      const list = await (window as any).api.getUsers(selectedCompany.id);
      setUsers(list);
      if (list.length > 0 && !selectedUserId) {
        setSelectedUserId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const clearPermissions = () => {
    const defaultPermissions: Record<string, PermissionRight> = {};
    PERMISSION_ITEMS.forEach(item => {
      const key = `${item.menu}_${item.submenu}`;
      defaultPermissions[key] = { view: false, edit: false, delete: false, print: false };
    });
    setPermissions(defaultPermissions);
  };

  const handleCheckboxChange = (menu: string, submenu: string, action: keyof PermissionRight) => {
    const key = `${menu}_${submenu}`;
    const current = permissions[key] || { view: false, edit: false, delete: false, print: false };
    setPermissions({
      ...permissions,
      [key]: {
        ...current,
        [action]: !current[action]
      }
    });
  };

  const handleUpdateRights = async () => {
    if (!selectedUserId) {
      alert('Please select a user to update rights.');
      return;
    }
    try {
      await (window as any).api.updateUserPermissions(selectedUserId, JSON.stringify(permissions));
      alert('User permission rights updated successfully.');
      loadUsers(); // Refresh permissions
    } catch (err) {
      alert('Error updating user rights.');
    }
  };

  const handleSave = async () => {
    if (!selectedCompany) return;

    // 1. If "Create New User" is filled, attempt user creation
    if (newUsername.trim()) {
      if (!newPassword) {
        alert('Please specify a password for the new user.');
        return;
      }
      if (newPassword !== confirmPassword) {
        alert('Passwords do not match.');
        return;
      }

      try {
        const payload = {
          company_id: selectedCompany.id,
          username: newUsername.trim(),
          role: userRole,
          password_plain: newPassword,
          permissions_json: JSON.stringify(permissions) // Inherit checkmarks directly
        };

        const created = await (window as any).api.createUser(payload);
        alert(`User "${created.username}" created successfully.`);
        setNewUsername('');
        setNewPassword('');
        setConfirmPassword('');
        await loadUsers();
        setSelectedUserId(created.id);
        return;
      } catch (err: any) {
        alert(`Failed to create user: ${err.message || err}`);
        return;
      }
    }

    // 2. If existing user selected and password fields are filled, update password
    if (selectedUserId && (newPassword || oldPassword || confirmPassword)) {
      if (!oldPassword || !newPassword || !confirmPassword) {
        alert('Please fill out Old Password, New Password, and Confirm Password fields.');
        return;
      }
      if (newPassword !== confirmPassword) {
        alert('New passwords do not match.');
        return;
      }

      try {
        const res = await (window as any).api.updateUserPassword(selectedUserId, oldPassword, newPassword);
        alert(res.message);
        if (res.success) {
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      } catch (err: any) {
        alert(`Error resetting password: ${err.message || err}`);
      }
      return;
    }

    // Default trigger updates permissions
    if (selectedUserId) {
      await handleUpdateRights();
    }
  };

  const handleCancel = () => {
    setNewUsername('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setUserRole('Salesman');
    if (selectedUserId) {
      const activeUser = users.find(u => u.id === selectedUserId);
      if (activeUser) {
        setSelectedUserId('');
        setTimeout(() => setSelectedUserId(activeUser.id), 50);
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    const target = users.find(u => u.id === selectedUserId);
    if (!target) return;

    if (confirm(`CAUTION: Permanently delete user "${target.username}" login credentials?`)) {
      try {
        await (window as any).api.deleteUser(selectedUserId);
        alert('User deleted successfully.');
        setSelectedUserId('');
        setUsers(users.filter(u => u.id !== selectedUserId));
        loadUsers();
      } catch (err) {
        alert('Error removing user account.');
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

  return (
    <div className="p-3 bg-[#eef1f6] h-full overflow-hidden flex flex-col font-sans select-none">
      
      {/* 1. Split Panel Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0 pb-2">
        
        {/* LEFT PANEL: User Selection & Tabular Rights Matrix (col-span-8) */}
        <div className="col-span-8 bg-white border border-slate-350 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          
          {/* Top orange header */}
          <div className="bg-[#070D18] text-[#d4af37] px-3 py-2 border-b border-slate-950 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider font-luxury">User Rights Matrix</span>
            <div className="flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[9px] font-mono text-slate-400">ACCESS PERMISSIONS CONTROL</span>
            </div>
          </div>

          {/* User selection dropdown row */}
          <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <label className="erp-label">User Name</label>
              <select
                className="erp-input w-48 font-bold border-slate-300"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">-- Select Existing User --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="ag-grid-dense-table w-full border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-2 border border-slate-200 text-center w-12">SrNo</th>
                  <th className="p-2 border border-slate-200">Main Menu</th>
                  <th className="p-2 border border-slate-200">Sub Menu</th>
                  <th className="p-2 border border-slate-200 text-center w-16">View</th>
                  <th className="p-2 border border-slate-200 text-center w-16">Edit</th>
                  <th className="p-2 border border-slate-200 text-center w-16">Delete</th>
                  <th className="p-2 border border-slate-200 text-center w-16">Print</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-700">
                {PERMISSION_ITEMS.map((item) => {
                  const key = `${item.menu}_${item.submenu}`;
                  const rights = permissions[key] || { view: false, edit: false, delete: false, print: false };
                  const isMaster = item.menu === 'Master';
                  
                  return (
                    <tr key={key} className="hover:bg-slate-50 border-b border-slate-150">
                      <td className="p-1.5 border border-slate-200 text-center font-data text-slate-500 text-[10px]">
                        {String(item.sr).padStart(2, '0')}
                      </td>
                      <td className={`p-1.5 border border-slate-200 text-[11px] uppercase ${isMaster ? 'text-amber-700 font-bold' : 'text-indigo-700 font-bold'}`}>
                        {item.menu}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-[11px] text-slate-800 font-medium">
                        {item.submenu}
                      </td>
                      
                      {/* Checkbox columns */}
                      <td className="p-1 border border-slate-200 text-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 text-amber-500 focus:ring-amber-500/20 border-slate-300 rounded-[2px] cursor-pointer"
                          checked={rights.view}
                          onChange={() => handleCheckboxChange(item.menu, item.submenu, 'view')}
                        />
                      </td>
                      <td className="p-1 border border-slate-200 text-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 text-amber-500 focus:ring-amber-500/20 border-slate-300 rounded-[2px] cursor-pointer"
                          checked={rights.edit}
                          onChange={() => handleCheckboxChange(item.menu, item.submenu, 'edit')}
                        />
                      </td>
                      <td className="p-1 border border-slate-200 text-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 text-amber-500 focus:ring-amber-500/20 border-slate-300 rounded-[2px] cursor-pointer"
                          checked={rights.delete}
                          onChange={() => handleCheckboxChange(item.menu, item.submenu, 'delete')}
                        />
                      </td>
                      <td className="p-1 border border-slate-200 text-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 text-amber-500 focus:ring-amber-500/20 border-slate-300 rounded-[2px] cursor-pointer"
                          checked={rights.print}
                          onChange={() => handleCheckboxChange(item.menu, item.submenu, 'print')}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Under grid action button */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-center shrink-0">
            <button
              type="button"
              onClick={handleUpdateRights}
              className="border border-amber-600 bg-white hover:bg-amber-50 text-amber-700 px-6 py-1.5 rounded-[2px] font-bold text-xs uppercase tracking-wide transition-colors shadow-xs"
            >
              Update User Right
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Create / Edit password controls (col-span-4) */}
        <div className="col-span-4 bg-white border border-slate-350 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          
          <div className="bg-amber-500/15 border-b border-amber-500/30 py-2 text-center shrink-0">
            <h1 className="text-sm font-extrabold uppercase text-amber-700 tracking-widest font-luxury flex items-center justify-center gap-1.5">
              <UserPlus className="h-4.5 w-4.5" />
              <span>User Credentials</span>
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Create New User Panel */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-[2px] space-y-3">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Create New User Profile
              </h2>
              
              <div className="space-y-1.5">
                <label className="erp-label block">Create New User</label>
                <input
                  type="text"
                  placeholder="e.g. SalesHead"
                  className="erp-input font-bold"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="erp-label block">User Type (Role)</label>
                <select
                  className="erp-input font-bold"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Salesman">Salesman</option>
                </select>
              </div>
            </div>

            {/* Password Modification Panel */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-[2px] space-y-3">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Password Setup / Reset
              </h2>
              
              {selectedUserId && !newUsername && (
                <div className="space-y-1.5">
                  <label className="erp-label block">Old Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="erp-input font-data text-xs"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="erp-label block">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="erp-input font-data text-xs"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="erp-label block">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="erp-input font-data text-xs"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {selectedUserId && !newUsername && (
              <div className="p-2 border border-slate-250 bg-slate-50 rounded-[2px] text-[10px] text-slate-500 font-semibold uppercase text-center">
                Editing: <span className="text-slate-800 font-bold">{users.find(u => u.id === selectedUserId)?.username}</span>
              </div>
            )}
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
          onClick={handleSave}
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
          onClick={handleDeleteUser}
          disabled={!selectedUserId}
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
