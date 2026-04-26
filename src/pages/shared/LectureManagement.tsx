import React, { useEffect, useState } from 'react';
import { supabase, type Lecture, type Subject, type Teacher } from '../../lib/supabase';
import { Plus, Calendar, Clock, BookOpen, User, Loader2, Trash2, School } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { formatTime, formatDate } from '../../lib/utils';

export default function LectureManagement() {
  const { profile } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    subject_id: '',
    teacher_id: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    fetchData();
    
    const subscription = supabase
      .channel('lecture-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lectures'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [profile]);

  async function fetchData() {
    try {
      setLoading(true);
      let lecturesQuery = supabase.from('lectures').select('*, subject:subjects(*, class:classes(*)), teacher:teachers(*, profile:profiles(*))');
      let subjectsQuery = supabase.from('subjects').select('*, teacher:teachers!teacher_id(*, profile:profiles(*)), class:classes(*)');
      
      if (profile?.role === 'teacher') {
        const { data: teacherData, error: tError } = await supabase
          .from('teachers')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        
        if (tError || !teacherData) {
          toast.error('Teacher profile not found. Please ensure your teacher profile is set up.');
          setLectures([]);
          setSubjects([]);
          return;
        }

        lecturesQuery = lecturesQuery.eq('teacher_id', teacherData.id);
        subjectsQuery = subjectsQuery.eq('teacher_id', teacherData.id);
        setFormData(prev => ({ ...prev, teacher_id: teacherData.id }));
      } else if (profile?.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('class_id')
          .eq('profile_id', profile.id)
          .single();
        
        if (studentData?.class_id) {
          // Get subjects for this class
          const { data: classSubjects } = await supabase
            .from('subjects')
            .select('id')
            .eq('class_id', studentData.class_id);
          
          const subjectIds = classSubjects?.map(s => s.id) || [];
          
          if (subjectIds.length > 0) {
            lecturesQuery = lecturesQuery.in('subject_id', subjectIds);
            subjectsQuery = subjectsQuery.eq('class_id', studentData.class_id);
          } else {
            setLectures([]);
            setSubjects([]);
            setLoading(false);
            return;
          }
        } else {
          setLectures([]);
          setSubjects([]);
          setLoading(false);
          return;
        }
      } else if (profile?.role === 'admin') {
        const { data: teachersData } = await supabase.from('teachers').select('*, profile:profiles(*)');
        setTeachers(teachersData || []);
      }

      const [lecturesRes, subjectsRes] = await Promise.all([lecturesQuery, subjectsQuery]);

      if (lecturesRes.error) throw lecturesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setLectures(lecturesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Attempting to create lecture:', {
      role: profile?.role,
      userId: profile?.id,
      formData
    });

    if (!formData.subject_id) {
      toast.error('Please select a subject');
      return;
    }
    if (!formData.teacher_id) {
      toast.error('Please select a teacher');
      return;
    }
    if (!formData.date || !formData.time) {
      toast.error('Please select date and time');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for overlapping lectures for the same teacher
      const { data: overlappingLectures, error: checkError } = await supabase
        .from('lectures')
        .select('id')
        .eq('teacher_id', formData.teacher_id)
        .eq('date', formData.date)
        .eq('time', formData.time);
      
      if (checkError) throw checkError;

      if (overlappingLectures && overlappingLectures.length > 0) {
        toast.error('This teacher already has a lecture scheduled for this date and time.');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('lectures')
        .insert([{
          subject_id: formData.subject_id,
          teacher_id: formData.teacher_id,
          date: formData.date,
          time: formData.time
        }]);

      if (error) {
        console.error('Supabase error creating lecture:', error);
        if (error.code === '42501') {
          throw new Error(`Permission denied (RLS). Your role is ${profile?.role}. Please ensure you have permission to schedule lectures for this teacher.`);
        }
        throw error;
      }

      toast.success('Lecture scheduled successfully');
      setIsModalOpen(false);
      // Reset form but keep teacher_id if user is a teacher
      setFormData(prev => ({ 
        ...prev, 
        subject_id: '', 
        date: '', 
        time: '',
        teacher_id: profile?.role === 'teacher' ? prev.teacher_id : ''
      }));
      fetchData();
    } catch (error: any) {
      console.error('Error creating lecture:', error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLecture = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;

    try {
      const { error } = await supabase.from('lectures').delete().eq('id', id);
      if (error) throw error;
      toast.success('Lecture deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lecture Schedule</h1>
          <p className="text-gray-500">View and manage upcoming lectures.</p>
        </div>
        {profile?.role !== 'student' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Schedule Lecture
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Class</th>
                {profile?.role === 'admin' && <th className="px-6 py-4">Teacher</th>}
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Time</th>
                {profile?.role !== 'student' && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : lectures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No lectures scheduled.
                  </td>
                </tr>
              ) : (
                lectures.map((lecture) => (
                  <tr key={lecture.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                        <span className="font-medium text-gray-900">{lecture.subject?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <School className="w-4 h-4 text-gray-400" />
                        {lecture.subject?.class?.name || <span className="italic text-gray-400">N/A</span>}
                      </div>
                    </td>
                    {profile?.role === 'admin' && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{lecture.teacher?.profile?.name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(lecture.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTime(lecture.time)}
                      </div>
                    </td>
                    {profile?.role !== 'student' && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteLecture(lecture.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lecture Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Schedule New Lecture</h2>
            <form onSubmit={handleCreateLecture} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => {
                    const subjectId = e.target.value;
                    const selectedSubject = subjects.find(s => s.id === subjectId);
                    setFormData(prev => ({ 
                      ...prev, 
                      subject_id: subjectId,
                      teacher_id: selectedSubject?.teacher_id || prev.teacher_id
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} {subject.class ? `(${subject.class.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {profile?.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <select
                    required
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select a teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.profile?.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
