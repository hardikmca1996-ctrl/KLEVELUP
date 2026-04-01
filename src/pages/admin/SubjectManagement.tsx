import React, { useEffect, useState } from 'react';
import { supabase, type Subject, type Teacher, type Class } from '../../lib/supabase';
import { Plus, Trash2, BookOpen, Loader2, User, School, Edit2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export default function SubjectManagement() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    teacher_id: '',
    class_id: ''
  });

  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'teacher';
  const isStudent = profile?.role === 'student';

  const [formData, setFormData] = useState({
    name: '',
    teacher_id: '',
    class_id: ''
  });

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    if (!profile) return;
    
    setLoading(true);
    try {
      let subjectsQuery = supabase.from('subjects').select('*, teacher:teachers!teacher_id(*, profile:profiles(*)), class:classes(*)');
      
      if (profile.role === 'teacher') {
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('profile_id', profile.id).single();
        if (teacherData?.id) {
          subjectsQuery = subjectsQuery.eq('teacher_id', teacherData.id);
        }
      } else if (profile.role === 'student') {
        const { data: studentData } = await supabase.from('students').select('class_id').eq('profile_id', profile.id).single();
        if (studentData?.class_id) {
          subjectsQuery = subjectsQuery.eq('class_id', studentData.class_id);
        } else {
          // If student has no class, they should see no subjects
          setSubjects([]);
          setTeachers([]);
          setClasses([]);
          setLoading(false);
          return;
        }
      }

      const [subjectsRes, teachersRes, classesRes] = await Promise.all([
        subjectsQuery,
        supabase.from('teachers').select('*, profile:profiles(*)'),
        supabase.from('classes').select('*')
      ]);

      if (subjectsRes.error) throw subjectsRes.error;
      if (teachersRes.error) throw teachersRes.error;
      if (classesRes.error) throw classesRes.error;

      setSubjects(subjectsRes.data || []);
      setTeachers(teachersRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('subjects')
        .insert([{ 
          name: formData.name, 
          teacher_id: formData.teacher_id || null,
          class_id: formData.class_id || null
        }]);

      if (error) throw error;

      toast.success('Subject created successfully');
      setIsModalOpen(false);
      setFormData({ name: '', teacher_id: '', class_id: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Subject deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateSubject = async (id: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: editFormData.name,
          teacher_id: editFormData.teacher_id || null,
          class_id: editFormData.class_id || null
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Subject updated successfully');
      setEditingId(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (subject: Subject) => {
    setEditingId(subject.id);
    setEditFormData({
      name: subject.name,
      teacher_id: subject.teacher_id || '',
      class_id: subject.class_id || ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
          <p className="text-gray-500">
            {isAdmin ? 'Create subjects and assign teachers to them.' : 
             isTeacher ? 'View and manage your assigned subjects.' :
             'View available subjects and their teachers.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Subject
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-xl"></div>
          ))
        ) : subjects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No subjects created yet.
          </div>
        ) : (
          subjects.map((subject) => (
            <div key={subject.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              {editingId === subject.id ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Edit Subject</h3>
                    <button onClick={() => setEditingId(null)} className="p-1 hover:bg-gray-100 rounded">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Subject Name</label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Teacher</label>
                      <select
                        value={editFormData.teacher_id}
                        onChange={(e) => setEditFormData({ ...editFormData, teacher_id: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Select a teacher</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.profile?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
                      <select
                        value={editFormData.class_id}
                        onChange={(e) => setEditFormData({ ...editFormData, class_id: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Select a class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleUpdateSubject(subject.id)}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-100 p-3 rounded-lg">
                      <BookOpen className="w-6 h-6 text-indigo-600" />
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(subject)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        {deletingId === subject.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(subject.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{subject.name}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <School className="w-4 h-4" />
                      {subject.class ? (
                        <span>Class: <span className="font-medium text-gray-900">{subject.class.name}</span></span>
                      ) : (
                        <span className="italic text-gray-400">No class assigned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      {subject.teacher ? (
                        <span>Assigned to: <span className="font-medium text-gray-900">{subject.teacher.profile?.name}</span></span>
                      ) : (
                        <span className="italic text-gray-400">No teacher assigned</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Subject</h2>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Advanced Physics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Teacher (Optional)</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.profile?.name} ({teacher.qualification})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Class (Optional)</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.grade})
                    </option>
                  ))}
                </select>
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
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
