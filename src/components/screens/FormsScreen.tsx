
import React, { useState, useEffect } from 'react';
import type { Form, KidProfile, ProcessedEmail } from '../../types';
import { processFormWithGemini, processEmailWithGemini, processEmailImageWithGemini } from '../../services/geminiService';
import { PlusIcon, TrashIcon, ArrowUpTrayIcon, EnvelopeIcon, CameraIcon, MagnifyingGlassIcon, ChevronLeftIcon, CheckCircleIcon, SpinnerIcon, CalendarIcon } from '../Icons';
import ConfirmationModal from '../ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';
import CameraOverlay from '../CameraOverlay';

type FormScreenState = 'list' | 'upload' | 'processing' | 'review' | 'details';
type ReviewingForm = Partial<Omit<Form, 'summary' | 'actionItems'>> & { 
    summary?: { en: string; es: string; } | string;
    actionItems?: { en: string[]; es: string[] } | string[];
};

const formCategories = ['School', 'Medical', 'Activities', 'Other'];

interface FormsScreenProps {
  forms: Form[];
  setForms: React.Dispatch<React.SetStateAction<Form[]>>;
  kids: KidProfile[];
  emails: ProcessedEmail[];
  setEmails: React.Dispatch<React.SetStateAction<ProcessedEmail[]>>;
}

declare global {
    interface Window {
        jspdf: any;
    }
}

/* --- Helper Components --- */
const ModalSheet: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title?: string }> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full md:max-w-xl bg-brand-surface rounded-t-[2rem] md:rounded-3xl p-6 md:p-8 max-h-[92vh] flex flex-col shadow-2xl animate-slide-up border-t border-white/10 md:border md:border-brand-border">
                {/* Drag Handle */}
                <div className="w-12 h-1.5 bg-brand-border rounded-full mx-auto mb-6 flex-shrink-0" />
                {title && <h2 className="text-2xl font-bold text-brand-light mb-6 px-1">{title}</h2>}
                <div className="flex-1 overflow-y-auto scrollbar-hide pb-safe">
                    {children}
                </div>
            </div>
        </div>
    );
}

const FormsScreen: React.FC<FormsScreenProps> = ({ forms, setForms, kids, emails, setEmails }) => {
  const { language, t } = useLanguage();
  const [screenState, setScreenState] = useState<FormScreenState>('list');
  const [currentForm, setCurrentForm] = useState<ReviewingForm>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedKidId, setSelectedKidId] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState<string>(formCategories[0]);
  const [reviewLanguage, setReviewLanguage] = useState<'en' | 'es'>(language);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'active' | 'history' | 'emails'>('active');
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  
  // Loading States
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  // Email Processing State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [processedEmailData, setProcessedEmailData] = useState<ProcessedEmail | null>(null);
  const [emailStep, setEmailStep] = useState<'input' | 'processing' | 'review'>('input');
  const [emailInputType, setEmailInputType] = useState<'text' | 'image'>('text');
  
  // Detail View State
  const [selectedItem, setSelectedItem] = useState<{ type: 'form' | 'email', data: any } | null>(null);

  useEffect(() => setSelectedIds(new Set()), [view]);

  // Cycle loading messages for AI processing
  useEffect(() => {
    if (screenState === 'processing' || emailStep === 'processing') {
      const messages = ['Uploading...', 'Analyzing text...', 'Extracting dates...', 'Translating summary...'];
      let i = 0;
      setLoadingMessage(messages[0]);
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [screenState, emailStep]);

  /* --- Handlers --- */
  const handleScan = async () => {
    if (!selectedKidId || !imagePreview) return setError("Please fill all fields");
    const selectedKid = kids.find(k => k.id === selectedKidId);
    if (!selectedKid) return;

    setError(null);
    setScreenState('processing');

    try {
        const { summary, actionItems, keyDates, fields } = await processFormWithGemini(imagePreview, selectedKid);
        const now = new Date().toISOString();
        
        // Auto-select due date if found in keyDates
        let detectedDueDate = dueDate;
        if (!detectedDueDate && keyDates.length > 0) {
             // Basic heuristic: pick the first future date, or just the first date
             const today = new Date().toISOString().split('T')[0];
             const futureDate = keyDates.find(d => d >= today);
             detectedDueDate = futureDate ? `${futureDate}T09:00` : `${keyDates[0]}T09:00`;
             setDueDate(detectedDueDate);
        }

        setCurrentForm({
            id: Date.now().toString(),
            kidId: selectedKidId,
            imageDataUrl: imagePreview,
            dueDate: detectedDueDate,
            category: category,
            summary: summary,
            actionItems: actionItems,
            keyDates: keyDates,
            filledFields: fields,
            createdAt: now,
            updatedAt: now,
            status: 'pending',
        });
        setScreenState('review');
    } catch (e: any) {
        setError(e.message || "An unknown error occurred.");
        setScreenState('upload');
    }
  };

  const handleSaveForm = async () => {
      if (!currentForm.id) return;
      setIsSaving(true);
      // Simulate network delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const kidName = kids.find(k => k.id === currentForm.kidId)?.name || 'Unknown';
      const summaryObj = currentForm.summary as { en: string; es: string };
      const actionItemsObj = currentForm.actionItems as { en: string[]; es: string[] };
      const formName = `${kidName} - ${(summaryObj[reviewLanguage] || '').substring(0, 30)}...`;
      
      const newForm: Form = {
          id: currentForm.id,
          kidId: currentForm.kidId!,
          formName,
          dueDate: currentForm.dueDate || dueDate,
          imageDataUrl: currentForm.imageDataUrl!,
          filledFields: currentForm.filledFields!,
          createdAt: currentForm.createdAt!,
          category: currentForm.category!,
          summary: summaryObj[reviewLanguage],
          actionItems: actionItemsObj ? actionItemsObj[reviewLanguage] : [],
          keyDates: currentForm.keyDates || [],
          status: 'pending',
          updatedAt: currentForm.updatedAt!
      };
      setForms(prev => [newForm, ...prev]);
      setIsSaving(false);
      resetState();
  };

  const resetState = () => {
      setScreenState('list');
      setCurrentForm({});
      setError(null);
      setSelectedKidId('');
      setImagePreview('');
      setDueDate('');
      setIsCameraActive(false);
      setSelectedItem(null);
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkDelete = () => {
      const ids = Array.from(selectedIds);
      if (view === 'active') {
          setForms(prev => prev.map(f => ids.includes(f.id) ? { ...f, status: 'deleted', updatedAt: new Date().toISOString() } : f));
      } else if (view === 'history') {
         setForms(prev => prev.map(f => ids.includes(f.id) ? { ...f, status: 'deleted', updatedAt: new Date().toISOString() } : f));
      } else {
          setEmails(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: 'deleted', updatedAt: new Date().toISOString() } : e));
      }
      setSelectedIds(new Set());
      setBulkDeleteModalOpen(false);
  };

  /* --- Email Handlers --- */
  const handleProcessEmail = async () => {
      if (!selectedKidId || (emailInputType === 'text' && !emailContent) || (emailInputType === 'image' && !imagePreview)) return;
      const kid = kids.find(k => k.id === selectedKidId);
      if (!kid) return;
      
      setEmailStep('processing');
      try {
          let result;
          if (emailInputType === 'text') {
            result = await processEmailWithGemini(emailContent, kid.name);
          } else {
            result = await processEmailImageWithGemini(imagePreview, kid.name);
          }
          
          const now = new Date().toISOString();
          setProcessedEmailData({
              id: Date.now().toString(),
              kidId: selectedKidId,
              originalContent: emailInputType === 'text' ? emailContent : 'Image Upload',
              label: result.label,
              summary: result.summary,
              actionItems: result.actionItems,
              dueDate: result.dueDate || undefined,
              createdAt: now,
              updatedAt: now,
              status: 'active'
          });
          setEmailStep('review');
      } catch (e) {
          setEmailStep('input');
          setError('Failed to process email');
      }
  };

  const saveEmail = async () => {
      if (processedEmailData) {
          setIsSaving(true);
          await new Promise(resolve => setTimeout(resolve, 600));

          setEmails(prev => [processedEmailData, ...prev]);
          setIsSaving(false);
          setIsEmailModalOpen(false);
          setEmailStep('input');
          setProcessedEmailData(null);
          setEmailContent('');
          setImagePreview('');
      }
  };

  const handleExportPDF = async () => {
    if (!selectedItem || selectedItem.type !== 'form') return;
    setIsExporting(true);
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Lazy load jsPDF to ensure window.jspdf is available
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const form = selectedItem.data as Form;

    doc.setFontSize(20);
    doc.text(form.formName, 10, 20);
    
    doc.setFontSize(12);
    doc.text(`Category: ${form.category}`, 10, 30);
    doc.text(`Due Date: ${new Date(form.dueDate).toLocaleString()}`, 10, 40);
    doc.text(`Summary: ${form.summary}`, 10, 50, { maxWidth: 180 });

    let yPos = 70;
    
    // Export Action Items
    if (form.actionItems && form.actionItems.length > 0) {
        doc.setFontSize(14);
        doc.text("Action Items:", 10, yPos);
        yPos += 7;
        doc.setFontSize(10);
        form.actionItems.forEach(item => {
            doc.text(`• ${item}`, 15, yPos);
            yPos += 5;
        });
        yPos += 10;
    }

    doc.setFontSize(14);
    doc.text("Fields:", 10, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    form.filledFields.forEach((field: any) => {
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
        }
        doc.text(`${field.label}: ${field.value}`, 10, yPos);
        yPos += 7;
    });

    if (form.imageDataUrl) {
        doc.addPage();
        const imgProps = doc.getImageProperties(form.imageDataUrl);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.addImage(form.imageDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    doc.save(`${form.formName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    setIsExporting(false);
  };

  /* --- Render Helpers --- */
  const inputStyle = "w-full bg-brand-surface-highlight border-none text-brand-light rounded-xl p-4 placeholder-gray-500 focus:ring-2 focus:ring-brand-primary/50 transition-all outline-none";
  const labelStyle = "block text-sm font-medium text-brand-secondary mb-2 ml-1";

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'pending':
            return <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-yellow-500/20 text-yellow-500 border border-yellow-500/20">{t('forms.statusPending')}</span>;
        case 'completed':
            return <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-green-500/20 text-green-500 border border-green-500/20">{t('forms.statusCompleted')}</span>;
        case 'deleted':
            return <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-red-500/20 text-red-500 border border-red-500/20">{t('forms.statusDeleted')}</span>;
        default:
            return null;
    }
  };

  const filteredForms = forms.filter(f => {
      // 1. Filter by view
      if (view === 'active' && f.status !== 'pending') return false;
      if (view === 'history' && f.status === 'pending') return false;

      // 2. Filter by search query
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const kid = kids.find(k => k.id === f.kidId);
          return (
              f.formName.toLowerCase().includes(q) ||
              f.summary.toLowerCase().includes(q) ||
              f.category.toLowerCase().includes(q) ||
              kid?.name.toLowerCase().includes(q) ||
              (f.dueDate && f.dueDate.includes(q))
          );
      }
      return true;
  });

  const filteredEmails = emails.filter(e => {
      // 1. Filter by view
      if (view !== 'emails') return false;
      if (e.status !== 'active') return false;

      // 2. Filter by search
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const kid = kids.find(k => k.id === e.kidId);
          return (
              e.label.toLowerCase().includes(q) ||
              e.summary.toLowerCase().includes(q) ||
              kid?.name.toLowerCase().includes(q) ||
              (e.dueDate && e.dueDate.includes(q))
          );
      }
      return true;
  });

  return (
    <div className="h-full flex flex-col">
        {/* Header & Search */}
        <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-brand-light tracking-tight">{t('forms.title')}</h1>
                {/* Header buttons removed in favor of in-tab buttons */}
                <div className="flex gap-2"></div>
            </div>

            <div className="relative">
                <div className="absolute left-4 top-3.5 text-gray-500"><MagnifyingGlassIcon /></div>
                <input 
                    type="text" 
                    placeholder={t('forms.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-brand-surface rounded-2xl py-3 pl-11 pr-4 text-brand-light placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all border border-brand-border"
                />
            </div>

            {/* Segmented Control Tabs */}
            <div className="bg-brand-surface p-1 rounded-xl flex border border-brand-border">
                {(['active', 'emails', 'history'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setView(tab)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${view === tab ? 'bg-brand-surface-highlight text-brand-light shadow-sm' : 'text-gray-400 hover:text-brand-light'}`}
                    >
                        {t(`forms.${tab}Tab`)}
                    </button>
                ))}
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between bg-brand-primary/10 border border-brand-primary/20 p-3 rounded-xl animate-in">
                    <span className="text-brand-primary font-medium ml-2">{selectedIds.size} selected</span>
                    <button onClick={() => setBulkDeleteModalOpen(true)} className="text-brand-danger font-medium px-3 py-1 bg-brand-danger/10 rounded-lg active:scale-95 transition-transform">
                        {t('forms.deleteButton')}
                    </button>
                </div>
            )}
        </div>

        {/* Content Lists */}
        <div className="flex-1 space-y-3 pb-20">
            {/* Active Forms List */}
            {view === 'active' && (
                <>
                    <button 
                        onClick={() => setScreenState('upload')}
                        className="w-full mb-4 p-4 rounded-2xl border-2 border-dashed border-brand-border hover:border-brand-primary/50 hover:bg-brand-surface-highlight group transition-all flex items-center justify-center gap-2"
                    >
                        <div className="p-2 bg-brand-primary/10 rounded-full text-brand-primary group-hover:scale-110 transition-transform">
                            <PlusIcon />
                        </div>
                        <span className="font-semibold text-brand-light group-hover:text-brand-primary transition-colors">{t('forms.scanNewForm')}</span>
                    </button>

                    {filteredForms.map(form => (
                        <div key={form.id} onClick={() => { setSelectedItem({ type: 'form', data: form }); setScreenState('details'); }} className="glass-panel p-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex gap-4 items-center group">
                            <div className="relative group/select z-20">
                                <div onClick={(e) => { e.stopPropagation(); toggleSelection(form.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(form.id) ? 'bg-brand-primary border-brand-primary' : 'border-gray-500'}`}>
                                    {selectedIds.has(form.id) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-brand-surface-highlight border border-brand-border rounded-lg shadow-xl opacity-0 translate-y-1 group-hover/select:opacity-100 group-hover/select:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-md">
                                    <span className="text-xs font-bold text-brand-light">{selectedIds.has(form.id) ? t('forms.deselect') : t('forms.select')}</span>
                                    {/* Triangle */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-brand-surface-highlight"></div>
                                </div>
                            </div>
                            
                            <img src={form.imageDataUrl} className="w-16 h-16 rounded-xl object-cover bg-black border border-white/5" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-semibold text-brand-light truncate pr-2">{form.formName}</h3>
                                    {getStatusBadge(form.status)}
                                </div>
                                <p className="text-sm text-gray-400 truncate">{form.summary}</p>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Emails List */}
            {view === 'emails' && (
                <>
                    <button 
                        onClick={() => {
                            setIsEmailModalOpen(true);
                            setEmailInputType('text');
                            setImagePreview('');
                            setEmailContent('');
                        }}
                        className="w-full mb-4 p-4 rounded-2xl border-2 border-dashed border-brand-border hover:border-brand-primary/50 hover:bg-brand-surface-highlight group transition-all flex items-center justify-center gap-2"
                    >
                        <div className="p-2 bg-purple-500/10 rounded-full text-purple-500 group-hover:scale-110 transition-transform">
                            <EnvelopeIcon />
                        </div>
                        <span className="font-semibold text-brand-light group-hover:text-purple-500 transition-colors">{t('emails.addEmail')}</span>
                    </button>

                    {filteredEmails.map(email => (
                        <div key={email.id} onClick={() => { setSelectedItem({ type: 'email', data: email }); setScreenState('details'); }} className="glass-panel p-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex gap-4 items-center group">
                            <div className="relative group/select z-20">
                                <div onClick={(e) => { e.stopPropagation(); toggleSelection(email.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(email.id) ? 'bg-brand-primary border-brand-primary' : 'border-gray-500'}`}>
                                    {selectedIds.has(email.id) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-brand-surface-highlight border border-brand-border rounded-lg shadow-xl opacity-0 translate-y-1 group-hover/select:opacity-100 group-hover/select:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-md">
                                    <span className="text-xs font-bold text-brand-light">{selectedIds.has(email.id) ? t('forms.deselect') : t('forms.select')}</span>
                                    {/* Triangle */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-brand-surface-highlight"></div>
                                </div>
                            </div>
                            <div className="w-16 h-16 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary flex-shrink-0">
                                <EnvelopeIcon />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-brand-light truncate">{email.label}</h3>
                                <p className="text-sm text-gray-400 truncate mt-1">{email.summary}</p>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* History List */}
            {view === 'history' && filteredForms.map(form => (
                 <div key={form.id} onClick={() => { setSelectedItem({ type: 'form', data: form }); setScreenState('details'); }} className="glass-panel p-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex gap-4 items-center group opacity-80 hover:opacity-100">
                    <div className="relative group/select z-20">
                        <div onClick={(e) => { e.stopPropagation(); toggleSelection(form.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(form.id) ? 'bg-brand-primary border-brand-primary' : 'border-gray-500'}`}>
                            {selectedIds.has(form.id) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                         {/* Tooltip */}
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-brand-surface-highlight border border-brand-border rounded-lg shadow-xl opacity-0 translate-y-1 group-hover/select:opacity-100 group-hover/select:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-md">
                            <span className="text-xs font-bold text-brand-light">{selectedIds.has(form.id) ? t('forms.deselect') : t('forms.select')}</span>
                             {/* Triangle */}
                             <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-brand-surface-highlight"></div>
                        </div>
                    </div>
                    
                    <img src={form.imageDataUrl} className="w-16 h-16 rounded-xl object-cover bg-black grayscale" />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-semibold text-brand-light truncate pr-2">{form.formName}</h3>
                            {getStatusBadge(form.status)}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{form.summary}</p>
                    </div>
                 </div>
            ))}

            {/* Empty States */}
            {view === 'active' && filteredForms.length === 0 && (
                <div className="text-center py-12 opacity-50">
                    <p className="text-lg font-medium text-brand-light">{t('forms.noActiveForms')}</p>
                    <p className="text-sm text-brand-secondary">{t('forms.noActiveFormsDesc')}</p>
                </div>
            )}
             {view === 'history' && filteredForms.length === 0 && (
                <div className="text-center py-12 opacity-50">
                    <p className="text-lg font-medium text-brand-light">{t('forms.noHistory')}</p>
                    <p className="text-sm text-brand-secondary">{t('forms.noHistoryDesc')}</p>
                </div>
            )}
            {view === 'emails' && filteredEmails.length === 0 && (
                <div className="text-center py-12 opacity-50">
                    <p className="text-lg font-medium text-brand-light">{t('emails.noEmails')}</p>
                    <p className="text-sm text-brand-secondary">{t('emails.noEmailsDesc')}</p>
                </div>
            )}
        </div>

        {/* --- MODALS --- */}

        {/* 1. Camera Overlay */}
        {isCameraActive && (
            <CameraOverlay 
                onCapture={(img) => { setImagePreview(img); setIsCameraActive(false); }} 
                onClose={() => setIsCameraActive(false)} 
            />
        )}

        {/* 2. Upload/Scan Sheet */}
        <ModalSheet isOpen={screenState === 'upload'} onClose={resetState} title={t('forms.scanNewForm')}>
             <div className="space-y-6">
                 {error && <div className="bg-red-500/20 text-red-500 p-4 rounded-xl border border-red-500/30 text-sm">{error}</div>}
                 
                 {imagePreview ? (
                     <div className="relative rounded-2xl overflow-hidden border border-brand-border group">
                         <img src={imagePreview} className="w-full h-48 object-cover opacity-80" />
                         <button onClick={() => setImagePreview('')} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-red-500 p-3 rounded-full text-white"><TrashIcon /></div>
                         </button>
                     </div>
                 ) : (
                     <div className="grid grid-cols-2 gap-4">
                         <button onClick={() => setIsCameraActive(true)} className="aspect-square bg-brand-surface-highlight rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-border transition-colors">
                             <div className="w-10 h-10 text-brand-primary"><CameraIcon /></div>
                             <span className="text-sm font-medium text-brand-light">{t('forms.useCamera')}</span>
                         </button>
                         <div className="relative aspect-square bg-brand-surface-highlight rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-border transition-colors cursor-pointer">
                             <input type="file" accept="image/*" onChange={(e) => {
                                 if (e.target.files?.[0]) {
                                     const reader = new FileReader();
                                     reader.onloadend = () => setImagePreview(reader.result as string);
                                     reader.readAsDataURL(e.target.files[0]);
                                 }
                             }} className="absolute inset-0 opacity-0 cursor-pointer" />
                             <div className="w-10 h-10 text-brand-primary"><ArrowUpTrayIcon /></div>
                             <span className="text-sm font-medium text-brand-light">{t('forms.uploadFile')}</span>
                         </div>
                     </div>
                 )}

                 <div className="space-y-4">
                     <div>
                         <label className={labelStyle}>{t('forms.selectChild')}</label>
                         <select value={selectedKidId} onChange={e => setSelectedKidId(e.target.value)} className={inputStyle}>
                             <option value="">{t('forms.selectChild')}</option>
                             {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className={labelStyle}>{t('forms.category')}</label>
                         <select value={category} onChange={e => setCategory(e.target.value)} className={inputStyle}>
                             {formCategories.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                     </div>
                     <div>
                        <label className={labelStyle}>{t('forms.dueDateOptional')}</label>
                        <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputStyle} />
                     </div>
                 </div>

                 <button onClick={handleScan} disabled={!imagePreview || !selectedKidId} className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg shadow-glow active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100">
                     {t('forms.scanForm')}
                 </button>
             </div>
        </ModalSheet>

        {/* 3. Processing State */}
        {screenState === 'processing' && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
                <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">{t('forms.analyzing')}</h2>
                <p className="text-gray-400 font-medium transition-all duration-300 min-h-[1.5rem]">{loadingMessage || t('forms.aiAssist')}</p>
            </div>
        )}

        {/* 4. Review & Details (Reusing similar UI) */}
        {(screenState === 'review' || screenState === 'details') && (
            <div className="fixed inset-0 z-50 bg-brand-dark animate-in flex flex-col">
                <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between bg-brand-surface/80 backdrop-blur-xl sticky top-0 z-10">
                    <button onClick={resetState} className="text-brand-primary flex items-center gap-1 font-medium">
                        <ChevronLeftIcon /> {t('forms.back')}
                    </button>
                    <h2 className="font-bold text-brand-light">{screenState === 'review' ? t('forms.reviewEdit') : t('forms.formDetails')}</h2>
                    {screenState === 'review' ? (
                        <button onClick={handleSaveForm} disabled={isSaving} className="font-bold text-brand-primary flex items-center disabled:opacity-50">
                            {isSaving && <SpinnerIcon />} {t('forms.saveForm')}
                        </button>
                    ) : (
                         <button onClick={handleExportPDF} disabled={isExporting} className="font-bold text-brand-primary text-sm flex items-center disabled:opacity-50">
                             {isExporting && <SpinnerIcon />} {t('forms.exportPdf')}
                         </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-brand-surface p-5 rounded-2xl border border-brand-border space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold tracking-wider text-brand-secondary uppercase">AI Summary</span>
                            {screenState === 'review' && (
                                <div className="flex bg-brand-dark/50 rounded-lg p-1">
                                    {['en', 'es'].map((lang: any) => (
                                        <button key={lang} onClick={() => setReviewLanguage(lang)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${reviewLanguage === lang ? 'bg-brand-primary text-white' : 'text-gray-400'}`}>{lang.toUpperCase()}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-brand-light text-lg leading-relaxed">
                            {screenState === 'review' 
                                ? (typeof currentForm.summary === 'object' ? currentForm.summary[reviewLanguage] : currentForm.summary)
                                : (selectedItem?.type === 'form' 
                                    ? selectedItem.data.summary 
                                    : selectedItem?.data.summary)
                            }
                        </p>
                    </div>

                    {/* Action Items Card - NEW */}
                    {((screenState === 'review' && currentForm.actionItems) || (selectedItem && selectedItem.data.actionItems)) && (
                         <div className="bg-brand-surface p-5 rounded-2xl border border-brand-border space-y-3">
                             <span className="text-xs font-bold tracking-wider text-brand-secondary uppercase">{t('emails.actionItems')}</span>
                             <ul className="space-y-2">
                                 {(screenState === 'review' 
                                     ? (Array.isArray(currentForm.actionItems) ? currentForm.actionItems : (currentForm.actionItems as any)?.[reviewLanguage] || [])
                                     : (selectedItem?.data.actionItems || [])
                                 ).map((item: string, idx: number) => (
                                     <li key={idx} className="flex gap-3 items-start">
                                         <div className="mt-1 text-brand-primary"><CheckCircleIcon /></div>
                                         <span className="text-brand-light leading-snug">{item}</span>
                                     </li>
                                 ))}
                             </ul>
                         </div>
                    )}

                    {/* Key Dates Card */}
                     {((screenState === 'review' && currentForm.keyDates?.length) || (selectedItem?.type === 'form' && (selectedItem.data as Form).keyDates?.length)) && (
                        <div className="bg-brand-surface p-5 rounded-2xl border border-brand-border space-y-3">
                            <span className="text-xs font-bold tracking-wider text-brand-secondary uppercase">Key Dates</span>
                            <div className="flex flex-wrap gap-2">
                                {(screenState === 'review' ? currentForm.keyDates : (selectedItem!.data as Form).keyDates)?.map((date: string, idx: number) => (
                                    <span key={idx} className="px-3 py-1.5 rounded-lg bg-brand-surface-highlight border border-brand-border text-brand-light font-medium flex items-center gap-2">
                                        <div className="w-4 h-4 text-brand-primary"><CalendarIcon /></div>
                                        {date}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fields Card */}
                    {((screenState === 'review' && currentForm.filledFields?.length) || (selectedItem?.type === 'form' && (selectedItem.data as Form).filledFields?.length)) && (
                        <div className="bg-brand-surface p-5 rounded-2xl border border-brand-border space-y-3">
                             <span className="text-xs font-bold tracking-wider text-brand-secondary uppercase">Filled Fields</span>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(screenState === 'review' ? currentForm.filledFields : (selectedItem!.data as Form).filledFields)?.map((field: any, idx: number) => (
                                    <div key={idx} className="bg-brand-surface-highlight p-3 rounded-xl">
                                        <span className="block text-xs font-bold text-brand-secondary uppercase mb-1">{field.label}</span>
                                        <span className="text-brand-light font-medium">{field.value}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* 5. Email Processing Modal */}
        <ModalSheet isOpen={isEmailModalOpen} onClose={() => { setIsEmailModalOpen(false); setEmailStep('input'); }} title={t('emails.addEmailTitle')}>
            {/* Email Modal Content */}
             {emailStep === 'input' && (
                 <div className="space-y-4">
                      {error && <div className="bg-red-500/20 text-red-500 p-4 rounded-xl border border-red-500/30 text-sm">{error}</div>}
                      
                      <div className="flex bg-brand-surface-highlight p-1 rounded-xl mb-4">
                          <button onClick={() => setEmailInputType('text')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${emailInputType === 'text' ? 'bg-brand-surface shadow text-brand-light' : 'text-gray-500'}`}>Text</button>
                          <button onClick={() => setEmailInputType('image')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${emailInputType === 'image' ? 'bg-brand-surface shadow text-brand-light' : 'text-gray-500'}`}>Image</button>
                      </div>

                      {emailInputType === 'text' ? (
                        <textarea 
                            value={emailContent} 
                            onChange={e => setEmailContent(e.target.value)} 
                            placeholder={t('emails.pasteEmail')}
                            className={`${inputStyle} h-48 font-mono text-sm`}
                        />
                      ) : (
                          <div className="space-y-4">
                                {imagePreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-brand-border group">
                                        <img src={imagePreview} className="w-full h-48 object-cover opacity-80" />
                                        <button onClick={() => setImagePreview('')} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-red-500 p-3 rounded-full text-white"><TrashIcon /></div>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setIsCameraActive(true)} className="aspect-square bg-brand-surface-highlight rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-border transition-colors">
                                            <div className="w-10 h-10 text-brand-primary"><CameraIcon /></div>
                                            <span className="text-sm font-medium text-brand-light">{t('forms.useCamera')}</span>
                                        </button>
                                        <div className="relative aspect-square bg-brand-surface-highlight rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-border transition-colors cursor-pointer">
                                            <input type="file" accept="image/*" onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setImagePreview(reader.result as string);
                                                    reader.readAsDataURL(e.target.files[0]);
                                                }
                                            }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <div className="w-10 h-10 text-brand-primary"><ArrowUpTrayIcon /></div>
                                            <span className="text-sm font-medium text-brand-light">{t('forms.uploadFile')}</span>
                                        </div>
                                    </div>
                                )}
                          </div>
                      )}

                      <div>
                          <label className={labelStyle}>{t('emails.selectChild')}</label>
                          <select value={selectedKidId} onChange={e => setSelectedKidId(e.target.value)} className={inputStyle}>
                              <option value="">{t('emails.selectChild')}</option>
                              {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                          </select>
                      </div>

                      <button onClick={handleProcessEmail} disabled={!selectedKidId || (emailInputType === 'text' ? !emailContent : !imagePreview)} className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg shadow-glow active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100">
                          {t('emails.processEmail')}
                      </button>
                 </div>
             )}
             
             {emailStep === 'processing' && (
                 <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <h3 className="text-xl font-bold text-brand-light mb-2">{t('emails.processing')}</h3>
                    <p className="text-brand-secondary">{loadingMessage}</p>
                 </div>
             )}

             {emailStep === 'review' && processedEmailData && (
                 <div className="space-y-6">
                      <div className="bg-brand-surface-highlight p-4 rounded-2xl space-y-4">
                          <div>
                              <label className="text-xs font-bold text-brand-secondary uppercase">{t('emails.aiLabel')}</label>
                              <input 
                                type="text" 
                                value={processedEmailData.label} 
                                onChange={e => setProcessedEmailData({...processedEmailData, label: e.target.value})}
                                className="w-full bg-transparent border-b border-brand-border py-2 text-lg font-bold text-brand-light focus:outline-none focus:border-brand-primary"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-brand-secondary uppercase">{t('emails.aiSummary')}</label>
                              <textarea 
                                value={processedEmailData.summary} 
                                onChange={e => setProcessedEmailData({...processedEmailData, summary: e.target.value})}
                                className="w-full bg-transparent border border-brand-border rounded-lg p-3 mt-1 text-brand-light focus:outline-none focus:border-brand-primary h-24 text-sm leading-relaxed"
                              />
                          </div>
                           <div>
                              <label className="text-xs font-bold text-brand-secondary uppercase">{t('emails.actionItems')}</label>
                              <div className="space-y-2 mt-2">
                                  {processedEmailData.actionItems?.map((item, i) => (
                                      <div key={i} className="flex gap-2">
                                          <div className="text-brand-primary mt-1"><CheckCircleIcon /></div>
                                          <input 
                                            value={item}
                                            onChange={(e) => {
                                                const newItems = [...(processedEmailData.actionItems || [])];
                                                newItems[i] = e.target.value;
                                                setProcessedEmailData({...processedEmailData, actionItems: newItems});
                                            }}
                                            className="flex-1 bg-transparent border-b border-brand-border/50 text-sm text-brand-light focus:outline-none focus:border-brand-primary"
                                          />
                                      </div>
                                  ))}
                              </div>
                          </div>
                          <div>
                               <label className="text-xs font-bold text-brand-secondary uppercase">{t('emails.dueDate')}</label>
                               <input 
                                 type="date"
                                 value={processedEmailData.dueDate || ''}
                                 onChange={e => setProcessedEmailData({...processedEmailData, dueDate: e.target.value})}
                                 className="w-full bg-brand-surface rounded-lg p-3 mt-1 text-brand-light outline-none border border-brand-border focus:border-brand-primary"
                               />
                          </div>
                      </div>
                      
                      <button onClick={saveEmail} disabled={isSaving} className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg shadow-glow active:scale-95 transition-transform flex items-center justify-center gap-2">
                          {isSaving && <SpinnerIcon />} {t('emails.saveEmail')}
                      </button>
                 </div>
             )}
        </ModalSheet>

        {/* 6. Bulk Delete Confirmation */}
        {bulkDeleteModalOpen && (
             <ConfirmationModal 
                title={t('forms.bulkDeleteTitle')}
                message={t('forms.bulkDeleteMessage')}
                onConfirm={handleBulkDelete}
                onCancel={() => setBulkDeleteModalOpen(false)}
                confirmText={t('forms.deleteButton')}
                confirmColor="bg-red-600 hover:bg-red-700"
            />
        )}
    </div>
  );
};

export default FormsScreen;
