import React, { useEffect, useState } from 'react';
import { supabase, type Exam, type Student, type Result } from '../../lib/supabase';
import { Loader2, GraduationCap, Save, Search, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

export default function ResultManagement() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [profile]);

  async function fetchExams() {
    try {
      let query = supabase.from('exams').select('*, subject:subjects(*, class:classes(*))');
      
      if (profile?.role === 'teacher') {
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('profile_id', profile.id).single();
        if (teacherData) {
          query = query.eq('teacher_id', teacherData.id);
        }
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      setExams(data || []);
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

  async function fetchExistingResults(examId: string) {
    try {
      const { data, error } = await supabase
        .from('results')
        .select('student_id, marks_obtained')
        .eq('exam_id', examId);

      if (error) throw error;
      
      const marksMap: Record<string, number> = {};
      data?.forEach(record => {
        marksMap[record.student_id] = record.marks_obtained;
      });
      setMarks(marksMap);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  const handleExamChange = (examId: string) => {
    setSelectedExam(examId);
    if (examId) {
      const exam = exams.find(e => e.id === examId);
      if (exam) fetchStudents(exam.subject_id);
      fetchExistingResults(examId);
    } else {
      setMarks({});
      setStudents([]);
    }
  };

  const handleMarkChange = (studentId: string, value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;
    
    const exam = exams.find(e => e.id === selectedExam);
    if (exam && numValue > exam.total_marks) {
      toast.error(`Marks cannot exceed total marks (${exam.total_marks})`);
      return;
    }
    setMarks(prev => ({ ...prev, [studentId]: numValue }));
  };

  const saveResults = async () => {
    if (!selectedExam) return;
    setSaving(true);

    try {
      const resultsData = Object.entries(marks).map(([studentId, marks_obtained]) => ({
        exam_id: selectedExam,
        student_id: studentId,
        marks_obtained
      }));

      const { error } = await supabase
        .from('results')
        .upsert(resultsData, { onConflict: 'student_id,exam_id' });

      if (error) throw error;
      toast.success('Results saved successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedExamData = exams.find(e => e.id === selectedExam);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.role === 'admin' ? 'Result Management' : 'Upload Marks'}
          </h1>
          <p className="text-gray-500">
            {profile?.role === 'admin' 
              ? 'Manage and oversee student performance across all subjects.' 
              : 'Enter and manage student marks for your exams.'}
          </p>
        </div>
        <div className="bg-indigo-50 p-3 rounded-xl">
          <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => handleExamChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Choose an exam...</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} - {exam.subject?.name} {exam.subject?.class?.name ? `(${exam.subject.class.name})` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedExamData && (
            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Selected Exam Details</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedExamData.subject?.name} • {selectedExamData.subject?.class?.name}
                </p>
                <p className="text-xs text-gray-500">{formatDate(selectedExamData.date)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedExam && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900">Student Results</h3>
              <p className="text-xs text-gray-500">Total Marks: {selectedExamData?.total_marks}</p>
            </div>
            <button
              onClick={saveResults}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Results
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
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={selectedExamData?.total_marks}
                        value={marks[student.id] === undefined || isNaN(marks[student.id]) ? '' : marks[student.id]}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setMarks(prev => {
                              const newMarks = { ...prev };
                              delete newMarks[student.id];
                              return newMarks;
                            });
                          } else {
                            handleMarkChange(student.id, val);
                          }
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold"
                        placeholder="0"
                      />
                      <span className="absolute -top-6 left-0 text-[10px] uppercase font-bold text-gray-400">Marks</span>
                    </div>
                    <div className="text-sm font-medium text-gray-400">
                      / {selectedExamData?.total_marks}
                    </div>
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
