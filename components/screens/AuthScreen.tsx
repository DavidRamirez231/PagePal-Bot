
import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { PagePalLogo } from '../Icons';

interface AuthScreenProps {
    onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
    const { t, language, setLanguage } = useLanguage();
    const [isLoginView, setIsLoginView] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [viewState, setViewState] = useState<'welcome' | 'auth' | 'success'>('welcome');
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setViewState('auth');
        }, 2000);
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
            email,
            photoUrl: undefined
        };
        localStorage.setItem(`pagepal-user-${email}`, JSON.stringify({ ...newUser, password }));
        performLogin(newUser);
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
                performLogin(userToLogin);
            } else {
                setError(t('auth.errorInvalidCredentials'));
            }
        } else {
            setError(t('auth.errorNoAccount'));
        }
    };

    const performLogin = (user: User) => {
        setViewState('success');
        setIsExiting(true);
        // Delay actual state change to allow animation to play
        setTimeout(() => {
            onLogin(user);
        }, 800);
    };

    const inputClass = "w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all";

    return (
        <div className={`min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 relative overflow-hidden transition-all duration-700 ${isExiting ? 'scale-110 opacity-0' : 'opacity-100'}`}>
            
            {/* Language Toggle */}
            <div className="absolute top-6 right-6 z-50 animate-in" style={{ animationDelay: '1000ms' }}>
                <button 
                    onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium backdrop-blur-md transition-colors border border-white/5 active:scale-95"
                >
                    {language === 'en' ? 'Español' : 'English'}
                </button>
            </div>

            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Logo Animation Container */}
            <div className={`flex flex-col items-center transition-all duration-1000 ease-in-out z-10 ${viewState === 'welcome' ? 'scale-125' : viewState === 'success' ? 'scale-[3] opacity-0' : 'scale-100 mb-8'}`}>
                 <div className="w-24 h-24 text-brand-primary drop-shadow-[0_0_15px_rgba(10,132,255,0.4)]">
                    <PagePalLogo />
                 </div>
                 <h1 className={`text-4xl font-bold mt-4 tracking-tight transition-opacity duration-500 ${viewState === 'welcome' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    {t('auth.appName')}
                 </h1>
            </div>
            
            {/* Auth Forms */}
            <div className={`w-full max-w-sm transition-all duration-700 ease-in-out transform ${viewState === 'auth' ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none absolute'}`}>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">{t('auth.appName')}</h1>
                    <p className="text-brand-secondary mt-2">{t('auth.appDesc')}</p>
                </div>
                
                <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-center mb-6 text-white">{isLoginView ? t('auth.login') : t('auth.signup')}</h2>
                    {error && <p className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-4 text-center text-sm">{error}</p>}
                    
                    <form onSubmit={isLoginView ? handleLogin : handleSignUp} className="space-y-4">
                        {!isLoginView && (
                             <div>
                                <label className="block text-xs font-bold text-brand-secondary uppercase mb-1 ml-1">{t('auth.nameLabel')}</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="John Doe" />
                             </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-brand-secondary uppercase mb-1 ml-1">{t('auth.emailLabel')}</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="john@example.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-brand-secondary uppercase mb-1 ml-1">{t('auth.passwordLabel')}</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 rounded-xl text-white font-bold bg-brand-primary shadow-glow hover:bg-brand-primary-hover active:scale-95 transition-all">
                            {isLoginView ? t('auth.login') : t('auth.createAccount')}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-8">
                    <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-brand-secondary hover:text-white transition-colors text-sm font-medium">
                        {isLoginView ? t('auth.promptSignup') : t('auth.promptLogin')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
