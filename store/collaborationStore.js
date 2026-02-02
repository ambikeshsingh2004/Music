import { create } from 'zustand';

const useCollaborationStore = create((set) => ({
  // Collaborators
  collaborators: [],
  activeUsers: [],

  // Proposals
  proposals: [],

  // Socket connection
  socket: null,
  isConnected: false,

  // Actions
  setCollaborators: (collaborators) => set({ collaborators }),
  addCollaborator: (collaborator) => set((state) => ({
    collaborators: [...state.collaborators, collaborator]
  })),
  removeCollaborator: (userId) => set((state) => ({
    collaborators: state.collaborators.filter(c => c.user_id !== userId)
  })),

  setActiveUsers: (users) => set({ activeUsers: users }),
  addActiveUser: (user) => set((state) => ({
    activeUsers: [...state.activeUsers, user]
  })),
  removeActiveUser: (userId) => set((state) => ({
    activeUsers: state.activeUsers.filter(u => u.userId !== userId)
  })),

  setProposals: (proposals) => set({ proposals }),
  addProposal: (proposal) => set((state) => ({
    proposals: [proposal, ...state.proposals]
  })),
  updateProposal: (proposalId, updates) => set((state) => ({
    proposals: state.proposals.map(p => p.id === proposalId ? { ...p, ...updates } : p)
  })),

  setSocket: (socket) => set({ socket, isConnected: !!socket }),
  disconnect: () => set({ socket: null, isConnected: false, activeUsers: [] })
}));

export default useCollaborationStore;
