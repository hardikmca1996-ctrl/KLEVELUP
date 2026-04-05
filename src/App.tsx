import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherManagement from './pages/admin/TeacherManagement';
import StudentManagement from './pages/admin/StudentManagement';
import SubjectManagement from './pages/admin/SubjectManagement';
import ClassManagement from './pages/admin/ClassManagement';
import LectureManagement from './pages/shared/LectureManagement';
import ExamManagement from './pages/shared/ExamManagement';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import AttendanceManagement from './pages/teacher/AttendanceManagement';
import ResultManagement from './pages/teacher/ResultManagement';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentResults from './pages/student/StudentResults';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentNotes from './pages/student/StudentNotes';
import NotesManagement from './pages/shared/NotesManagement';
import AnnouncementManagement from './pages/shared/AnnouncementManagement';
import ChangePassword from './pages/shared/ChangePassword';
import PrivacyPolicy from './pages/PrivacyPolicy';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/teachers" element={<TeacherManagement />} />
              <Route path="/admin/students" element={<StudentManagement />} />
              <Route path="/admin/classes" element={<ClassManagement />} />
              <Route path="/admin/subjects" element={<SubjectManagement />} />
              <Route path="/admin/lectures" element={<LectureManagement />} />
              <Route path="/admin/exams" element={<ExamManagement />} />
              <Route path="/admin/results" element={<ResultManagement />} />
              <Route path="/admin/notes" element={<NotesManagement />} />
              <Route path="/admin/announcements" element={<AnnouncementManagement />} />
            </Route>
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/subjects" element={<SubjectManagement />} />
              <Route path="/teacher/lectures" element={<LectureManagement />} />
              <Route path="/teacher/attendance" element={<AttendanceManagement />} />
              <Route path="/teacher/exams" element={<ExamManagement />} />
              <Route path="/teacher/results" element={<ResultManagement />} />
              <Route path="/teacher/notes" element={<NotesManagement />} />
              <Route path="/teacher/announcements" element={<AnnouncementManagement />} />
            </Route>
          </Route>

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/subjects" element={<SubjectManagement />} />
              <Route path="/student/lectures" element={<LectureManagement />} />
              <Route path="/student/attendance" element={<StudentAttendance />} />
              <Route path="/student/exams" element={<ExamManagement />} />
              <Route path="/student/results" element={<StudentResults />} />
              <Route path="/student/notes" element={<StudentNotes />} />
              <Route path="/student/announcements" element={<AnnouncementManagement />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/unauthorized" element={<div className="flex items-center justify-center min-h-screen">Unauthorized Access</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
