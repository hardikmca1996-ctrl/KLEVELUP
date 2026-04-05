import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Send, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type DeletionRequest } from '../../lib/supabase';

export default function DeleteAccount() {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<DeletionRequest | null>(null);
  const [checking, setChecking] = useState(true);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      checkExistingRequest();
    }
  }, [profile]);

  async function checkExistingRequest() {
    try {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .eq('profile_id', profile?.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error && !error.message.includes("Could not find the table 'public.deletion_requests'")) {
        console.error('Error checking deletion request:', error);
      } else if (data) {
        setExistingRequest(data);
      }
    } catch (error) {
      console.error('Error checking deletion request:', error);
    } finally {
      setChecking(false);
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('deletion_requests')
        .insert([{
          profile_id: profile?.id,
          reason,
          status: 'pending'
        }]);

      if (error) {
        if (error.message.includes("Could not find the table 'public.deletion_requests'")) {
          throw new Error('Deletion request system is not yet configured by admin. Please contact support.');
        }
        throw error;
      }

      toast.success('Your deletion request has been submitted to the admin');
      checkExistingRequest();
    } catch (error: any) {
      console.error('Request deletion error:', error);
      toast.error(error.message || 'An error occurred while submitting your request');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (existingRequest) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-orange-100 rounded-full text-orange-600 mb-4">
            <Clock className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Request Pending</h1>
          <p className="text-gray-500 mt-2">Your account deletion request is currently being reviewed by the administration.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Request Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</p>
              <p className="text-orange-600 font-bold flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                Pending Review
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Reason Provided</p>
              <p className="text-gray-700 mt-1 italic">"{existingRequest.reason}"</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Submitted On</p>
              <p className="text-gray-700 mt-1">
                {new Date(existingRequest.created_at).toLocaleDateString()} at {new Date(existingRequest.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 leading-relaxed">
              The administration will review your request and process it shortly. Once approved, your account and all data will be permanently removed. If you wish to cancel this request, please contact the administration immediately.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/student')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Request Account Deletion</h1>
        <p className="text-gray-500 mt-1">Submit a request to the administration to permanently remove your account</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="bg-orange-50 p-6 border-b border-orange-100 flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-full text-orange-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-orange-900">How it works</h3>
            <p className="text-orange-700 text-sm mt-1 leading-relaxed">
              As per school policy, account deletions must be approved by an administrator. 
              Once you submit this request, an admin will review it and process the permanent removal of your data.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why do you want to delete your account? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[120px]"
              placeholder="Please explain why you wish to leave KLevelUp..."
              required
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              To confirm your request, please type <span className="font-bold text-red-600">DELETE</span> below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
              placeholder="Type DELETE here"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || confirmText !== 'DELETE' || !reason.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Deletion Request
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-800">
          <p className="font-bold mb-1">Important Note</p>
          <p>After submission, you will still be able to use your account until the admin processes the deletion. If you change your mind, please contact the administration immediately.</p>
        </div>
      </div>
    </div>
  );
}
