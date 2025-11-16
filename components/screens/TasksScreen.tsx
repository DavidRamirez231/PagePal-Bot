
import React, { useState } from 'react';
import type { Task, Form, KidProfile, ProcessedEmail } from '../../types';
import { CheckCircleIcon, TrashIcon, EnvelopeIcon } from '../Icons';
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
  const { t } = useLanguage();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
    confirmText?: string;
    confirmColor?: string;
  }>({ isOpen: false, title: '', message: '', action: null });

  const getTaskDetails = (task: Task) => {
    if (task.id.startsWith('form-')) {
        const form = forms.find(f => f.id === task.formId);
        const kid = kids.find(k => k.id === form?.kidId);
        return { source: form, kid, type: 'form' as const };
    } else if (task.id.startsWith('email-')) {
        const email = emails.find(e => e.id === task.formId);
        const kid = kids.find(k => k.id === email?.kidId);
        return { source: email, kid, type: 'email' as const };
    }
    return { source: null, kid: null, type: null };
  };

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

  const openCompleteModal = (taskId: string) => {
    setModalState({
        isOpen: true,
        title: t('tasks.completeModalTitle'),
        message: t('tasks.completeModalMessage'),
        action: () => handleCompleteTask(taskId),
        confirmText: t('tasks.completeButton'),
        confirmColor: 'bg-brand-primary hover:bg-brand-primary-hover'
    });
  };
  
  const openDeleteModal = (taskId: string) => {
    setModalState({
        isOpen: true,
        title: t('tasks.deleteModalTitle'),
        message: t('tasks.deleteModalMessage'),
        action: () => handleDeleteTask(taskId),
        confirmText: t('tasks.deleteButton'),
        confirmColor: 'bg-red-600 hover:bg-red-700'
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTasks = tasks.filter(t => new Date(t.dueDate) >= today);
  const pastDueTasks = tasks.filter(t => new Date(t.dueDate) < today);

  const TaskItem: React.FC<{ task: Task, isPastDue?: boolean }> = ({ task, isPastDue = false }) => {
    const { source, kid, type } = getTaskDetails(task);
    if (!source || !kid) return null;

    const dueDate = new Date(task.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let urgencyColor = 'text-green-400';
    if (diffDays <= 7) urgencyColor = 'text-yellow-400';
    if (diffDays <= 2) urgencyColor = 'text-red-400';
    if (isPastDue) urgencyColor = 'text-red-400';
    
    const summaryText = type === 'form' ? (source as Form).summary : (source as ProcessedEmail).summary;

    return (
        <div className={`bg-brand-surface p-4 rounded-lg border ${isPastDue ? 'border-red-800 opacity-90' : 'border-brand-border'}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {type === 'form' ? (
                    <img src={(source as Form).imageDataUrl} alt="Form thumbnail" className="w-12 h-12 object-cover rounded-md flex-shrink-0"/>
                  ) : (
                    <div className="w-12 h-12 bg-brand-dark rounded-md flex-shrink-0 flex items-center justify-center">
                        <div className="w-6 h-6 text-brand-secondary"><EnvelopeIcon /></div>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-light truncate">{task.title}</p>
                    <p className="text-sm text-brand-secondary">{t('tasks.for')} {kid?.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                    <p className={`font-semibold ${urgencyColor}`}>{dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    {isPastDue ? (
                        <p className={`text-sm ${urgencyColor}`}>{t('tasks.wasDue')}</p>
                    ) : (
                        <p className={`text-sm ${urgencyColor}`}>
                            {diffDays === 0 ? t('tasks.today') : diffDays === 1 ? t('tasks.tomorrow') : t('tasks.inDays', { days: diffDays.toString() })}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex justify-end items-center gap-2 border-t border-brand-border/80 mt-3 pt-3">
                <button onClick={() => openCompleteModal(task.id)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-green-400 hover:bg-green-500/10 transition-colors">
                    <div className="w-5 h-5"><CheckCircleIcon /></div>
                    <span>{t('tasks.completeButton')}</span>
                </button>
                <button onClick={() => openDeleteModal(task.id)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-red-500 hover:bg-red-500/10 transition-colors">
                    <div className="w-5 h-5"><TrashIcon /></div>
                    <span>{t('tasks.deleteButton')}</span>
                </button>
            </div>
        </div>
    );
  };


  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
        <p className="text-brand-secondary mt-1">{t('tasks.subtitle')}</p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-brand-primary mb-4 pb-2 border-b-2 border-brand-border">{t('tasks.upcoming')}</h2>
          {upcomingTasks.length > 0 ? (
            <div className="space-y-4">
              {upcomingTasks.map(task => <TaskItem key={task.id} task={task} />)}
            </div>
          ) : (
            <p className="text-brand-secondary">{t('tasks.noUpcoming')}</p>
          )}
        </div>

        {pastDueTasks.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-red-500 mb-4 pb-2 border-b-2 border-brand-border">{t('tasks.pastDue')}</h2>
            <div className="space-y-4">
              {pastDueTasks.map(task => <TaskItem key={task.id} task={task} isPastDue />)}
            </div>
          </div>
        )}
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