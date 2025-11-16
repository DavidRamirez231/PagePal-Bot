import React from 'react';
import type { User } from '../../types';
import { ArrowRightOnRectangleIcon, LanguageIcon } from '../Icons';
import { useLanguage } from '../../contexts/LanguageContext';

interface SettingsScreenProps {
  currentUser: User | null;
  onLogout: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onLogout }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
      </div>

      <div className="bg-brand-surface p-6 rounded-lg border border-brand-border mb-8">
        <h2 className="text-xl font-semibold text-brand-primary mb-4">{t('settings.accountInfo')}</h2>
        {currentUser ? (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-brand-secondary">{t('settings.name')}</p>
              <p className="text-brand-light">{currentUser.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-brand-secondary">{t('settings.email')}</p>
              <p className="text-brand-light">{currentUser.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-brand-secondary">{t('settings.notLoggedIn')}</p>
        )}
      </div>

      <div className="bg-brand-surface p-6 rounded-lg border border-brand-border">
        <h2 className="text-xl font-semibold text-brand-primary mb-4 flex items-center gap-2">
          <LanguageIcon /> {t('settings.language')}
        </h2>
        <div className="flex space-x-2">
            <button 
                onClick={() => setLanguage('en')}
                className={`w-full py-2 rounded-md transition-colors ${language === 'en' ? 'bg-brand-primary text-white' : 'bg-brand-dark hover:bg-brand-border'}`}
            >
                {t('settings.english')}
            </button>
            <button 
                onClick={() => setLanguage('es')}
                className={`w-full py-2 rounded-md transition-colors ${language === 'es' ? 'bg-brand-primary text-white' : 'bg-brand-dark hover:bg-brand-border'}`}
            >
                {t('settings.spanish')}
            </button>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
        >
          <ArrowRightOnRectangleIcon />
          <span>{t('settings.logout')}</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;
