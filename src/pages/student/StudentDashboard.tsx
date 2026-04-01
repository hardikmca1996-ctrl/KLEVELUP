import React, { useEffect, useState } from 'react';
import { supabase, type Lecture, type Result, type Exam } from '../../lib/supabase';
import { BookOpen, Calendar, GraduationCap, CheckSquare, TrendingUp, Clock, Bell, Megaphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatTime } from '../../lib/utils';
import { format } from 'date-fns';
import { 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_role: string;
  author?: {
    name: string;
  };
}

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    subjects: 0,
    attendance: 0,
    avgMarks: 0,
    upcomingExams: 0
  });
  const [upcomingLectures, setUpcomingLectures] = useState<Lecture[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('profile_id', profile?.id)
        .single();
      
      if (!studentData || !studentData.class_id) {
        setLoading(false);
        return;
      }

      // Get all subjects for this class
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id')
        .eq('class_id', studentData.class_id);
      
      const subjectIds = subjectsData?.map(s => s.id) || [];

      const [subjectsRes, attendanceRes, resultsRes, examsRes, lecturesRes, announcementsRes] = await Promise.all([
        supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('class_id', studentData.class_id),
        supabase.from('attendance').select('*').eq('student_id', studentData.id),
        supabase.from('results').select('*, exam:exams(*)').eq('student_id', studentData.id),
        supabase.from('exams').select('*', { count: 'exact', head: true })
          .in('subject_id', subjectIds)
          .gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('lectures').select('*, subject:subjects(*)')
          .in('subject_id', subjectIds)
          .gte('date', new Date().toISOString().split('T')[0])
          .limit(3),
        supabase.from('announcements').select('*, author:profiles(name)')
          .or(`class_id.is.null,class_id.eq.${studentData.class_id}`)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (announcementsRes.error && !announcementsRes.error.message.includes("Could not find the table 'public.announcements'")) {
        console.error('Error fetching announcements:', announcementsRes.error);
      }

      const totalAttendance = attendanceRes.data?.length || 0;
      const presentCount = attendanceRes.data?.filter(a => a.status === 'present').length || 0;
      const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

      const totalMarks = resultsRes.data?.reduce((acc, r) => {
        const examTotal = r.exam?.total_marks || 100; // Fallback to 100 if exam or total_marks is missing
        return acc + (r.marks_obtained / examTotal) * 100;
      }, 0) || 0;
      const avgMarks = resultsRes.data?.length ? totalMarks / resultsRes.data.length : 0;

      setStats({
        subjects: subjectsRes.count || 0,
        attendance: Math.round(attendanceRate) || 0,
        avgMarks: Math.round(avgMarks) || 0,
        upcomingExams: examsRes.count || 0
      });

      setUpcomingLectures(lecturesRes.data || []);
      setRecentResults(resultsRes.data || []);
      setAnnouncements(announcementsRes.data || []);
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'My Subjects', value: stats.subjects, icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Attendance Rate', value: `${stats.attendance}%`, icon: CheckSquare, color: 'bg-green-500' },
    { label: 'Average Marks', value: `${stats.avgMarks}%`, icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Upcoming Exams', value: stats.upcomingExams, icon: GraduationCap, color: 'bg-red-500' },
  ];

  const pieData = [
    { name: 'Present', value: stats.attendance },
    { name: 'Absent', value: 100 - stats.attendance },
  ];
  const COLORS = ['#10b981', '#ef4444'];

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-80 bg-gray-200 rounded-xl"></div>
      <div className="h-80 bg-gray-200 rounded-xl"></div>
    </div>
  </div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-500">Track your progress and upcoming schedule.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center mb-4`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Announcements Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" />
          Latest Announcements
        </h3>
        {announcements.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <Megaphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No announcements at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    announcement.author_role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {announcement.author_role}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {format(new Date(announcement.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">{announcement.title}</h4>
                <p className="text-xs text-gray-600 line-clamp-3">{announcement.content}</p>
                <p className="text-[10px] text-gray-400 mt-2 italic">— {announcement.author?.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Upcoming Lectures
          </h3>
          <div className="space-y-4">
            {upcomingLectures.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming lectures scheduled.</p>
            ) : (
              upcomingLectures.map((lecture) => (
                <div key={lecture.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-bold text-gray-900">{lecture.subject?.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(lecture.time)} • {formatDate(lecture.date)}
                    </p>
                  </div>
                  <div className="bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase px-2 py-1 rounded">
                    Live
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-green-600" />
            Attendance Overview
          </h3>
          <div className="h-64 w-full relative flex items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" aspect={1} minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.attendance}%</p>
              <p className="text-xs text-gray-500 uppercase font-bold">Present</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
