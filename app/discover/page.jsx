'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function DiscoverPage() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiClient.getAllUsers();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await apiClient.getProjects();
      setProjects(data.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length < 2) {
      loadUsers();
      return;
    }

    try {
      const data = await apiClient.searchUsers(query);
      setUsers(data.users);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const openInviteModal = (user) => {
    setSelectedUser(user);
    setShowInviteModal(true);
    setSelectedProject('');
    setInviteMessage('');
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    
    if (!selectedProject) {
      alert('Please select a project');
      return;
    }

    try {
      await apiClient.sendCollaborationRequest(
        selectedProject,
        selectedUser.id,
        inviteMessage
      );
      alert('Invitation sent successfully!');
      setShowInviteModal(false);
    } catch (error) {
      alert(error.message || 'Failed to send invitation');
    }
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Discover Musicians
          </h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            ← Back to Projects
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by username or email..."
            className="w-full px-6 py-4 bg-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* User Grid */}
        {users.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">No users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => (
              <div
                key={user.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/15 transition"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-lg">{user.username}</h3>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => openInviteModal(user)}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold hover:scale-105 transition-transform"
                >
                  Invite to Project
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">
                Invite {selectedUser.username}
              </h2>
              <form onSubmit={sendInvite}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Select Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  >
                    <option value="">Choose a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Let's make music together!"
                    rows={3}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold hover:scale-105 transition-transform"
                  >
                    Send Invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
