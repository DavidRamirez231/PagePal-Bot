
import React, { useState } from 'react';
import type { Task, Form, KidProfile, ProcessedEmail } from '../../types';
import { CheckCircleIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from '../Icons';
import ConfirmationModal from '../ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';

interface TasksScreenProps {
  tasks: Task[];
  forms: Form[];
  kids: KidProfile[];
  emails: ProcessedEmail[];
  setForms: React.Dispatch<React.SetStateAction<Form[]>>;
  setEmails: React.Dispatch<React.SetStateAction<ProcessedEmail[]>>;
}

const TasksScreen: React.FC<TasksScreenProps> = ({ tasks, forms, kids, setForms, emails, setEmails }) => {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
    confirmText?: string;
    confirmColor?: string;
  }>({ isOpen: false, title: '', message: '', action: null });

  const handleCompleteTask = (taskId: string) => {
    if (taskId.startsWith('form-')) {
        const formId = taskId.replace('form-', '');
        setForms(prevForms =>
          prevForms.map(form =>
            form.id === formId ? { ...form, status: 'completed', updatedAt: new Date().toISOString() } : form
          )
        );
    } else if (taskId.startsWith('email-')) {
        const emailId = taskId.replace('email-', '');
        setEmails(prevEmails =>
          prevEmails.map(email =>
            email.id === emailId ? { ...email, status: 'deleted', updatedAt: new Date().toISOString() } : email
          )
        );
    }
    setModalState({ isOpen: false, title: '', message: '', action: null });
  };

  const handleDeleteTask = (taskId: string) => {
    if (taskId.startsWith('form-')) {
        const formId = taskId.replace('form-', '');
        setForms(prevForms => prevForms.map(form => form.id === formId ? { ...form, status: 'deleted', updatedAt: new Date().toISOString() } : form));
    } else if (taskId.startsWith('email-')) {
        const emailId = taskId.replace('email-', '');
        setEmails(prevEmails => prevEmails.map(email => email.id === emailId ? { ...email, status: 'deleted', updatedAt: new Date().toISOString() } : email));
    }
    setModalState({ isOpen: false, title: '', message: '', action: null });
  };

  const openTaskActionModal = (task: Task) => {
      setModalState({
        isOpen: true,
        title: task.title,
        message: t('tasks.completeModalMessage'), // Reusing existing message logic, or can simplify
        action: () => handleCompleteTask(task.id),
        confirmText: t('tasks.completeButton'),
        confirmColor: 'bg-brand-primary hover:bg-brand-primary-hover'
      });
  };
  
  // Calendar Logic
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getCategoryColor = (task: Task) => {
      // Check for past due
      const isPastDue = new Date(task.dueDate) < new Date();
      if (isPastDue) {
          return 'bg-red-600/20 text-red-300 border-red-600/50 hover:bg-red-600/30';
      }

      if (task.id.startsWith('email-')) return 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30';
      
      const form = forms.find(f => f.id === task.formId);
      const category = form?.category || 'Other';
      
      switch(category) {
          case 'School': return 'bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30';
          case 'Medical': return 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30';
          case 'Activities': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30';
          default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50 hover:bg-gray-500/30';
      }
  };

  const renderHeader = () => (
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold capitalize">
              {currentDate.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex space-x-2">
              <button onClick={prevMonth} className="p-2 rounded-full hover:bg-brand-surface transition-colors">
                  <ChevronLeftIcon />
              </button>
              <button onClick={nextMonth} className="p-2 rounded-full hover:bg-brand-surface transition-colors">
                  <ChevronRightIcon />
              </button>
          </div>
      </div>
  );

  const renderDays = () => {
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      return (
          <div className="grid grid-cols-7 mb-2">
              {days.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-brand-secondary uppercase py-2">
                      {t(`tasks.weekdays.${day}`)}
                  </div>
              ))}
          </div>
      );
  };

  const renderCells = () => {
      const totalDays = daysInMonth(currentDate);
      const startDay = firstDayOfMonth(currentDate);
      const daysArray = [];

      // Padding for previous month
      for (let i = 0; i < startDay; i++) {
          daysArray.push(<div key={`empty-${i}`} className="h-32 bg-brand-dark/50 border border-brand-border/30"></div>);
      }

      // Actual days
      for (let day = 1; day <= totalDays; day++) {
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const daysTasks = tasks.filter(task => {
             const taskDate = new Date(task.dueDate);
             return taskDate.getDate() === day && 
                    taskDate.getMonth() === currentDate.getMonth() && 
                    taskDate.getFullYear() === currentDate.getFullYear();
          });

          daysArray.push(
              <div key={day} className="min-h-[8rem] bg-brand-surface border border-brand-border p-2 overflow-hidden transition-colors hover:border-brand-primary/50 relative group">
                  <span className={`inline-block w-7 h-7 text-center leading-7 rounded-full text-sm font-medium mb-1 ${
                      new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear() 
                      ? 'bg-brand-primary text-brand-dark' 
                      : 'text-brand-light'
                  }`}>
                      {day}
                  </span>
                  <div className="space-y-1.5 overflow-y-auto max-h-[6rem] scrollbar-hide">
                      {daysTasks.map(task => {
                          const kid = kids.find(k => {
                              if (task.id.startsWith('form-')) return forms.find(f => f.id === task.formId)?.kidId === k.id;
                              if (task.id.startsWith('email-')) return emails.find(e => e.id === task.formId)?.kidId === k.id;
                              return false;
                          });
                          const dateObj = new Date(task.dueDate);
                          const hasTime = task.dueDate.includes('T');
                          const timeStr = hasTime 
                              ? dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              : 'All Day';

                          return (
                              <button 
                                  key={task.id} 
                                  onClick={() => openTaskActionModal(task)}
                                  className={`w-full text-left px-2 py-1 rounded text-xs border truncate block ${getCategoryColor(task)}`}
                                  title={`${task.title} - ${kid?.name}`}
                              >
                                  <div className="flex justify-between items-center text-[10px] opacity-80 mb-0.5">
                                      <span>{kid?.name.split(' ')[0]}</span>
                                      <span>{timeStr}</span>
                                  </div>
                                  <div className="font-medium truncate">{task.title}</div>
                              </button>
                          );
                      })}
                  </div>
              </div>
          );
      }

      return <div className="grid grid-cols-7 gap-1">{daysArray}</div>;
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('tasks.calendar')}</h1>
        <p className="text-brand-secondary mt-1">{t('tasks.subtitle')}</p>
      </div>

      <div className="bg-brand-dark rounded-lg">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
      </div>

       {modalState.isOpen && (
          <ConfirmationModal 
              title={modalState.title}
              message={modalState.message}
              onConfirm={modalState.action!}
              onCancel={() => setModalState({ isOpen: false, title: '', message: '', action: null })}
              confirmText={modalState.confirmText}
              confirmColor={modalState.confirmColor}
          />
      )}
    </div>
  );
};

export default TasksScreen;
