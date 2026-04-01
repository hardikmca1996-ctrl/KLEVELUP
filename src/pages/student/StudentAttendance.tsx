import React, { useEffect, useState } from 'react';
import { supabase, type Attendance } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Loader2, Calendar, BookOpen } from 'lucide-react';
import { formatDate, formatTime, cn } from '../../lib/utils';
import { toast } from 'sonner';

export default function StudentAttendance() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchAttendance();
  }, [profile]);

  async function fetchAttendance() {
    try {
      const { data: studentData } = await supabase.from('students').select('id').eq('profile_id', profile?.id).single();
      if (!studentData) return;

      const { data, error } = await supabase
        .from('attendance')
        .select('*, lecture:lectures(*, subject:subjects(*))')
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const totalCount = attendance.length;
  const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-500">Track your presence in all lectures.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500">Overall Rate</p>
          <p className={cn(
            "text-3xl font-bold",
            rate >= 75 ? "text-green-600" : "text-orange-600"
          )}>{rate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Total Lectures</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1 text-green-600">Present</p>
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1 text-red-600">Absent</p>
          <p className="text-2xl font-bold text-red-600">{totalCount - presentCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                        <span className="font-medium text-gray-900">{record.lecture?.subject?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(record.lecture!.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatTime(record.lecture!.time)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase",
                        record.status === 'present' 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      )}>
                        {record.status === 'present' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
