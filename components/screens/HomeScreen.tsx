
import React from 'react';
import { DocumentTextIcon, UserGroupIcon, CalendarIcon } from '../Icons';
import { Screen, type Task, type User } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface HomeScreenProps {
  setActiveScreen: (screen: Screen) => void;
  tasks: Task[];
  currentUser: User | null;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveScreen, tasks, currentUser }) => {
  const { t } = useLanguage();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 18) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  };

  const upcomingTasks = tasks.slice(0, 3);

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      {/* Header Section */}
      <div className="animate-in flex items-center justify-between" style={{ animationDelay: '0ms' }}>
        <div>
            <h1 className="text-4xl font-bold text-brand-light tracking-tight">{getGreeting()}</h1>
            <p className="text-brand-secondary text-lg mt-1 font-medium">{currentUser?.name || t('home.defaultParentName')}</p>
        </div>
        
        {/* Profile Circle with Hover Tooltip */}
        <div className="group relative cursor-pointer" onClick={() => setActiveScreen(Screen.Settings)}>
            <div className="w-14 h-14 rounded-full border-2 border-brand-surface-highlight bg-brand-surface-highlight overflow-hidden shadow-lg transition-transform group-hover:scale-105 group-active:scale-95">
                {currentUser?.photoUrl ? (
                    <img src={currentUser.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-brand-secondary bg-brand-surface">
                        {currentUser?.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-brand-surface-highlight border border-brand-border rounded-lg shadow-xl opacity-0 translate-y-[-5px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-md">
                <span className="text-xs font-bold text-brand-light">{t('nav.settings')}</span>
                {/* Little triangle pointer */}
                <div className="absolute bottom-full right-4 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-brand-surface-highlight"></div>
            </div>
        </div>
      </div>

      {/* Deadlines Widget */}
      <div className="animate-in" style={{ animationDelay: '100ms' }}>
        <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-xl font-bold text-brand-light tracking-wide">{t('home.upcomingDeadlines')}</h2>
            <button onClick={() => setActiveScreen(Screen.Tasks)} className="text-sm font-medium text-brand-primary active:opacity-60 transition-opacity">
                {t('home.view')}
            </button>
        </div>
        
        {upcomingTasks.length > 0 ? (
          <div className="space-y-3">
            {upcomingTasks.map((task, idx) => {
              const isPastDue = new Date(task.dueDate) < new Date();
              return (
                <div 
                    key={task.id} 
                    onClick={() => setActiveScreen(Screen.Tasks)}
                    className={`glass-panel p-4 rounded-2xl flex justify-between items-center active:scale-95 transition-transform duration-200 cursor-pointer ${isPastDue ? 'border-brand-danger/30 bg-brand-danger/5' : ''}`}
                    style={{ animationDelay: `${150 + idx * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${isPastDue ? 'bg-brand-danger' : 'bg-brand-primary'}`}></div>
                      <div>
                        <p className="font-semibold text-brand-light text-base">{task.title}</p>
                        <p className={`text-sm ${isPastDue ? 'text-brand-danger font-medium' : 'text-brand-secondary'}`}>
                            {new Date(task.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            {isPastDue && ` • ${t('tasks.pastDue')}`}
                        </p>
                      </div>
                  </div>
                  <div className="text-brand-secondary/50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-3xl text-center">
            <div className="w-16 h-16 bg-brand-surface-highlight rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary">
                <CalendarIcon />
            </div>
            <p className="text-brand-secondary font-medium">{t('home.noDeadlines')}</p>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xl font-bold text-brand-light tracking-wide mb-4 px-1">{t('nav.home')}</h2>
        <div className="grid grid-cols-2 gap-4 animate-in" style={{ animationDelay: '200ms' }}>
            <ActionButton
            icon={<DocumentTextIcon />}
            title={t('home.scanForm')}
            color="bg-brand-primary"
            onClick={() => setActiveScreen(Screen.Forms)}
            delay={0}
            />
            <ActionButton
            icon={<UserGroupIcon />}
            title={t('home.kidProfiles')}
            color="bg-purple-500"
            onClick={() => setActiveScreen(Screen.Kids)}
            delay={100}
            />
            <ActionButton
            icon={<CalendarIcon />}
            title={t('home.tasksDeadlines')}
            color="bg-orange-500"
            onClick={() => setActiveScreen(Screen.Tasks)}
            delay={200}
            fullWidth
            />
        </div>
      </div>
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  title: string;
  color: string;
  onClick: () => void;
  fullWidth?: boolean;
  delay: number;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, color, onClick, fullWidth, delay }) => (
  <button
    onClick={onClick}
    className={`glass-panel p-5 rounded-3xl text-left active:scale-95 transition-all duration-200 group relative overflow-hidden ${fullWidth ? 'col-span-2 flex items-center gap-4' : 'flex flex-col justify-between h-32'}`}
    style={{ animationDelay: `${200 + delay}ms` }}
  >
    {/* Gradient Background Glow */}
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20 blur-2xl ${color}`}></div>

    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${color} ${fullWidth ? 'mb-0' : 'mb-3'}`}>
        {icon}
    </div>
    <span className="text-lg font-bold text-brand-light z-10">{title}</span>
  </button>
);

export default HomeScreen;
