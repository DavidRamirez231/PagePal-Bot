
export interface User {
    id: string;
    name: string;
    email: string;
    photoUrl?: string;
}

export interface KidProfile {
  id: string;
  name: string;
  grade: string;
  allergies: string;
  medications: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  doctorName: string;
  doctorPhone: string;
  teacherName: string;
  photoUrl?: string;
}

export interface FormField {
  label: string;
  value: string;
}

export interface Form {
  id: string;
  kidId: string;
  formName: string;
  dueDate: string;
  imageDataUrl: string;
  filledFields: FormField[];
  createdAt: string;
  category: string;
  summary: string;
  actionItems?: string[];
  keyDates?: string[];
  status: 'pending' | 'completed' | 'deleted';
  updatedAt: string;
}

export interface ProcessedEmail {
  id: string;
  kidId: string;
  originalContent: string;
  label: string;
  summary: string;
  actionItems?: string[];
  dueDate?: string;
  createdAt: string;
  status: 'active' | 'deleted';
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  formId: string;
}

export enum Screen {
    Home = 'Home',
    Forms = 'Forms',
    Kids = 'Kids',
    Tasks = 'Tasks',
    Settings = 'Settings'
}
