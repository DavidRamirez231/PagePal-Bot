
export interface User {
    id: string;
    name: string;
    email: string;
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
  status: 'pending' | 'completed' | 'deleted';
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