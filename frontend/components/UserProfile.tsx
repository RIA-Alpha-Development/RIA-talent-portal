
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Shield, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserProfileProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ currentUser, onUpdateUser }) => {
  const [name, setName] = useState(currentUser.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({ ...currentUser, name });
    setMessage({ type: 'success', text: 'Profile updated successfully.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentPassword !== currentUser.password) {
      setMessage({ type: 'error', text: 'Current password is incorrect.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    onUpdateUser({ ...currentUser, password: newPassword });
    setMessage({ type: 'success', text: 'Password changed successfully.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-16 h-16 bg-[#002b5c] rounded flex items-center justify-center text-[#c5a059] shadow-lg">
          <UserIcon size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#002b5c]">My Profile</h2>
          <p className="text-slate-500">Manage your personal information and security settings.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded border flex items-center gap-3 animate-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Information */}
        <div className="bg-white p-8 rounded border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-serif font-bold text-[#002b5c] border-b border-slate-100 pb-4">Basic Information</h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  disabled
                  value={currentUser.email}
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-100 rounded text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">Email cannot be changed. Contact Admin for updates.</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">System Role</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded w-fit">
                <Shield size={14} className="text-[#c5a059]" />
                <span className="text-xs font-bold text-[#002b5c] uppercase tracking-widest">{currentUser.role}</span>
              </div>
            </div>
            <button 
              type="submit"
              className="bg-[#002b5c] text-white px-6 py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-lg flex items-center gap-2"
            >
              <Save size={16} />
              Update Profile
            </button>
          </form>
        </div>

        {/* Security / Password */}
        <div className="bg-white p-8 rounded border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-lg font-serif font-bold text-[#002b5c]">Security Settings</h3>
            <button 
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-slate-400 hover:text-[#002b5c] transition-colors"
            >
              {showPasswords ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPasswords ? "text" : "password"} 
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-50">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPasswords ? "text" : "password"} 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPasswords ? "text" : "password"} 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-[#002b5c] text-white py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Lock size={16} />
              Change Password
            </button>
          </form>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-slate-50 p-6 rounded border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Account Status: Active</p>
            <p className="text-xs text-slate-500">Your account is in good standing and has full access to assigned features.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Login</p>
          <p className="text-xs font-medium text-slate-700">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
