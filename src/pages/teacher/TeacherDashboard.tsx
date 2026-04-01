import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Calendar, GraduationCap, Users, Clock, CheckCircle, Bell } from 'lucide-react';
import { formatDate, formatTime } from '../../lib/utils';
import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    subjects: 0,
    lectures: 0,
    exams: 0,
    students: 0,
    announcements: 0
  });
  const [upcomingLectures, setUpcomingLectures] = useState<any[]>([]);
  const [mySubjects, setMySubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchTeacherStats();
  }, [profile]);

  async function fetchTeacherStats() {
    try {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!teacherData) return;

      const [
        { count: subjectsCount },
        { count: lecturesCount },
        { count: examsCount },
        announcementsRes,
        mySubjectsRes,
        upcomingLecturesRes
      ] = await Promise.all([
        supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('teacher_id', teacherData.id),
        supabase.from('lectures').select('*', { count: 'exact', head: true }).eq('teacher_id', teacherData.id),
        supabase.from('exams').select('*', { count: 'exact', head: true }).eq('teacher_id', teacherData.id),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('author_id', profile?.id),
        supabase.from('subjects')
          .select('*, class:classes(name)')
          .eq('teacher_id', teacherData.id),
        supabase.from('lectures')
          .select('*, subject:subjects(name, class:classes(name))')
          .eq('teacher_id', teacherData.id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .order('time', { ascending: true })
          .limit(3)
      ]);

      setStats({
        subjects: subjectsCount || 0,
        lectures: lecturesCount || 0,
        exams: examsCount || 0,
        students: 0,
        announcements: announcementsRes.count || 0
      });
      setMySubjects(mySubjectsRes.data || []);
      setUpcomingLectures(upcomingLecturesRes.data || []);
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'My Subjects', value: stats.subjects, icon: BookOpen, color: 'bg-indigo-500', link: '/teacher/subjects' },
    { label: 'Total Lectures', value: stats.lectures, icon: Calendar, color: 'bg-blue-500', link: '/teacher/lectures' },
    { label: 'Total Exams', value: stats.exams, icon: GraduationCap, color: 'bg-purple-500', link: '/teacher/exams' },
    { label: 'Announcements', value: stats.announcements, icon: Bell, color: 'bg-orange-500', link: '/teacher/announcements' },
  ];

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
    </div>
    <div className="h-64 bg-gray-200 rounded-xl"></div>
  </div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-500">Welcome back, {profile?.name}! Manage your classes and students.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <Link key={card.label} to={card.link} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} p-2 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Upcoming Lectures</h3>
            <Link to="/teacher/lectures" className="text-sm text-indigo-600 font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {upcomingLectures.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming lectures scheduled.</p>
            ) : (
              upcomingLectures.map((lecture) => (
                <div key={lecture.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <Clock className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {lecture.subject?.name}
                        {lecture.subject?.class && (
                          <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {lecture.subject.class.name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(lecture.date)} at {formatTime(lecture.time)}</p>
                    </div>
                  </div>
                  <Link 
                    to="/teacher/attendance" 
                    className="px-3 py-1 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Mark Attendance
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">My Subjects</h3>
            <Link to="/teacher/subjects" className="text-sm text-indigo-600 font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {mySubjects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No subjects assigned yet.</p>
            ) : (
              mySubjects.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{subject.name}</p>
                      <p className="text-xs text-gray-500">Class: {subject.class?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <Link 
                    to="/teacher/lectures" 
                    className="px-3 py-1 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Schedule
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/teacher/lectures" className="flex flex-col items-center justify-center p-6 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors group">
              <Calendar className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-indigo-900">Schedule Lecture</span>
            </Link>
            <Link to="/teacher/exams" className="flex flex-col items-center justify-center p-6 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group">
              <GraduationCap className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-purple-900">Create Exam</span>
            </Link>
            <Link to="/teacher/attendance" className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group">
              <CheckCircle className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-green-900">Mark Attendance</span>
            </Link>
            <Link to="/teacher/results" className="flex flex-col items-center justify-center p-6 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors group">
              <Users className="w-8 h-8 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-orange-900">Upload Marks</span>
            </Link>
            <Link to="/teacher/announcements" className="flex flex-col items-center justify-center p-6 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors group">
              <Bell className="w-8 h-8 text-yellow-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-yellow-900">Announcements</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
