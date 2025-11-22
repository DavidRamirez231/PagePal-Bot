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
    <div className="space-y-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-brand-light">{getGreeting()}, {currentUser?.name || t('home.defaultParentName')}.</h1>
        <p className="text-brand-secondary mt-1">{t('home.subtitle')}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-brand-light mb-4">{t('home.upcomingDeadlines')}</h2>
        {upcomingTasks.length > 0 ? (
          <div className="space-y-3">
            {upcomingTasks.map(task => {
              const isPastDue = new Date(task.dueDate) < new Date();
              const containerClass = isPastDue 
                ? "bg-brand-surface p-4 rounded-lg border border-red-500 flex justify-between items-center"
                : "bg-brand-surface p-4 rounded-lg border border-brand-border flex justify-between items-center";
              const dateClass = isPastDue ? "text-sm text-red-500 font-bold" : "text-sm text-brand-primary";
              const statusText = isPastDue ? ` (${t('tasks.pastDue')})` : "";

              return (
                <div key={task.id} className={containerClass}>
                  <div>
                    <p className="font-medium text-brand-light">{task.title}</p>
                    <p className={dateClass}>
                        {new Date(task.dueDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {statusText}
                    </p>
                  </div>
                  <button onClick={() => setActiveScreen(Screen.Tasks)} className="text-sm text-brand-primary hover:underline">
                    {t('home.view')}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-brand-surface rounded-lg border border-brand-border">
            <p className="text-brand-secondary">{t('home.noDeadlines')}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionButton
          icon={<DocumentTextIcon />}
          title={t('home.scanForm')}
          description={t('home.scanFormDesc')}
          onClick={() => setActiveScreen(Screen.Forms)}
        />
        <ActionButton
          icon={<UserGroupIcon />}
          title={t('home.kidProfiles')}
          description={t('home.kidProfilesDesc')}
          onClick={() => setActiveScreen(Screen.Kids)}
        />
        <ActionButton
          icon={<CalendarIcon />}
          title={t('home.tasksDeadlines')}
          description={t('home.tasksDeadlinesDesc')}
          onClick={() => setActiveScreen(Screen.Tasks)}
        />
      </div>
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="bg-brand-surface p-6 rounded-lg border border-brand-border text-left hover:border-brand-primary transition-all duration-200 transform hover:-translate-y-1"
  >
    <div className="w-10 h-10 text-brand-primary mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-brand-light">{title}</h3>
    <p className="text-brand-secondary mt-1">{description}</p>
  </button>
);

export default HomeScreen;