
import React, { useState } from 'react';
import type { Task, Form, KidProfile, ProcessedEmail, ManualTask } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ExclamationTriangleIcon, FunnelIcon, SpinnerIcon, DocumentTextIcon, EnvelopeIcon, CalendarIcon } from '../Icons';
import ConfirmationModal from '../ConfirmationModal';
import { useLanguage } from '../../contexts/LanguageContext';

interface TasksScreenProps {
  tasks: Task[];
  forms: Form[];
  kids: KidProfile[];
  emails: ProcessedEmail[];
  setForms: React.Dispatch<React.SetStateAction<Form[]>>;
  setEmails: React.Dispatch<React.SetStateAction<ProcessedEmail[]>>;
  onAddManualTask: (task: ManualTask) => void;
  onDeleteManualTask: (id: string) => void;
}

const TasksScreen: React.FC<TasksScreenProps> = ({ tasks, forms, kids, setForms, emails, setEmails, onAddManualTask, onDeleteManualTask }) => {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [filterSource, setFilterSource] = useState<'all' | 'form' | 'email' | 'manual'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'normal' | 'important' | 'urgent' | 'critical'>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Modal States
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
    confirmText?: string;
    confirmColor?: string;
  }>({ isOpen: false, title: '', message: '', action: null });

  // Event Creation Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('09:00');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventColor, setNewEventColor] = useState('blue');
  const [newEventPriority, setNewEventPriority] = useState<ManualTask['priority']>('normal');

  const colorOptions = [
      { id: 'blue', class: 'bg-blue-500', display: 'bg-blue-500/20 text-blue-500 border-blue-500/50' },
      { id: 'red', class: 'bg-red-500', display: 'bg-red-500/20 text-red-500 border-red-500/50' },
      { id: 'green', class: 'bg-emerald-500', display: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' },
      { id: 'orange', class: 'bg-orange-500', display: 'bg-orange-500/20 text-orange-500 border-orange-500/50' },
      { id: 'purple', class: 'bg-purple-500', display: 'bg-purple-500/20 text-purple-500 border-purple-500/50' },
      { id: 'pink', class: 'bg-pink-500', display: 'bg-pink-500/20 text-pink-500 border-pink-500/50' },
  ];

  const priorityOptions = ['low', 'normal', 'important', 'urgent', 'critical'] as const;

  const handleCompleteTask = (taskId: string, sourceType: string, sourceId: string) => {
    if (sourceType === 'form') {
        setForms(prevForms =>
          prevForms.map(form =>
            form.id === sourceId ? { ...form, status: 'completed', updatedAt: new Date().toISOString() } : form
          )
        );
    } else if (sourceType === 'email') {
        setEmails(prevEmails =>
          prevEmails.map(email =>
            email.id === sourceId ? { ...email, status: 'deleted', updatedAt: new Date().toISOString() } : email
          )
        );
    } else if (sourceType === 'manual') {
        onDeleteManualTask(sourceId);
    }
    setModalState({ isOpen: false, title: '', message: '', action: null });
  };

  const openTaskActionModal = (task: Task) => {
      // Determine action type based on source
      const isManual = task.sourceType === 'manual';
      
      setModalState({
        isOpen: true,
        title: task.title,
        message: isManual ? t('tasks.deleteModalMessage') : t('tasks.completeModalMessage'),
        action: () => handleCompleteTask(task.id, task.sourceType, task.sourceId),
        confirmText: isManual ? t('tasks.deleteButton') : t('tasks.completeButton'),
        confirmColor: isManual ? 'bg-brand-danger hover:bg-red-700' : 'bg-brand-primary hover:bg-brand-primary-hover'
      });
  };
  
  // Calendar Logic
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevStep = () => {
    if (viewMode === 'month') {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
        setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
    }
  };

  const nextStep = () => {
    if (viewMode === 'month') {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
        setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
    }
  };

  const getCategoryColor = (task: Task) => {
      // 1. Manual Color takes precedence if set
      if (task.sourceType === 'manual' && task.color) {
          const colorObj = colorOptions.find(c => c.id === task.color);
          if (colorObj) return `${colorObj.display} hover:opacity-80`;
      }

      // 2. Check for past due (only if not a manual task with custom color)
      const isPastDue = new Date(task.dueDate) < new Date();
      if (isPastDue && !(task.sourceType === 'manual' && task.color)) {
          return 'bg-red-600/20 text-red-500 border-red-600/50 hover:bg-red-600/30';
      }

      // 3. Category Fallbacks
      if (task.sourceType === 'email') return 'bg-purple-500/20 text-purple-500 border-purple-500/50 hover:bg-purple-500/30';
      if (task.sourceType === 'manual') return 'bg-orange-500/20 text-orange-500 border-orange-500/50 hover:bg-orange-500/30';
      
      const form = forms.find(f => f.id === task.sourceId);
      const category = form?.category || 'Other';
      
      switch(category) {
          case 'School': return 'bg-blue-500/20 text-blue-500 border-blue-500/50 hover:bg-blue-500/30';
          case 'Medical': return 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30';
          case 'Activities': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/30';
          default: return 'bg-gray-500/20 text-gray-500 border-gray-500/50 hover:bg-gray-500/30';
      }
  };

  const openAddEventModal = (dateStr?: string) => {
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventTime('09:00');
      setNewEventColor('blue');
      setNewEventPriority('normal');
      
      if (dateStr) {
          setNewEventDate(dateStr);
      } else {
          // Default to today
          const today = new Date();
          setNewEventDate(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`);
      }
      setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
      if (!newEventTitle || !newEventDate) return;
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 600));

      const dueDate = `${newEventDate}T${newEventTime}`;
      
      const newTask: ManualTask = {
          id: Date.now().toString(),
          title: newEventTitle,
          description: newEventDesc,
          dueDate: dueDate,
          createdAt: new Date().toISOString(),
          color: newEventColor,
          priority: newEventPriority
      };
      
      onAddManualTask(newTask);
      setIsSaving(false);
      setIsEventModalOpen(false);
  };

  // Filter Logic
  const filteredTasks = tasks.filter(task => {
      // Source Filter
      if (filterSource !== 'all' && task.sourceType !== filterSource) return false;
      
      // Priority Filter
      if (filterPriority !== 'all') {
          const p = task.priority || 'normal'; // Treat undefined priority as normal
          if (p !== filterPriority) return false;
      }
      return true;
  });

  const getSourceIcon = (source: string) => {
    switch(source) {
        case 'form': return <DocumentTextIcon />;
        case 'email': return <EnvelopeIcon />;
        case 'manual': return <CalendarIcon />;
        default: return <FunnelIcon />;
    }
  };

  const renderFilters = () => (
      <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-brand-secondary uppercase tracking-wider">{t('tasks.filter')}</span>
              {(filterSource !== 'all' || filterPriority !== 'all') && (
                  <button 
                    onClick={() => { setFilterSource('all'); setFilterPriority('all'); }}
                    className="text-xs text-brand-primary font-medium hover:text-brand-light transition-colors"
                  >
                      Clear All
                  </button>
              )}
          </div>

          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
               {(['all', 'form', 'email', 'manual'] as const).map(source => (
                   <button
                       key={source}
                       onClick={() => setFilterSource(source)}
                       className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border ${
                           filterSource === source 
                           ? 'bg-brand-primary text-white border-brand-primary shadow-glow scale-105' 
                           : 'bg-brand-surface-highlight border-transparent text-gray-400 hover:bg-brand-border hover:text-brand-light'
                       }`}
                   >
                       <div className="w-4 h-4">{getSourceIcon(source)}</div>
                       <span>{t(`tasks.source${source.charAt(0).toUpperCase() + source.slice(1)}`)}</span>
                   </button>
               ))}
          </div>

          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
               {(['all', 'low', 'normal', 'important', 'urgent', 'critical'] as const).map(prio => {
                   let colorClass = 'bg-gray-500';
                   if (prio === 'low') colorClass = 'bg-emerald-500';
                   if (prio === 'normal') colorClass = 'bg-blue-500';
                   if (prio === 'important') colorClass = 'bg-yellow-500';
                   if (prio === 'urgent') colorClass = 'bg-orange-500';
                   if (prio === 'critical') colorClass = 'bg-red-500';
                   
                   const isActive = filterPriority === prio;

                   return (
                       <button
                           key={prio}
                           onClick={() => setFilterPriority(prio)}
                           className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border ${
                               isActive
                               ? 'bg-brand-light text-brand-dark border-brand-light scale-105' 
                               : 'bg-brand-surface-highlight border-transparent text-gray-400 hover:bg-brand-border hover:text-brand-light'
                           }`}
                       >
                           {prio !== 'all' && <div className={`w-2.5 h-2.5 rounded-full ${colorClass} ${isActive ? 'ring-2 ring-black/20' : ''}`} />}
                           <span>{prio === 'all' ? t('tasks.priorityAll') : t(`tasks.priority${prio.charAt(0).toUpperCase() + prio.slice(1)}`)}</span>
                       </button>
                   );
               })}
          </div>
      </div>
  );

  const renderHeader = () => (
      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold capitalize text-brand-light">
                {viewMode === 'month' 
                    ? currentDate.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })
                    : currentDate.getFullYear()}
            </h2>
            <button 
                onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
                className="text-xs font-bold bg-brand-surface border border-brand-border px-2 py-1 rounded-md text-brand-secondary hover:text-brand-light transition-colors"
            >
                {viewMode === 'month' ? t('tasks.viewYear') : t('tasks.viewMonth')}
            </button>
          </div>
          <div className="flex space-x-2">
              <button onClick={() => openAddEventModal()} className="p-2 rounded-full bg-brand-primary text-white shadow-lg active:scale-95 transition-transform mr-2">
                  <div className="w-5 h-5"><PlusIcon /></div>
              </button>
              <button onClick={prevStep} className="p-2 rounded-full hover:bg-brand-surface text-brand-secondary hover:text-brand-light transition-colors">
                  <ChevronLeftIcon />
              </button>
              <button onClick={nextStep} className="p-2 rounded-full hover:bg-brand-surface text-brand-secondary hover:text-brand-light transition-colors">
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
          daysArray.push(<div key={`empty-${i}`} className="h-32 bg-brand-dark/20 border border-brand-border/30"></div>);
      }

      // Actual days
      for (let day = 1; day <= totalDays; day++) {
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const daysTasks = filteredTasks.filter(task => {
             const taskDate = new Date(task.dueDate);
             return taskDate.getDate() === day && 
                    taskDate.getMonth() === currentDate.getMonth() && 
                    taskDate.getFullYear() === currentDate.getFullYear();
          });

          daysArray.push(
              <div 
                key={day} 
                className="min-h-[8rem] bg-brand-surface border border-brand-border p-2 overflow-hidden transition-colors hover:border-brand-primary/50 relative group cursor-pointer"
                onClick={(e) => {
                    // Prevent firing if clicking on a task button
                    if ((e.target as HTMLElement).closest('button')) return;
                    openAddEventModal(dateStr);
                }}
              >
                  <span className={`inline-block w-7 h-7 text-center leading-7 rounded-full text-sm font-medium mb-1 ${
                      new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear() 
                      ? 'bg-brand-primary text-white' 
                      : 'text-brand-light'
                  }`}>
                      {day}
                  </span>
                  <div className="space-y-1.5 overflow-y-auto max-h-[6rem] scrollbar-hide">
                      {daysTasks.map(task => {
                          const kid = kids.find(k => {
                              if (task.sourceType === 'form') return forms.find(f => f.id === task.sourceId)?.kidId === k.id;
                              if (task.sourceType === 'email') return emails.find(e => e.id === task.sourceId)?.kidId === k.id;
                              return false;
                          });
                          const dateObj = new Date(task.dueDate);
                          const hasTime = task.dueDate.includes('T');
                          const timeStr = hasTime 
                              ? dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              : 'All Day';
                          
                          const isHighPriority = task.priority === 'urgent' || task.priority === 'critical';

                          return (
                              <button 
                                  key={task.id} 
                                  onClick={(e) => { e.stopPropagation(); openTaskActionModal(task); }}
                                  className={`w-full text-left px-2 py-1 rounded-lg text-xs border truncate flex items-center gap-1 shadow-sm ${getCategoryColor(task)}`}
                                  title={`${task.title} - ${kid?.name || 'Manual Event'}`}
                              >
                                  {isHighPriority && <ExclamationTriangleIcon />}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center text-[10px] opacity-80 mb-0.5">
                                        <span>{kid?.name.split(' ')[0] || 'Me'}</span>
                                        <span>{timeStr}</span>
                                    </div>
                                    <div className="font-medium truncate">{task.title}</div>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>
          );
      }

      return <div className="grid grid-cols-7 gap-1 animate-in">{daysArray}</div>;
  };

  const renderYearView = () => {
      const months = Array.from({length: 12}, (_, i) => i);
      const year = currentDate.getFullYear();
      
      return (
          <div className="grid grid-cols-3 gap-3 animate-in">
              {months.map(monthIndex => {
                  const date = new Date(year, monthIndex, 1);
                  const monthTasks = filteredTasks.filter(t => {
                      const d = new Date(t.dueDate);
                      return d.getFullYear() === year && d.getMonth() === monthIndex;
                  });
                  const hasTasks = monthTasks.length > 0;
                  
                  return (
                      <button 
                        key={monthIndex}
                        onClick={() => {
                            setCurrentDate(new Date(year, monthIndex, 1));
                            setViewMode('month');
                        }}
                        className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col items-center justify-center hover:bg-brand-surface-highlight hover:border-brand-primary/50 transition-all aspect-square active:scale-95"
                      >
                          <span className="text-lg font-bold text-brand-light mb-2">
                             {date.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short' }).toUpperCase()}
                          </span>
                          {hasTasks ? (
                              <div className="flex flex-wrap gap-1 justify-center max-w-[60%]">
                                  {monthTasks.slice(0, 5).map(t => (
                                      <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${
                                          t.priority === 'critical' ? 'bg-red-500' :
                                          t.priority === 'urgent' ? 'bg-orange-500' :
                                          t.sourceType === 'manual' ? 'bg-blue-500' : 'bg-gray-500'
                                      }`} />
                                  ))}
                                  {monthTasks.length > 5 && <div className="w-1.5 h-1.5 rounded-full bg-brand-light/50" />}
                              </div>
                          ) : (
                              <span className="text-xs text-brand-secondary">No events</span>
                          )}
                      </button>
                  );
              })}
          </div>
      );
  };

  const inputStyle = "w-full bg-brand-surface-highlight border-none text-brand-light rounded-xl p-4 placeholder-gray-500 focus:ring-2 focus:ring-brand-primary/50 transition-all outline-none";

  return (
    <div className="animate-fade-in pb-20">
      <div className="mb-6 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-brand-light">{t('tasks.calendar')}</h1>
            <p className="text-brand-secondary mt-1">{t('tasks.subtitle')}</p>
        </div>
      </div>
      
      {renderFilters()}

      <div className="bg-brand-surface-highlight/10 rounded-lg">
          {renderHeader()}
          {viewMode === 'month' ? (
              <>
                {renderDays()}
                {renderCells()}
              </>
          ) : (
              renderYearView()
          )}
      </div>

       {/* Confirmation Modal */}
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

      {/* Add Event Modal */}
      {isEventModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEventModalOpen(false)}></div>
              <div className="relative w-full max-w-md bg-brand-surface rounded-3xl p-6 shadow-2xl animate-in border border-white/10 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-2xl font-bold text-brand-light mb-6">{t('tasks.addEvent')}</h2>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-brand-secondary mb-1">{t('tasks.eventTitle')}</label>
                          <input 
                            type="text" 
                            value={newEventTitle} 
                            onChange={e => setNewEventTitle(e.target.value)} 
                            className={inputStyle}
                            placeholder="e.g. Soccer Practice"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-brand-secondary mb-1">Date</label>
                              <input 
                                type="date" 
                                value={newEventDate} 
                                onChange={e => setNewEventDate(e.target.value)} 
                                className={inputStyle}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-brand-secondary mb-1">{t('tasks.eventTime')}</label>
                              <input 
                                type="time" 
                                value={newEventTime} 
                                onChange={e => setNewEventTime(e.target.value)} 
                                className={inputStyle}
                              />
                          </div>
                      </div>
                      
                      {/* Priority Scale */}
                      <div>
                          <label className="block text-sm font-bold text-brand-secondary mb-2">{t('tasks.priority')}</label>
                          <div className="bg-brand-surface-highlight p-1 rounded-xl flex justify-between">
                              {priorityOptions.map((level) => (
                                  <button
                                    key={level}
                                    onClick={() => setNewEventPriority(level)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all duration-200 ${newEventPriority === level ? 
                                        (level === 'critical' ? 'bg-red-500 text-white shadow-lg scale-105' : 
                                         level === 'urgent' ? 'bg-orange-500 text-white shadow-lg scale-105' : 
                                         'bg-brand-primary text-white shadow-lg scale-105') 
                                        : 'text-gray-500 hover:text-brand-light'}`}
                                  >
                                      {level === 'critical' ? '!!' : level}
                                  </button>
                              ))}
                          </div>
                          <p className="text-center text-xs text-brand-primary mt-2 font-medium">
                              {t(`tasks.priority${newEventPriority.charAt(0).toUpperCase() + newEventPriority.slice(1)}`)}
                          </p>
                      </div>

                      {/* Color Picker */}
                      <div>
                          <label className="block text-sm font-bold text-brand-secondary mb-2">{t('tasks.color')}</label>
                          <div className="flex justify-between items-center bg-brand-surface-highlight p-3 rounded-xl">
                              {colorOptions.map((option) => (
                                  <button
                                    key={option.id}
                                    onClick={() => setNewEventColor(option.id)}
                                    className={`w-8 h-8 rounded-full ${option.class} transition-all duration-300 ${newEventColor === option.id ? 'ring-4 ring-brand-light/30 scale-125' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
                                  />
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-brand-secondary mb-1">{t('tasks.eventDesc')}</label>
                          <textarea 
                            value={newEventDesc} 
                            onChange={e => setNewEventDesc(e.target.value)} 
                            className={`${inputStyle} h-24`}
                            placeholder="Optional notes..."
                          />
                      </div>
                      
                      <div className="flex gap-3 mt-6">
                          <button onClick={() => setIsEventModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-brand-light bg-brand-surface-highlight hover:bg-brand-border active:scale-95 transition-all">
                              {t('confirmModal.cancel')}
                          </button>
                          <button onClick={handleSaveEvent} disabled={isSaving} className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-primary shadow-glow hover:bg-brand-primary-hover active:scale-95 transition-all flex items-center justify-center disabled:opacity-70">
                              {isSaving ? <><SpinnerIcon /> {t('tasks.saveEvent')}...</> : t('tasks.saveEvent')}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TasksScreen;
