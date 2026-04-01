import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Plus, Trash2, Megaphone, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_role: string;
  class_id: string | null;
  created_at: string;
  author?: {
    name: string;
  };
  class?: {
    name: string;
  };
}

interface Class {
  id: string;
  name: string;
}

export default function AnnouncementManagement() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    class_id: '' as string | null
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch announcements with author and class info
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select(`
          *,
          author:profiles(name),
          class:classes(name)
        `)
        .order('created_at', { ascending: false });

      if (announcementsError) {
        if (announcementsError.message.includes("Could not find the table 'public.announcements'")) {
          setTableMissing(true);
          return;
        }
        throw announcementsError;
      }
      setAnnouncements(announcementsData || []);
      setTableMissing(false);

      // Fetch classes for the dropdown
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (classesError) throw classesError;
      setClasses(classesData || []);
    } catch (error: any) {
      toast.error('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          class_id: newAnnouncement.class_id || null,
          author_id: profile.id,
          author_role: profile.role
        }]);

      if (error) throw error;

      toast.success('Announcement posted successfully');
      setShowAddModal(false);
      setNewAnnouncement({ title: '', content: '', class_id: null });
      fetchData();
    } catch (error: any) {
      toast.error('Error posting announcement: ' + error.message);
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Announcement deleted');
      fetchData();
    } catch (error: any) {
      toast.error('Error deleting announcement: ' + error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500">Manage and broadcast messages to students.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : tableMissing ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <Megaphone className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-900 mb-2">Database Setup Required</h3>
          <p className="text-red-700 mb-6 max-w-lg mx-auto">
            The announcements table hasn't been created in your Supabase database yet. 
            Please run the following SQL in your Supabase SQL Editor to fix this.
          </p>
          <div className="bg-gray-900 rounded-lg p-4 text-left overflow-x-auto mb-6 max-w-2xl mx-auto">
            <pre className="text-gray-300 text-xs font-mono">
{`CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_role TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements are viewable by everyone" ON announcements FOR SELECT USING (true);
CREATE POLICY "Admins and teachers can manage announcements" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);`}
            </pre>
          </div>
          <button
            onClick={() => fetchData()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            I've run the SQL, Refresh Now
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No announcements yet</h3>
          <p className="text-gray-500">Create your first announcement to notify students.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${announcement.author_role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium">{announcement.author?.name}</span>
                      <span>•</span>
                      <span>{format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(announcement.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-gray-600 text-sm flex-1 mb-4 whitespace-pre-wrap">
                {announcement.content}
              </p>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                  <Users className="w-3 h-3" />
                  {announcement.class?.name || 'All Classes'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">New Announcement</h2>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g., Holiday Notice"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Class</label>
                <select
                  value={newAnnouncement.class_id || ''}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, class_id: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  required
                  rows={4}
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Type your message here..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
