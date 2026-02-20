
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Candidate, CandidateStage, Job } from '../types';

interface ReportsProps {
  candidates: Candidate[];
  jobs: Job[];
}

const Reports: React.FC<ReportsProps> = ({ candidates, jobs }) => {
  // Funnel Data
  const funnelData = Object.values(CandidateStage).map(stage => ({
    name: stage,
    count: candidates.filter(c => c.currentStage === stage).length
  }));

  // Rejection Reasons Data
  const rejectionReasons: Record<string, number> = {};
  candidates.forEach(c => {
    c.history.forEach(h => {
      if (h.reason) {
        rejectionReasons[h.reason] = (rejectionReasons[h.reason] || 0) + 1;
      }
    });
  });

  const pieData = Object.entries(rejectionReasons).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

  const hasData = candidates.length > 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Hiring Funnel</h3>
          <div className="h-80">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                No candidate data to display.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Rejection Reasons</h3>
          <div className="h-80">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                No rejection data available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Candidate Transparency Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 font-semibold text-slate-500 text-sm">Candidate</th>
                <th className="pb-4 font-semibold text-slate-500 text-sm">Job</th>
                <th className="pb-4 font-semibold text-slate-500 text-sm">Current Status</th>
                <th className="pb-4 font-semibold text-slate-500 text-sm">Last Action Note</th>
                <th className="pb-4 font-semibold text-slate-500 text-sm">Reason (if applicable)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {candidates.map(candidate => {
                const lastEvent = candidate.history[candidate.history.length - 1];
                return (
                  <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4">
                      <p className="font-medium text-slate-900">{candidate.name}</p>
                      <p className="text-xs text-slate-500">{candidate.email}</p>
                    </td>
                    <td className="py-4 text-sm text-slate-600">
                      {jobs.find(j => j.id === candidate.jobId)?.title || 'Unknown Job'}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        candidate.currentStage === CandidateStage.REJECTED ? 'bg-red-100 text-red-700' :
                        candidate.currentStage === CandidateStage.HIRED ? 'bg-emerald-100 text-emerald-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {candidate.currentStage}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-slate-500 italic">
                      "{lastEvent?.note || 'Applied'}"
                    </td>
                    <td className="py-4 text-sm text-slate-600">
                      {lastEvent?.reason || '-'}
                    </td>
                  </tr>
                );
              })}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                    No candidates found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
