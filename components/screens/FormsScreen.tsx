
import React, { useState, useEffect } from 'react';
import type { Form, KidProfile, ProcessedEmail } from '../../types';
import { processFormWithGemini, processEmailWithGemini } from '../../services/geminiService';
import { PlusIcon, TrashIcon, ArrowUpTrayIcon, EnvelopeIcon, CameraIcon, MagnifyingGlassIcon, ChevronLeftIcon } from '../Icons';
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
            <div className="relative w-full md:max-w-xl bg-[#1C1C1E] rounded-t-[2rem] md:rounded-3xl p-6 md:p-8 max-h-[92vh] flex flex-col shadow-2xl animate-slide-up border-t border-white/10 md:border">
                {/* Drag Handle */}
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 flex-shrink-0" />
                {title && <h2 className="text-2xl font-bold text-white mb-6 px-1">{title}</h2>}
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
  
  // Email Processing State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [processedEmailData, setProcessedEmailData] = useState<ProcessedEmail | null>(null);
  const [emailStep, setEmailStep] = useState<'input' | 'processing' | 'review'>('input');
  
  // Detail View State
  const [selectedItem, setSelectedItem] = useState<{ type: 'form' | 'email', data: any } | null>(null);

  useEffect(() => setSelectedIds(new Set()), [view]);

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

  const handleSaveForm = () => {
      if (!currentForm.id) return;
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
      } else {
          setEmails(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: 'deleted', updatedAt: new Date().toISOString() } : e));
      }
      setSelectedIds(new Set());
      setBulkDeleteModalOpen(false);
  };

  /* --- Email Handlers --- */
  const handleProcessEmail = async () => {
      if (!selectedKidId || !emailContent) return;
      const kid = kids.find(k => k.id === selectedKidId);
      if (!kid) return;
      
      setEmailStep('processing');
      try {
          const result = await processEmailWithGemini(emailContent, kid.name);
          const now = new Date().toISOString();
          setProcessedEmailData({
              id: Date.now().toString(),
              kidId: selectedKidId,
              originalContent: emailContent,
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

  const saveEmail = () => {
      if (processedEmailData) {
          setEmails(prev => [processedEmailData, ...prev]);
          setIsEmailModalOpen(false);
          setEmailStep('input');
          setProcessedEmailData(null);
          setEmailContent('');
      }
  };

  const handleExportPDF = async () => {
    if (!selectedItem || selectedItem.type !== 'form') return;
    
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
  };

  /* --- Render Helpers --- */
  const inputStyle = "w-full bg-[#2C2C2E] border-none text-white rounded-xl p-4 placeholder-gray-500 focus:ring-2 focus:ring-brand-primary/50 transition-all outline-none";
  const labelStyle = "block text-sm font-medium text-brand-secondary mb-2 ml-1";

  return (
    <div className="h-full flex flex-col">
        {/* Header & Search */}
        <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white tracking-tight">{t('forms.title')}</h1>
                <div className="flex gap-2">
                    <button onClick={() => setIsEmailModalOpen(true)} className="p-3 bg-[#2C2C2E] rounded-full text-brand-primary hover:bg-white/10 active:scale-95 transition-all">
                        <EnvelopeIcon />
                    </button>
                    <button onClick={() => setScreenState('upload')} className="p-3 bg-brand-primary rounded-full text-white shadow-glow hover:bg-brand-primary-hover active:scale-95 transition-all">
                        <PlusIcon />
                    </button>
                </div>
            </div>

            <div className="relative">
                <div className="absolute left-4 top-3.5 text-gray-500"><MagnifyingGlassIcon /></div>
                <input 
                    type="text" 
                    placeholder={t('forms.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1C1C1E] rounded-2xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                />
            </div>

            {/* Segmented Control Tabs */}
            <div className="bg-[#1C1C1E] p-1 rounded-xl flex">
                {(['active', 'emails', 'history'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setView(tab)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${view === tab ? 'bg-[#636366] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
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
            {view === 'active' && forms.filter(f => f.status === 'pending').map(form => (
                 <div key={form.id} onClick={() => { setSelectedItem({ type: 'form', data: form }); setScreenState('details'); }} className="glass-panel p-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex gap-4 items-center group">
                    <div onClick={(e) => { e.stopPropagation(); toggleSelection(form.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(form.id) ? 'bg-brand-primary border-brand-primary' : 'border-gray-600'}`}>
                        {selectedIds.has(form.id) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <img src={form.imageDataUrl} className="w-16 h-16 rounded-xl object-cover bg-black" />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                            <h3 className="font-semibold text-white truncate">{form.formName}</h3>
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-md">Pending</span>
                        </div>
                        <p className="text-sm text-gray-400 truncate mt-1">{form.summary}</p>
                    </div>
                 </div>
            ))}
             {view === 'emails' && emails.filter(e => e.status === 'active').map(email => (
                 <div key={email.id} onClick={() => { setSelectedItem({ type: 'email', data: email }); setScreenState('details'); }} className="glass-panel p-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex gap-4 items-center">
                    <div onClick={(e) => { e.stopPropagation(); toggleSelection(email.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(email.id) ? 'bg-brand-primary border-brand-primary' : 'border-gray-600'}`}>
                        {selectedIds.has(email.id) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <div className="w-16 h-16 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                        <EnvelopeIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{email.label}</h3>
                        <p className="text-sm text-gray-400 truncate mt-1">{email.summary}</p>
                    </div>
                 </div>
            ))}
            {/* Empty States */}
            {view === 'active' && forms.filter(f => f.status === 'pending').length === 0 && (
                <div className="text-center py-12 opacity-50">
                    <p className="text-lg font-medium">{t('forms.noActiveForms')}</p>
                    <p className="text-sm">{t('forms.noActiveFormsDesc')}</p>
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
                 {error && <div className="bg-red-500/20 text-red-200 p-4 rounded-xl border border-red-500/30 text-sm">{error}</div>}
                 
                 {imagePreview ? (
                     <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
                         <img src={imagePreview} className="w-full h-48 object-cover opacity-80" />
                         <button onClick={() => setImagePreview('')} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-red-500 p-3 rounded-full text-white"><TrashIcon /></div>
                         </button>
                     </div>
                 ) : (
                     <div className="grid grid-cols-2 gap-4">
                         <button onClick={() => setIsCameraActive(true)} className="aspect-square bg-[#2C2C2E] rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-[#3A3A3C] transition-colors">
                             <div className="w-10 h-10 text-brand-primary"><CameraIcon /></div>
                             <span className="text-sm font-medium text-white">{t('forms.useCamera')}</span>
                         </button>
                         <div className="relative aspect-square bg-[#2C2C2E] rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-[#3A3A3C] transition-colors cursor-pointer">
                             <input type="file" accept="image/*" onChange={(e) => {
                                 if (e.target.files?.[0]) {
                                     const reader = new FileReader();
                                     reader.onloadend = () => setImagePreview(reader.result as string);
                                     reader.readAsDataURL(e.target.files[0]);
                                 }
                             }} className="absolute inset-0 opacity-0 cursor-pointer" />
                             <div className="w-10 h-10 text-brand-primary"><ArrowUpTrayIcon /></div>
                             <span className="text-sm font-medium text-white">{t('forms.uploadFile')}</span>
                         </div>
                     </div>
                 )}

                 <div className="space-y-4">
                     <div>
                         <label className={labelStyle}>{t('forms.selectChild')}</label>
                         <select value={selectedKidId} onChange={e => setSelectedKidId(e.target.value)} className={inputStyle}>
                             <option value="">Select...</option>
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
                <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">{t('forms.analyzing')}</h2>
                <p className="text-gray-400">{t('forms.aiAssist')}</p>
            </div>
        )}

        {/* 4. Review & Details (Reusing similar UI) */}
        {(screenState === 'review' || screenState === 'details') && (
            <div className="fixed inset-0 z-50 bg-[#000000] animate-in flex flex-col">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#1C1C1E]/80 backdrop-blur-xl sticky top-0 z-10">
                    <button onClick={resetState} className="text-brand-primary flex items-center gap-1 font-medium">
                        <ChevronLeftIcon /> {t('forms.back')}
                    </button>
                    <h2 className="font-bold text-white">{screenState === 'review' ? t('forms.reviewEdit') : t('forms.formDetails')}</h2>
                    {screenState === 'review' ? (
                        <button onClick={handleSaveForm} className="font-bold text-brand-primary">{t('forms.saveForm')}</button>
                    ) : (
                         <button onClick={handleExportPDF} className="font-bold text-brand-primary text-sm">{t('forms.exportPdf')}</button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-[#1C1C1E] p-5 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold tracking-wider text-brand-secondary uppercase">AI Summary</span>
                            {screenState === 'review' && (
                                <div className="flex bg-black/50 rounded-lg p-1">
                                    {['en', 'es'].map((lang: any) => (
                                        <button key={lang} onClick={() => setReviewLanguage(lang)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${reviewLanguage === lang ? 'bg-brand-primary text-white' : 'text-gray-400'}`}>{lang.toUpperCase()}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-white text-lg leading-relaxed">
                            {screenState === 'review' 
                                ? (typeof currentForm.summary === 'object' ? currentForm.summary[reviewLanguage] : currentForm.summary)
                                : (selectedItem?.type === 'form' 
                                    ? selectedItem.data.summary 
                                    : selectedItem?.data.summary)
                            }
                        </p>
                    </div>

                    {/* Action Items Card - NEW */}
                    {((screenState === 'review' && currentForm.actionItems) || (selectedItem?.type === 'form' && selectedItem.data.actionItems?.length > 0)) && (
                         <div className="bg-[#1C1C1E] p-5 rounded-2xl border border-white/5">
                            <h3 className="text-brand-primary font-bold mb-3">Action Items</h3>
                            <ul className="list-disc pl-5 space-y-2 text-white">
                                {screenState === 'review' 
                                    ? (currentForm.actionItems as any)?.[reviewLanguage]?.map((item: string, i: number) => <li key={i}>{item}</li>)
                                    : selectedItem?.data.actionItems?.map((item: string, i: number) => <li key={i}>{item}</li>)
                                }
                            </ul>
                        </div>
                    )}
                    
                    {/* Key Dates Card - NEW */}
                    {((screenState === 'review' && currentForm.keyDates?.length! > 0) || (selectedItem?.type === 'form' && selectedItem.data.keyDates?.length > 0)) && (
                         <div className="bg-[#1C1C1E] p-5 rounded-2xl border border-white/5">
                            <h3 className="text-brand-primary font-bold mb-3">Key Dates</h3>
                             <div className="flex flex-wrap gap-2">
                                {screenState === 'review' 
                                    ? currentForm.keyDates?.map((date: string, i: number) => <span key={i} className="px-3 py-1 bg-brand-surface-highlight rounded-lg border border-white/10 text-sm">{date}</span>)
                                    : selectedItem?.data.keyDates?.map((date: string, i: number) => <span key={i} className="px-3 py-1 bg-brand-surface-highlight rounded-lg border border-white/10 text-sm">{date}</span>)
                                }
                             </div>
                        </div>
                    )}

                    {/* Image Preview */}
                    <div className="rounded-2xl overflow-hidden border border-white/5">
                        <img 
                            src={screenState === 'review' ? currentForm.imageDataUrl : (selectedItem?.type === 'form' ? selectedItem.data.imageDataUrl : '')} 
                            className="w-full object-contain bg-black/50 max-h-96" 
                        />
                    </div>
                    
                    {/* Fields List */}
                    <div className="space-y-4">
                        {(screenState === 'review' ? currentForm.filledFields : (selectedItem?.type === 'form' ? selectedItem.data.filledFields : []))?.map((field: any, idx: number) => (
                            <div key={idx}>
                                <label className={labelStyle}>{field.label}</label>
                                <input 
                                    readOnly={screenState !== 'review'}
                                    value={field.value} 
                                    onChange={(e) => {
                                        if (screenState === 'review') {
                                            const newFields = [...currentForm.filledFields!];
                                            newFields[idx].value = e.target.value;
                                            setCurrentForm(prev => ({ ...prev, filledFields: newFields }));
                                        }
                                    }}
                                    className={inputStyle}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Email Action Items */}
                    {selectedItem?.type === 'email' && (
                        <div className="bg-[#1C1C1E] p-5 rounded-2xl border border-white/5">
                            <h3 className="text-brand-primary font-bold mb-3">Action Items</h3>
                            <ul className="list-disc pl-5 space-y-2 text-white">
                                {selectedItem.data.actionItems?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* 5. Email Modal */}
        <ModalSheet isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title="Process Email">
            {emailStep === 'input' && (
                <div className="space-y-4">
                    <select value={selectedKidId} onChange={e => setSelectedKidId(e.target.value)} className={inputStyle}>
                         <option value="">Select Child...</option>
                         {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                    <textarea 
                        value={emailContent} 
                        onChange={e => setEmailContent(e.target.value)} 
                        className={`${inputStyle} min-h-[200px]`} 
                        placeholder="Paste email content..." 
                    />
                    <button onClick={handleProcessEmail} className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-glow active:scale-95 transition-transform">Process</button>
                </div>
            )}
            {emailStep === 'processing' && (
                 <div className="flex flex-col items-center py-10">
                    <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p>Analyzing...</p>
                 </div>
            )}
            {emailStep === 'review' && processedEmailData && (
                <div className="space-y-4">
                    <input value={processedEmailData.label} onChange={e => setProcessedEmailData({...processedEmailData, label: e.target.value})} className={inputStyle} />
                    <textarea value={processedEmailData.summary} onChange={e => setProcessedEmailData({...processedEmailData, summary: e.target.value})} className={`${inputStyle} h-32`} />
                    <button onClick={saveEmail} className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold">Save Email</button>
                </div>
            )}
        </ModalSheet>

        {/* Confirmation Modals */}
        {bulkDeleteModalOpen && (
            <ConfirmationModal 
                title={t('forms.bulkDeleteTitle')} 
                message={t('forms.bulkDeleteMessage')} 
                onConfirm={handleBulkDelete} 
                onCancel={() => setBulkDeleteModalOpen(false)} 
            />
        )}
    </div>
  );
};

export default FormsScreen;
