
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
    
    // Initial entrance animation
    useEffect(() => {
        // Reduced from 2200ms to 1000ms for a snappier feel
        const timer = setTimeout(() => {
            setViewState('auth');
        }, 1000); 
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
        // Delay actual state change to allow the warp animation to complete
        setTimeout(() => {
            onLogin(user);
        }, 1100);
    };

    const inputClass = "w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-brand-light focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all";

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 relative overflow-hidden perspective-[1000px] transition-colors duration-500">
            
            {/* Language Toggle - Fades out on success */}
            <div className={`absolute top-6 right-6 z-50 transition-opacity duration-500 ${viewState === 'success' ? 'opacity-0' : 'opacity-100 animate-in'}`} style={{ animationDelay: '500ms' }}>
                <button 
                    onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                    className="px-4 py-2 rounded-full bg-brand-surface/10 hover:bg-brand-surface/20 text-brand-light text-sm font-medium backdrop-blur-md transition-colors border border-brand-border active:scale-95"
                >
                    {language === 'en' ? 'Español' : 'English'}
                </button>
            </div>

            {/* Background Ambient Orbs - Blur out on success */}
            <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${viewState === 'success' ? 'opacity-0 scale-150 blur-3xl' : 'opacity-100 scale-100 blur-0'}`}>
                <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Logo Animation Container */}
            {/* Logic: 
                - Welcome: Large, Centered, bouncy
                - Auth: Small, Top, smooth slide
                - Success: MASSIVE (Fly through effect), slightly rotated
            */}
            <div className={`flex flex-col items-center transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-20 ${
                viewState === 'welcome' ? 'scale-150 translate-y-0' : 
                viewState === 'success' ? 'scale-[50] opacity-0 rotate-6 pointer-events-none ease-in' : 
                'scale-100 mb-8 translate-y-0'
            }`}>
                 <div className={`w-24 h-24 text-brand-primary drop-shadow-[0_0_25px_rgba(10,132,255,0.6)] transition-all duration-500 ${viewState === 'success' ? 'text-brand-light' : ''}`}>
                    <PagePalLogo />
                 </div>
                 
                 {/* App Name: Fades out immediately on success to clean up the zoom view */}
                 <h1 className={`text-4xl font-bold mt-4 tracking-tight transition-all duration-500 text-brand-light ${
                     viewState === 'welcome' ? 'opacity-100 translate-y-0' : 
                     viewState === 'success' ? 'opacity-0 scale-50 translate-y-10' :
                     'opacity-0 h-0 overflow-hidden'
                 }`}>
                    {t('auth.appName')}
                 </h1>
            </div>
            
            {/* Auth Forms Container */}
            <div className={`w-full max-w-sm transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] transform ${
                viewState === 'auth' ? 'translate-y-0 opacity-100 scale-100 blur-0 delay-100' : 
                viewState === 'success' ? 'translate-y-20 opacity-0 scale-90 blur-sm' : 
                'translate-y-20 opacity-0 pointer-events-none absolute'
            }`}>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-brand-light">{t('auth.appName')}</h1>
                    <p className="text-brand-secondary mt-2">{t('auth.appDesc')}</p>
                </div>
                
                <div className="glass-panel p-8 rounded-3xl border border-brand-border shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                    {/* Subtle shimmer effect on the card */}
                    <div className="absolute top-0 left-[-100%] w-[200%] h-full bg-gradient-to-r from-transparent via-brand-light/5 to-transparent skew-x-12 group-hover:animate-[shimmer_2s_infinite]" />
                    
                    <h2 className="text-2xl font-bold text-center mb-6 text-brand-light relative z-10">{isLoginView ? t('auth.login') : t('auth.signup')}</h2>
                    {error && <p className="bg-red-500/20 border border-red-500/50 text-red-500 p-3 rounded-xl mb-4 text-center text-sm animate-in">{error}</p>}
                    
                    <form onSubmit={isLoginView ? handleLogin : handleSignUp} className="space-y-4 relative z-10">
                        {!isLoginView && (
                             <div className="animate-slide-down">
                                <label className="block text-xs font-bold text-brand-secondary uppercase mb-1 ml-1">{t('auth.nameLabel')}</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="John Doe" />
                             </div>
                        )}
                        <div className="animate-in" style={{ animationDelay: '100ms' }}>
                            <label className="block text-xs font-bold text-brand-secondary uppercase mb-1 ml-1">{t('auth.emailLabel')}</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="john@example.com" />
                        </div>
                        <div className="animate-in" style={{ animationDelay: '200ms' }}>
                            <label className="block text-xs font-bold text-brand-secondary uppercase mb-1 ml-1">{t('auth.passwordLabel')}</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                        </div>
                        <button type="submit" className="w-full mt-6 py-4 rounded-xl text-white font-bold bg-brand-primary shadow-glow hover:bg-brand-primary-hover active:scale-95 transition-all duration-200 animate-in" style={{ animationDelay: '300ms' }}>
                            {isLoginView ? t('auth.login') : t('auth.createAccount')}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-8 animate-in" style={{ animationDelay: '400ms' }}>
                    <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-brand-secondary hover:text-brand-light transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-surface/5">
                        {isLoginView ? t('auth.promptSignup') : t('auth.promptLogin')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
