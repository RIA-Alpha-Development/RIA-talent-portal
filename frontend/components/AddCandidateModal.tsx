
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, FileText, CheckCircle2, Sparkles, AlertCircle, BrainCircuit } from 'lucide-react';
import { Job, Candidate, CandidateStage } from '../types';
import { extractCandidateDetails, calculateMatchScore } from '../services/geminiService';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Ensure the worker version matches the API version exactly
pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

interface AddCandidateModalProps {
  jobs: Job[];
  onClose: () => void;
  onAdd: (candidate: Candidate) => void;
  initialJobId?: string;
}

const AddCandidateModal: React.FC<AddCandidateModalProps> = ({ jobs, onClose, onAdd, initialJobId }) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Candidate>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    summary: '',
    skills: [],
    jobId: initialJobId || jobs[0]?.id || '',
    currentStage: CandidateStage.APPLIED,
    matchScore: 0
  });

  // Recalculate match score if job changes during review
  useEffect(() => {
    if (step === 'review' && formData.jobId && extractedText) {
      handleCalculateMatch(formData.jobId, extractedText);
    }
  }, [formData.jobId, step]);

  const handleCalculateMatch = async (jobId: string, text: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setIsScoring(true);
    try {
      const score = await calculateMatchScore(text, job.description);
      setFormData(prev => ({ ...prev, matchScore: score }));
    } catch (err) {
      console.error('Scoring error:', err);
    } finally {
      setIsScoring(false);
    }
  };

  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (err) {
      console.error('PDF Extraction Error:', err);
      throw new Error('Failed to read PDF content.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsLoading(true);
    setError(null);

    try {
      let text = '';
      const fileName = selectedFile.name.toLowerCase();

      if (fileName.endsWith('.docx')) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        text = await extractPdfText(arrayBuffer);
      } else if (fileName.endsWith('.txt')) {
        text = await selectedFile.text();
      } else {
        throw new Error('Unsupported file format. Please use .pdf, .docx, or .txt');
      }

      if (!text || text.trim().length < 10) {
        throw new Error('The document appears to be empty or contains too little text for analysis.');
      }

      setExtractedText(text);
      const extracted = await extractCandidateDetails(text);
      
      if (!extracted || (!extracted.name && !extracted.email)) {
        throw new Error('AI was unable to identify key information (Name/Email) from this document.');
      }

      setFormData(prev => ({
        ...prev,
        ...extracted,
        resumeFileName: selectedFile.name
      }));
      setStep('review');
    } catch (err: any) {
      console.error('Extraction Error:', err);
      setError(err.message || 'Failed to process the document.');
      setStep('review');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.jobId) {
      setError('Name, Email, and Target Job are required.');
      return;
    }

    const newCandidate: Candidate = {
      id: Math.random().toString(36).substr(2, 9),
      jobId: formData.jobId!,
      name: formData.name!,
      email: formData.email!,
      phone: formData.phone || '',
      address: formData.address || '',
      summary: formData.summary || '',
      skills: formData.skills || [],
      resumeFileName: formData.resumeFileName,
      currentStage: CandidateStage.APPLIED,
      appliedAt: new Date().toISOString(),
      matchScore: formData.matchScore,
      history: [{
        id: Math.random().toString(36).substr(2, 9),
        stage: CandidateStage.APPLIED,
        timestamp: new Date().toISOString(),
        note: `Candidate added via document upload. AI Match Score: ${formData.matchScore}%`
      }]
    };
    onAdd(newCandidate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#002b5c]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-serif font-bold text-[#002b5c] flex items-center gap-2">
            <Upload size={20} className="text-[#c5a059]" />
            Add New Candidate
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-[#002b5c] transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 'upload' ? (
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-lg font-serif font-bold text-slate-800 mb-2">Upload Resume</h3>
                <p className="text-slate-500 text-sm">Upload a .pdf, .docx, or .txt file. Our AI will automatically extract details and calculate role suitability.</p>
              </div>

              <div 
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isLoading ? 'bg-slate-50 border-slate-200 cursor-wait' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-[#c5a059]'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf,.docx,.txt"
                />
                {isLoading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="text-[#002b5c] animate-spin" />
                    <div className="text-center">
                      <p className="font-bold text-[#002b5c]">AI is analyzing resume...</p>
                      <p className="text-xs text-slate-500">Extracting data & calculating match score</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-[#002b5c]/5 rounded-full flex items-center justify-center text-[#002b5c] mb-4">
                      <Upload size={32} className="text-[#c5a059]" />
                    </div>
                    <p className="font-bold text-slate-700">Click to browse or drag and drop</p>
                    <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-bold">Supported: .PDF, .DOCX, .TXT</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl mb-6">
                  <AlertCircle size={20} className="text-red-600 shrink-0" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                    <p className="text-sm text-emerald-800 font-medium">AI successfully extracted details from <strong>{file?.name}</strong></p>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm">
                    <BrainCircuit size={16} className="text-[#002b5c]" />
                    <span className="text-xs font-bold text-[#002b5c]">{isScoring ? 'Scoring...' : `${formData.matchScore}% Match`}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Job</label>
                  <select 
                    required
                    value={formData.jobId}
                    onChange={(e) => setFormData({...formData, jobId: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none text-sm bg-slate-50"
                  >
                    <option value="" disabled>Select a position...</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none text-sm bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none text-sm bg-slate-50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Professional Summary</label>
                  <textarea 
                    value={formData.summary}
                    onChange={(e) => setFormData({...formData, summary: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none text-sm h-24 bg-slate-50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Skills (comma separated)</label>
                  <input 
                    type="text" 
                    value={formData.skills?.join(', ')}
                    onChange={(e) => setFormData({...formData, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#c5a059] outline-none text-sm bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setStep('upload'); setError(null); }}
                  className="px-6 py-3 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-[#002b5c] transition-colors"
                >
                  Back to Upload
                </button>
                <button 
                  type="submit"
                  disabled={isScoring}
                  className="px-8 py-3 bg-[#002b5c] text-white font-bold rounded-xl uppercase tracking-widest text-xs hover:bg-[#c5a059] hover:text-[#002b5c] shadow-lg transition-all disabled:opacity-50"
                >
                  Create Candidate Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCandidateModal;
