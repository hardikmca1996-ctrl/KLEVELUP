import React, { useEffect, useState } from 'react';
import { supabase, isDemoMode } from '../../lib/supabase';
import { Users, UserSquare2, BookOpen, Calendar, GraduationCap, TrendingUp, School, RefreshCw, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    classes: 0,
    subjects: 0,
    lectures: 0,
    exams: 0,
    announcements: 0
  });
  const [loading, setLoading] = useState(true);

  const handleResetDemoData = () => {
    if (window.confirm('This will clear all your local changes and reset the app to its default state. Continue?')) {
      localStorage.removeItem('klevlup_mock_data');
      window.location.reload();
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to changes for real-time updates
    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lectures' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchStats() {
    try {
      const [
        teachersRes,
        studentsRes,
        classesRes,
        subjectsRes,
        lecturesRes,
        examsRes,
        announcementsRes
      ] = await Promise.all([
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('lectures').select('*', { count: 'exact', head: true }),
        supabase.from('exams').select('*', { count: 'exact', head: true }),
        supabase.from('announcements').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        teachers: teachersRes.count || 0,
        students: studentsRes.count || 0,
        classes: classesRes.count || 0,
        subjects: subjectsRes.count || 0,
        lectures: lecturesRes.count || 0,
        exams: examsRes.count || 0,
        announcements: announcementsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Total Teachers', value: stats.teachers, icon: UserSquare2, color: 'bg-blue-500' },
    { label: 'Total Students', value: stats.students, icon: Users, color: 'bg-green-500' },
    { label: 'Total Classes', value: stats.classes, icon: School, color: 'bg-indigo-500' },
    { label: 'Subjects', value: stats.subjects, icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Scheduled Lectures', value: stats.lectures, icon: Calendar, color: 'bg-orange-500' },
    { label: 'Upcoming Exams', value: stats.exams, icon: GraduationCap, color: 'bg-red-500' },
    { label: 'Announcements', value: stats.announcements, icon: Bell, color: 'bg-yellow-500' },
  ];

  const chartData = [
    { name: 'Mon', lectures: 4 },
    { name: 'Tue', lectures: 6 },
    { name: 'Wed', lectures: 5 },
    { name: 'Thu', lectures: 8 },
    { name: 'Fri', lectures: 7 },
    { name: 'Sat', lectures: 3 },
  ];

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded-xl"></div>
    </div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening in your tuition center.</p>
        </div>
        {isDemoMode && (
          <button
            onClick={handleResetDemoData}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Demo Data
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} p-2 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Lectures This Week</h3>
          <div className="w-full relative min-h-[300px]">
            <ResponsiveContainer width="100%" aspect={2} minWidth={0} minHeight={0}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="lectures" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Student Enrollment Trend</h3>
          <div className="w-full relative min-h-[300px]">
            <ResponsiveContainer width="100%" aspect={2} minWidth={0} minHeight={0}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="lectures" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
