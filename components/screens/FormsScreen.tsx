
import React, { useState, useMemo } from 'react';
import type { Form, KidProfile, FormField, ProcessedEmail } from '../../types';
import { processFormWithGemini, processEmailWithGemini } from '../../services/geminiService';
import { PlusIcon, TrashIcon, ArrowUpTrayIcon, EnvelopeIcon } from '../Icons';
import ConfirmationModal from '../ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';

type FormScreenState = 'list' | 'upload' | 'processing' | 'review';
type ReviewingForm = Partial<Omit<Form, 'summary'>> & { summary?: { en: string; es: string; }};

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

const EmailProcessingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    kids: KidProfile[];
    onSave: (email: ProcessedEmail) => void;
}> = ({ isOpen, onClose, kids, onSave }) => {
    const { t } = useLanguage();
    const [modalState, setModalState] = useState<'input' | 'processing' | 'review'>('input');
    const [selectedKidId, setSelectedKidId] = useState<string>('');
    const [emailContent, setEmailContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [processedData, setProcessedData] = useState<{label: string; summary: string; dueDate: string | null} | null>(null);

    const resetModal = () => {
        setModalState('input');
        setSelectedKidId('');
        setEmailContent('');
        setError(null);
        setProcessedData(null);
        onClose();
    }

    const handleProcess = async () => {
        if (!selectedKidId || !emailContent) {
            setError('Please select a child and paste the email content.');
            return;
        }
        const selectedKid = kids.find(k => k.id === selectedKidId);
        if (!selectedKid) {
            setError('Selected child not found.');
            return;
        }

        setError(null);
        setModalState('processing');

        try {
            const result = await processEmailWithGemini(emailContent, selectedKid.name);
            setProcessedData(result);
            setModalState('review');
        } catch(e: any) {
            setError(e.message || "An unknown error occurred while processing the email.");
            setModalState('input');
        }
    }

    const handleSave = () => {
        if (!processedData) return;
        const now = new Date().toISOString();
        const newEmail: ProcessedEmail = {
            id: Date.now().toString(),
            kidId: selectedKidId,
            originalContent: emailContent,
            label: processedData.label,
            summary: processedData.summary,
            dueDate: processedData.dueDate || undefined,
            createdAt: now,
            updatedAt: now,
            status: 'active'
        };
        onSave(newEmail);
        resetModal();
    }
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-surface rounded-lg p-8 w-full max-w-2xl max-h-full overflow-y-auto">
                {modalState === 'input' && (
                    <>
                        <h2 className="text-2xl font-bold mb-6">{t('emails.addEmailTitle')}</h2>
                        {error && <p className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-md mb-4">{error}</p>}
                        <div className="space-y-4">
                           <select value={selectedKidId} onChange={(e) => setSelectedKidId(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary">
                               <option value="">{t('emails.selectChild')}</option>
                               {kids.map(kid => <option key={kid.id} value={kid.id}>{kid.name}</option>)}
                           </select>
                           <textarea 
                                value={emailContent}
                                onChange={e => setEmailContent(e.target.value)}
                                placeholder={t('emails.pasteEmail')}
                                rows={10}
                                className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"
                           />
                        </div>
                        <div className="flex justify-end space-x-4 pt-6">
                            <button onClick={resetModal} className="px-4 py-2 rounded-md text-brand-light bg-brand-border hover:bg-opacity-80 transition-colors">{t('forms.cancel')}</button>
                            <button onClick={handleProcess} disabled={!selectedKidId || !emailContent} className="px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors disabled:bg-brand-border disabled:cursor-not-allowed">{t('emails.processEmail')}</button>
                        </div>
                    </>
                )}
                {modalState === 'processing' && (
                     <div className="text-center py-16">
                        <h2 className="text-2xl font-semibold text-brand-primary">{t('emails.processing')}</h2>
                        <p className="text-brand-secondary mt-2">{t('forms.aiAssist')}</p>
                        <div className="mt-8">
                           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
                        </div>
                    </div>
                )}
                {modalState === 'review' && processedData && (
                    <>
                        <h2 className="text-2xl font-bold mb-6">{t('emails.reviewTitle')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-secondary mb-1">{t('emails.aiLabel')}</label>
                                <input type="text" value={processedData.label} onChange={e => setProcessedData({...processedData, label: e.target.value})} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-brand-secondary mb-1">{t('emails.aiSummary')}</label>
                                <textarea rows={5} value={processedData.summary} onChange={e => setProcessedData({...processedData, summary: e.target.value})} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-brand-secondary mb-1">{t('emails.dueDate')}</label>
                                <input type="date" value={processedData.dueDate || ''} onChange={e => setProcessedData({...processedData, dueDate: e.target.value})} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                           </div>
                        </div>
                        <div className="flex justify-end space-x-4 pt-6">
                            <button onClick={resetModal} className="px-4 py-2 rounded-md text-brand-light bg-brand-border hover:bg-opacity-80 transition-colors">{t('forms.discard')}</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">{t('emails.saveEmail')}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const EmailDetailModal: React.FC<{
    email: ProcessedEmail;
    kidName: string;
    onClose: () => void;
}> = ({ email, kidName, onClose }) => {
    const { t } = useLanguage();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-brand-surface rounded-lg p-8 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
                <h2 className="text-2xl font-bold mb-2 text-brand-light">{email.label}</h2>
                <p className="text-brand-secondary mb-4">
                    {t('forms.for')} {kidName}
                    {email.dueDate && (
                        <span className="ml-2 pl-2 border-l border-brand-border text-brand-primary font-medium">
                            {t('forms.due')}: {new Date(email.dueDate).toLocaleDateString()}
                        </span>
                    )}
                </p>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-primary mb-2">{t('emails.aiSummary')}</h3>
                        <p className="text-brand-light italic bg-brand-dark p-4 rounded-md whitespace-pre-wrap">{email.summary}</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-brand-primary mb-2">{t('emails.originalContent')}</h3>
                        <pre className="text-sm text-brand-secondary bg-brand-dark p-4 rounded-md whitespace-pre-wrap font-sans">{email.originalContent}</pre>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-brand-border mt-6">
                    <button onClick={onClose} className="px-6 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">{t('emails.close')}</button>
                </div>
            </div>
        </div>
    );
};


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
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; action: (() => void) | null; }>({ isOpen: false, title: '', message: '', action: null });
  const [view, setView] = useState<'active' | 'history' | 'emails'>('active');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [viewingEmail, setViewingEmail] = useState<ProcessedEmail | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      // Corrected typo from `readDataURL` to `readAsDataURL`
      reader.readAsDataURL(file);
    }
  };
  
  const handleScan = async () => {
    if (!selectedKidId || !imagePreview) {
        setError("Please select a child and upload a form image.");
        return;
    }
    const selectedKid = kids.find(k => k.id === selectedKidId);
    if (!selectedKid) {
        setError("Selected child profile not found.");
        return;
    }

    setError(null);
    setScreenState('processing');

    try {
        const { summary, fields } = await processFormWithGemini(imagePreview, selectedKid);
        const now = new Date().toISOString();
        setCurrentForm({
            id: Date.now().toString(),
            kidId: selectedKidId,
            imageDataUrl: imagePreview,
            dueDate: dueDate,
            category: category,
            summary: summary,
            filledFields: fields,
            createdAt: now,
            updatedAt: now,
            status: 'pending',
        });
        setReviewLanguage(language);
        setScreenState('review');
    } catch (e: any) {
        setError(e.message || "An unknown error occurred.");
        setScreenState('upload');
    }
  };

  const handleSaveForm = () => {
    if (!currentForm.id) return;
    
    const kidName = kids.find(k => k.id === currentForm.kidId)?.name || 'Unknown Kid';
    const summaryText = currentForm.summary?.[reviewLanguage] || '';
    const summaryPart = summaryText.split('.')[0] || summaryText.substring(0, 50).trim();
    const formName = summaryPart ? `${kidName} - ${summaryPart}` : `Form for ${kidName}`;

    const finalForm: Form = {
      id: currentForm.id,
      kidId: currentForm.kidId!,
      formName: formName,
      dueDate: currentForm.dueDate!,
      imageDataUrl: currentForm.imageDataUrl!,
      filledFields: currentForm.filledFields!,
      createdAt: currentForm.createdAt!,
      category: currentForm.category!,
      summary: currentForm.summary![reviewLanguage],
      status: 'pending',
      updatedAt: currentForm.updatedAt!,
    };

    setForms(prev => [finalForm, ...prev]);
    resetState();
  };
  
  const handleSaveEmail = (email: ProcessedEmail) => {
    setEmails(prev => [email, ...prev]);
  };

  const handleExportPdf = () => {
    if (!currentForm.imageDataUrl || !currentForm.filledFields) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const img = new Image();
    img.src = currentForm.imageDataUrl;
    img.onload = () => {
        const imgProps = doc.getImageProperties(img.src);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        
        const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
        
        const imgWidth = imgProps.width * ratio;
        const imgHeight = imgProps.height * ratio;
        
        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;

        doc.addImage(img.src, 'JPEG', x, y, imgWidth, imgHeight);

        if (currentForm.filledFields && currentForm.filledFields.length > 0) {
            doc.addPage();
            doc.setFontSize(18);
            doc.text("Filled Form Data", 14, 22);

            doc.setFontSize(12);
            let currentY = 40;
            const margin = 14;
            const maxLineWidth = pdfWidth - margin * 2;
            const lineHeight = 7;

            currentForm.filledFields?.forEach(field => {
                if (currentY > pdfHeight - 20) {
                    doc.addPage();
                    currentY = 22;
                }

                doc.setFont(undefined, 'bold');
                const labelLines = doc.splitTextToSize(`${field.label}:`, maxLineWidth);
                doc.text(labelLines, margin, currentY);
                currentY += labelLines.length * lineHeight;

                doc.setFont(undefined, 'normal');
                const valueLines = doc.splitTextToSize(field.value, maxLineWidth - 5); // Indent value
                doc.text(valueLines, margin + 5, currentY);
                currentY += valueLines.length * lineHeight + 5; // Add extra space between fields
            });
        }

        const kidName = kids.find(k => k.id === currentForm.kidId)?.name || 'form';
        const date = new Date().toISOString().split('T')[0];
        doc.save(`${kidName}-form-${date}.pdf`);
    };
    img.onerror = () => {
        setError("Could not load image to generate PDF.");
    }
  };

  const resetState = () => {
    setScreenState('list');
    setCurrentForm({});
    setError(null);
    setSelectedKidId('');
    setImagePreview('');
    setDueDate('');
    setCategory(formCategories[0]);
  };
  
  const handleFieldChange = (index: number, value: string) => {
    const newFields = [...(currentForm.filledFields || [])];
    newFields[index].value = value;
    setCurrentForm(prev => ({ ...prev, filledFields: newFields }));
  };

  const handleDeleteForm = (formId: string) => {
    setForms(prev => prev.map(f => f.id === formId ? { ...f, status: 'deleted', updatedAt: new Date().toISOString() } : f));
    setModalState({ isOpen: false, title: '', message: '', action: null });
  };
  
  const handleDeleteEmail = (emailId: string) => {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, status: 'deleted', updatedAt: new Date().toISOString() } : e));
    setModalState({ isOpen: false, title: '', message: '', action: null });
  };

  const openDeleteModal = (id: string, type: 'form' | 'email') => {
    if (type === 'form') {
        setModalState({
            isOpen: true,
            title: t('forms.deleteModalTitle'),
            message: t('forms.deleteModalMessage'),
            action: () => handleDeleteForm(id)
        });
    } else {
        setModalState({
            isOpen: true,
            title: t('emails.deleteModalTitle'),
            message: t('emails.deleteModalMessage'),
            action: () => handleDeleteEmail(id)
        });
    }
  };
  
  const activeForms = useMemo(() => forms.filter(form => form.status === 'pending'), [forms]);
  const historyForms = useMemo(() => forms.filter(form => form.status === 'completed' || form.status === 'deleted').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [forms]);
  const activeEmails = useMemo(() => emails.filter(email => email.status === 'active').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [emails]);

  const groupedActiveForms = useMemo(() => {
    return activeForms.reduce((acc, form) => {
        const cat = form.category || 'Other';
        if (!acc[cat]) {
            acc[cat] = [];
        }
        acc[cat].push(form);
        return acc;
    }, {} as Record<string, Form[]>);
  }, [activeForms]);

  const renderContent = () => {
    switch(screenState) {
        case 'upload':
            return (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-brand-surface rounded-lg p-8 w-full max-w-lg">
                        <h2 className="text-2xl font-bold mb-6">{t('forms.scanNewForm')}</h2>
                        {error && <p className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-md mb-4">{error}</p>}
                        <div className="space-y-4">
                           <select value={selectedKidId} onChange={(e) => setSelectedKidId(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary">
                               <option value="">{t('forms.selectChild')}</option>
                               {kids.map(kid => <option key={kid.id} value={kid.id}>{kid.name}</option>)}
                           </select>
                           <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary">
                                {formCategories.map(cat => <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>)}
                           </select>
                           <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full text-sm text-brand-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-primary-hover"/>
                           {imagePreview && <img src={imagePreview} alt="Form preview" className="max-h-40 rounded-md border border-brand-border"/>}
                           <div>
                                <label className="block text-sm font-medium text-brand-secondary mb-1">{t('forms.dueDateOptional')}</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                           </div>
                        </div>
                        <div className="flex justify-end space-x-4 pt-6">
                            <button onClick={resetState} className="px-4 py-2 rounded-md text-brand-light bg-brand-border hover:bg-opacity-80 transition-colors">{t('forms.cancel')}</button>
                            <button onClick={handleScan} disabled={!selectedKidId || !imagePreview} className="px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors disabled:bg-brand-border disabled:cursor-not-allowed">{t('forms.scanForm')}</button>
                        </div>
                    </div>
                </div>
            );
        case 'processing':
            return (
                <div className="text-center py-16">
                    <h2 className="text-2xl font-semibold text-brand-primary">{t('forms.analyzing')}</h2>
                    <p className="text-brand-secondary mt-2">{t('forms.aiAssist')}</p>
                    <div className="mt-8">
                       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
                    </div>
                </div>
            );
        case 'review':
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">{t('forms.reviewEdit')}</h2>
                    <div className="bg-brand-surface p-4 rounded-lg border border-brand-border">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-sm font-semibold text-brand-primary">{t('forms.aiSummary')}</p>
                           <div className="flex space-x-1">
                               <button onClick={() => setReviewLanguage('en')} className={`px-2 py-0.5 text-xs rounded ${reviewLanguage === 'en' ? 'bg-brand-primary text-white' : 'bg-brand-dark text-brand-secondary'}`}>EN</button>
                               <button onClick={() => setReviewLanguage('es')} className={`px-2 py-0.5 text-xs rounded ${reviewLanguage === 'es' ? 'bg-brand-primary text-white' : 'bg-brand-dark text-brand-secondary'}`}>ES</button>
                           </div>
                        </div>
                        <p className="text-brand-light">{currentForm.summary ? currentForm.summary[reviewLanguage] : t('forms.loadingSummary')}</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <img src={currentForm.imageDataUrl} alt="Scanned Form" className="rounded-lg border border-brand-border max-h-[70vh] object-contain"/>
                       <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                           {currentForm.filledFields?.map((field, index) => (
                               <div key={index}>
                                   <label className="block text-sm font-medium text-brand-secondary mb-1">{field.label}</label>
                                   <input type="text" value={field.value} onChange={(e) => handleFieldChange(index, e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                               </div>
                           ))}
                            {currentForm.filledFields?.length === 0 && (
                                 <div className="text-center py-8 px-4 bg-brand-dark rounded-lg border border-brand-border">
                                    <p className="text-brand-secondary">{t('forms.noFields')}</p>
                                </div>
                            )}
                       </div>
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button onClick={resetState} className="px-6 py-2 rounded-md text-brand-light bg-brand-border hover:bg-opacity-80 transition-colors">{t('forms.discard')}</button>
                        <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2 rounded-md text-brand-primary border border-brand-primary hover:bg-brand-primary hover:text-white transition-colors">
                            <ArrowUpTrayIcon /> <span>{t('forms.exportPdf')}</span>
                        </button>
                        <button onClick={handleSaveForm} className="px-6 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">{t('forms.saveForm')}</button>
                    </div>
                </div>
            );
        case 'list':
        default:
            return (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold">{t('forms.title')}</h1>
                        {view === 'emails' ? (
                            <button onClick={() => setIsEmailModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">
                                <PlusIcon /><span>{t('forms.addEmail')}</span>
                            </button>
                        ) : (
                            <button onClick={() => setScreenState('upload')} className="flex items-center gap-2 px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">
                                <PlusIcon /><span>{t('forms.scanForm')}</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex border-b border-brand-border mb-6">
                        <button onClick={() => setView('active')} className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'active' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-brand-secondary hover:text-brand-light'}`}>
                            {t('forms.activeTab')} ({activeForms.length})
                        </button>
                        <button onClick={() => setView('emails')} className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'emails' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-brand-secondary hover:text-brand-light'}`}>
                            {t('forms.emailsTab')} ({activeEmails.length})
                        </button>
                        <button onClick={() => setView('history')} className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'history' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-brand-secondary hover:text-brand-light'}`}>
                            {t('forms.historyTab')} ({historyForms.length})
                        </button>
                    </div>

                    {view === 'active' && (
                        <>
                            {activeForms.length > 0 ? (
                                <div className="space-y-8">
                                   {Object.keys(groupedActiveForms).sort().map(category => (
                                       <div key={category}>
                                           <h2 className="text-lg font-semibold text-brand-primary mb-3">{t(`categories.${category}`)}</h2>
                                           <div className="space-y-4">
                                           {groupedActiveForms[category].map(form => (
                                                <div key={form.id} className="bg-brand-surface p-4 rounded-lg border border-brand-border flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-grow min-w-0">
                                                        <img src={form.imageDataUrl} alt="Form thumbnail" className="w-16 h-16 object-cover rounded-md flex-shrink-0"/>
                                                        <div className="flex-grow min-w-0">
                                                            <p className="font-semibold text-brand-light truncate" title={form.formName}>{form.formName}</p>
                                                            <p className="text-sm text-brand-secondary mt-1 italic truncate">"{form.summary}"</p>
                                                            <p className="text-sm text-brand-secondary mt-2">{t('forms.due')}: {form.dueDate ? new Date(form.dueDate).toLocaleDateString() : 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <button className="p-2 text-brand-secondary hover:text-red-500 flex-shrink-0 ml-4" onClick={() => openDeleteModal(form.id, 'form')}><TrashIcon /></button>
                                                </div>
                                            ))}
                                            </div>
                                       </div>
                                   ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 px-4 bg-brand-surface rounded-lg border-2 border-dashed border-brand-border">
                                    <h3 className="text-xl font-semibold text-brand-light">{t('forms.noActiveForms')}</h3>
                                    <p className="text-brand-secondary mt-2">{t('forms.noActiveFormsDesc')}</p>
                                </div>
                            )}
                        </>
                    )}

                     {view === 'emails' && (
                        <>
                            {activeEmails.length > 0 ? (
                                <div className="space-y-4">
                                    {activeEmails.map(email => {
                                        const kidName = kids.find(k => k.id === email.kidId)?.name || 'Unknown';
                                        return (
                                            <div key={email.id} className="bg-brand-surface rounded-lg border border-brand-border flex items-center justify-between transition-colors hover:border-brand-primary">
                                                <button onClick={() => setViewingEmail(email)} className="p-4 flex items-center gap-4 flex-grow min-w-0 text-left">
                                                    <div className="w-16 h-16 bg-brand-dark rounded-md flex-shrink-0 flex items-center justify-center">
                                                        <div className="w-8 h-8 text-brand-secondary"><EnvelopeIcon /></div>
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-semibold text-brand-light truncate" title={email.label}>{email.label}</p>
                                                        <p className="text-sm text-brand-secondary mt-1 italic truncate">"{email.summary}"</p>
                                                        <p className="text-sm text-brand-secondary mt-2">{t('forms.for')} {kidName} {email.dueDate ? `· ${t('forms.due')}: ${new Date(email.dueDate).toLocaleDateString()}` : ''}</p>
                                                    </div>
                                                </button>
                                                <button className="p-2 text-brand-secondary hover:text-red-500 flex-shrink-0 mx-4" onClick={() => openDeleteModal(email.id, 'email')}><TrashIcon /></button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16 px-4 bg-brand-surface rounded-lg border-2 border-dashed border-brand-border">
                                    <h3 className="text-xl font-semibold text-brand-light">{t('emails.noEmails')}</h3>
                                    <p className="text-brand-secondary mt-2">{t('emails.noEmailsDesc')}</p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {view === 'history' && (
                         <>
                            {historyForms.length > 0 ? (
                                <div className="space-y-4">
                                {historyForms.map(form => {
                                    const kidName = kids.find(k => k.id === form.kidId)?.name || 'Unknown';
                                    const statusText = form.status === 'completed' ? t('forms.statusCompleted') : t('forms.statusDeleted');
                                    const statusColor = form.status === 'completed' ? 'text-green-400' : 'text-red-400';
                                    const statusBg = form.status === 'completed' ? 'bg-green-500/10' : 'bg-red-500/10';
                                    return (
                                        <div key={form.id} className="bg-brand-surface p-4 rounded-lg border border-brand-border opacity-80">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-grow min-w-0">
                                                    <p className="font-semibold text-brand-light truncate" title={form.formName}>{form.formName}</p>
                                                    <p className="text-sm text-brand-secondary mt-1">{t('forms.for')} {kidName} &middot; {t(`categories.${form.category}`)}</p>
                                                </div>
                                                <div className="text-right ml-4 flex-shrink-0">
                                                    <p className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor} ${statusBg}`}>{statusText}</p>
                                                    <p className="text-xs text-brand-secondary mt-1">{new Date(form.updatedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                </div>
                            ) : (
                                <div className="text-center py-16 px-4 bg-brand-surface rounded-lg border-2 border-dashed border-brand-border">
                                    <h3 className="text-xl font-semibold text-brand-light">{t('forms.noHistory')}</h3>
                                    <p className="text-brand-secondary mt-2">{t('forms.noHistoryDesc')}</p>
                                </div>
                            )}
                        </>
                    )}

                    {modalState.isOpen && (
                        <ConfirmationModal 
                            title={modalState.title}
                            message={modalState.message}
                            onConfirm={modalState.action!}
                            onCancel={() => setModalState({ isOpen: false, title: '', message: '', action: null })}
                            confirmText={t('forms.deleteButton')}
                            confirmColor="bg-red-600 hover:bg-red-700"
                        />
                    )}
                </>
            );
    }
  };

  return (
    <div>
        {renderContent()}
        <EmailProcessingModal 
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            kids={kids}
            onSave={handleSaveEmail}
        />
        {viewingEmail && (
            <EmailDetailModal
                email={viewingEmail}
                kidName={kids.find(k => k.id === viewingEmail.kidId)?.name || 'Unknown'}
                onClose={() => setViewingEmail(null)}
            />
        )}
    </div>
  );
};

export default FormsScreen;
