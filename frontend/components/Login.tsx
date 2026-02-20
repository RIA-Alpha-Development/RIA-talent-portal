
import React, { useState } from 'react';
import { TrendingUp, Lock, Mail, ChevronRight, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Case-insensitive email check
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      setError('User not found. Please check the email address.');
      return;
    }

    if (user.status === 'Inactive') {
      setError('This account has been deactivated. Please contact an administrator.');
      return;
    }

    if (user.password === password) {
      onLogin(user);
    } else {
      setError('Invalid password. Please try again.');
    }
  };

  const handleEmergencyReset = () => {
    if (window.confirm('This will clear all local data and reset the system to factory defaults. Use this if you are locked out. Continue?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#002b5c] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#c5a059]/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#c5a059]/5 rounded-full -ml-48 -mb-48 blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded shadow-2xl overflow-hidden relative z-10 border-t-8 border-[#c5a059]">
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-[#002b5c] rounded flex items-center justify-center text-[#c5a059] shadow-xl mb-4">
              <TrendingUp size={36} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#002b5c]">RIA Talent Portal</h1>
            <p className="text-slate-400 text-xs uppercase tracking-[0.3em] mt-2">Secure Access</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded flex items-center gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="admin@ria.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#002b5c] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#002b5c] text-white py-4 rounded font-bold uppercase tracking-widest text-sm hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              Sign In
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center space-y-4">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Authorized use only. All activities are monitored and logged. 
              By signing in, you agree to our internal security policies.
            </p>
            
            <button 
              onClick={handleEmergencyReset}
              className="flex items-center gap-1.5 mx-auto text-[9px] font-bold text-slate-300 hover:text-red-400 uppercase tracking-widest transition-colors"
            >
              <RefreshCw size={10} />
              Emergency System Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
