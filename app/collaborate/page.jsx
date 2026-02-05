'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function CollaboratePage() {
  const [activeTab, setActiveTab] = useState('received');
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await apiClient.getMyCollaborationRequests();
      setSentRequests(data.sent);
      setReceivedRequests(data.received);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await apiClient.acceptCollaborationRequest(requestId);
      alert('Collaboration request accepted!');
      loadRequests();
    } catch (error) {
      alert(error.message || 'Failed to accept request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await apiClient.rejectCollaborationRequest(requestId);
      alert('Collaboration request rejected');
      loadRequests();
    } catch (error) {
      alert(error.message || 'Failed to reject request');
    }
  };

  const handleCancel = async (requestId) => {
    try {
      await apiClient.cancelCollaborationRequest(requestId);
      alert('Collaboration request cancelled');
      loadRequests();
    } catch (error) {
      alert(error.message || 'Failed to cancel request');
    }
  };

  const renderRequest = (request, type) => {
    const isPending = request.status === 'pending';
    const isReceived = type === 'received';

    return (
      <div
        key={request.id}
        className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-4"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">{request.project_name}</h3>
            <p className="text-gray-400 text-sm">
              {isReceived ? (
                <>From: <span className="text-cyan-400">{request.sender_username}</span></>
              ) : (
                <>To: <span className="text-purple-400">{request.recipient_username}</span></>
              )}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              request.status === 'pending'
                ? 'bg-yellow-500/20 text-yellow-300'
                : request.status === 'accepted'
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            }`}
          >
            {request.status}
          </span>
        </div>

        {request.message && (
          <p className="text-gray-300 mb-4 italic">"{request.message}"</p>
        )}

        <div className="flex gap-3">
          {isReceived && isPending && (
            <>
              <button
                onClick={() => handleAccept(request.id)}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
              >
                Accept
              </button>
              <button
                onClick={() => handleReject(request.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
              >
                Reject
              </button>
            </>
          )}
          {!isReceived && isPending && (
            <button
              onClick={() => handleCancel(request.id)}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition"
            >
              Cancel Request
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          {new Date(request.created_at).toLocaleString()}
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Collaboration Requests
          </h1>
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Projects</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'received'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Received ({receivedRequests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'sent'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Sent ({sentRequests.filter(r => r.status === 'pending').length})
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'received' ? (
            receivedRequests.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-xl">No collaboration requests received</p>
              </div>
            ) : (
              receivedRequests.map(request => renderRequest(request, 'received'))
            )
          ) : (
            sentRequests.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-xl">No collaboration requests sent</p>
                <button
                  onClick={() => router.push('/discover')}
                  className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold hover:scale-105 transition-transform"
                >
                  Discover Musicians
                </button>
              </div>
            ) : (
              sentRequests.map(request => renderRequest(request, 'sent'))
            )
          )}
        </div>
      </div>
    </div>
  );
}
