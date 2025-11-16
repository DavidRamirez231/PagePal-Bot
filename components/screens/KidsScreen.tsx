import React, { useState } from 'react';
import type { KidProfile } from '../../types';
import { PlusIcon, PencilIcon, TrashIcon } from '../Icons';
import { useLanguage } from '../../contexts/LanguageContext';

interface KidsScreenProps {
  kids: KidProfile[];
  setKids: React.Dispatch<React.SetStateAction<KidProfile[]>>;
}

const KidProfileForm: React.FC<{
    kid: KidProfile | null;
    onSave: (kid: KidProfile) => void;
    onCancel: () => void;
}> = ({ kid, onSave, onCancel }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<Omit<KidProfile, 'id'>>(
        kid || {
            name: '',
            grade: '',
            allergies: '',
            medications: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            doctorName: '',
            doctorPhone: '',
            teacherName: '',
        }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: kid?.id || Date.now().toString() });
    };

    const inputClass = "w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-surface rounded-lg p-8 w-full max-w-lg max-h-full overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{kid ? t('kids.editProfileTitle') : t('kids.addProfileTitle')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.nameLabel')}</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required /></div>
                        <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.gradeLabel')}</label><input type="text" name="grade" value={formData.grade} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.allergiesLabel')}</label><input type="text" name="allergies" value={formData.allergies} onChange={handleChange} className={inputClass} /></div>
                    <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.medsLabel')}</label><input type="text" name="medications" value={formData.medications} onChange={handleChange} className={inputClass} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.emergencyContactLabel')}</label><input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.emergencyPhoneLabel')}</label><input type="text" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.doctorNameLabel')}</label><input type="text" name="doctorName" value={formData.doctorName} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.doctorPhoneLabel')}</label><input type="text" name="doctorPhone" value={formData.doctorPhone} onChange={handleChange} className={inputClass} /></div>
                    </div>
                     <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('kids.teacherNameLabel')}</label><input type="text" name="teacherName" value={formData.teacherName} onChange={handleChange} className={inputClass} /></div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md text-brand-light bg-brand-border hover:bg-opacity-80 transition-colors">{t('kids.cancel')}</button>
                        <button type="submit" className="px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">{t('kids.saveProfile')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const KidsScreen: React.FC<KidsScreenProps> = ({ kids, setKids }) => {
  const { t } = useLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<KidProfile | null>(null);

  const handleSave = (kid: KidProfile) => {
    setKids(prev => {
      const existing = prev.find(k => k.id === kid.id);
      if (existing) {
        return prev.map(k => k.id === kid.id ? kid : k);
      }
      return [...prev, kid];
    });
    setIsFormOpen(false);
    setEditingKid(null);
  };
  
  const handleEdit = (kid: KidProfile) => {
    setEditingKid(kid);
    setIsFormOpen(true);
  };
  
  const handleDelete = (kidId: string) => {
    if (window.confirm(t('kids.deleteConfirm'))) {
        setKids(prev => prev.filter(k => k.id !== kidId));
    }
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{t('kids.title')}</h1>
            <button onClick={() => { setEditingKid(null); setIsFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">
                <PlusIcon />
                <span>{t('kids.addKid')}</span>
            </button>
        </div>

        {kids.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {kids.map(kid => (
                    <div key={kid.id} className="bg-brand-surface p-6 rounded-lg border border-brand-border flex flex-col">
                        <div className="flex-grow">
                            <h3 className="text-2xl font-semibold text-brand-primary">{kid.name}</h3>
                            <p className="text-brand-secondary">{t('kids.grade')} {kid.grade}</p>
                            <div className="mt-4 space-y-2 text-sm">
                                <p><strong className="text-brand-light">{t('kids.allergies')}:</strong> {kid.allergies || 'N/A'}</p>
                                <p><strong className="text-brand-light">{t('kids.emergency')}:</strong> {kid.emergencyContactName} ({kid.emergencyContactPhone || 'N/A'})</p>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button onClick={() => handleEdit(kid)} className="p-2 text-brand-secondary hover:text-brand-primary"><PencilIcon /></button>
                            <button onClick={() => handleDelete(kid.id)} className="p-2 text-brand-secondary hover:text-red-500"><TrashIcon /></button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-16 px-4 bg-brand-surface rounded-lg border-2 border-dashed border-brand-border">
                <h3 className="text-xl font-semibold text-brand-light">{t('kids.noProfiles')}</h3>
                <p className="text-brand-secondary mt-2">{t('kids.noProfilesDesc')}</p>
                <button onClick={() => setIsFormOpen(true)} className="mt-6 flex mx-auto items-center gap-2 px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">
                    <PlusIcon />
                    <span>{t('kids.addFirstKid')}</span>
                </button>
            </div>
        )}

        {isFormOpen && <KidProfileForm kid={editingKid} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />}
    </div>
  );
};

export default KidsScreen;
