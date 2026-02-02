'use client';

import { useEffect, useState } from 'react';
import useCollaborationStore from '@/store/collaborationStore';
import apiClient from '@/lib/api';

export default function CollaborationPanel({ projectId }) {
  const { collaborators, activeUsers, proposals } = useCollaborationStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCollabEmail, setNewCollabEmail] = useState('');

  useEffect(() => {
    loadCollaborators();
    loadProposals();
  }, [projectId]);

  const loadCollaborators = async () => {
    try {
      const data = await apiClient.getCollaborators(projectId);
      useCollaborationStore.getState().setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Failed to load collaborators:', error);
    }
  };

  const loadProposals = async () => {
    try {
      const data = await apiClient.getProposals(projectId);
      useCollaborationStore.getState().setProposals(data.proposals);
    } catch (error) {
      console.error('Failed to load proposals:', error);
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    try {
      await apiClient.addCollaborator(projectId, newCollabEmail, 'editor');
      setNewCollabEmail('');
      setShowAddModal(false);
      loadCollaborators();
    } catch (error) {
      console.error('Failed to add collaborator:', error);
      alert('Failed to add collaborator');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Collaboration</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded"
        >
          + Add
        </button>
      </div>

      {/* Active Users */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">
          Active Now ({activeUsers.length})
        </h4>
        {activeUsers.map((user, i) => (
          <div key={i} className="flex items-center gap-2 text-sm mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>{user.username}</span>
          </div>
        ))}
      </div>

      {/* Collaborators */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">
          Collaborators ({collaborators.length})
        </h4>
        <div className="space-y-1">
          {collaborators.map((collab) => (
            <div key={collab.id} className="flex justify-between items-center text-sm">
              <span>{collab.username}</span>
              <span className="text-xs text-gray-500">{collab.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proposals */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">
          Proposals ({proposals.filter(p => p.status === 'pending').length})
        </h4>
        {proposals.filter(p => p.status === 'pending').map((proposal) => (
          <div key={proposal.id} className="bg-white/5 rounded p-2 mb-2 text-sm">
            <div className="font-medium">{proposal.title}</div>
            <div className="text-xs text-gray-400">{proposal.proposed_by_username}</div>
          </div>
        ))}
      </div>

      {/* Add Collaborator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Add Collaborator</h3>
            <form onSubmit={handleAddCollaborator}>
              <input
                type="email"
                value={newCollabEmail}
                onChange={(e) => setNewCollabEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg mb-4"
                placeholder="user@example.com"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 rounded-lg"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
