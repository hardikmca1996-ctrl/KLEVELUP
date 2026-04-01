import React, { useEffect, useState } from 'react';
import { supabase, type Lecture, type Student, type Attendance } from '../../lib/supabase';
import { CheckCircle, XCircle, Loader2, Calendar, BookOpen, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate, formatTime, cn } from '../../lib/utils';

export default function AttendanceManagement() {
  const { profile } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<string>('');
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLectures();
  }, [profile]);

  async function fetchLectures() {
    try {
      const { data: teacherData } = await supabase.from('teachers').select('id').eq('profile_id', profile?.id).single();
      if (!teacherData) return;

      const { data, error } = await supabase
        .from('lectures')
        .select('*, subject:subjects(*)')
        .eq('teacher_id', teacherData.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setLectures(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents(subjectId?: string) {
    if (!subjectId) {
      setStudents([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, student:students(*, profile:profiles(*))')
        .eq('subject_id', subjectId);
      
      if (error) throw error;
      setStudents(data?.map(e => e.student) || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function fetchExistingAttendance(lectureId: string) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('lecture_id', lectureId);

      if (error) throw error;
      
      const attendanceMap: Record<string, 'present' | 'absent'> = {};
      data?.forEach(record => {
        attendanceMap[record.student_id] = record.status as 'present' | 'absent';
      });
      setAttendance(attendanceMap);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  const handleLectureChange = (lectureId: string) => {
    setSelectedLecture(lectureId);
    if (lectureId) {
      const lecture = lectures.find(l => l.id === lectureId);
      if (lecture) fetchStudents(lecture.subject_id);
      fetchExistingAttendance(lectureId);
    } else {
      setAttendance({});
      setStudents([]);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const saveAttendance = async () => {
    if (!selectedLecture) return;
    setSaving(true);

    try {
      const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
        lecture_id: selectedLecture,
        student_id: studentId,
        status
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceData, { onConflict: 'student_id,lecture_id' });

      if (error) throw error;
      toast.success('Attendance saved successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-gray-500">Select a lecture to mark student attendance.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Lecture</label>
          <select
            value={selectedLecture}
            onChange={(e) => handleLectureChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Choose a lecture...</option>
            {lectures.map((lecture) => (
              <option key={lecture.id} value={lecture.id}>
                {lecture.subject?.name} - {formatDate(lecture.date)} ({formatTime(lecture.time)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedLecture && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Student List</h3>
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Attendance'}
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {students.length === 0 ? (
              <div className="p-12 text-center text-gray-500 italic">
                No students enrolled in this subject.
              </div>
            ) : (
              students.map((student) => (
                <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      {student.profile?.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.profile?.name}</p>
                      <p className="text-xs text-gray-500">{student.class}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAttendance(prev => ({ ...prev, [student.id]: 'present' }))}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                        attendance[student.id] === 'present'
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-white border-gray-200 text-gray-400 hover:border-green-200 hover:text-green-600"
                      )}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Present
                    </button>
                    <button
                      onClick={() => setAttendance(prev => ({ ...prev, [student.id]: 'absent' }))}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                        attendance[student.id] === 'absent'
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-white border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-600"
                      )}
                    >
                      <XCircle className="w-5 h-5" />
                      Absent
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
