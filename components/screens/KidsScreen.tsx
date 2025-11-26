
import React, { useState, useRef } from 'react';
import type { KidProfile } from '../../types';
import { PlusIcon, PencilIcon, TrashIcon, CameraIcon, ArrowUpTrayIcon } from '../Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import CameraOverlay from '../CameraOverlay';

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
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [showImageOptions, setShowImageOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
            photoUrl: undefined,
        }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoCapture = (dataUrl: string) => {
        setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
        setIsCameraOpen(false);
        setShowImageOptions(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handlePhotoCapture(reader.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: kid?.id || Date.now().toString() });
    };

    const inputClass = "w-full bg-brand-surface-highlight border border-transparent rounded-xl px-4 py-3 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder-gray-500 transition-all";
    const labelClass = "block text-xs font-bold text-brand-secondary uppercase mb-1 ml-1";

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel}></div>
            <div className="relative w-full md:max-w-lg bg-brand-surface rounded-t-3xl md:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up flex flex-col shadow-2xl border border-white/10">
                <div className="w-12 h-1.5 bg-brand-border rounded-full mx-auto mb-6 flex-shrink-0" />
                
                <h2 className="text-2xl font-bold mb-6 text-brand-light text-center">{kid ? t('kids.editProfileTitle') : t('kids.addProfileTitle')}</h2>
                
                {/* Photo Picker */}
                <div className="flex justify-center mb-6">
                    <button onClick={() => setShowImageOptions(true)} className="relative group w-24 h-24 rounded-full bg-brand-surface-highlight border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden hover:border-brand-primary transition-colors">
                        {formData.photoUrl ? (
                            <img src={formData.photoUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-brand-secondary">
                                <CameraIcon />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold text-white">Change</span>
                        </div>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>{t('kids.nameLabel')}</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required placeholder="Child's Name" /></div>
                        <div><label className={labelClass}>{t('kids.gradeLabel')}</label><input type="text" name="grade" value={formData.grade} onChange={handleChange} className={inputClass} placeholder="e.g. 2nd Grade" /></div>
                    </div>
                    <div><label className={labelClass}>{t('kids.allergiesLabel')}</label><input type="text" name="allergies" value={formData.allergies} onChange={handleChange} className={inputClass} placeholder="None" /></div>
                    <div><label className={labelClass}>{t('kids.medsLabel')}</label><input type="text" name="medications" value={formData.medications} onChange={handleChange} className={inputClass} placeholder="None" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>{t('kids.emergencyContactLabel')}</label><input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>{t('kids.emergencyPhoneLabel')}</label><input type="text" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>{t('kids.doctorNameLabel')}</label><input type="text" name="doctorName" value={formData.doctorName} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>{t('kids.doctorPhoneLabel')}</label><input type="text" name="doctorPhone" value={formData.doctorPhone} onChange={handleChange} className={inputClass} /></div>
                    </div>
                     <div><label className={labelClass}>{t('kids.teacherNameLabel')}</label><input type="text" name="teacherName" value={formData.teacherName} onChange={handleChange} className={inputClass} /></div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onCancel} className="flex-1 py-3.5 rounded-xl font-medium text-brand-light bg-brand-surface-highlight hover:bg-brand-border active:scale-95 transition-all">{t('kids.cancel')}</button>
                        <button type="submit" className="flex-1 py-3.5 rounded-xl font-bold text-white bg-brand-primary shadow-glow hover:bg-brand-primary-hover active:scale-95 transition-all">{t('kids.saveProfile')}</button>
                    </div>
                </form>
            </div>
            
            {isCameraOpen && <CameraOverlay onCapture={handlePhotoCapture} onClose={() => setIsCameraOpen(false)} />}
            
             {/* Image Options Sheet */}
            {showImageOptions && (
                <div className="fixed inset-0 z-[150] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImageOptions(false)} />
                    <div className="relative bg-brand-surface rounded-t-3xl p-6 space-y-3 animate-slide-up border-t border-brand-border">
                        <div className="w-12 h-1.5 bg-brand-border rounded-full mx-auto mb-4" />
                        <h3 className="text-center font-bold text-brand-light mb-4">Update Photo</h3>
                        
                        <button onClick={() => { setShowImageOptions(false); setIsCameraOpen(true); }} className="w-full py-4 rounded-xl bg-brand-surface-highlight text-brand-light font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-brand-border">
                            <CameraIcon /> {t('imagePicker.takePhoto')}
                        </button>
                        
                        <button onClick={() => { setShowImageOptions(false); fileInputRef.current?.click(); }} className="w-full py-4 rounded-xl bg-brand-surface-highlight text-brand-light font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-brand-border">
                            <ArrowUpTrayIcon /> {t('imagePicker.chooseLibrary')}
                        </button>
                        
                        <button onClick={() => setShowImageOptions(false)} className="w-full py-4 rounded-xl bg-brand-surface text-red-500 font-medium active:scale-95 transition-transform mt-2 border border-brand-border">
                            {t('imagePicker.cancel')}
                        </button>
                    </div>
                </div>
            )}
            
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileSelect} />
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
    <div className="animate-in pb-20">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-brand-light tracking-tight">{t('kids.title')}</h1>
            <button onClick={() => { setEditingKid(null); setIsFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-full text-white bg-brand-primary shadow-glow hover:bg-brand-primary-hover active:scale-95 transition-all font-semibold">
                <PlusIcon />
                <span>{t('kids.addKid')}</span>
            </button>
        </div>

        {kids.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
                {kids.map((kid, idx) => (
                    <div 
                        key={kid.id} 
                        className="glass-panel p-5 rounded-3xl flex items-center gap-5 group hover:bg-brand-surface-highlight transition-colors"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-purple-600 p-[2px] shadow-lg flex-shrink-0">
                            <div className="w-full h-full rounded-full overflow-hidden bg-brand-surface border border-brand-border">
                                {kid.photoUrl ? (
                                    <img src={kid.photoUrl} alt={kid.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-brand-light bg-brand-surface-highlight">
                                        {kid.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-grow min-w-0">
                            <h3 className="text-xl font-bold text-brand-light truncate">{kid.name}</h3>
                            <p className="text-brand-primary font-medium text-sm">{kid.grade}</p>
                            <p className="text-brand-secondary text-xs mt-1 truncate">
                                {kid.allergies ? `⚠️ ${kid.allergies}` : 'No known allergies'}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(kid)} className="p-2.5 bg-brand-surface-highlight rounded-full text-brand-secondary hover:text-brand-light hover:bg-brand-primary/20 transition-all active:scale-90"><div className="w-5 h-5"><PencilIcon /></div></button>
                            <button onClick={() => handleDelete(kid.id)} className="p-2.5 bg-brand-surface-highlight rounded-full text-brand-secondary hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"><div className="w-5 h-5"><TrashIcon /></div></button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-16 px-6 glass-panel rounded-3xl border-2 border-dashed border-brand-border flex flex-col items-center">
                <div className="w-20 h-20 bg-brand-surface-highlight rounded-full flex items-center justify-center text-gray-500 mb-4">
                    <div className="w-10 h-10"><PlusIcon /></div>
                </div>
                <h3 className="text-xl font-bold text-brand-light mb-2">{t('kids.noProfiles')}</h3>
                <p className="text-brand-secondary mb-6 max-w-xs mx-auto">{t('kids.noProfilesDesc')}</p>
                <button onClick={() => setIsFormOpen(true)} className="px-6 py-3 rounded-xl text-white bg-brand-primary shadow-glow hover:bg-brand-primary-hover active:scale-95 transition-all font-bold">
                    {t('kids.addFirstKid')}
                </button>
            </div>
        )}

        {isFormOpen && <KidProfileForm kid={editingKid} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />}
    </div>
  );
};

export default KidsScreen;
