import React, { useEffect, useState } from 'react';
import { supabase, type Exam, type Subject, type Teacher } from '../../lib/supabase';
import { Plus, GraduationCap, Calendar, BookOpen, User, Loader2, Trash2, School, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

export default function ExamManagement() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    teacher_id: '',
    date: '',
    total_marks: 100,
    pdf_url: ''
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      let examsQuery = supabase.from('exams').select('*, subject:subjects(*, class:classes(*))');
      let subjectsQuery = supabase.from('subjects').select('*, class:classes(*)');
      
      if (profile?.role === 'teacher') {
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('profile_id', profile.id).single();
        if (teacherData) {
          examsQuery = examsQuery.eq('teacher_id', teacherData.id);
          subjectsQuery = subjectsQuery.eq('teacher_id', teacherData.id);
          setFormData(prev => ({ ...prev, teacher_id: teacherData.id }));
        }
      } else if (profile?.role === 'student') {
        const { data: studentData } = await supabase.from('students').select('class_id').eq('profile_id', profile.id).single();
        if (studentData?.class_id) {
          // Get subjects for this class
          const { data: classSubjects } = await supabase
            .from('subjects')
            .select('id')
            .eq('class_id', studentData.class_id);
          
          const subjectIds = classSubjects?.map(s => s.id) || [];
          
          if (subjectIds.length > 0) {
            examsQuery = examsQuery.in('subject_id', subjectIds);
            subjectsQuery = subjectsQuery.eq('class_id', studentData.class_id);
          } else {
            setExams([]);
            setSubjects([]);
            setLoading(false);
            return;
          }
        } else {
          setExams([]);
          setSubjects([]);
          setLoading(false);
          return;
        }
      } else {
        const { data: teachersData } = await supabase.from('teachers').select('*, profile:profiles(*)');
        setTeachers(teachersData || []);
      }

      const [examsRes, subjectsRes] = await Promise.all([examsQuery, subjectsQuery]);

      if (examsRes.error) throw examsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      let filteredExams = examsRes.data || [];
      if (profile?.role === 'student') {
        const { data: studentData } = await supabase.from('students').select('class_id').eq('profile_id', profile.id).single();
        if (studentData?.class_id) {
          filteredExams = filteredExams.filter(exam => exam.subject?.class_id === studentData.class_id);
        }
      }

      setExams(filteredExams);
      setSubjects(subjectsRes.data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      
      // In a real app, we would upload to Supabase Storage
      // For mock, we'll convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, pdf_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleViewPdf = (pdfUrl: string) => {
    if (!pdfUrl) return;
    
    try {
      if (pdfUrl.startsWith('data:application/pdf;base64,')) {
        const base64 = pdfUrl.split(',')[1];
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      toast.error('Failed to open PDF. It might be too large or corrupted.');
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('exams')
        .insert([{
          title: formData.title,
          subject_id: formData.subject_id,
          teacher_id: formData.teacher_id,
          date: formData.date,
          total_marks: formData.total_marks,
          pdf_url: formData.pdf_url
        }]);

      if (error) throw error;

      toast.success('Exam created successfully');
      setIsModalOpen(false);
      setFormData(prev => ({ ...prev, title: '', subject_id: '', date: '', total_marks: 100, pdf_url: '' }));
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      toast.success('Exam deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-500">Create and manage exams for your subjects.</p>
        </div>
        {profile?.role !== 'student' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Exam
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl"></div>
          ))
        ) : exams.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No exams created yet.
          </div>
        ) : (
          exams.map((exam) => (
            <div key={exam.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-red-600" />
                </div>
                {profile?.role !== 'student' && (
                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{exam.title}</h3>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm text-indigo-600 font-medium">{exam.subject?.name}</p>
                {exam.subject?.class && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                    <School className="w-3 h-3" />
                    {exam.subject.class.name}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {formatDate(exam.date)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  Total Marks: {exam.total_marks}
                </div>
                {exam.pdf_url && (
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <button
                      onClick={() => handleViewPdf(exam.pdf_url!)}
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      View Question Paper
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Exam</h2>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Mid-term Assessment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
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
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    required
                    value={isNaN(formData.total_marks) ? '' : formData.total_marks}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({ ...formData, total_marks: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Paper (PDF)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                  >
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formData.pdf_url ? 'PDF Selected' : 'Click to upload question paper'}
                    </span>
                  </label>
                </div>
                {formData.pdf_url && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> File ready to upload
                  </p>
                )}
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
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
