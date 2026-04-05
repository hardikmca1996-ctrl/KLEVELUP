import React, { useEffect, useState } from 'react';
import { supabase, type DeletionRequest } from '../../lib/supabase';
import { Trash2, CheckCircle2, XCircle, Clock, Loader2, User, Mail, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DeletionRequests() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*, profile:profiles(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message.includes("Could not find the table 'public.deletion_requests'")) {
          setRequests([]);
        } else {
          throw error;
        }
      } else {
        setRequests(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching deletion requests:', error);
      toast.error('Failed to load deletion requests');
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (request: DeletionRequest) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE the account for ${request.profile?.name}? This action cannot be undone.`)) {
      return;
    }

    setProcessingId(request.id);
    try {
      // 1. Call the backend API to delete the user from Auth and database
      const response = await fetch(`/api/admin/delete-user/${request.profile_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      // 2. Update the request status to completed
      const { error: updateError } = await supabase
        .from('deletion_requests')
        .update({ status: 'completed' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success('Account deleted successfully');
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving deletion:', error);
      toast.error(error.message || 'Failed to process deletion');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to reject this deletion request?')) {
      return;
    }

    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('deletion_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request rejected');
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Deletion Requests</h1>
        <p className="text-gray-500">Review and process student requests for account removal.</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-green-50 rounded-full text-green-600 mb-4">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Pending Requests</h3>
          <p className="text-gray-500 mt-2">All account deletion requests have been processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                      {request.profile?.name?.[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{request.profile?.name}</h3>
                      <div className="flex flex-wrap gap-4 mt-1">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Mail className="w-4 h-4" />
                          {request.profile?.email}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          Requested on {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={processingId !== null}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processingId !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm shadow-red-200"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Approve & Delete
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Reason for Deletion</p>
                  <p className="text-gray-700 italic leading-relaxed">"{request.reason}"</p>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="w-4 h-4" />
                  <span>Warning: Approving this request will permanently delete all user data from Auth and Database.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
