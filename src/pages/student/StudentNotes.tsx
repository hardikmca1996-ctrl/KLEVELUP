import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Search,
  BookOpen,
  School,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

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

export default function StudentNotes() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [profile]);

  async function fetchNotes() {
    if (!profile?.id) return;

    try {
      // 1. Get student's class_id
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('class_id')
        .eq('profile_id', profile.id)
        .single();

      if (studentError) throw studentError;

      if (!studentData?.class_id) {
        setNotes([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch notes for that class
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*, class:classes(name, grade), subject:subjects(name), teacher:teachers(profile:profiles(name))')
        .eq('class_id', studentData.class_id)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);
    } catch (error: any) {
      toast.error('Error fetching notes: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.subject?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Study Materials</h1>
        <p className="text-gray-500">Access notes and resources shared by your teachers.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes by title or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-gray-500">Loading notes...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No notes available for your class yet.</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div key={note.id} className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-500 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <FileText className="w-7 h-7" />
                  </div>
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Download Note"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{note.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{note.description}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{note.subject?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <School className="w-4 h-4 text-gray-400" />
                      <span>{note.teacher?.profile?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(note.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
