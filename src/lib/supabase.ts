import { createClient } from '@supabase/supabase-js';
import { mockSupabase } from './mockSupabase';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  must_change_password: boolean;
  password_changed_at?: string;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  subject_id: string;
  created_at: string;
  student?: Student;
  subject?: Subject;
}

export interface Teacher {
  id: string;
  profile_id: string;
  qualification: string;
  class_id?: string;
  profile?: Profile;
  subjects?: Subject[];
}

export interface Student {
  id: string;
  profile_id: string;
  class: string;
  class_id?: string;
  phone: string;
  profile?: Profile;
}

export interface Subject {
  id: string;
  name: string;
  teacher_id: string;
  class_id?: string;
  teacher?: Teacher;
  class?: Class;
}

export interface Lecture {
  id: string;
  subject_id: string;
  teacher_id: string;
  date: string;
  time: string;
  subject?: Subject;
  teacher?: Teacher;
}

export interface Attendance {
  id: string;
  student_id: string;
  lecture_id: string;
  status: 'present' | 'absent';
  student?: Student;
  lecture?: Lecture;
}

export interface Exam {
  id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  date: string;
  total_marks: number;
  pdf_url?: string;
  subject?: Subject;
}

export interface Result {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained: number;
  exam?: Exam;
  student?: Student;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zikxfinrnxsmwhtnsxgx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detect if a Stripe key is being used instead of a Supabase key
const isStripeKey = supabaseAnonKey?.startsWith('sb_publishable_');

// Use mock client if key is missing or invalid
export const isDemoMode = !supabaseAnonKey || isStripeKey;

if (isDemoMode) {
  console.warn(
    '⚠️ DEMO MODE: Supabase API Key is missing or invalid.' +
    (isStripeKey ? ' You are using a STRIPE key instead of a SUPABASE key.' : '') +
    ' The app is running with a mock backend. Please set VITE_SUPABASE_ANON_KEY in your AI Studio settings for real data.'
  );
}

export const supabase = isDemoMode 
  ? (mockSupabase as any) 
  : createClient(supabaseUrl, supabaseAnonKey!);

