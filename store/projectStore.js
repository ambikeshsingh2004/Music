import { create } from 'zustand';

const useProjectStore = create((set, get) => ({
  // Current project
  currentProject: null,
  currentVersion: null,

  // Tracks
  tracks: [],

  // Timeline state
  isPlaying: false,
  isRecording: false,
  currentTime: 0,
  tempo: 120,
  timeSignature: '4/4',

  // Selected instrument
  selectedInstrument: null,

  // Version history
  versions: [],

  // Actions
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentVersion: (version) => set({ currentVersion: version }),

  setTracks: (tracks) => set({ tracks }),
  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
  removeTrack: (trackId) => set((state) => ({
    tracks: state.tracks.filter(t => t.id !== trackId)
  })),
  updateTrack: (trackId, updates) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t)
  })),

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setTempo: (tempo) => set({ tempo }),
  setTimeSignature: (timeSignature) => set({ timeSignature }),

  setSelectedInstrument: (instrument) => set({ selectedInstrument: instrument }),

  setVersions: (versions) => set({ versions }),
  addVersion: (version) => set((state) => ({ versions: [version, ...state.versions] })),

  // Load project data
  loadProject: (projectData) => {
    set({
      currentProject: projectData.project,
      currentVersion: projectData.currentVersion,
      tracks: projectData.currentVersion?.music_data?.tracks || [],
      tempo: projectData.currentVersion?.metadata?.tempo || 120,
      timeSignature: projectData.currentVersion?.metadata?.timeSignature || '4/4'
    });
  },

  // Update project name
  updateProjectName: (name) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, name } : null
  })),

  // Clear project
  clearProject: () => set({
    currentProject: null,
    currentVersion: null,
    tracks: [],
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    versions: []
  })
}));

export default useProjectStore;
