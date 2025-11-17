import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface AuthScreenProps {
    onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const { t } = useLanguage();
    const [isLoginView, setIsLoginView] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [viewState, setViewState] = useState<'welcome' | 'auth'>('welcome');

    useEffect(() => {
        const timer = setTimeout(() => {
            setViewState('auth');
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name || !email || !password) {
            setError(t('auth.errorAllFields'));
            return;
        }

        const newUser: User = {
            id: Date.now().toString(),
            name,
            email
        };
        localStorage.setItem(`pagepal-user-${email}`, JSON.stringify({ ...newUser, password }));
        
        onLogin(newUser);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError(t('auth.errorEmailPassword'));
            return;
        }
        
        const storedUserString = localStorage.getItem(`pagepal-user-${email}`);
        if (storedUserString) {
            const storedUser = JSON.parse(storedUserString);
            if (storedUser.password === password) {
                const { password: _, ...userToLogin } = storedUser;
                onLogin(userToLogin);
            } else {
                setError(t('auth.errorInvalidCredentials'));
            }
        } else {
            setError(t('auth.errorNoAccount'));
        }
    };

    const inputClass = "w-full bg-brand-dark border border-brand-border rounded-md px-3 py-2 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary";

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 relative overflow-hidden">
            <div className={`absolute inset-0 flex flex-col justify-center items-center transition-opacity duration-1000 ease-in-out ${viewState === 'welcome' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <h1 className="text-5xl font-bold text-brand-primary animate-fade-in-scale">Welcome to {t('auth.appName')}</h1>
            </div>
            
            <div className={`w-full max-w-sm transition-opacity duration-1000 ease-in-out ${viewState === 'auth' ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-brand-primary">{t('auth.appName')}</h1>
                    <p className="text-brand-secondary mt-2">{t('auth.appDesc')}</p>
                </div>
                
                <div className="bg-brand-surface p-8 rounded-lg border border-brand-border">
                    <h2 className="text-2xl font-bold text-center mb-6">{isLoginView ? t('auth.login') : t('auth.signup')}</h2>
                    {error && <p className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-md mb-4 text-center">{error}</p>}
                    <form onSubmit={isLoginView ? handleLogin : handleSignUp} className="space-y-4">
                        {!isLoginView && (
                             <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('auth.nameLabel')}</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} /></div>
                        )}
                        <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('auth.emailLabel')}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-brand-secondary mb-1">{t('auth.passwordLabel')}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} /></div>
                        <button type="submit" className="w-full mt-4 px-4 py-2 rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors">
                            {isLoginView ? t('auth.login') : t('auth.createAccount')}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6">
                    <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-brand-primary hover:underline">
                        {isLoginView ? t('auth.promptSignup') : t('auth.promptLogin')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;