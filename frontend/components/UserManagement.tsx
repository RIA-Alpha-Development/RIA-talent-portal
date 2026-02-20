
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { 
  UserPlus, 
  MoreVertical, 
  Key, 
  UserMinus, 
  UserCheck, 
  Mail, 
  Shield, 
  X,
  Check,
  AlertCircle
} from 'lucide-react';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.BUSINESS,
    password: ''
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      status: 'Active'
    };
    onAddUser(newUser);
    setIsAdding(false);
    setFormData({ name: '', email: '', role: UserRole.BUSINESS, password: '' });
  };

  const handleResetPassword = () => {
    if (resettingPassword) {
      onUpdateUser({ ...resettingPassword, password: newPassword });
      setResettingPassword(null);
      setNewPassword('');
      alert(`Password for ${resettingPassword.name} has been reset.`);
    }
  };

  const toggleUserStatus = (user: User) => {
    onUpdateUser({ ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#002b5c]">User Management</h2>
          <p className="text-slate-500 text-sm">Manage onboarding, offboarding, and access for the RIA team.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#002b5c] text-white px-6 py-2.5 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-lg flex items-center gap-2"
        >
          <UserPlus size={16} />
          Onboard New User
        </button>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
              <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
              <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#002b5c] flex items-center justify-center text-[#c5a059] font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest">
                    <Shield size={12} className="text-[#c5a059]" />
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                    user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setResettingPassword(user)}
                      className="p-2 text-slate-400 hover:text-[#002b5c] hover:bg-white rounded transition-all"
                      title="Reset Password"
                    >
                      <Key size={16} />
                    </button>
                    <button 
                      onClick={() => toggleUserStatus(user)}
                      className={`p-2 rounded transition-all ${
                        user.status === 'Active' 
                          ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' 
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                    >
                      {user.status === 'Active' ? <UserMinus size={16} /> : <UserCheck size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Onboarding Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-[#002b5c]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-serif font-bold text-[#002b5c]">Onboard New User</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="e.g. Robert Wilson"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="robert@ria.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">System Role</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                >
                  {Object.values(UserRole).filter(r => r !== UserRole.EXTERNAL).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Initial Password</label>
                <input 
                  required
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="Set temporary password"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-[#002b5c] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#002b5c] text-white py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-lg"
                >
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resettingPassword && (
        <div className="fixed inset-0 bg-[#002b5c]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-serif font-bold text-[#002b5c]">Reset Password</h3>
              <button onClick={() => setResettingPassword(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <p className="text-xs text-amber-800">
                  You are resetting the password for <strong>{resettingPassword.name}</strong>. This will take effect immediately.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">New Temporary Password</label>
                <input 
                  required
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="Enter new password"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setResettingPassword(null)}
                  className="flex-1 py-3 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-[#002b5c] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResetPassword}
                  disabled={!newPassword}
                  className="flex-1 bg-[#002b5c] text-white py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-lg disabled:opacity-50"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
