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
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-brand-surface rounded-lg p-8 w-full max-w-md shadow-xl">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <p className="text-brand-secondary mb-6">{message}</p>
                <div className="flex justify-end space-x-4">
                    <button onClick={onCancel} className="px-4 py-2 rounded-md text-brand-light bg-brand-border hover:bg-opacity-80 transition-colors">{t('confirmModal.cancel')}</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-md text-white ${confirmColor} transition-colors`}>{confirmText || t('confirmModal.confirm')}</button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;
