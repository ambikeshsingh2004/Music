// API client for backend endpoints

const API_HOST = process.env.NEXT_PUBLIC_API_HOST;
const API_URL = API_HOST ? `https://${API_HOST}` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

if (typeof window !== 'undefined') {
  console.log('🔌 Connecting to API at:', API_URL);
}

class ApiClient {
  constructor() {
    this.token = null;
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Get authentication token
  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  // Clear token
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Make authenticated request
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth endpoints
  async register(email, username, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password })
    });
    this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // Project endpoints
  async getProjects() {
    return this.request('/api/projects');
  }

  async getPublicProjects() {
    return this.request('/api/projects/public');
  }

  async getProject(projectId) {
    return this.request(`/api/projects/${projectId}`);
  }

  async createProject(name, description) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  async updateProject(projectId, data) {
    return this.request(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProject(projectId) {
    return this.request(`/api/projects/${projectId}`, {
      method: 'DELETE'
    });
  }

  // Version endpoints
  async getVersions(projectId) {
    return this.request(`/api/versions/projects/${projectId}/versions`);
  }

  async getVersion(projectId, versionId) {
    return this.request(`/api/versions/projects/${projectId}/versions/${versionId}`);
  }

  async createVersion(projectId, musicData, metadata, message, parentVersionId) {
    return this.request(`/api/versions/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ musicData, metadata, message, parentVersionId })
    });
  }

  async revertToVersion(projectId, versionId) {
    return this.request(`/api/versions/projects/${projectId}/revert/${versionId}`, {
      method: 'POST'
    });
  }

  // Proposal endpoints
  async getProposals(projectId) {
    return this.request(`/api/proposals/projects/${projectId}/proposals`);
  }

  async createProposal(projectId, proposedVersionId, title, description) {
    return this.request(`/api/proposals/projects/${projectId}/proposals`, {
      method: 'POST',
      body: JSON.stringify({ proposedVersionId, title, description })
    });
  }

  async acceptProposal(proposalId) {
    return this.request(`/api/proposals/${proposalId}/accept`, {
      method: 'POST'
    });
  }

  async rejectProposal(proposalId) {
    return this.request(`/api/proposals/${proposalId}/reject`, {
      method: 'POST'
    });
  }

  // Collaborator endpoints
  async getCollaborators(projectId) {
    return this.request(`/api/collaborators/projects/${projectId}/collaborators`);
  }

  async addCollaborator(projectId, userEmail, role) {
    return this.request(`/api/collaborators/projects/${projectId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ userEmail, role })
    });
  }

  async removeCollaborator(projectId, userId) {
    return this.request(`/api/collaborators/projects/${projectId}/collaborators/${userId}`, {
      method: 'DELETE'
    });
  }

  // User endpoints
  async getAllUsers() {
    return this.request('/api/users');
  }

  async getAvailableUsers(projectId) {
    return this.request(`/api/users/available/${projectId}`);
  }

  async searchUsers(query) {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  }

  // Collaboration request endpoints
  async getMyCollaborationRequests() {
    return this.request('/api/collaboration-requests/my-requests');
  }

  async sendCollaborationRequest(projectId, recipientId, message) {
    return this.request('/api/collaboration-requests', {
      method: 'POST',
      body: JSON.stringify({ projectId, recipientId, message })
    });
  }

  async acceptCollaborationRequest(requestId) {
    return this.request(`/api/collaboration-requests/${requestId}/accept`, {
      method: 'POST'
    });
  }

  async rejectCollaborationRequest(requestId) {
    return this.request(`/api/collaboration-requests/${requestId}/reject`, {
      method: 'POST'
    });
  }

  async cancelCollaborationRequest(requestId) {
    return this.request(`/api/collaboration-requests/${requestId}`, {
      method: 'DELETE'
    });
  }

  // Messaging endpoints
  async getConversations() {
    return this.request('/api/messages/conversations');
  }

  async createDirectConversation(recipientId) {
    return this.request('/api/messages/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ recipientId })
    });
  }

  async createProjectConversation(projectId) {
    return this.request('/api/messages/conversations/project', {
      method: 'POST',
      body: JSON.stringify({ projectId })
    });
  }

  async getMessages(conversationId, limit = 50, before = null) {
    let url = `/api/messages/conversations/${conversationId}/messages?limit=${limit}`;
    if (before) {
      url += `&before=${before}`;
    }
    return this.request(url);
  }

  async sendMessage(conversationId, content, messageType = 'text', metadata = null) {
    return this.request(`/api/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType, metadata })
    });
  }

  async markConversationRead(conversationId) {
    return this.request(`/api/messages/conversations/${conversationId}/read`, {
      method: 'POST'
    });
  }

  async getConversationParticipants(conversationId) {
    return this.request(`/api/messages/conversations/${conversationId}/participants`);
  }
}

// Export singleton instance
const apiClient = new ApiClient();
export default apiClient;
