
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Sparkles, 
  FileUp, 
  Loader2, 
  Trash2, 
  X, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock,
  ChevronRight,
  ExternalLink,
  Save,
  Users,
  Share2,
  LayoutDashboard,
  FileText,
  CheckCircle2,
  Paperclip,
  UserPlus
} from 'lucide-react';
import { Job, EmploymentType, WorkMode, UserRole, Candidate, CandidateStage, User, SalaryUnit } from '../types';
import { apiService } from '../services/apiService';
import PipelineBoard from './PipelineBoard';
import AddCandidateModal from './AddCandidateModal';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

interface JobsListProps {
  jobs: Job[];
  candidates: Candidate[];
  users: User[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onUpdateCandidateStage: (id: string, stage: CandidateStage, note: string, reason?: string) => void;
  onUpdateCandidate: (candidate: Candidate) => void;
  onAddCandidate: (candidate: Candidate) => void;
  userRole: UserRole;
  currentUser: User;
}

const JobsList: React.FC<JobsListProps> = ({ 
  jobs, 
  candidates,
  users,
  onAddJob, 
  onUpdateJob, 
  onDeleteJob, 
  onUpdateCandidateStage,
  onUpdateCandidate,
  onAddCandidate,
  userRole,
  currentUser
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'pipeline'>('details');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.HR;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    salaryMin: 0,
    salaryMax: 0,
    salaryUnit: SalaryUnit.ANNUAL,
    type: EmploymentType.FULL_TIME,
    mode: WorkMode.ONSITE,
    referenceFileName: ''
  });

  useEffect(() => {
    if (isEditing && selectedJob) {
      setFormData({
        title: selectedJob.title,
        description: selectedJob.description,
        salaryMin: selectedJob.salaryMin,
        salaryMax: selectedJob.salaryMax,
        salaryUnit: selectedJob.salaryUnit,
        type: selectedJob.type,
        mode: selectedJob.mode,
        referenceFileName: selectedJob.referenceFileName || ''
      });
    }
  }, [isEditing, selectedJob]);

  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    try {
      const desc = await apiService.generateJobDescription(prompt);
      setFormData(prev => ({ ...prev, description: desc }));
    } catch (err) {
      alert('Failed to generate description');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
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
        alert('Unsupported file format. Please use .pdf, .docx, or .txt');
        setIsLoading(false);
        return;
      }

      const details = await apiService.extractJobDetails(text);
      setFormData({
        title: details.title || '',
        description: details.description || text,
        salaryMin: details.salaryMin || 0,
        salaryMax: details.salaryMax || 0,
        salaryUnit: (details.salaryUnit as SalaryUnit) || SalaryUnit.ANNUAL,
        type: (details.type as EmploymentType) || EmploymentType.FULL_TIME,
        mode: (details.mode as WorkMode) || WorkMode.ONSITE,
        referenceFileName: file.name
      });
      
      alert('Job details extracted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to extract details from the document.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedJob) {
      const updatedJob: Job = { ...selectedJob, ...formData };
      onUpdateJob(updatedJob);
      setSelectedJob(updatedJob);
      setIsEditing(false);
    } else {
      const newJob: Job = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        status: 'Open',
        createdAt: new Date().toISOString()
      };
      onAddJob(newJob);
      setIsCreating(false);
    }
    setFormData({ title: '', description: '', salaryMin: 0, salaryMax: 0, salaryUnit: SalaryUnit.ANNUAL, type: EmploymentType.FULL_TIME, mode: WorkMode.ONSITE, referenceFileName: '' });
  };

  const formatSalary = (job: Job) => {
    const min = job.salaryMin.toLocaleString();
    const max = job.salaryMax.toLocaleString();
    return `$${min} - $${max} ${job.salaryUnit}`;
  };

  const handleClosePosting = () => {
    if (selectedJob) {
      const updated = { ...selectedJob, status: 'Closed' as const };
      onUpdateJob(updated);
      setSelectedJob(updated);
    }
  };

  const handleDeletePosting = () => {
    if (selectedJob && window.confirm('Are you sure you want to delete this posting?')) {
      onDeleteJob(selectedJob.id);
      setSelectedJob(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-serif font-bold text-[#002b5c]">Internal Job Postings</h2>
        {canManage && (
          <button 
            onClick={() => { setIsEditing(false); setIsCreating(true); }}
            className="bg-[#002b5c] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-md font-bold text-xs uppercase tracking-widest"
          >
            <Plus size={18} />
            Create New Job
          </button>
        )}
      </div>

      {isCreating && canManage && (
        <div className="bg-white p-8 rounded border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
            <h3 className="text-xl font-serif font-bold text-[#002b5c]">New Job Opportunity</h3>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 space-y-6">
              <div className="p-5 bg-slate-50 rounded border border-slate-200">
                <h4 className="text-xs font-bold text-[#002b5c] uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Sparkles size={16} className="text-[#c5a059]" /> AI Generation</h4>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Senior Portfolio Manager..." className="w-full p-3 text-sm border border-slate-200 rounded h-28 mb-3 focus:ring-2 focus:ring-[#c5a059] outline-none" />
                <button onClick={handleGenerate} disabled={isLoading || !prompt} className="w-full bg-[#002b5c] text-white py-2.5 rounded text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#c5a059] hover:text-[#002b5c] transition-all">
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Generate Draft
                </button>
              </div>
              <div className="p-5 bg-slate-50 rounded border border-slate-200">
                <h4 className="text-xs font-bold text-[#002b5c] uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><FileUp size={16} className="text-[#c5a059]" /> Document Upload</h4>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.txt" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-full bg-white border border-slate-200 text-[#002b5c] py-2.5 rounded text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />} Upload Document
                </button>
                {formData.referenceFileName && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded text-[10px] text-emerald-700 font-bold uppercase tracking-widest">
                    <CheckCircle2 size={14} />
                    {formData.referenceFileName}
                  </div>
                )}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job Title</label><input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none" /></div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Min Salary</label>
                  <input required type="number" value={formData.salaryMin} onChange={(e) => setFormData({...formData, salaryMin: parseInt(e.target.value) || 0})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Max Salary</label>
                  <input required type="number" value={formData.salaryMax} onChange={(e) => setFormData({...formData, salaryMax: parseInt(e.target.value) || 0})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Salary Unit</label>
                  <select value={formData.salaryUnit} onChange={(e) => setFormData({...formData, salaryUnit: e.target.value as SalaryUnit})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none">
                    {Object.values(SalaryUnit).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Employment Type</label><select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as EmploymentType})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none">{Object.values(EmploymentType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Work Mode</label><select value={formData.mode} onChange={(e) => setFormData({...formData, mode: e.target.value as WorkMode})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none">{Object.values(WorkMode).map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job Description</label><textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-4 border border-slate-200 rounded h-72 focus:ring-2 focus:ring-[#c5a059] outline-none font-sans text-sm leading-relaxed" /></div>
              <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2.5 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-[#002b5c]">Cancel</button>
                <button type="submit" className="px-8 py-2.5 bg-[#002b5c] text-white font-bold rounded uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] shadow-lg">Publish Posting</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {jobs.map(job => (
          <div key={job.id} className="bg-white p-8 rounded border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#c5a059] transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#002b5c] group-hover:bg-[#c5a059] transition-colors"></div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-serif font-bold text-[#002b5c] text-xl group-hover:text-[#c5a059] transition-colors">{job.title}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Created {new Date(job.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${job.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{job.status}</span>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-widest border border-slate-100 rounded">{job.type}</span>
              <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-widest border border-slate-100 rounded">{job.mode}</span>
              <span className="px-2 py-1 bg-[#c5a059]/10 text-[#002b5c] text-[10px] font-bold uppercase tracking-widest rounded">{formatSalary(job)}</span>
            </div>
            <p className="text-sm text-slate-600 line-clamp-3 mb-8 leading-relaxed font-light">{job.description}</p>
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-[#002b5c] font-bold text-xs">{candidates.filter(c => c.jobId === job.id).length}</div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Applicants</span>
              </div>
              <button onClick={() => { setSelectedJob(job); setIsEditing(false); setActiveTab('details'); }} className="text-[#002b5c] text-xs font-bold uppercase tracking-widest hover:text-[#c5a059] transition-colors flex items-center gap-1">View Details <ChevronRight size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-[#002b5c]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-[#c5a059] text-[#002b5c] text-[10px] font-bold uppercase tracking-widest rounded">{selectedJob.type}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {selectedJob.id}</span>
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#002b5c]">{selectedJob.title}</h2>
              </div>
              <button onClick={() => { setSelectedJob(null); setIsEditing(false); }} className="text-slate-400 hover:text-[#002b5c] transition-colors p-2 hover:bg-white rounded-full"><X size={28} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white px-8">
              <button onClick={() => setActiveTab('details')} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'details' ? 'border-[#c5a059] text-[#002b5c]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Details & Actions</button>
              <button onClick={() => setActiveTab('pipeline')} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'pipeline' ? 'border-[#c5a059] text-[#002b5c]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Candidate Pipeline</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'details' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-8">
                    {isEditing ? (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job Title</label><input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none" /></div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Min Salary</label>
                            <input required type="number" value={formData.salaryMin} onChange={(e) => setFormData({...formData, salaryMin: parseInt(e.target.value) || 0})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Max Salary</label>
                            <input required type="number" value={formData.salaryMax} onChange={(e) => setFormData({...formData, salaryMax: parseInt(e.target.value) || 0})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none" />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Salary Unit</label>
                            <select value={formData.salaryUnit} onChange={(e) => setFormData({...formData, salaryUnit: e.target.value as SalaryUnit})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none">
                              {Object.values(SalaryUnit).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Employment Type</label><select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as EmploymentType})} className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none">{Object.values(EmploymentType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                        </div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job Description</label><textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-4 border border-slate-200 rounded h-96 focus:ring-2 focus:ring-[#c5a059] outline-none font-sans text-sm leading-relaxed" /></div>
                        <div className="flex gap-4"><button type="submit" className="bg-[#002b5c] text-white px-8 py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] shadow-lg flex items-center gap-2"><Save size={16} /> Save Changes</button><button type="button" onClick={() => setIsEditing(false)} className="px-8 py-3 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-[#002b5c]">Cancel</button></div>
                      </form>
                    ) : (
                      <>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-6 border-b border-slate-100 pb-2">Full Description</h3>
                        <div className="prose prose-slate max-w-none"><div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg font-light">{selectedJob.description}</div></div>
                      </>
                    )}
                  </div>
                  <div className="lg:col-span-4 space-y-8">
                    <div className="bg-[#002b5c] p-6 rounded text-white shadow-lg">
                      <h4 className="font-serif font-bold text-[#c5a059] mb-4 text-lg">Posting Status</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm"><span className="text-white/60">Current Status</span><span className={`font-bold uppercase tracking-widest text-[10px] px-2 py-0.5 rounded ${selectedJob.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{selectedJob.status}</span></div>
                        <div className="flex justify-between items-center text-sm"><span className="text-white/60">Salary</span><span className="font-bold text-xs">{formatSalary(selectedJob)}</span></div>
                        {canManage && !isEditing && <button onClick={() => setIsEditing(true)} className="w-full bg-[#c5a059] text-[#002b5c] py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-white transition-all mt-4 flex items-center justify-center gap-2"><Briefcase size={16} /> Edit Posting</button>}
                      </div>
                    </div>

                    {selectedJob.referenceFileName && (
                      <div className="p-6 border border-slate-200 rounded bg-slate-50">
                        <h4 className="font-serif font-bold text-[#002b5c] mb-4">Source Document</h4>
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                          <Paperclip size={18} className="text-[#c5a059]" />
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-900 truncate">{selectedJob.referenceFileName}</p>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest">Original Reference</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-6 border border-slate-200 rounded bg-slate-50">
                      <h4 className="font-serif font-bold text-[#002b5c] mb-4">Quick Actions</h4>
                      <div className="space-y-3">
                        <button onClick={() => setActiveTab('pipeline')} className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-600 hover:bg-white hover:text-[#002b5c] rounded border border-transparent hover:border-slate-200 transition-all uppercase tracking-widest"><div className="flex items-center gap-2"><Users size={16} className="text-[#c5a059]" /> View Applicants</div><ChevronRight size={16} /></button>
                        {canManage && selectedJob.status === 'Open' && <button onClick={handleClosePosting} className="w-full flex items-center justify-between p-3 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded border border-transparent hover:border-amber-100 transition-all uppercase tracking-widest"><div className="flex items-center gap-2"><X size={16} /> Close Posting</div></button>}
                        {canManage && <button onClick={handleDeletePosting} className="w-full flex items-center justify-between p-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-all uppercase tracking-widest"><div className="flex items-center gap-2"><Trash2 size={16} /> Delete Posting</div></button>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-serif font-bold text-[#002b5c]">Job-Specific Pipeline</h3>
                      <p className="text-xs text-slate-500">Managing {candidates.filter(c => c.jobId === selectedJob.id).length} applicants for this role.</p>
                    </div>
                    {canManage && (
                      <button 
                        onClick={() => setIsAddingCandidate(true)}
                        className="bg-[#002b5c] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#c5a059] hover:text-[#002b5c] transition-all shadow-md font-bold text-xs uppercase tracking-widest"
                      >
                        <UserPlus size={16} />
                        Add Candidate
                      </button>
                    )}
                  </div>
                  <PipelineBoard candidates={candidates} jobs={jobs} users={users} onUpdateStage={onUpdateCandidateStage} onUpdateCandidate={onUpdateCandidate} userRole={userRole} currentUser={currentUser} filterJobId={selectedJob.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {isAddingCandidate && selectedJob && (
        <AddCandidateModal 
          jobs={jobs}
          initialJobId={selectedJob.id}
          onClose={() => setIsAddingCandidate(false)}
          onAdd={onAddCandidate}
        />
      )}
    </div>
  );
};

export default JobsList;
