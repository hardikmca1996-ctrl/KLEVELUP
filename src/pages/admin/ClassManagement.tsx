import React, { useState, useEffect } from 'react';
import { supabase, Class } from '../../lib/supabase';
import { Plus, Trash2, School, Loader2, Edit2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newGrade) return;

    try {
      const { error } = await supabase
        .from('classes')
        .insert([{ 
          name: newClassName, 
          grade: newGrade,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      
      toast.success('Class added successfully');
      setIsAdding(false);
      setNewClassName('');
      setNewGrade('');
      fetchClasses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateClass = async (id: string) => {
    if (!editName || !editGrade) return;

    try {
      const { error } = await supabase
        .from('classes')
        .update({ name: editName, grade: editGrade })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Class updated successfully');
      setEditingId(null);
      fetchClasses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const startEditing = (cls: Class) => {
    setEditingId(cls.id);
    setEditName(cls.name);
    setEditGrade(cls.grade);
  };

  const handleDeleteClass = async (id: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Class deleted successfully');
      fetchClasses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
          <p className="text-gray-500">Manage school grades and sections</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Class
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Add New Class</h2>
          <form onSubmit={handleAddClass} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name (e.g. 10-A)</label>
              <input
                type="text"
                required
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="10-A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade (e.g. 10th)</label>
              <input
                type="text"
                required
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="10th"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save Class
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            {editingId === cls.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1 border rounded"
                />
                <input
                  type="text"
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-full px-3 py-1 border rounded"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateClass(cls.id)} className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="p-3 bg-indigo-50 rounded-lg mr-4">
                    <School className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-500">Grade: {cls.grade}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEditing(cls)}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  {deletingId === cls.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
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
                      onClick={() => setDeletingId(cls.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {classes.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <School className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No classes found. Add your first class to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
