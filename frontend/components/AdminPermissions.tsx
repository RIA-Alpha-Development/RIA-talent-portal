
import React from 'react';
import { UserRole, Permission, RolePermissions } from '../types';
import { Shield, Check, X } from 'lucide-react';

interface AdminPermissionsProps {
  rolePermissions: RolePermissions;
  onUpdatePermissions: (role: UserRole, permissions: Permission[]) => void;
}

const AdminPermissions: React.FC<AdminPermissionsProps> = ({ rolePermissions, onUpdatePermissions }) => {
  const roles = Object.values(UserRole);
  const permissions = Object.values(Permission);

  const togglePermission = (role: UserRole, permission: Permission) => {
    const current = rolePermissions[role];
    const updated = current.includes(permission)
      ? current.filter(p => p !== permission)
      : [...current, permission];
    onUpdatePermissions(role, updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-[#002b5c] rounded flex items-center justify-center text-[#c5a059]">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#002b5c]">Role-Based Access Control</h2>
            <p className="text-slate-500 text-sm">Define what each user role can see and do within the RIA Talent Portal.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-4 border border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Permission</th>
                {roles.map(role => (
                  <th key={role} className="p-4 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-[#002b5c] uppercase tracking-widest">{role}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map(permission => (
                <tr key={permission} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 border border-slate-200">
                    <p className="text-sm font-bold text-slate-700">{permission.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-slate-400">System capability</p>
                  </td>
                  {roles.map(role => {
                    const isEnabled = rolePermissions[role].includes(permission);
                    const isReadOnly = role === UserRole.ADMIN; // Admin usually has all permissions

                    return (
                      <td key={`${role}-${permission}`} className="p-4 border border-slate-200 text-center">
                        <button
                          disabled={isReadOnly}
                          onClick={() => togglePermission(role, permission)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${
                            isEnabled 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : 'bg-slate-100 text-slate-300'
                          } ${!isReadOnly && 'hover:scale-110 active:scale-95'}`}
                        >
                          {isEnabled ? <Check size={16} strokeWidth={3} /> : <X size={16} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded flex items-start gap-3">
          <Shield className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Security Note:</strong> Changes to permissions take effect immediately for all users in that role. The <strong>ADMIN</strong> role is protected and always retains full system access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPermissions;
