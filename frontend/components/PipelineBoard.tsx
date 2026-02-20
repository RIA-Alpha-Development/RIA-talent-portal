
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Candidate, CandidateStage, Job, UserRole, User, CandidateEvent } from '../types';
import { 
  MoreVertical, 
  Mail, 
  Phone, 
  XCircle, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Tag,
  MessageSquare,
  Calendar,
  FileText,
  UserPlus,
  Check,
  X,
  Search,
  ChevronDown,
  User as UserIcon,
  Timer,
  ExternalLink,
  FileUp,
  Loader2,
  Sparkles,
  ArrowRightCircle,
  Paperclip,
  Eye,
  BrainCircuit
} from 'lucide-react';
import { summarizeInterviewNotes } from '../services/geminiService';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Ensure the worker version matches the API version exactly
pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

interface PipelineBoardProps {
  candidates: Candidate[];
  jobs: Job[];
  users: User[];
  onUpdateStage: (id: string, stage: CandidateStage, note: string, reason?: string, attachmentName?: string, attachmentData?: string) => void;
  onUpdateCandidate: (candidate: Candidate) => void;
  userRole: UserRole;
  currentUser: User;
  filterJobId?: string;
}

const PipelineBoard: React.FC<PipelineBoardProps> = ({ 
  candidates, 
  jobs, 
  users,
  onUpdateStage, 
  onUpdateCandidate,
  userRole,
  currentUser,
  filterJobId
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isProcessingNotes, setIsProcessingNotes] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<{ name: string, data: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [updateData, setUpdateData] = useState({ 
    stage: CandidateStage.APPLIED, 
    note: '', 
    reason: '',
    attachmentName: '',
    attachmentData: ''
  });
  
  const notesFileInputRef = useRef<HTMLInputElement>(null);

  // Scheduling state
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');

  const stages = Object.values(CandidateStage);
  const isAdminOrHR = userRole === UserRole.ADMIN || userRole === UserRole.HR;
  
  // Reset update form when candidate changes
  useEffect(() => {
    if (selectedCandidate) {
      setUpdateData({
        stage: selectedCandidate.currentStage,
        note: '',
        reason: '',
        attachmentName: '',
        attachmentData: ''
      });
      setIsUpdating(false);
      setIsScheduling(false);
    }
  }, [selectedCandidate]);

  const canManageCandidate = (candidate: Candidate) => {
    if (isAdminOrHR) return true;
    return candidate.assignedInterviewerIds?.includes(currentUser.id);
  };

  const filteredCandidates = filterJobId 
    ? candidates.filter(c => c.jobId === filterJobId)
    : candidates;

  const availableInterviewers = useMemo(() => {
    return users.filter(u => 
      (u.role === UserRole.BUSINESS || u.role === UserRole.HR || u.role === UserRole.ADMIN) &&
      (u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    );
  }, [users, userSearch]);

  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (err) {
      console.error('PDF Extraction Error:', err);
      throw new Error('Failed to read PDF content.');
    }
  };

  const handleUpdate = () => {
    if (selectedCandidate) {
      onUpdateStage(
        selectedCandidate.id, 
        updateData.stage, 
        updateData.note, 
        updateData.reason, 
        updateData.attachmentName,
        updateData.attachmentData
      );
      setIsUpdating(false);
      setSelectedCandidate(null);
    }
  };

  const toggleInterviewer = (userId: string) => {
    if (!selectedCandidate) return;
    const currentIds = selectedCandidate.assignedInterviewerIds || [];
    const newIds = currentIds.includes(userId)
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId];
    
    const updatedCandidate = { ...selectedCandidate, assignedInterviewerIds: newIds };
    onUpdateCandidate(updatedCandidate);
    setSelectedCandidate(updatedCandidate);
  };

  const handleSaveSchedule = () => {
    if (!selectedCandidate || !schedDate || !schedTime) return;
    
    const updatedCandidate: Candidate = {
      ...selectedCandidate,
      scheduledInterview: {
        date: schedDate,
        time: schedTime,
        type: selectedCandidate.currentStage
      }
    };
    
    onUpdateCandidate(updatedCandidate);
    setSelectedCandidate(updatedCandidate);
    setIsScheduling(false);
    setSchedDate('');
    setSchedTime('');
  };

  const openScheduling = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setSchedDate(candidate.scheduledInterview?.date || '');
    setSchedTime(candidate.scheduledInterview?.time || '');
    setIsScheduling(true);
  };

  const handleContactCandidate = () => {
    if (!selectedCandidate) return;

    const job = jobs.find(j => j.id === selectedCandidate.jobId);
    const interviewers = selectedCandidate.assignedInterviewerIds
      ?.map(id => users.find(u => u.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'TBD';

    const subject = encodeURIComponent(`Interview Invitation: ${job?.title || 'Position'} at Real Investment Advice`);
    
    let bodyText = `Hi ${selectedCandidate.name},\n\n`;
    
    if (selectedCandidate.scheduledInterview) {
      const dateStr = new Date(selectedCandidate.scheduledInterview.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
      
      bodyText += `We are pleased to invite you for an interview for the ${job?.title || 'requested'} position.\n\n`;
      bodyText += `Details:\n`;
      bodyText += `Stage: ${selectedCandidate.scheduledInterview.type}\n`;
      bodyText += `Date: ${dateStr}\n`;
      bodyText += `Time: ${selectedCandidate.scheduledInterview.time}\n`;
      bodyText += `Interviewers: ${interviewers}\n\n`;
      bodyText += `Please let us know if this time works for you. We look forward to speaking with you.\n\n`;
    } else {
      bodyText += `We are reviewing your application for the ${job?.title || 'requested'} position and would like to discuss your background further.\n\n`;
      bodyText += `Please let us know your availability for a brief introductory call.\n\n`;
    }

    bodyText += `Best regards,\n\n${currentUser.name}\nReal Investment Advice`;
    
    const mailtoLink = `mailto:${selectedCandidate.email}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoLink;
  };

  const handleNotesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingNotes(true);
    try {
      let text = '';
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        text = await extractPdfText(arrayBuffer);
      } else if (fileName.endsWith('.txt')) {
        text = await file.text();
      } else {
        alert('Please upload a .pdf, .docx, or .txt transcript.');
        setIsProcessingNotes(false);
        return;
      }

      // Store both name and content
      setUpdateData(prev => ({
        ...prev,
        attachmentName: file.name,
        attachmentData: text
      }));
      
      alert('Transcript attached successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to process transcript.');
    } finally {
      setIsProcessingNotes(false);
      if (notesFileInputRef.current) notesFileInputRef.current.value = '';
    }
  };

  const getNextStage = (current: CandidateStage): CandidateStage => {
    const pipeline = [
      CandidateStage.APPLIED,
      CandidateStage.PHONE_SCREEN,
      CandidateStage.IN_HOUSE_INTERVIEW,
      CandidateStage.OFFER,
      CandidateStage.HIRED
    ];
    const currentIndex = pipeline.indexOf(current);
    if (currentIndex === -1 || currentIndex === pipeline.length - 1) return current;
    return pipeline[currentIndex + 1];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-[400px]">
        {stages.map(stage => (
          <div key={stage} className="flex-shrink-0 w-72 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200">
            <div className="p-3 flex items-center justify-between border-b border-slate-200 bg-white rounded-t-xl">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-widest flex items-center gap-2">
                {stage}
                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">
                  {filteredCandidates.filter(c => c.currentStage === stage).length}
                </span>
              </h3>
            </div>
            
            <div className="p-2 space-y-3 overflow-y-auto flex-1">
              {filteredCandidates
                .filter(c => c.currentStage === stage)
                .map(candidate => (
                  <div 
                    key={candidate.id} 
                    onClick={() => setSelectedCandidate(candidate)}
                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-[#c5a059] cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#002b5c] transition-colors">
                        {candidate.name}
                      </h4>
                      {candidate.assignedInterviewerIds && candidate.assignedInterviewerIds.length > 0 && (
                        <div className="flex -space-x-1">
                          {candidate.assignedInterviewerIds.slice(0, 3).map(id => (
                            <div key={id} className="w-5 h-5 rounded-full bg-[#c5a059] border-2 border-white flex items-center justify-center text-[8px] text-[#002b5c] font-bold shadow-sm">
                              {users.find(u => u.id === id)?.name.charAt(0)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Match Score Indicator */}
                    {candidate.matchScore !== undefined && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            <BrainCircuit size={10} className="text-[#002b5c]" />
                            AI Match
                          </div>
                          <span className="text-[10px] font-bold text-[#002b5c]">{candidate.matchScore}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${getScoreColor(candidate.matchScore)}`}
                            style={{ width: `${candidate.matchScore}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {candidate.scheduledInterview && (
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded mb-2 w-fit">
                        <Calendar size={10} />
                        {new Date(candidate.scheduledInterview.date).toLocaleDateString()} @ {candidate.scheduledInterview.time}
                      </div>
                    )}

                    {!filterJobId && (
                      <p className="text-[10px] text-slate-500 mb-2 truncate">
                        {jobs.find(j => j.id === candidate.jobId)?.title || 'Unknown Job'}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail size={12} />
                      {candidate.phone && <Phone size={12} />}
                      <div className="flex-1"></div>
                      <span className="text-[9px] font-medium text-slate-400">
                        {new Date(candidate.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-[#002b5c]/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#002b5c] flex items-center justify-center text-[#c5a059] font-bold text-2xl shadow-lg">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-serif font-bold text-[#002b5c]">{selectedCandidate.name}</h2>
                    {selectedCandidate.matchScore !== undefined && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#002b5c]/5 border border-[#002b5c]/10 rounded-lg">
                        <BrainCircuit size={14} className="text-[#002b5c]" />
                        <span className="text-xs font-bold text-[#002b5c]">{selectedCandidate.matchScore}% Match</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1.5 text-sm text-slate-500"><Mail size={14} /> {selectedCandidate.email}</span>
                    {selectedCandidate.phone && <span className="flex items-center gap-1.5 text-sm text-slate-500"><Phone size={14} /> {selectedCandidate.phone}</span>}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedCandidate(null);
                  setIsUpdating(false);
                  setIsScheduling(false);
                }} 
                className="text-slate-400 hover:text-[#002b5c] transition-colors"
              >
                <XCircle size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                {isScheduling ? (
                  <section className="animate-in fade-in slide-in-from-left-4 space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#002b5c] uppercase tracking-widest">Schedule & Assign Panel</h3>
                        <p className="text-xs text-slate-500 mt-1">Set the date, time, and evaluation team for the <strong>{selectedCandidate.currentStage}</strong>.</p>
                      </div>
                      <button onClick={() => setIsScheduling(false)} className="text-xs font-bold text-slate-400 hover:text-[#002b5c] uppercase tracking-widest flex items-center gap-1">
                        <X size={14} /> Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Interview Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="date"
                            value={schedDate}
                            onChange={(e) => setSchedDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Interview Time</label>
                        <div className="relative">
                          <Timer className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="time"
                            value={schedTime}
                            onChange={(e) => setSchedTime(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Evaluation Team</h4>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Search size={18} />
                        </div>
                        <input 
                          type="text"
                          placeholder="Search team members..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none transition-all text-sm"
                        />
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto divide-y divide-slate-50">
                        {availableInterviewers.map(user => {
                          const isAssigned = selectedCandidate.assignedInterviewerIds?.includes(user.id);
                          return (
                            <button
                              key={user.id}
                              onClick={() => toggleInterviewer(user.id)}
                              className={`w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors ${isAssigned ? 'bg-indigo-50/30' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAssigned ? 'bg-[#002b5c] text-[#c5a059]' : 'bg-slate-100 text-slate-400'}`}>
                                  {user.name.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-900">{user.name}</p>
                                  <p className="text-[9px] uppercase tracking-widest text-slate-400">{user.role}</p>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isAssigned ? 'bg-[#c5a059] border-[#c5a059] text-[#002b5c]' : 'border-slate-200'}`}>
                                {isAssigned && <Check size={12} strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.assignedInterviewerIds?.map(id => {
                          const user = users.find(u => u.id === id);
                          if (!user) return null;
                          return (
                            <div key={id} className="flex items-center gap-2 bg-[#002b5c] text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm">
                              <span className="text-[#c5a059]">{user.name}</span>
                              <button onClick={() => toggleInterviewer(id)} className="hover:text-red-400 transition-colors"><X size={12} /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      onClick={handleSaveSchedule}
                      disabled={!schedDate || !schedTime}
                      className="w-full bg-[#002b5c] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-lg disabled:opacity-50"
                    >
                      Confirm Schedule & Team
                    </button>
                  </section>
                ) : (
                  <>
                    {selectedCandidate.scheduledInterview && (
                      <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Calendar size={24} className="text-[#c5a059]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Upcoming {selectedCandidate.scheduledInterview.type}</p>
                            <p className="text-lg font-bold">{new Date(selectedCandidate.scheduledInterview.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                            <p className="text-sm font-medium text-[#c5a059]">at {selectedCandidate.scheduledInterview.time}</p>
                          </div>
                        </div>
                        {isAdminOrHR && (
                          <button onClick={() => setIsScheduling(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">Reschedule</button>
                        )}
                      </div>
                    )}

                    {selectedCandidate.summary && (
                      <section>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Professional Summary</h3>
                        <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                          {selectedCandidate.summary}
                        </p>
                      </section>
                    )}

                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Timeline & Notes</h3>
                      <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {selectedCandidate.history.map((event) => (
                          <div key={event.id} className="relative pl-10">
                            <div className={`absolute left-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${
                              event.stage === CandidateStage.HIRED ? 'bg-emerald-500' :
                              event.stage === CandidateStage.REJECTED ? 'bg-red-500' :
                              'bg-[#002b5c]'
                            }`}>
                              <Clock size={12} className="text-white" />
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-slate-900 text-sm">
                                  {event.stage === selectedCandidate.currentStage ? 'Current Stage: ' : 'Moved to '} {event.stage}
                                </h4>
                                <span className="text-[10px] text-slate-400">{new Date(event.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-slate-600 italic">"{event.note}"</p>
                              
                              {event.attachmentName && (
                                <div className="mt-3 flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg w-fit">
                                  <Paperclip size={12} className="text-[#c5a059]" />
                                  <span className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]">{event.attachmentName}</span>
                                  <button 
                                    onClick={() => setViewingAttachment({ name: event.attachmentName!, data: event.attachmentData || '' })}
                                    className="text-[9px] font-bold text-[#002b5c] uppercase tracking-widest hover:underline ml-2 flex items-center gap-1"
                                  >
                                    <Eye size={10} />
                                    Review
                                  </button>
                                </div>
                              )}

                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">By {event.authorName || 'System'} ({event.authorRole || 'Admin'})</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#002b5c] p-6 rounded-2xl text-white shadow-xl">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                    <ChevronRight size={18} className="text-[#c5a059]" />
                    {canManageCandidate(selectedCandidate) ? 'Take Action' : 'Feedback Restricted'}
                  </h3>
                  {!isUpdating ? (
                    <div className="space-y-3">
                      {canManageCandidate(selectedCandidate) ? (
                        <>
                          <button 
                            onClick={() => {
                              const next = getNextStage(selectedCandidate.currentStage);
                              setUpdateData({ ...updateData, stage: next });
                              setIsUpdating(true);
                            }}
                            className="w-full bg-[#c5a059] text-[#002b5c] py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:bg-white flex items-center justify-center gap-2"
                          >
                            <ArrowRightCircle size={16} />
                            Move to Next Stage
                          </button>
                          <button 
                            onClick={() => {
                              setUpdateData({ ...updateData, stage: CandidateStage.REJECTED });
                              setIsUpdating(true);
                            }}
                            className="w-full bg-red-500 hover:bg-red-600 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                          >
                            Reject Candidate
                          </button>
                        </>
                      ) : (
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-[10px] text-white/60 leading-relaxed italic">You are not currently assigned to this candidate's interview panel. Please contact HR to be added.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      {canManageCandidate(selectedCandidate) && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase mb-1 opacity-60 tracking-widest">New Stage</label>
                          <select 
                            value={updateData.stage}
                            onChange={(e) => setUpdateData({...updateData, stage: e.target.value as CandidateStage})}
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm outline-none focus:bg-white/20"
                          >
                            {stages.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold uppercase opacity-60 tracking-widest">Feedback / Note</label>
                          <button 
                            onClick={() => notesFileInputRef.current?.click()}
                            className="text-[9px] font-bold text-[#c5a059] uppercase tracking-widest flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <FileUp size={10} />
                            Attach Transcript
                          </button>
                          <input 
                            type="file" 
                            ref={notesFileInputRef} 
                            onChange={handleNotesUpload} 
                            className="hidden" 
                            accept=".pdf,.docx,.txt" 
                          />
                        </div>
                        <textarea 
                          value={updateData.note}
                          onChange={(e) => setUpdateData({...updateData, note: e.target.value})}
                          className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm outline-none focus:bg-white/20 h-32"
                          placeholder="Share your thoughts or attach a transcript..."
                        />
                        {updateData.attachmentName && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-white/10 rounded border border-white/10">
                            <Paperclip size={12} className="text-[#c5a059]" />
                            <span className="text-[9px] font-bold truncate flex-1">{updateData.attachmentName}</span>
                            <button onClick={() => setUpdateData(prev => ({ ...prev, attachmentName: '', attachmentData: '' }))} className="text-red-400 hover:text-red-300">
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleUpdate}
                          className="flex-1 bg-[#c5a059] text-[#002b5c] py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setIsUpdating(false)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-[#002b5c] mb-4 text-sm uppercase tracking-widest">Candidate Assets</h3>
                  <div className="space-y-2">
                    {isAdminOrHR && (
                      <button 
                        onClick={() => openScheduling(selectedCandidate)}
                        className={`w-full flex items-center gap-3 p-3 text-xs font-bold rounded-xl transition-colors uppercase tracking-widest border ${
                          isScheduling ? 'bg-[#c5a059] text-[#002b5c] border-[#c5a059]' : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-transparent'
                        }`}
                      >
                        <Calendar size={16} className={isScheduling ? 'text-[#002b5c]' : 'text-[#c5a059]'} />
                        Schedule & Assign
                      </button>
                    )}
                    {selectedCandidate.resumeFileName ? (
                      <button className="w-full flex items-center gap-3 p-3 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100">
                        <FileText size={16} className="text-[#c5a059]" />
                        <div className="text-left overflow-hidden">
                          <p className="font-bold truncate">{selectedCandidate.resumeFileName}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest">Resume File</p>
                        </div>
                      </button>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">No resume file uploaded.</p>
                    )}
                    <button 
                      onClick={handleContactCandidate}
                      className="w-full flex items-center gap-3 p-3 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors uppercase tracking-widest group"
                    >
                      <MessageSquare size={16} className="text-[#c5a059]" />
                      Contact Candidate
                      <ExternalLink size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                </div>

                {selectedCandidate.assignedInterviewerIds && selectedCandidate.assignedInterviewerIds.length > 0 && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-[#002b5c] mb-4 text-sm uppercase tracking-widest">Assigned Team</h3>
                    <div className="space-y-3">
                      {selectedCandidate.assignedInterviewerIds.map(id => {
                        const user = users.find(u => u.id === id);
                        return (
                          <div key={id} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[#002b5c] flex items-center justify-center text-[#c5a059] font-bold text-xs">
                              {user?.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest">{user?.role}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-[#002b5c]/95 backdrop-blur-md z-[200] flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#002b5c] rounded flex items-center justify-center text-[#c5a059]">
                  <Paperclip size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#002b5c]">{viewingAttachment.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transcript Review</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingAttachment(null)} 
                className="text-slate-400 hover:text-[#002b5c] transition-colors p-2 hover:bg-white rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-inner min-h-full">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                  {viewingAttachment.data || 'No content available for this attachment.'}
                </pre>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
              <button 
                onClick={() => setViewingAttachment(null)}
                className="bg-[#002b5c] text-white px-8 py-2.5 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-lg"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineBoard;
