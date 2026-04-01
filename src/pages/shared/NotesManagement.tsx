import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Search,
  BookOpen,
  School,
  FileUp,
  X
} from 'lucide-react';
import { supabase, isDemoMode } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  description: string;
  file_url: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  created_at: string;
  class?: { name: string; grade: string };
  subject?: { name: string };
  teacher?: { profile: { name: string } };
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function NotesManagement() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bucketExists, setBucketExists] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    file_url: ''
  });

  useEffect(() => {
    fetchInitialData();
    checkBucket();
  }, []);

  async function checkBucket() {
    if (isDemoMode) {
      setBucketExists(true);
      return;
    }
    try {
      // More reliable way to check bucket existence without requiring 'listBuckets' permissions
      const { data, error } = await supabase.storage.from('notes').list('', { limit: 1 });
      
      if (error) {
        if (error.message.includes('not found') || (error as any).status === 404) {
          setBucketExists(false);
          
          // Attempt to create the bucket if it's missing (might fail if not admin)
          const { error: createError } = await supabase.storage.createBucket('notes', {
            public: true,
            allowedMimeTypes: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            fileSizeLimit: 5242880 // 5MB
          });
          
          if (!createError) {
            setBucketExists(true);
            console.log('Successfully created "notes" bucket');
          }
        } else {
          // Some other error (e.g. permission denied on listing objects)
          // We assume the bucket exists but we just can't list it
          setBucketExists(true);
        }
      } else {
        // No error, bucket exists
        setBucketExists(true);
      }
    } catch (error) {
      console.warn('Error checking bucket:', error);
      setBucketExists(true); // Default to true on unexpected error
    }
  }

  async function fetchInitialData() {
    try {
      const [notesRes, classesRes, subjectsRes] = await Promise.all([
        supabase
          .from('notes')
          .select('*, class:classes(name, grade), subject:subjects(name), teacher:teachers(profile:profiles(name))')
          .order('created_at', { ascending: false }),
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name')
      ]);

      if (notesRes.error) throw notesRes.error;
      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setNotes(notesRes.data || []);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error: any) {
      toast.error('Error fetching data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `notes/${fileName}`;
      let publicUrl = '';

      if (isDemoMode) {
        publicUrl = `https://mock-storage.com/notes/${fileName}`;
      } else {
        // Check if bucket exists first
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) {
          console.warn('Could not list buckets:', bucketsError);
        } else {
          const notesBucket = buckets?.find(b => b.name === 'notes');
          if (!notesBucket) {
            throw new Error('Bucket "notes" not found. Please create a public bucket named "notes" in your Supabase Storage dashboard.');
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('notes')
          .upload(filePath, file);

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('Bucket "notes" not found. Please create a public bucket named "notes" in your Supabase Storage dashboard.');
          }
          throw uploadError;
        }

        const { data: { publicUrl: url } } = supabase.storage
          .from('notes')
          .getPublicUrl(filePath);
        publicUrl = url;
      }

      setFormData(prev => ({ ...prev, file_url: publicUrl }));
      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Error uploading file. Make sure "notes" bucket exists in Supabase Storage.');
      // Fallback: allow manual URL entry if upload fails
      const manualUrl = prompt('Storage upload failed. Please provide a direct URL to the file:');
      if (manualUrl) {
        setFormData(prev => ({ ...prev, file_url: manualUrl }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file_url) {
      toast.error('Please upload a file first');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get teacher ID for the current user
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (teacherError && profile?.role !== 'admin') throw teacherError;

      const noteData = {
        ...formData,
        teacher_id: teacherData?.id || (profile?.role === 'admin' ? notes[0]?.teacher_id : null)
      };

      if (!noteData.teacher_id && profile?.role !== 'admin') {
        throw new Error('Teacher record not found');
      }

      const { error } = await supabase.from('notes').insert([noteData]);

      if (error) throw error;

      toast.success('Note added successfully');
      setIsModalOpen(false);
      setFormData({ title: '', description: '', class_id: '', subject_id: '', file_url: '' });
      fetchInitialData();
    } catch (error: any) {
      toast.error('Error adding note: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Note deleted successfully');
      fetchInitialData();
    } catch (error: any) {
      toast.error('Error deleting note: ' + error.message);
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.subject?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.class?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Notes</h1>
          <p className="text-gray-500">Upload and manage study materials for your classes.</p>
        </div>
        {(profile?.role === 'teacher' || profile?.role === 'admin') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Note
          </button>
        )}
      </div>

      {!bucketExists && (profile?.role === 'admin' || profile?.role === 'teacher') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
            <School className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-800">Storage Bucket Missing</h3>
            <p className="text-sm text-amber-700 mt-1">
              The "notes" storage bucket was not found in your Supabase project. 
              Please create a <strong>public</strong> bucket named <strong>notes</strong> in your 
              Supabase Storage dashboard to enable file uploads.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={checkBucket}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors"
              >
                Attempt to Create Bucket
              </button>
              <button
                onClick={() => {
                  const sql = `-- Run this in Supabase SQL Editor to create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for storage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'notes');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated Upload'
    ) THEN
        CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Owner Delete'
    ) THEN
        CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE USING (bucket_id = 'notes' AND auth.uid() = owner);
    END IF;
END
$$;`;
                  navigator.clipboard.writeText(sql);
                  toast.success('SQL copied to clipboard! Run it in Supabase SQL Editor.');
                }}
                className="px-3 py-1.5 bg-white border border-amber-600 text-amber-600 text-xs font-medium rounded hover:bg-amber-50 transition-colors"
              >
                Copy SQL Fix
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes by title, subject, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class & Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading notes...</td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No notes found.</td>
                </tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{note.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{note.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <School className="w-4 h-4 text-gray-400" />
                          {note.class?.name} ({note.class?.grade})
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          {note.subject?.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {note.teacher?.profile?.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(note.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={note.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Download/View"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                        {(profile?.role === 'admin' || (profile?.role === 'teacher' && note.teacher_id === profile.id)) && (
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Note</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Algebra Basics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows={3}
                  placeholder="Brief description of the note..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    required
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    required
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Attachment</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors cursor-pointer relative">
                  <div className="space-y-1 text-center">
                    <FileUp className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input type="file" className="sr-only" onChange={handleFileUpload} disabled={isSubmitting} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG up to 5MB</p>
                    <p className="text-[10px] text-gray-400 mt-1 italic">
                      Note: Ensure a public bucket named "notes" exists in Supabase Storage.
                    </p>
                    {formData.file_url && (
                      <p className="text-xs text-green-600 font-medium mt-2">File ready: {formData.file_url.split('/').pop()}</p>
                    )}
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
