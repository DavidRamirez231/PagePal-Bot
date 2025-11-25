
import React, { useState, useEffect, useCallback } from 'react';
import { HomeIcon, DocumentTextIcon, UserGroupIcon, CalendarIcon, Cog6ToothIcon } from './components/Icons';
import BottomNav from './components/BottomNav';
import HomeScreen from './components/screens/HomeScreen';
import KidsScreen from './components/screens/KidsScreen';
import FormsScreen from './components/screens/FormsScreen';
import TasksScreen from './components/screens/TasksScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import AuthScreen from './components/screens/AuthScreen';
import type { KidProfile, Form, Task, User, ProcessedEmail } from './types';
import { Screen } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const { language, t } = useLanguage();
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.Home);
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [emails, setEmails] = useState<ProcessedEmail[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('pagepal-currentUser');
      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);

        const storedKids = localStorage.getItem(`pagepal-kids-${user.id}`);
        if (storedKids) setKids(JSON.parse(storedKids));
  
        const storedForms = localStorage.getItem(`pagepal-forms-${user.id}`);
        if (storedForms) {
            const parsedForms: any[] = JSON.parse(storedForms);
            const formsWithDefaults = parsedForms.map(form => {
                const finalSummary = (typeof form.summary === 'object' && form.summary !== null)
                    ? form.summary[language] || form.summary.en
                    : form.summary || 'No summary available.';

                return {
                    ...form,
                    category: form.category || 'Other',
                    summary: finalSummary,
                    actionItems: form.actionItems || [],
                    keyDates: form.keyDates || [],
                    status: form.status || 'pending',
                    updatedAt: form.updatedAt || form.createdAt,
                };
            });
            setForms(formsWithDefaults);
        }

        const storedEmails = localStorage.getItem(`pagepal-emails-${user.id}`);
        if (storedEmails) setEmails(JSON.parse(storedEmails));
      }
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
    }
  }, [language]); 

  useEffect(() => {
    if (isLoggedIn && currentUser) {
        localStorage.setItem(`pagepal-kids-${currentUser.id}`, JSON.stringify(kids));
    }
  }, [kids, isLoggedIn, currentUser]);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
        localStorage.setItem(`pagepal-emails-${currentUser.id}`, JSON.stringify(emails));
    }
  }, [emails, isLoggedIn, currentUser]);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
        localStorage.setItem(`pagepal-forms-${currentUser.id}`, JSON.stringify(forms));
    }
    const formTasks = forms
      .filter(form => form.dueDate && form.status === 'pending')
      .map(form => ({
        id: `form-${form.id}`,
        title: form.formName,
        dueDate: form.dueDate,
        formId: form.id,
      }));

    const emailTasks = emails
      .filter(email => email.dueDate && email.status === 'active')
      .map(email => ({
          id: `email-${email.id}`,
          title: email.label,
          dueDate: email.dueDate!,
          formId: email.id,
      }));

    const allTasks = [...formTasks, ...emailTasks]
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    setTasks(allTasks);
  }, [forms, emails, isLoggedIn, currentUser]);

  // Notification Logic
  useEffect(() => {
    if (!isLoggedIn || tasks.length === 0 || !("Notification" in window)) return;

    const checkNotifications = () => {
      const hasNotifiedSession = sessionStorage.getItem('pagepal-notified-session');
      if (hasNotifiedSession) return;

      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingTasks = tasks.filter(t => {
        const d = new Date(t.dueDate);
        return d > now && d < in24Hours;
      });

      if (upcomingTasks.length > 0) {
        if (Notification.permission === "granted") {
          new Notification("PagePal Reminder", {
            body: `You have ${upcomingTasks.length} task${upcomingTasks.length > 1 ? 's' : ''} due within the next 24 hours.`,
            icon: '/vite.svg'
          });
          sessionStorage.setItem('pagepal-notified-session', 'true');
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              new Notification("PagePal Reminder", {
                body: `You have ${upcomingTasks.length} task${upcomingTasks.length > 1 ? 's' : ''} due within the next 24 hours.`,
                icon: '/vite.svg'
              });
              sessionStorage.setItem('pagepal-notified-session', 'true');
            }
          });
        }
      }
    };

    checkNotifications();
  }, [tasks, isLoggedIn]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('pagepal-currentUser', JSON.stringify(user));
    const storedKids = localStorage.getItem(`pagepal-kids-${user.id}`);
    if (storedKids) setKids(JSON.parse(storedKids));
    const storedForms = localStorage.getItem(`pagepal-forms-${user.id}`);
    if (storedForms) setForms(JSON.parse(storedForms));
    const storedEmails = localStorage.getItem(`pagepal-emails-${user.id}`);
    if (storedEmails) setEmails(JSON.parse(storedEmails));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setKids([]);
    setForms([]);
    setEmails([]);
    setTasks([]);
    setActiveScreen(Screen.Home);
    localStorage.removeItem('pagepal-currentUser');
    sessionStorage.removeItem('pagepal-notified-session');
  };
  
  const renderScreen = useCallback(() => {
    switch (activeScreen) {
      case Screen.Kids:
        return <KidsScreen kids={kids} setKids={setKids} />;
      case Screen.Forms:
        return <FormsScreen forms={forms} setForms={setForms} kids={kids} emails={emails} setEmails={setEmails} />;
      case Screen.Tasks:
        return <TasksScreen tasks={tasks} forms={forms} kids={kids} setForms={setForms} emails={emails} setEmails={setEmails} />;
      case Screen.Settings:
        return <SettingsScreen currentUser={currentUser} onLogout={handleLogout} />;
      case Screen.Home:
      default:
        return <HomeScreen setActiveScreen={setActiveScreen} tasks={tasks} currentUser={currentUser} />;
    }
  }, [activeScreen, kids, forms, tasks, currentUser, emails]);

  const navItems = [
    { id: Screen.Home, label: t('nav.home'), icon: <HomeIcon /> },
    { id: Screen.Forms, label: t('nav.forms'), icon: <DocumentTextIcon /> },
    { id: Screen.Kids, label: t('nav.kids'), icon: <UserGroupIcon /> },
    { id: Screen.Tasks, label: t('nav.tasks'), icon: <CalendarIcon /> },
    { id: Screen.Settings, label: t('nav.settings'), icon: <Cog6ToothIcon /> },
  ];

  if (!isLoggedIn) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-full bg-brand-dark text-brand-light flex flex-col font-sans">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 pt-safe-top px-4">
             {/* Keyed div triggers React reconciliation and CSS animation on change */}
            <div key={activeScreen} className="animate-fade-scale origin-center py-6">
                {renderScreen()}
            </div>
        </main>

        <BottomNav
            items={navItems}
            activeScreen={activeScreen}
            setActiveScreen={setActiveScreen}
        />
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;
