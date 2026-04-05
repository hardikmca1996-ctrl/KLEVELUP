import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  FileSpreadsheet, 
  GraduationCap,
  School,
  LogOut,
  Key,
  FileText,
  Bell,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth();

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/teachers', icon: UserSquare2, label: 'Teachers' },
    { to: '/admin/students', icon: Users, label: 'Students' },
    { to: '/admin/classes', icon: School, label: 'Classes' },
    { to: '/admin/subjects', icon: BookOpen, label: 'Subjects' },
    { to: '/admin/lectures', icon: Calendar, label: 'Lectures' },
    { to: '/admin/exams', icon: GraduationCap, label: 'Exams' },
    { to: '/admin/results', icon: FileSpreadsheet, label: 'Results' },
    { to: '/admin/notes', icon: FileText, label: 'Notes' },
    { to: '/admin/announcements', icon: Bell, label: 'Announcements' },
  ];

  const teacherLinks = [
    { to: '/teacher', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/teacher/lectures', icon: Calendar, label: 'Lectures' },
    { to: '/teacher/attendance', icon: CheckSquare, label: 'Attendance' },
    { to: '/teacher/exams', icon: GraduationCap, label: 'Exams' },
    { to: '/teacher/results', icon: FileSpreadsheet, label: 'Upload Marks' },
    { to: '/teacher/notes', icon: FileText, label: 'Notes' },
    { to: '/teacher/announcements', icon: Bell, label: 'Announcements' },
  ];

  const studentLinks = [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/subjects', icon: BookOpen, label: 'Subjects' },
    { to: '/student/lectures', icon: Calendar, label: 'Lectures' },
    { to: '/student/attendance', icon: CheckSquare, label: 'Attendance' },
    { to: '/student/exams', icon: GraduationCap, label: 'Exams' },
    { to: '/student/results', icon: FileSpreadsheet, label: 'Results' },
    { to: '/student/notes', icon: FileText, label: 'Notes' },
    { to: '/student/announcements', icon: Bell, label: 'Announcements' },
    { to: '/student/delete-account', icon: Trash2, label: 'Delete Account' },
  ];

  const links = profile?.role === 'admin' 
    ? adminLinks 
    : profile?.role === 'teacher' 
    ? teacherLinks 
    : studentLinks;

  return (
    <aside className="w-full bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
          <BookOpen className="w-8 h-8" />
          KLEVELUP
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
          {profile?.role} Portal
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )
            }
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
            {profile?.name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile?.name}</p>
            <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
          </div>
        </div>
        <NavLink
          to="/change-password"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )
          }
        >
          <Key className="w-5 h-5" />
          Change Password
        </NavLink>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
