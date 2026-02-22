
import React, { useState, useRef } from 'react';
import { Job, Candidate, CandidateStage, User, UserRole } from '../types';
import { MapPin, DollarSign, Briefcase, ChevronRight, ArrowLeft, Send, TrendingUp, ShieldCheck, Award, Zap, Upload, Loader2 } from 'lucide-react';
import { apiService } from '../services/apiService';

interface PublicBoardProps {
  jobs: Job[];
  onApply: (candidate: Candidate) => void;
  currentUser: User | null;
}

const PublicBoard: React.FC<PublicBoardProps> = ({ jobs, onApply, currentUser }) => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    resume: currentUser?.profile?.resumeFileName || ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExternal = currentUser?.role === UserRole.EXTERNAL;

  const formatSalary = (job: Job) => {
    const min = job.salaryMin.toLocaleString();
    const max = job.salaryMax.toLocaleString();
    return `$${min} - $${max} ${job.salaryUnit}`;
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setUploadError(null);
    let resumeUrl = '';
    let resumeFileName = formData.resume;

    // Upload file if selected
    if (resumeFile) {
      setIsUploading(true);
      try {
        resumeUrl = await apiService.uploadFile(resumeFile);
        resumeFileName = resumeFile.name;
      } catch (err: any) {
        console.error('Upload failed:', err);
        setUploadError('Failed to upload resume. Please try again.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const newCandidate: Candidate = {
      id: Math.random().toString(36).substr(2, 9),
      jobId: selectedJob.id,
      name: formData.name,
      email: formData.email,
      currentStage: CandidateStage.APPLIED,
      appliedAt: new Date().toISOString(),
      resumeFileName: resumeFileName,
      resumeUrl: resumeUrl,
      history: [{
        id: Math.random().toString(36).substr(2, 9),
        stage: CandidateStage.APPLIED,
        timestamp: new Date().toISOString(),
        note: isExternal ? 'Applied via Quick Apply (Registered User)' : 'Initial application submitted via RIA Talent Portal.',
        authorRole: currentUser?.role,
        authorName: currentUser?.name
      }]
    };

    onApply(newCandidate);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsApplying(false);
      setSelectedJob(null);
      setResumeFile(null);
      if (!isExternal) setFormData({ name: '', email: '', resume: '' });
    }, 2000);
  };

  if (selectedJob) {
    return (
      <div className="max-w-5xl mx-auto bg-white rounded shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-500">
        <div className="bg-[#002b5c] p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <button onClick={() => setSelectedJob(null)} className="flex items-center gap-2 text-[#c5a059] hover:text-white mb-8 transition-colors font-bold uppercase tracking-widest text-xs"><ArrowLeft size={16} /> Back to Opportunities</button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-[#c5a059] text-[#002b5c] text-[10px] font-bold uppercase tracking-widest rounded">{selectedJob.type}</span>
              <h2 className="text-4xl font-serif font-bold leading-tight">{selectedJob.title}</h2>
              <div className="flex flex-wrap gap-6 text-white/70 text-sm font-medium">
                <span className="flex items-center gap-2"><MapPin size={16} className="text-[#c5a059]" /> {selectedJob.mode}</span>
                <span className="flex items-center gap-2"><DollarSign size={16} className="text-[#c5a059]" /> {formatSalary(selectedJob)}</span>
              </div>
            </div>
            <button onClick={() => setIsApplying(true)} className="bg-[#c5a059] text-[#002b5c] px-10 py-4 rounded font-bold hover:bg-white transition-all shadow-xl uppercase tracking-widest text-sm flex items-center gap-2">{isExternal && <Zap size={18} />} {isExternal ? 'Quick Apply' : 'Apply for this Position'}</button>
          </div>
        </div>

        <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-serif font-bold text-[#002b5c] mb-6 border-b-2 border-[#c5a059] pb-2 inline-block">Role Overview</h3>
            <div className="prose prose-slate max-w-none"><div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg font-light">{selectedJob.description}</div></div>
          </div>
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-slate-50 p-8 rounded border border-slate-100">
              <h4 className="font-serif font-bold text-[#002b5c] mb-4 text-xl">Why RIA?</h4>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-slate-600"><ShieldCheck className="text-[#c5a059] shrink-0" size={20} /> <span>Fiduciary-first approach to investment advice.</span></li>
                <li className="flex gap-3 text-sm text-slate-600"><TrendingUp className="text-[#c5a059] shrink-0" size={20} /> <span>Dynamic environment focused on market analysis.</span></li>
                <li className="flex gap-3 text-sm text-slate-600"><Award className="text-[#c5a059] shrink-0" size={20} /> <span>Industry-leading insights and research team.</span></li>
              </ul>
            </div>
          </div>
        </div>

        {isApplying && (
          <div className="fixed inset-0 bg-[#002b5c]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded shadow-2xl p-10 border-t-8 border-[#c5a059]">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100"><Send size={40} /></div>
                  <h3 className="text-3xl font-serif font-bold text-[#002b5c] mb-4">Application Received</h3>
                  <p className="text-slate-500 text-lg">Our recruitment team will review your credentials and reach out shortly.</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 className="text-3xl font-serif font-bold text-[#002b5c] mb-2">{isExternal ? 'Confirm Quick Apply' : 'Submit Application'}</h3>
                    <p className="text-slate-500">Applying for: <span className="font-bold text-[#c5a059]">{selectedJob.title}</span></p>
                  </div>
                  <form onSubmit={handleApply} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div><label className="block text-xs font-bold text-[#002b5c] uppercase tracking-widest mb-2">Full Name</label><input required type="text" disabled={isExternal} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-4 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all bg-slate-50 disabled:opacity-60" placeholder="Enter your full name" /></div>
                      <div><label className="block text-xs font-bold text-[#002b5c] uppercase tracking-widest mb-2">Email Address</label><input required type="email" disabled={isExternal} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-4 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all bg-slate-50 disabled:opacity-60" placeholder="email@example.com" /></div>
                      <div>
                        <label className="block text-xs font-bold text-[#002b5c] uppercase tracking-widest mb-2">Resume Upload</label>
                        <div className="relative">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validate file size (10MB max)
                                if (file.size > 10 * 1024 * 1024) {
                                  setUploadError('File size exceeds 10MB limit');
                                  return;
                                }
                                // Validate file type
                                const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                                if (!validTypes.includes(file.type)) {
                                  setUploadError('Please upload a PDF, DOCX, or TXT file');
                                  return;
                                }
                                setResumeFile(file);
                                setUploadError(null);
                              }
                            }}
                            accept=".pdf,.docx,.txt"
                            className="w-full p-4 border border-slate-200 rounded focus:ring-2 focus:ring-[#c5a059] outline-none transition-all bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#002b5c] file:text-white hover:file:bg-[#c5a059] hover:file:text-[#002b5c]"
                          />
                          {resumeFile && (
                            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                              <Upload size={12} /> {resumeFile.name}
                            </p>
                          )}
                          {uploadError && (
                            <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">Supported: PDF, DOCX, TXT (max 10MB)</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 pt-6">
                      <button type="button" onClick={() => setIsApplying(false)} disabled={isUploading} className="flex-1 py-4 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-[#002b5c] disabled:opacity-50">Cancel</button>
                      <button type="submit" disabled={isUploading || (!resumeFile && !formData.resume)} className="flex-1 bg-[#002b5c] text-white py-4 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isUploading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          isExternal ? 'Confirm & Apply' : 'Submit Application'
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20">
      <div className="text-center space-y-6 py-12 border-b border-slate-200 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#c5a059]"></div>
        <h2 className="text-5xl font-serif font-bold text-[#002b5c] tracking-tight">Careers at Real Investment Advice</h2>
        <p className="text-xl text-slate-500 max-w-3xl mx-auto font-light leading-relaxed">Join a team of dedicated professionals committed to providing honest, independent, and actionable financial insights.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#002b5c] uppercase tracking-[0.3em]">Current Openings</h3>
          <div className="h-px flex-1 bg-slate-100 mx-8"></div>
          <span className="text-xs font-bold text-[#c5a059] uppercase tracking-widest">{jobs.filter(j => j.status === 'Open').length} Positions Available</span>
        </div>

        {jobs.filter(j => j.status === 'Open').map(job => (
          <div key={job.id} onClick={() => setSelectedJob(job)} className="bg-white p-8 rounded border border-slate-200 shadow-sm hover:shadow-2xl hover:border-[#c5a059] cursor-pointer transition-all group flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#002b5c] group-hover:bg-[#c5a059] transition-colors"></div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-widest border border-[#c5a059]/30 px-2 py-0.5 rounded">{job.type}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posted {new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#002b5c] group-hover:text-[#c5a059] transition-colors">{job.title}</h3>
              <div className="flex flex-wrap gap-6 text-slate-500 text-sm font-medium">
                <span className="flex items-center gap-2"><MapPin size={16} className="text-[#c5a059]" /> {job.mode}</span>
                <span className="flex items-center gap-2"><DollarSign size={16} className="text-[#c5a059]" /> {formatSalary(job)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[#002b5c] font-bold uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">View Position <ChevronRight size={20} className="text-[#c5a059]" /></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicBoard;
