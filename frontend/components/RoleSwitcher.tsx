
import React from 'react';
import { UserRole, User } from '../types';
import { Shield, User as UserIcon, Briefcase, Globe } from 'lucide-react';

interface RoleSwitcherProps {
  onSwitch: (user: User) => void;
  currentUser: User | null;
}

const MOCK_USERS: User[] = [
  { id: 'u-1', name: 'Admin User', email: 'admin@ria.com', role: UserRole.ADMIN },
  { id: 'u-2', name: 'HR Manager', email: 'hr@ria.com', role: UserRole.HR },
  { id: 'u-3', name: 'Business Lead', email: 'business@ria.com', role: UserRole.BUSINESS },
  { id: 'u-4', name: 'John Applicant', email: 'john@external.com', role: UserRole.EXTERNAL, profile: { summary: 'Experienced Analyst' } },
];

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onSwitch, currentUser }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-64">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Demo Role Switcher</h4>
      <div className="space-y-2">
        {MOCK_USERS.map((user) => (
          <button
            key={user.id}
            onClick={() => onSwitch(user)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg text-xs font-medium transition-all ${
              currentUser?.id === user.id 
                ? 'bg-[#002b5c] text-white' 
                : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            {user.role === UserRole.ADMIN && <Shield size={14} />}
            {user.role === UserRole.HR && <Briefcase size={14} />}
            {user.role === UserRole.BUSINESS && <UserIcon size={14} />}
            {user.role === UserRole.EXTERNAL && <Globe size={14} />}
            <div className="text-left">
              <p className="font-bold">{user.name}</p>
              <p className="opacity-60 text-[10px]">{user.role}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSwitcher;
