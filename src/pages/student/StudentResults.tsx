import React, { useEffect, useState } from 'react';
import { supabase, type Result } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, FileSpreadsheet, Loader2, TrendingUp, TrendingDown, FileText, ExternalLink } from 'lucide-react';
import { formatDate, cn } from '../../lib/utils';
import { toast } from 'sonner';

export default function StudentResults() {
  const { profile } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchResults();
  }, [profile]);

  async function fetchResults() {
    try {
      const { data: studentData } = await supabase.from('students').select('id').eq('profile_id', profile?.id).single();
      if (!studentData) return;

      const { data, error } = await supabase
        .from('results')
        .select('*, exam:exams(*, subject:subjects(*))')
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-gray-500">View your performance in recent exams.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {results.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
            <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No results published yet.</p>
          </div>
        ) : (
          results.map((result) => {
            const totalMarks = result.exam?.total_marks || 100;
            const percentage = totalMarks > 0 ? (result.marks_obtained / totalMarks) * 100 : 0;
            const isGood = percentage >= 75;
            const isAverage = percentage >= 40 && percentage < 75;

            return (
              <div key={result.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-4 rounded-xl",
                    isGood ? "bg-green-100 text-green-700" : isAverage ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                  )}>
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{result.exam?.title}</h3>
                    <p className="text-indigo-600 font-medium">{result.exam?.subject?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Exam Date: {formatDate(result.exam!.date)}</p>
                    {result.exam?.pdf_url && (
                      <button
                        onClick={() => handleViewPdf(result.exam!.pdf_url!)}
                        className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase mt-2"
                      >
                        <FileText className="w-3 h-3" />
                        Question Paper
                        <ExternalLink className="w-2 h-2" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.marks_obtained} <span className="text-sm text-gray-400 font-normal">/ {result.exam?.total_marks}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold",
                      isGood ? "bg-green-100 text-green-700" : isAverage ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                    )}>
                      {isGood ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {Math.round(percentage)}%
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Percentage</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
