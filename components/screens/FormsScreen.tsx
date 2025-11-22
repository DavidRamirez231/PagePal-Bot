
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Form, KidProfile, FormField, ProcessedEmail } from '../../types';
import { processFormWithGemini, processEmailWithGemini } from '../../services/geminiService';
import { PlusIcon, TrashIcon, ArrowUpTrayIcon, EnvelopeIcon, CameraIcon, MagnifyingGlassIcon } from '../Icons';
import ConfirmationModal from '../ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';

type FormScreenState = 'list' | 'upload' | 'processing' | 'review' | 'details';
type ReviewingForm = Partial<Omit<Form, 'summary'>> & { summary?: { en: string; es: string; } | string };

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
                                <input type="datetime-local" value={processedData.dueDate || ''} onChange={e => setProcessedData({...processedData, dueDate: e.target.value})} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
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
                            {t('forms.due')}: {new Date(email.dueDate).toLocaleString()}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Camera logic
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
      setSelectedIds(new Set());
  }, [view]);

  const startCamera = async () => {
      setIsCameraActive(true);
      setTimeout(async () => {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
              if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play();
              }
          } catch (err) {
              console.error("Error accessing camera", err);
              setError("Could not access camera. Please allow permissions.");
              setIsCameraActive(false);
          }
      }, 100);
  }

  const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
  }

  const takePhoto = () => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg');
              setImagePreview(dataUrl);
              stopCamera();
          }
      }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
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
    const summaryObj = currentForm.summary as { en: string; es: string };
    const summaryText = summaryObj?.[reviewLanguage] || '';
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
      summary: summaryObj![reviewLanguage],
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
    if (isCameraActive) stopCamera();
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
      const e = window.event;
      e?.stopPropagation();
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

  const handleViewDetails = (form: Form) => {
      setCurrentForm(form);
      setScreenState('details');
  };

  const filterForm = (form: Form, query: string) => {
      if (!query) return true;
      const lowerQuery = query.toLowerCase();
      const kid = kids.find(k => k.id === form.kidId);
      const kidName = kid ? kid.name.toLowerCase() : '';
      const summaryObj = typeof form.summary === 'object' ? form.summary : { en: form.summary, es: form.summary };
      const summaryEn = (summaryObj?.en || '').toLowerCase();
      const summaryEs = (summaryObj?.es || '').toLowerCase();
      const formName = form.formName.toLowerCase();
      const category = (form.category || '').toLowerCase();
      const date = form.dueDate ? new Date(form.dueDate).toLocaleDateString().toLowerCase() : '';

      return formName.includes(lowerQuery) ||
             kidName.includes(lowerQuery) ||
             summaryEn.includes(lowerQuery) ||
             summaryEs.includes(lowerQuery) ||
             category.includes(lowerQuery) ||
             date.includes(lowerQuery);
  };

  const filterEmail = (email: ProcessedEmail, query: string) => {
      if (!query) return true;
      const lowerQuery = query.toLowerCase();
      const kid = kids.find(k => k.id === email.kidId);
      const kidName = kid ? kid.name.toLowerCase() : '';
      const label = email.label.toLowerCase();
      const summary = email.summary.toLowerCase();
      const date = email.dueDate ? new Date(email.dueDate).toLocaleDateString().toLowerCase() : '';

      return label.includes(lowerQuery) ||
             kidName.includes(lowerQuery) ||
             summary.includes(lowerQuery) ||
             date.includes(lowerQuery);
  };

  
  const activeForms = useMemo(() => forms.filter(form => form.status === 'pending' && filterForm(form, searchQuery)), [forms, searchQuery, kids]);
  
  const historyForms = useMemo(() => forms.filter(form => (form.status === 'completed' || form.status === 'deleted') && filterForm(form, searchQuery))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), 
  [forms, searchQuery, kids]);
  
  const activeEmails = useMemo(() => emails.filter(email => email.status === 'active' && filterEmail(email, searchQuery))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
  [emails, searchQuery, kids]);

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

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const toggleSelectAll = (ids: string[]) => {
      if (ids.every(id => selectedIds.has(id))) {
          const newSet = new Set(selectedIds);
          ids.forEach(id => newSet.delete(id));
          setSelectedIds(newSet);
      } else {
          const newSet = new Set(selectedIds);
          ids.forEach(id => newSet.add(id));
          setSelectedIds(newSet);
      }
  };

  const handleBulkDelete = () => {
      setModalState({
          isOpen: true,
          title: t('forms.bulkDeleteTitle'),
          message: t('forms.bulkDeleteMessage'),
          action: () => {
              const ids = Array.from(selectedIds);
              if (view === 'active') {
                  setForms(prev => prev.map(f => ids.includes(f.id) ? { ...f, status: 'deleted', updatedAt: new Date().toISOString() } : f));
              } else if (view === 'emails') {
                  setEmails(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: 'deleted', updatedAt: new Date().toISOString() } : e));
              }
              setSelectedIds(new Set());
              setModalState({ isOpen: false, title: '', message: '', action: null });
          }
      });
  };

  const renderContent = () => {
    switch(screenState) {
        case 'upload':
            return (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-brand-surface rounded-lg p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                           
                           {!isCameraActive && (
                               <>
                                   <div className="flex space-x-2">
                                        <div className="relative flex-grow">
                                            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light text-center hover:border-brand-primary transition-colors cursor-pointer">
                                                {t('forms.uploadFile')}
                                            </div>
                                        </div>
                                        <button onClick={startCamera} className="px-4 py-2 bg-brand-dark border border-brand-border rounded-md text-brand-light hover:border-brand-primary transition-colors flex items-center gap-2">
                                            <CameraIcon />
                                        </button>
                                   </div>
                                   {imagePreview && (
                                       <div className="relative">
                                           <img src={imagePreview} alt="Form preview" className="max-h-40 w-full object-contain rounded-md border border-brand-border"/>
                                            <button onClick={() => setImagePreview('')} className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full text-white hover:bg-red-500">
                                                <TrashIcon />
                                            </button>
                                       </div>
                                   )}
                               </>
                           )}

                           {isCameraActive && (
                               <div className="space-y-2">
                                   <div className="bg-black rounded-md overflow-hidden flex items-center justify-center h-64 w-full">
                                       <video ref={videoRef} autoPlay playsInline className="max-h-full max-w-full"></video>
                                   </div>
                                   <div className="flex justify-center space-x-4">
                                       <button onClick={stopCamera} className="px-4 py-2 rounded-md text-brand-light bg-brand-border hover:bg-opacity-80 transition-colors">{t('forms.cancel')}</button>
                                       <button onClick={takePhoto} className="px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">{t('forms.takePhoto')}</button>
                                   </div>
                               </div>
                           )}

                           {!isCameraActive && (
                               <div>
                                    <label className="block text-sm font-medium text-brand-secondary mb-1">{t('forms.dueDateOptional')}</label>
                                    <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                               </div>
                           )}
                        </div>

                        {!isCameraActive && (
                            <div className="flex justify-end space-x-4 pt-6">
                                <button onClick={resetState} className="px-4 py-2 rounded-md text-brand-light bg-brand-border hover:bg-opacity-80 transition-colors">{t('forms.cancel')}</button>
                                <button onClick={handleScan} disabled={!selectedKidId || !imagePreview} className="px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors disabled:bg-brand-border disabled:cursor-not-allowed">{t('forms.scanForm')}</button>
                            </div>
                        )}
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
                        <p className="text-brand-light">{typeof currentForm.summary === 'object' ? currentForm.summary[reviewLanguage] : currentForm.summary || t('forms.loadingSummary')}</p>
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
        case 'details':
            return (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                         <h2 className="text-2xl font-bold">{t('forms.formDetails')}</h2>
                         <button onClick={resetState} className="text-brand-primary hover:underline">{t('forms.back')}</button>
                    </div>
                    
                    <div className="bg-brand-surface p-4 rounded-lg border border-brand-border">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-sm font-semibold text-brand-primary">{t('forms.aiSummary')}</p>
                        </div>
                        <p className="text-brand-light">{typeof currentForm.summary === 'string' ? currentForm.summary : 'No summary available.'}</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <img src={currentForm.imageDataUrl} alt="Scanned Form" className="rounded-lg border border-brand-border max-h-[70vh] object-contain"/>
                       <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                           {currentForm.filledFields?.map((field, index) => (
                               <div key={index}>
                                   <label className="block text-sm font-medium text-brand-secondary mb-1">{field.label}</label>
                                   <input readOnly type="text" value={field.value} className="w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-secondary focus:outline-none cursor-not-allowed"/>
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
                        <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">
                            <ArrowUpTrayIcon /> <span>{t('forms.exportPdf')}</span>
                        </button>
                    </div>
                </div>
            );
        case 'list':
        default:
            const currentItems = view === 'active' ? activeForms : view === 'emails' ? activeEmails : [];
            const currentIds = currentItems.map(i => i.id);
            const isAllSelected = currentIds.length > 0 && currentIds.every(id => selectedIds.has(id));
            const showBulkActions = (view === 'active' && activeForms.length > 0) || (view === 'emails' && activeEmails.length > 0);

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

                    <div className="mb-6 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-secondary">
                            <MagnifyingGlassIcon />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('forms.searchPlaceholder')}
                            className="w-full bg-brand-surface border border-brand-border rounded-md pl-10 pr-4 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
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
                    
                    {showBulkActions && (
                        <div className="flex items-center justify-between bg-brand-surface px-4 py-2 rounded-md border border-brand-border mb-4">
                            <div className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={isAllSelected} 
                                    onChange={() => toggleSelectAll(currentIds)}
                                    className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary bg-brand-dark"
                                />
                                <span className="ml-2 text-sm text-brand-secondary">{t('forms.selectAll')}</span>
                            </div>
                            {selectedIds.size > 0 && (
                                <button 
                                    onClick={handleBulkDelete} 
                                    className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                                >
                                    <TrashIcon />
                                    {t('forms.bulkDelete', {count: selectedIds.size.toString()})}
                                </button>
                            )}
                        </div>
                    )}

                    {view === 'active' && (
                        <>
                            {activeForms.length > 0 ? (
                                <div className="space-y-8">
                                   {Object.keys(groupedActiveForms).sort().map(category => (
                                       <div key={category}>
                                           <h2 className="text-lg font-semibold text-brand-primary mb-3">{t(`categories.${category}`)}</h2>
                                           <div className="space-y-4">
                                           {groupedActiveForms[category].map(form => (
                                                <div key={form.id} onClick={() => handleViewDetails(form)} className="bg-brand-surface p-4 rounded-lg border border-brand-border flex items-center justify-between hover:border-brand-primary cursor-pointer transition-colors">
                                                    <div className="flex items-center gap-4 flex-grow min-w-0">
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedIds.has(form.id)}
                                                                onChange={() => toggleSelection(form.id)}
                                                                className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary bg-brand-dark"
                                                            />
                                                        </div>
                                                        <img src={form.imageDataUrl} alt="Form thumbnail" className="w-16 h-16 object-cover rounded-md flex-shrink-0"/>
                                                        <div className="flex-grow min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-brand-light truncate" title={form.formName}>{form.formName}</p>
                                                                <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-400/20">
                                                                    {t('forms.statusPending')}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-brand-secondary mt-1 italic truncate">"{form.summary}"</p>
                                                            <p className="text-sm text-brand-secondary mt-2">{t('forms.due')}: {form.dueDate ? new Date(form.dueDate).toLocaleDateString() : 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <button className="p-2 text-brand-secondary hover:text-red-500 flex-shrink-0 ml-4" onClick={(e) => openDeleteModal(form.id, 'form')}><TrashIcon /></button>
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
                                                <div className="flex items-center flex-grow min-w-0">
                                                    <div className="pl-4" onClick={(e) => e.stopPropagation()}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedIds.has(email.id)}
                                                            onChange={() => toggleSelection(email.id)}
                                                            className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary bg-brand-dark"
                                                        />
                                                    </div>
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
                                                </div>
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
                                        <div key={form.id} onClick={() => handleViewDetails(form)} className="bg-brand-surface p-4 rounded-lg border border-brand-border opacity-80 hover:opacity-100 cursor-pointer hover:border-brand-primary transition-all">
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
