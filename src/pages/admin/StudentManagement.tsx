import React, { useEffect, useState } from 'react';
import { supabase, type Student, type Class, type Subject, type Enrollment, isDemoMode } from '../../lib/supabase';
import { UserPlus, Trash2, Search, Loader2, Mail, Phone, School, BookOpen, X, Plus, Edit2, FileText, Key } from 'lucide-react';
import { toast } from 'sonner';
import { generateUUID, formatDate } from '../../lib/utils';

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ profileId: '', name: '', password: '' });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    class_id: '',
    phone: ''
  });

  useEffect(() => {
    fetchInitialData();

    // Subscribe to changes in students table for real-time updates
    const studentsSubscription = supabase
      .channel('students-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(studentsSubscription);
    };
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    await Promise.all([
      fetchStudents(),
      fetchClasses(),
      fetchSubjects()
    ]);
    setLoading(false);
  }

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('*');
    setClasses(data || []);
  }

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('*');
    setSubjects(data || []);
  }

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          profile:profiles(*)
        `);

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedClass = classes.find(c => c.id === formData.class_id);
      if (!selectedClass) throw new Error('Please select a class');

      if (isEditMode && editingStudentId) {
        const studentToUpdate = students.find(s => s.id === editingStudentId);
        if (!studentToUpdate) throw new Error('Student not found');

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            email: formData.email
          })
          .eq('id', studentToUpdate.profile_id);

        if (profileError) throw profileError;

        // Update student
        const { error: studentError } = await supabase
          .from('students')
          .update({
            class: selectedClass.name,
            class_id: selectedClass.id,
            phone: formData.phone
          })
          .eq('id', editingStudentId);

        if (studentError) throw studentError;

        toast.success('Student updated successfully');
      } else {
        let profileId = '';
        
        // Always use the backend API for user creation to avoid logging out the admin
        const response = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: 'student',
            metadata: { class: selectedClass.name, phone: formData.phone }
          })
        });

        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error('Server returned non-JSON response:', responseText);
          throw new Error(`Server error: ${responseText.substring(0, 100)}...`);
        }

        if (!response.ok) throw new Error(result.error || 'Failed to create user account');
        
        if (!result.user?.id) throw new Error('User account created but no ID returned');
        profileId = result.user.id;

        const studentId = generateUUID();

        // Use upsert to handle the case where the profile might have been created by a trigger
        const { error: profileError } = await supabase.from('profiles').upsert([{
          id: profileId,
          name: formData.name,
          email: formData.email,
          role: 'student',
          must_change_password: true,
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });

        if (profileError) {
          console.error('Profile upsert error:', profileError);
          throw profileError;
        }

        // Insert into students
        const { error: studentError } = await supabase.from('students').insert([{
          id: studentId,
          profile_id: profileId,
          class: selectedClass.name,
          class_id: selectedClass.id,
          phone: formData.phone
        }]);

        if (studentError) {
          console.error('Student insert error:', studentError);
          throw studentError;
        }

        // Auto-enroll in subjects of this class
        const classSubjects = subjects.filter(s => s.class_id === selectedClass.id);
        if (classSubjects.length > 0) {
          const enrollments = classSubjects.map(subject => ({
            student_id: studentId,
            subject_id: subject.id,
            created_at: new Date().toISOString()
          }));
          const { error: enrollError } = await supabase.from('enrollments').insert(enrollments);
          if (enrollError) throw enrollError;
        }

        toast.success(`Student created and enrolled in ${classSubjects.length} subjects`);
      }

      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', class_id: '', phone: '' });
      setIsEditMode(false);
      setEditingStudentId(null);
      await fetchStudents();
    } catch (error: any) {
      console.error('Error creating student:', error);
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (userId: string) => {
    try {
      // 1. Delete from auth user via backend API
      const response = await fetch(`/api/admin/delete-user/${userId}`, {
        method: 'DELETE'
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Server returned non-JSON response:', responseText);
        throw new Error(`Server error: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(result.error);
      }

      // 2. Explicitly delete from students table in the frontend
      // This is crucial for Demo Mode and ensures the Admin Dashboard gets the event
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('profile_id', userId);

      if (studentError) {
        console.error('Error deleting student record:', studentError);
        // We don't throw here because the auth user is already deleted
      }

      // 3. Delete from profiles table
      await supabase.from('profiles').delete().eq('id', userId);

      toast.success('Student deleted successfully');
      setDeletingId(null);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEnrollSubject = async (subjectId: string) => {
    if (!selectedStudent) return;
    
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert([{
          student_id: selectedStudent.id,
          subject_id: subjectId,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      toast.success('Subject enrolled successfully');
      fetchStudentEnrollments(selectedStudent.id);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUnenrollSubject = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;
      toast.success('Subject unenrolled successfully');
      if (selectedStudent) fetchStudentEnrollments(selectedStudent.id);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchStudentEnrollments = async (studentId: string) => {
    const { data } = await supabase
      .from('enrollments')
      .select('*, subject:subjects(*)')
      .eq('student_id', studentId);
    setStudentEnrollments(data || []);
  };

  const fetchStudentResults = async (studentId: string) => {
    setLoadingResults(true);
    try {
        const { data, error } = await supabase
        .from('results')
        .select('*, exam:exams(*, subject:subjects(*))')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setStudentResults(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch results: ' + error.message);
    } finally {
      setLoadingResults(false);
    }
  };

  const openEnrollModal = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentEnrollments(student.id);
    setIsEnrollModalOpen(true);
  };

  const openResultsModal = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentResults(student.id);
    setIsResultsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setFormData({
      name: student.profile?.name || '',
      email: student.profile?.email || '',
      password: '', // Don't show password
      class_id: student.class_id || '',
      phone: student.phone || ''
    });
    setEditingStudentId(student.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setFormData({ name: '', email: '', password: '', class_id: '', phone: '' });
    setIsEditMode(false);
    setEditingStudentId(null);
    setIsModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordData.password) return;

    setIsSubmitting(true);
    try {
      // Always use backend API for password reset to handle Auth user update
      const response = await fetch(`/api/admin/reset-password/${resetPasswordData.profileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordData.password })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Server returned non-JSON response:', responseText);
        throw new Error(`Server error: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          must_change_password: true,
          password_changed_at: null 
        })
        .eq('id', resetPasswordData.profileId);

      if (error) throw error;
      toast.success('Password reset successfully. Student must change it on next login.');
      setIsResetModalOpen(false);
      setResetPasswordData({ profileId: '', name: '', password: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResetModal = (student: Student) => {
    setResetPasswordData({
      profileId: student.profile_id,
      name: student.profile?.name || '',
      password: ''
    });
    setIsResetModalOpen(true);
  };

  const filteredStudents = students.filter(s => 
    (s.profile?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.profile?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-500">Add, view, and manage students in the system.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                          {student.profile?.name?.[0]}
                        </div>
                        <span className="font-medium text-gray-900">{student.profile?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{student.profile?.email}</td>
                    <td className="px-6 py-4 text-gray-600">{student.class}</td>
                    <td className="px-6 py-4 text-gray-600">{student.phone}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openResetModal(student)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Student"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openResultsModal(student)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Results"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEnrollModal(student)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Manage Subjects"
                        >
                          <BookOpen className="w-5 h-5" />
                        </button>
                        {deletingId === student.profile_id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteStudent(student.profile_id)}
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
                            onClick={() => setDeletingId(student.profile_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{isEditMode ? 'Edit Student' : 'Add New Student'}</h2>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      required
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name} ({cls.grade})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Phone number"
                    />
                  </div>
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
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditMode ? 'Update Student' : 'Create Student')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Enrollment Modal */}
      {isEnrollModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Subject Enrollment</h2>
                <p className="text-sm text-gray-500">Manage subjects for {selectedStudent.profile?.name}</p>
              </div>
              <button onClick={() => setIsEnrollModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Enrolled Subjects</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {studentEnrollments.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No subjects enrolled yet.</p>
                  ) : (
                    studentEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <span className="font-medium text-indigo-900">{enrollment.subject?.name}</span>
                        <button 
                          onClick={() => handleUnenrollSubject(enrollment.id)}
                          className="p-1 text-indigo-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Available Subjects</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {subjects
                    .filter(s => !studentEnrollments.some(e => e.subject_id === s.id))
                    .map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => handleEnrollSubject(subject.id)}
                        className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                      >
                        <span className="text-gray-700 group-hover:text-indigo-900">{subject.name}</span>
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {isResultsModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Academic Results</h2>
                <p className="text-sm text-gray-500">Performance record for {selectedStudent.profile?.name}</p>
              </div>
              <button onClick={() => setIsResultsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {loadingResults ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : studentResults.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No results found for this student.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentResults.map((result) => (
                    <div key={result.id} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900">{result.exam?.title}</h4>
                          <p className="text-sm text-gray-500">{result.exam?.subject?.name} • {formatDate(result.exam?.date)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-indigo-600">{result.marks_obtained}</span>
                          <span className="text-gray-400 font-medium"> / {result.exam?.total_marks}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            (result.marks_obtained / result.exam?.total_marks) >= 0.8 ? 'bg-green-500' :
                            (result.marks_obtained / result.exam?.total_marks) >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(result.marks_obtained / (result.exam?.total_marks || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setIsResultsModalOpen(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Key className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                <p className="text-sm text-gray-500">For {resetPasswordData.name}</p>
              </div>
            </div>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Temporary Password</label>
                <input
                  type="password"
                  required
                  min={6}
                  value={resetPasswordData.password}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter new password"
                />
                <p className="mt-1 text-xs text-gray-500">Minimum 6 characters. The user will be required to change this on their next login.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
