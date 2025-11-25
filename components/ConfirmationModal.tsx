import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    confirmColor?: string;
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText, 
    confirmColor = 'bg-red-600 hover:bg-red-700' 
}) => {
    const { t } = useLanguage();
    
    // Desktop: Centered Modal. Mobile: Bottom Sheet.
    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center" aria-modal="true" role="dialog">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
            
            {/* Content */}
            <div className="relative w-full md:max-w-md bg-brand-surface rounded-t-3xl md:rounded-2xl p-6 md:p-8 shadow-2xl animate-slide-up md:animate-fade-in-scale ring-1 ring-white/10">
                {/* Mobile Handle */}
                <div className="w-12 h-1.5 bg-brand-border rounded-full mx-auto mb-6 md:hidden"></div>
                
                <h2 className="text-2xl font-bold mb-3 text-brand-light">{title}</h2>
                <p className="text-brand-secondary mb-8 leading-relaxed">{message}</p>
                <div className="flex flex-col md:flex-row gap-3 md:justify-end">
                     <button onClick={onConfirm} className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-semibold text-white shadow-lg active:scale-95 transition-all ${confirmColor}`}>
                        {confirmText || t('confirmModal.confirm')}
                    </button>
                    <button onClick={onCancel} className="w-full md:w-auto px-6 py-3.5 rounded-xl text-brand-light bg-brand-surface-highlight border border-brand-border hover:bg-brand-border active:scale-95 transition-all font-medium">
                        {t('confirmModal.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;