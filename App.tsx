import React, { useState, useEffect, useCallback } from 'react';
import { HomeIcon, DocumentTextIcon, UserGroupIcon, CalendarIcon, Cog6ToothIcon } from './components/Icons';
import BottomNav from './components/BottomNav';
import HomeScreen from './components/screens/HomeScreen';
import KidsScreen from './components/screens/KidsScreen';
import FormsScreen from './components/screens/FormsScreen';
import TasksScreen from './components/screens/TasksScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import AuthScreen from './components/screens/AuthScreen';
import type { KidProfile, Form, Task, User } from './types';
import { Screen } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const { language, t } = useLanguage();
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.Home);
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('formbot-currentUser');
      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);

        const storedKids = localStorage.getItem(`formbot-kids-${user.id}`);
        if (storedKids) setKids(JSON.parse(storedKids));
  
        const storedForms = localStorage.getItem(`formbot-forms-${user.id}`);
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
                    status: form.status || 'pending',
                    updatedAt: form.updatedAt || form.createdAt,
                };
            });
            setForms(formsWithDefaults);
        }
      }
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
    }
  }, [language]); // Depends on language to correctly normalize legacy data

  useEffect(() => {
    if (isLoggedIn && currentUser) {
        localStorage.setItem(`formbot-kids-${currentUser.id}`, JSON.stringify(kids));
    }
  }, [kids, isLoggedIn, currentUser]);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
        localStorage.setItem(`formbot-forms-${currentUser.id}`, JSON.stringify(forms));
    }
    const newTasks = forms
      .filter(form => form.dueDate && form.status === 'pending')
      .map(form => ({
        id: form.id,
        title: form.formName,
        dueDate: form.dueDate,
        formId: form.id,
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    setTasks(newTasks);
  }, [forms, kids, isLoggedIn, currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('formbot-currentUser', JSON.stringify(user));
    const storedKids = localStorage.getItem(`formbot-kids-${user.id}`);
    if (storedKids) setKids(JSON.parse(storedKids));
    const storedForms = localStorage.getItem(`formbot-forms-${user.id}`);
    if (storedForms) setForms(JSON.parse(storedForms));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setKids([]);
    setForms([]);
    setTasks([]);
    setActiveScreen(Screen.Home);
    localStorage.removeItem('formbot-currentUser');
  };
  
  const renderScreen = useCallback(() => {
    switch (activeScreen) {
      case Screen.Kids:
        return <KidsScreen kids={kids} setKids={setKids} />;
      case Screen.Forms:
        return <FormsScreen forms={forms} setForms={setForms} kids={kids} />;
      case Screen.Tasks:
        return <TasksScreen tasks={tasks} forms={forms} kids={kids} setForms={setForms} />;
      case Screen.Settings:
        return <SettingsScreen currentUser={currentUser} onLogout={handleLogout} />;
      case Screen.Home:
      default:
        return <HomeScreen setActiveScreen={setActiveScreen} tasks={tasks} currentUser={currentUser} />;
    }
  }, [activeScreen, kids, forms, tasks, currentUser]);

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
    <div className="min-h-screen bg-brand-dark text-brand-light flex flex-col font-sans">
      <main className="flex-grow container mx-auto px-4 py-8 pb-24">
        {renderScreen()}
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
