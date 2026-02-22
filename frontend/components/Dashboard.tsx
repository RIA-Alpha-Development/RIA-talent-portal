
import React from 'react';
import { Job, Candidate, CandidateStage, User, UserRole } from '../types';
import { Users, Briefcase, CheckCircle2, Clock, TrendingUp, Calendar, Timer, Database, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  jobs: Job[];
  candidates: Candidate[];
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ jobs, candidates, currentUser }) => {
  const activeJobs = jobs.filter(j => j.status === 'Open').length;
  const totalCandidates = candidates.length;
  const hiredCount = candidates.filter(c => c.currentStage === CandidateStage.HIRED).length;
  const pendingCount = candidates.filter(c => 
    c.currentStage !== CandidateStage.HIRED && 
    c.currentStage !== CandidateStage.REJECTED
  ).length;

  const myInterviews = candidates
    .filter(c => 
      c.assignedInterviewerIds?.includes(currentUser.id) && 
      c.scheduledInterview
    )
    .sort((a, b) => {
      const dateA = new Date(`${a.scheduledInterview!.date} ${a.scheduledInterview!.time}`);
      const dateB = new Date(`${b.scheduledInterview!.date} ${b.scheduledInterview!.time}`);
      return dateA.getTime() - dateB.getTime();
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Storage Status Banner */}
      <div className="bg-[#002b5c] text-white p-4 rounded-xl flex items-center justify-between shadow-lg border-l-4 border-emerald-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <Database size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold">Cloud Database Connected</p>
            <p className="text-xs text-white/60">Your data is securely stored in Google Cloud SQL with file storage in Google Cloud Storage.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
          <ShieldCheck size={12} className="text-emerald-400" />
          Secure Connection
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Job Postings" 
          value={activeJobs} 
          icon={<Briefcase className="text-[#002b5c]" />} 
          bgColor="bg-blue-50" 
        />
        <StatCard 
          title="Total Applicants" 
          value={totalCandidates} 
          icon={<Users className="text-[#002b5c]" />} 
          bgColor="bg-indigo-50" 
        />
        <StatCard 
          title="Successful Hires" 
          value={hiredCount} 
          icon={<CheckCircle2 className="text-emerald-600" />} 
          bgColor="bg-emerald-50" 
        />
        <StatCard 
          title="Pending Review" 
          value={pendingCount} 
          icon={<Clock className="text-amber-600" />} 
          bgColor="bg-amber-50" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* My Interview Schedule */}
          <div className="bg-white p-8 rounded border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#c5a059] rounded flex items-center justify-center text-[#002b5c]">
                  <Calendar size={20} />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#002b5c]">My Interview Schedule</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upcoming Events</span>
            </div>
            
            <div className="space-y-4">
              {myInterviews.length > 0 ? (
                myInterviews.map(candidate => (
                  <div key={candidate.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-[#c5a059] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px] border-r border-slate-200 pr-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {new Date(candidate.scheduledInterview!.date).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-xl font-serif font-bold text-[#002b5c]">
                          {new Date(candidate.scheduledInterview!.date).getDate()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-[#002b5c] transition-colors">{candidate.name}</p>
                        <p className="text-xs text-slate-500">{jobs.find(j => j.id === candidate.jobId)?.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-[#c5a059] font-bold text-xs uppercase tracking-widest">
                          <Timer size={14} />
                          {candidate.scheduledInterview!.time}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{candidate.scheduledInterview!.type}</p>
                      </div>
                      <button className="p-2 text-slate-300 hover:text-[#002b5c] transition-colors">
                        <TrendingUp size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
                  <Calendar className="mx-auto text-slate-200 mb-3" size={32} />
                  <p className="text-sm text-slate-400 italic">No interviews scheduled for you at this time.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Applicants */}
          <div className="bg-white p-8 rounded border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-serif font-bold text-[#002b5c]">Recent Applicants</h3>
              <TrendingUp size={20} className="text-[#c5a059]" />
            </div>
            <div className="space-y-4">
              {candidates.slice(0, 5).map(candidate => (
                <div key={candidate.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-[#002b5c] flex items-center justify-center text-[#c5a059] font-bold">
                      {candidate.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{candidate.name}</p>
                      <p className="text-xs text-slate-500">{jobs.find(j => j.id === candidate.jobId)?.title || 'Unknown Job'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {currentUser.role === UserRole.HR && candidate.matchScore !== undefined && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#002b5c] uppercase tracking-widest">Keyword Match</p>
                        <p className="text-xs font-bold text-emerald-600">{candidate.matchScore}%</p>
                      </div>
                    )}
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                      candidate.currentStage === CandidateStage.REJECTED ? 'bg-red-50 text-red-700' :
                      candidate.currentStage === CandidateStage.HIRED ? 'bg-emerald-50 text-emerald-700' :
                      'bg-[#c5a059]/10 text-[#002b5c]'
                    }`}>
                      {candidate.currentStage}
                    </span>
                  </div>
                </div>
              ))}
              {candidates.length === 0 && (
                <p className="text-center text-slate-400 py-12 italic">No candidate data available.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded border border-slate-200 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-serif font-bold text-[#002b5c]">Active Opportunities</h3>
              <Briefcase size={20} className="text-[#c5a059]" />
            </div>
            <div className="space-y-4">
              {jobs.filter(j => j.status === 'Open').slice(0, 8).map(job => (
                <div key={job.id} className="p-4 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate pr-2">{job.title}</p>
                    <p className="text-lg font-bold text-[#002b5c]">
                      {candidates.filter(c => c.jobId === job.id).length}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{job.type} • {job.mode}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Applicants</p>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <p className="text-center text-slate-400 py-12 italic">No active job postings.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; bgColor: string }> = ({ title, value, icon, bgColor }) => (
  <div className="bg-white p-6 rounded border border-slate-200 shadow-sm flex items-center gap-5 group hover:border-[#c5a059] transition-colors">
    <div className={`w-14 h-14 rounded ${bgColor} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-serif font-bold text-[#002b5c]">{value}</p>
    </div>
  </div>
);

export default Dashboard;
