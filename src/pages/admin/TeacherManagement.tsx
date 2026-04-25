import React, { useEffect, useState } from 'react';
import { supabase, type Teacher, type Class, type Subject, isDemoMode } from '../../lib/supabase';
import { UserPlus, Trash2, Search, Loader2, Mail, GraduationCap, School, BookOpen, Edit2, Key, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { generateUUID } from '../../lib/utils';

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    qualification: '',
    class_id: '',
    subject_ids: [] as string[]
  });

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ profileId: '', name: '', password: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    await Promise.all([
      fetchTeachers(),
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

  async function fetchTeachers() {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          profile:profiles(*),
          class:classes(*),
          subjects:subjects!teacher_id(id, name)
        `);

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditMode && editingTeacherId) {
        const teacherToUpdate = teachers.find(t => t.id === editingTeacherId);
        if (!teacherToUpdate) throw new Error('Teacher not found');

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            email: formData.email
          })
          .eq('id', teacherToUpdate.profile_id);

        if (profileError) throw profileError;

        // Update teacher
        const { error: teacherError } = await supabase
          .from('teachers')
          .update({
            qualification: formData.qualification,
            class_id: formData.class_id || null
          })
          .eq('id', editingTeacherId);

        if (teacherError) throw teacherError;

        // Update subject assignments
        // 1. Remove teacher_id from all subjects currently assigned to this teacher
        await supabase
          .from('subjects')
          .update({ teacher_id: null })
          .eq('teacher_id', editingTeacherId);

        // 2. Assign teacher_id to newly selected subjects
        if (formData.subject_ids.length > 0) {
          await supabase
            .from('subjects')
            .update({ teacher_id: editingTeacherId })
            .in('id', formData.subject_ids);
        }

        toast.success('Teacher updated successfully');
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
            role: 'teacher',
            metadata: { qualification: formData.qualification }
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

        const teacherId = generateUUID();

        // Use upsert to handle the case where the profile might have been created by a trigger
        const { error: profileError } = await supabase.from('profiles').upsert([{
          id: profileId,
          name: formData.name,
          email: formData.email,
          role: 'teacher',
          must_change_password: true,
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });

        if (profileError) {
          console.error('Profile upsert error:', profileError);
          throw profileError;
        }

        // Insert into teachers
        const { error: teacherError } = await supabase.from('teachers').insert([{
          id: teacherId,
          profile_id: profileId,
          qualification: formData.qualification,
          class_id: formData.class_id || null
        }]);

        if (teacherError) {
          console.error('Teacher insert error:', teacherError);
          throw teacherError;
        }

        // Assign to subjects if selected
        if (formData.subject_ids.length > 0) {
          const { error: subjectError } = await supabase
            .from('subjects')
            .update({ teacher_id: teacherId })
            .in('id', formData.subject_ids);
          
          if (subjectError) throw subjectError;
        }

        toast.success('Teacher created and assigned to subjects successfully');
      }

      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', qualification: '', class_id: '', subject_ids: [] });
      setIsEditMode(false);
      setEditingTeacherId(null);
      await fetchTeachers();
      await fetchSubjects(); // Refresh subjects to show new assignment
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this teacher? This will also delete their auth account.')) return;

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

      // 2. Explicitly delete from teachers table in the frontend
      // This is crucial for Demo Mode and ensures the Admin Dashboard gets the event
      const { error: teacherError } = await supabase
        .from('teachers')
        .delete()
        .eq('profile_id', userId);

      if (teacherError) {
        console.error('Error deleting teacher record:', teacherError);
      }

      // 3. Delete from profiles table
      await supabase.from('profiles').delete().eq('id', userId);

      toast.success('Teacher deleted successfully');
      fetchTeachers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openEditModal = (teacher: Teacher) => {
    setFormData({
      name: teacher.profile?.name || '',
      email: teacher.profile?.email || '',
      password: '', // Don't show password
      qualification: teacher.qualification || '',
      class_id: teacher.class_id || '',
      subject_ids: teacher.subjects?.map(s => s.id) || []
    });
    setEditingTeacherId(teacher.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setFormData({ name: '', email: '', password: '', qualification: '', class_id: '', subject_ids: [] });
    setIsEditMode(false);
    setEditingTeacherId(null);
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
      toast.success('Password reset successfully. Teacher must change it on next login.');
      setIsResetModalOpen(false);
      setResetPasswordData({ profileId: '', name: '', password: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResetModal = (teacher: Teacher) => {
    setResetPasswordData({
      profileId: teacher.profile_id,
      name: teacher.profile?.name || '',
      password: ''
    });
    setIsResetModalOpen(true);
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = (t.profile?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (t.profile?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassId ? t.class_id === selectedClassId : true;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-500">Add, view, and manage teachers in the system.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Teacher
        </button>
      </div>

      {/* Class Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {classes.map(cls => {
          const count = teachers.filter(t => t.class_id === cls.id).length;
          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id === selectedClassId ? '' : cls.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedClassId === cls.id 
                  ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20" 
                  : "bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm"
              }`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cls.name}</p>
              <p className={`text-2xl font-bold mt-1 ${
                selectedClassId === cls.id ? "text-indigo-600" : "text-gray-900"
              }`}>
                {count}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Class Teacher</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search teachers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-sm font-medium text-gray-500 whitespace-nowrap hidden lg:block">Filter by Class:</span>
              <div className="relative w-full md:w-64">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.grade})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Plus className="w-4 h-4 rotate-45" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Qualification</th>
                <th className="px-6 py-4">Assigned Class/Subject</th>
                <th className="px-6 py-4">Joined</th>
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
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {teacher.profile?.name?.[0]}
                        </div>
                        <span className="font-medium text-gray-900">{teacher.profile?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{teacher.profile?.email}</td>
                    <td className="px-6 py-4 text-gray-600">{teacher.qualification}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {(teacher.class_id || (teacher.subjects && teacher.subjects.length > 0)) ? (
                        <div className="flex flex-col gap-1">
                          {teacher.class_id && (
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-fit">
                              {classes.find(c => c.id === teacher.class_id)?.name || 'Unknown Class'}
                            </span>
                          )}
                          {teacher.subjects?.map(subject => (
                            <span key={subject.id} className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
                              {subject.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(teacher.profile?.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openResetModal(teacher)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Teacher"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.profile_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Teacher"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{isEditMode ? 'Edit Teacher' : 'Add New Teacher'}</h2>
            <form onSubmit={handleCreateTeacher} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. M.Sc. Mathematics"
                  />
                </div>
              </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Class (Class Teacher)</label>
                    <div className="relative">
                      <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Subjects</label>
                    <div className="space-y-4 max-h-48 overflow-y-auto p-3 border border-gray-300 rounded-lg bg-gray-50">
                      {classes.map(cls => {
                        const classSubjects = subjects.filter(s => s.class_id === cls.id);
                        if (classSubjects.length === 0) return null;
                        return (
                          <div key={cls.id} className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-1 mb-2">{cls.name}</p>
                            <div className="grid grid-cols-1 gap-1">
                              {classSubjects.map(subject => (
                                <label key={subject.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors group">
                                  <input
                                    type="checkbox"
                                    checked={formData.subject_ids.includes(subject.id)}
                                    onChange={(e) => {
                                      const newIds = e.target.checked
                                        ? [...formData.subject_ids, subject.id]
                                        : formData.subject_ids.filter(id => id !== subject.id);
                                      setFormData({ ...formData, subject_ids: newIds });
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                  />
                                  <span className="text-sm text-gray-700 group-hover:text-indigo-600">{subject.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {subjects.filter(s => !s.class_id).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-1 mb-2">Other Subjects</p>
                          <div className="grid grid-cols-1 gap-1">
                            {subjects.filter(s => !s.class_id).map(subject => (
                              <label key={subject.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors group">
                                <input
                                  type="checkbox"
                                  checked={formData.subject_ids.includes(subject.id)}
                                  onChange={(e) => {
                                    const newIds = e.target.checked
                                      ? [...formData.subject_ids, subject.id]
                                      : formData.subject_ids.filter(id => id !== subject.id);
                                    setFormData({ ...formData, subject_ids: newIds });
                                  }}
                                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-indigo-600">{subject.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      {subjects.length === 0 && <p className="text-xs text-gray-500 italic">No subjects available</p>}
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
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditMode ? 'Update Teacher' : 'Create Teacher')}
                </button>
              </div>
            </form>
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
