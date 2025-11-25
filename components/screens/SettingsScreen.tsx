
import React, { useState, useRef } from 'react';
import type { User } from '../../types';
import { ArrowRightOnRectangleIcon, LanguageIcon, CameraIcon, PencilIcon, TrashIcon, ArrowUpTrayIcon } from '../Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import CameraOverlay from '../CameraOverlay';

interface SettingsScreenProps {
  currentUser: User | null;
  onLogout: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onLogout }) => {
  const { language, setLanguage, t } = useLanguage();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [updatedUser, setUpdatedUser] = useState<User | null>(currentUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdatePhoto = (dataUrl: string) => {
      if (!updatedUser) return;
      const newUser = { ...updatedUser, photoUrl: dataUrl };
      setUpdatedUser(newUser);
      
      // Persist changes
      localStorage.setItem('pagepal-currentUser', JSON.stringify(newUser));
      // Also update the comprehensive user record if it exists
      const storedUserKey = `pagepal-user-${newUser.email}`;
      const storedFullUser = localStorage.getItem(storedUserKey);
      if (storedFullUser) {
          const parsed = JSON.parse(storedFullUser);
          localStorage.setItem(storedUserKey, JSON.stringify({ ...parsed, photoUrl: dataUrl }));
      }
      setIsCameraOpen(false);
      setShowImageOptions(false);
      // Force reload to propagate changes to context/app (in a real app, use context dispatch)
      window.location.reload(); 
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdatePhoto(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    if (!updatedUser) return;
    const newUser = { ...updatedUser, photoUrl: undefined };
    setUpdatedUser(newUser);
    localStorage.setItem('pagepal-currentUser', JSON.stringify(newUser));
    window.location.reload();
  };

  return (
    <div className="animate-in pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
      </div>

      {/* Profile Section */}
      <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border mb-6 flex flex-col items-center">
         <div className="relative group mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-brand-surface-highlight bg-brand-surface-highlight flex items-center justify-center">
                {updatedUser?.photoUrl ? (
                    <img src={updatedUser.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-3xl font-bold text-brand-secondary">{updatedUser?.name.charAt(0).toUpperCase()}</span>
                )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full gap-2">
                 <button onClick={() => setShowImageOptions(true)} className="p-2 bg-brand-primary rounded-full text-white hover:scale-110 transition-transform">
                    <div className="w-4 h-4"><PencilIcon /></div>
                 </button>
                 {updatedUser?.photoUrl && (
                     <button onClick={handleRemovePhoto} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform">
                        <div className="w-4 h-4"><TrashIcon /></div>
                     </button>
                 )}
            </div>
             {/* Mobile tap target */}
            <button onClick={() => setShowImageOptions(true)} className="absolute bottom-0 right-0 bg-brand-primary text-white p-1.5 rounded-full border-2 border-brand-surface md:hidden">
                <div className="w-3 h-3"><PencilIcon /></div>
            </button>
         </div>
         <h2 className="text-xl font-bold text-white">{updatedUser?.name}</h2>
         <p className="text-brand-secondary text-sm">{updatedUser?.email}</p>
      </div>

      <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border">
        <h2 className="text-xl font-semibold text-brand-primary mb-4 flex items-center gap-2">
          <LanguageIcon /> {t('settings.language')}
        </h2>
        <div className="flex space-x-2">
            <button 
                onClick={() => setLanguage('en')}
                className={`w-full py-3 rounded-xl font-medium transition-all active:scale-95 ${language === 'en' ? 'bg-brand-primary text-white shadow-glow' : 'bg-[#2C2C2E] text-gray-400 hover:bg-[#3A3A3C]'}`}
            >
                {t('settings.english')}
            </button>
            <button 
                onClick={() => setLanguage('es')}
                className={`w-full py-3 rounded-xl font-medium transition-all active:scale-95 ${language === 'es' ? 'bg-brand-primary text-white shadow-glow' : 'bg-[#2C2C2E] text-gray-400 hover:bg-[#3A3A3C]'}`}
            >
                {t('settings.spanish')}
            </button>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all font-medium"
        >
          <ArrowRightOnRectangleIcon />
          <span>{t('settings.logout')}</span>
        </button>
      </div>

      {isCameraOpen && (
          <CameraOverlay onCapture={handleUpdatePhoto} onClose={() => setIsCameraOpen(false)} />
      )}

      {/* Image Options Sheet */}
      {showImageOptions && (
          <div className="fixed inset-0 z-[150] flex flex-col justify-end">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImageOptions(false)} />
             <div className="relative bg-[#1C1C1E] rounded-t-3xl p-6 space-y-3 animate-slide-up border-t border-white/10">
                 <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
                 <h3 className="text-center font-bold text-white mb-4">Update Profile Photo</h3>
                 
                 <button onClick={() => { setShowImageOptions(false); setIsCameraOpen(true); }} className="w-full py-4 rounded-xl bg-[#2C2C2E] text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-[#3A3A3C]">
                     <CameraIcon /> {t('imagePicker.takePhoto')}
                 </button>
                 
                 <button onClick={() => { setShowImageOptions(false); fileInputRef.current?.click(); }} className="w-full py-4 rounded-xl bg-[#2C2C2E] text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-[#3A3A3C]">
                     <ArrowUpTrayIcon /> {t('imagePicker.chooseLibrary')}
                 </button>
                 
                 <button onClick={() => setShowImageOptions(false)} className="w-full py-4 rounded-xl bg-black text-red-400 font-medium active:scale-95 transition-transform mt-2">
                     {t('imagePicker.cancel')}
                 </button>
             </div>
          </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        hidden 
        accept="image/*" 
        onChange={handleFileSelect} 
      />
    </div>
  );
};

export default SettingsScreen;
