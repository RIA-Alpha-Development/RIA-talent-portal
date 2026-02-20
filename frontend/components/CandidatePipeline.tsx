
import React, { useState } from 'react';
import { Candidate, CandidateStage, Job, UserRole, User } from '../types';
import { Plus, UserPlus } from 'lucide-react';
import AddCandidateModal from './AddCandidateModal';
import PipelineBoard from './PipelineBoard';

interface CandidatePipelineProps {
  candidates: Candidate[];
  jobs: Job[];
  users: User[];
  onUpdateStage: (id: string, stage: CandidateStage, note: string, reason?: string) => void;
  onUpdateCandidate: (candidate: Candidate) => void;
  onAddCandidate?: (candidate: Candidate) => void;
  userRole: UserRole;
  currentUser: User;
}

const CandidatePipeline: React.FC<CandidatePipelineProps> = ({ 
  candidates, 
  jobs, 
  users,
  onUpdateStage, 
  onUpdateCandidate,
  onAddCandidate, 
  userRole,
  currentUser
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const canAddCandidates = userRole === UserRole.ADMIN || userRole === UserRole.HR || userRole === UserRole.BUSINESS;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-serif font-bold text-[#002b5c]">Global Candidate Pipeline</h2>
        {canAddCandidates && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[#002b5c] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-md font-bold text-xs uppercase tracking-widest"
          >
            {userRole === UserRole.BUSINESS ? <UserPlus size={16} /> : <Plus size={16} />}
            {userRole === UserRole.BUSINESS ? 'Refer Candidate' : 'Add Candidate'}
          </button>
        )}
      </div>

      <PipelineBoard 
        candidates={candidates}
        jobs={jobs}
        users={users}
        onUpdateStage={onUpdateStage}
        onUpdateCandidate={onUpdateCandidate}
        userRole={userRole}
        currentUser={currentUser}
      />

      {/* Add Candidate Modal */}
      {isAdding && onAddCandidate && (
        <AddCandidateModal 
          jobs={jobs} 
          onClose={() => setIsAdding(false)} 
          onAdd={(c) => {
            if (userRole === UserRole.BUSINESS) {
              c.referredBy = currentUser.id;
              c.history[0].note = `Referred by ${currentUser.name} (Business User)`;
            }
            onAddCandidate(c);
          }} 
        />
      )}
    </div>
  );
};

export default CandidatePipeline;
