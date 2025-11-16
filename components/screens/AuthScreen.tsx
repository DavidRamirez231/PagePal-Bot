import React, { useState } from 'react';
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
        localStorage.setItem(`formbot-user-${email}`, JSON.stringify({ ...newUser, password }));
        
        onLogin(newUser);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError(t('auth.errorEmailPassword'));
            return;
        }
        
        const storedUserString = localStorage.getItem(`formbot-user-${email}`);
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
        <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm">
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
