
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  BarChart3, 
  Globe, 
  Search,
  TrendingUp,
  UserCircle,
  LogOut,
  ShieldAlert,
  UserCog,
  Settings,
  Database,
  Cloud,
  Loader2
} from 'lucide-react';
import { View, Job, Candidate, CandidateStage, User, UserRole, Permission, RolePermissions } from './types';
import { SEED_JOBS, SEED_CANDIDATES, DEFAULT_PERMISSIONS, SEED_USERS } from './constants';
import { apiService } from './services/apiService';
import Dashboard from './components/Dashboard';
import JobsList from './components/JobsList';
import CandidatePipeline from './components/CandidatePipeline';
import Reports from './components/Reports';
import PublicBoard from './components/PublicBoard';
import Login from './components/Login';
import AdminPermissions from './components/AdminPermissions';
import UserManagement from './components/UserManagement';
import UserProfile from './components/UserProfile';
import DeploymentGuide from './components/DeploymentGuide';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize data from API (Cloud SQL) with Local Fallback
  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedJobs, fetchedCandidates, fetchedUsers] = await Promise.all([
          apiService.getJobs(),
          apiService.getCandidates(),
          apiService.getUsers()
        ]);
        setJobs(fetchedJobs);
        setCandidates(fetchedCandidates);
        setUsers(fetchedUsers);
      } catch (err) {
        console.warn('Backend API not available, falling back to local storage.');
        const savedJobs = localStorage.getItem('tf_jobs');
        const savedCandidates = localStorage.getItem('tf_candidates');
        const savedUsers = localStorage.getItem('tf_users');
        
        setJobs(savedJobs ? JSON.parse(savedJobs) : SEED_JOBS);
        setCandidates(savedCandidates ? JSON.parse(savedCandidates) : SEED_CANDIDATES);
        setUsers(savedUsers ? JSON.parse(savedUsers) : SEED_USERS);
      }

      const savedUser = localStorage.getItem('tf_user');
      const savedPerms = localStorage.getItem('tf_perms');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      if (savedPerms) setRolePermissions(JSON.parse(savedPerms));
      
      setIsLoading(false);
    };

    loadData();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('tf_user', JSON.stringify(user));
    if (user.role === UserRole.EXTERNAL) setCurrentView('public');
    else setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
    localStorage.removeItem('tf_user');
  };

  const addJob = async (job: Job) => {
    setJobs(prev => [job, ...prev]);
    localStorage.setItem('tf_jobs', JSON.stringify([job, ...jobs]));
    try { await apiService.createJob(job); } catch (e) {}
  };

  const updateJob = async (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    try { await apiService.updateJob(updatedJob); } catch (e) {}
  };

  const addCandidate = async (candidate: Candidate) => {
    setCandidates(prev => [candidate, ...prev]);
    localStorage.setItem('tf_candidates', JSON.stringify([candidate, ...candidates]));
    try { await apiService.createCandidate(candidate); } catch (e) {}
  };

  const updateCandidate = async (updatedCandidate: Candidate) => {
    setCandidates(prev => prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));
    try { await apiService.updateCandidate(updatedCandidate); } catch (e) {}
  };

  const updateCandidateStage = (candidateId: string, newStage: CandidateStage, note: string, reason?: string, attachmentName?: string, attachmentData?: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    const updatedCandidate = {
      ...candidate,
      currentStage: newStage,
      history: [
        ...candidate.history,
        {
          id: Math.random().toString(36).substr(2, 9),
          stage: newStage,
          timestamp: new Date().toISOString(),
          note,
          reason,
          authorRole: currentUser?.role,
          authorName: currentUser?.name,
          attachmentName,
          attachmentData
        }
      ]
    };
    updateCandidate(updatedCandidate);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#002b5c] text-white">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-serif text-xl">Connecting to RIA Talent Portal...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard jobs={jobs} candidates={candidates} currentUser={currentUser} />;
      case 'jobs':
        return (
          <JobsList 
            jobs={jobs} 
            candidates={candidates}
            users={users}
            onAddJob={addJob} 
            onUpdateJob={updateJob}
            onDeleteJob={() => {}}
            onUpdateCandidateStage={updateCandidateStage}
            onUpdateCandidate={updateCandidate}
            onAddCandidate={addCandidate}
            userRole={currentUser.role} 
            currentUser={currentUser}
          />
        );
      case 'candidates':
        return (
          <CandidatePipeline 
            candidates={candidates} 
            jobs={jobs} 
            users={users}
            onUpdateStage={updateCandidateStage} 
            onUpdateCandidate={updateCandidate}
            onAddCandidate={addCandidate}
            userRole={currentUser.role}
            currentUser={currentUser}
          />
        );
      case 'reports':
        return <Reports candidates={candidates} jobs={jobs} />;
      case 'public':
        return <PublicBoard jobs={jobs} onApply={addCandidate} currentUser={currentUser} />;
      case 'permissions':
        return <AdminPermissions rolePermissions={rolePermissions} onUpdatePermissions={(r, p) => setRolePermissions({...rolePermissions, [r]: p})} />;
      case 'users':
        return <UserManagement users={users} onAddUser={() => {}} onUpdateUser={() => {}} onDeleteUser={() => {}} />;
      case 'profile':
        return <UserProfile currentUser={currentUser} onUpdateUser={() => {}} />;
      case 'deployment':
        return <DeploymentGuide />;
      default:
        return <Dashboard jobs={jobs} candidates={candidates} currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-64 bg-[#002b5c] text-white flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c5a059] rounded flex items-center justify-center text-[#002b5c] shadow-inner">
              <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg leading-tight tracking-tight">RIA</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059] font-bold">Talent Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {currentUser.role !== UserRole.EXTERNAL && (
            <>
              <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
              <NavItem icon={<Briefcase size={20} />} label="Job Postings" active={currentView === 'jobs'} onClick={() => setCurrentView('jobs')} />
              <NavItem icon={<Users size={20} />} label="Candidate Pipeline" active={currentView === 'candidates'} onClick={() => setCurrentView('candidates')} />
              <NavItem icon={<BarChart3 size={20} />} label="Analytics" active={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
              {currentUser.role === UserRole.ADMIN && (
                <>
                  <NavItem icon={<UserCog size={20} />} label="Users" active={currentView === 'users'} onClick={() => setCurrentView('users')} />
                  <NavItem icon={<ShieldAlert size={20} />} label="Permissions" active={currentView === 'permissions'} onClick={() => setCurrentView('permissions')} />
                  <NavItem icon={<Cloud size={20} />} label="Cloud Setup" active={currentView === 'deployment'} onClick={() => setCurrentView('deployment')} />
                </>
              )}
            </>
          )}
          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">External</div>
          <NavItem icon={<Globe size={20} />} label="Career Board" active={currentView === 'public'} onClick={() => setCurrentView('public')} />
        </nav>
        <div className="p-4 border-t border-white/10 bg-black/10 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5" onClick={() => setCurrentView('profile')}>
            <div className="w-8 h-8 rounded bg-[#c5a059] flex items-center justify-center text-[#002b5c] font-bold text-xs">{currentUser.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-white/50 truncate uppercase tracking-wider">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <h1 className="text-lg font-serif font-bold text-[#002b5c] capitalize">{currentView.replace('-', ' ')}</h1>
        </header>
        <div className="p-8">{renderView()}</div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all ${active ? 'bg-[#c5a059] text-[#002b5c] shadow-lg' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
    {icon} {label}
  </button>
);

export default App;
