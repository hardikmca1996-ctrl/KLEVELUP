import { Profile, Teacher, Student, Subject, Lecture, Attendance, Exam, Result } from './supabase';

export const mockProfiles: Profile[] = [
  { id: 'admin-1', name: 'Admin User', email: 'admin@tuition.com', role: 'admin', must_change_password: false, created_at: new Date().toISOString() },
  { id: 'teacher-1', name: 'John Doe', email: 'john@teacher.com', role: 'teacher', must_change_password: false, created_at: new Date().toISOString() },
  { id: 'student-1', name: 'Jane Smith', email: 'jane@student.com', role: 'student', must_change_password: false, created_at: new Date().toISOString() },
];

export const mockTeachers: Teacher[] = [
  { id: 't-1', profile_id: 'teacher-1', qualification: 'M.Sc Physics', profile: mockProfiles[1] },
];

export const mockStudents: Student[] = [
  { id: 's-1', profile_id: 'student-1', class: 'Class 10-A', class_id: 'c-1', phone: '1234567890', profile: mockProfiles[2] },
];

export const mockSubjects: Subject[] = [
  { id: 'sub-1', name: 'Physics', teacher_id: 't-1', class_id: 'c-1', teacher: mockTeachers[0] },
];

export const mockLectures: Lecture[] = [
  { id: 'l-1', subject_id: 'sub-1', teacher_id: 't-1', date: new Date().toISOString().split('T')[0], time: '10:00', subject: mockSubjects[0], teacher: mockTeachers[0] },
];

export const mockAttendance: Attendance[] = [
  { id: 'a-1', student_id: 's-1', lecture_id: 'l-1', status: 'present', student: mockStudents[0], lecture: mockLectures[0] },
];

export const mockExams: Exam[] = [
  { id: 'e-1', subject_id: 'sub-1', teacher_id: 't-1', title: 'Midterm Exam', date: new Date().toISOString().split('T')[0], total_marks: 100, subject: mockSubjects[0] },
];

export const mockResults: Result[] = [
  { id: 'r-1', exam_id: 'e-1', student_id: 's-1', marks_obtained: 85, exam: mockExams[0], student: mockStudents[0] },
];

export const mockClasses = [
  { id: 'c-1', name: 'Class 10-A', grade: '10th', created_at: new Date().toISOString() },
  { id: 'c-2', name: 'Class 12-B', grade: '12th', created_at: new Date().toISOString() },
];

export const mockEnrollments = [
  { id: 'en-1', student_id: 's-1', subject_id: 'sub-1', created_at: new Date().toISOString(), student: mockStudents[0], subject: mockSubjects[0] },
];
