'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function HistoryPage() {
  const [projects, setProjects] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [projectVersions, setProjectVersions] = useState({});
  const [projectProposals, setProjectProposals] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [playingVersion, setPlayingVersion] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(null);
  const audioContextRef = useRef(null);
  const scheduledEventsRef = useRef([]);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    return () => {
      // Cleanup audio on unmount
      stopPlayback();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const data = await apiClient.getCurrentUser();
      setUser(data.user);
    } catch (error) {
      router.push('/auth');
    }
  };

  const loadProjects = async () => {
    try {
      const data = await apiClient.getProjects();
      setProjects(data.projects);
      
      if (data.projects.length > 0) {
        toggleProject(data.projects[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = async (projectId) => {
    setExpandedProjects(prev => {
      const newExpanded = { ...prev, [projectId]: !prev[projectId] };
      
      if (newExpanded[projectId] && !projectVersions[projectId]) {
        loadProjectData(projectId);
      }
      
      return newExpanded;
    });
  };

  const loadProjectData = async (projectId) => {
    try {
      const [versionsData, proposalsData] = await Promise.all([
        apiClient.getVersions(projectId),
        apiClient.getProposals(projectId)
      ]);
      
      setProjectVersions(prev => ({ ...prev, [projectId]: versionsData.versions }));
      setProjectProposals(prev => ({ ...prev, [projectId]: proposalsData.proposals }));
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  };

  // Initialize Tone.js for audio playback
  const initAudio = async () => {
    if (typeof window !== 'undefined') {
      const ToneModule = await import('tone');
      const Tone = ToneModule.default || ToneModule;
      await Tone.start();
      return Tone;
    }
    return null;
  };

  // Play a specific version
  const handlePlayVersion = async (version) => {
    // Stop current playback if any
    if (playingVersion === version.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setLoadingPreview(version.id);

    try {
      const Tone = await initAudio();
      if (!Tone) return;

      // Get the music data from the version
      const musicData = version.music_data;
      if (!musicData || !musicData.tracks || musicData.tracks.length === 0) {
        alert('No music data in this version');
        setLoadingPreview(null);
        return;
      }

      // Create simple synths for playback
      const synths = {
        piano: new Tone.PolySynth(Tone.Synth).toDestination(),
        bass: new Tone.MonoSynth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.8 }
        }).toDestination(),
        lead: new Tone.Synth({ oscillator: { type: 'square' } }).toDestination(),
        pad: new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.5, decay: 0.2, sustain: 0.8, release: 1 }
        }).toDestination(),
        guitar: new Tone.PluckSynth().toDestination(),
        drums: new Tone.MembraneSynth().toDestination()
      };

      // Schedule all events
      let maxTime = 0;
      musicData.tracks.forEach(track => {
        const instrument = synths[track.instrumentType] || synths.piano;
        
        track.events.forEach(event => {
          const scheduleTime = event.time || 0;
          maxTime = Math.max(maxTime, scheduleTime + (event.duration || 0.5));

          if (event.type === 'note' || event.note) {
            const eventId = Tone.Transport.schedule((time) => {
              try {
                if (track.instrumentType === 'drums') {
                  synths.drums.triggerAttackRelease('C2', '8n', time);
                } else {
                  instrument.triggerAttackRelease(
                    event.note,
                    event.duration || '8n',
                    time,
                    event.velocity || 0.8
                  );
                }
              } catch (e) {
                console.warn('Playback error:', e);
              }
            }, scheduleTime);
            scheduledEventsRef.current.push(eventId);
          } else if (event.type === 'drum') {
            const eventId = Tone.Transport.schedule((time) => {
              try {
                synths.drums.triggerAttackRelease('C2', '8n', time);
              } catch (e) {
                console.warn('Drum playback error:', e);
              }
            }, scheduleTime);
            scheduledEventsRef.current.push(eventId);
          }
        });
      });

      // Store synths for cleanup
      audioContextRef.current = { synths, Tone };

      // Start playback
      Tone.Transport.start();
      setPlayingVersion(version.id);
      setLoadingPreview(null);

      // Auto-stop after track ends
      setTimeout(() => {
        if (playingVersion === version.id) {
          stopPlayback();
        }
      }, (maxTime + 1) * 1000);

    } catch (error) {
      console.error('Failed to play version:', error);
      alert('Failed to play: ' + error.message);
      setLoadingPreview(null);
    }
  };

  // Stop playback
  const stopPlayback = async () => {
    try {
      if (typeof window !== 'undefined') {
        const ToneModule = await import('tone');
        const Tone = ToneModule.default || ToneModule;
        
        // Clear scheduled events
        scheduledEventsRef.current.forEach(eventId => {
          Tone.Transport.clear(eventId);
        });
        scheduledEventsRef.current = [];

        // Stop transport
        Tone.Transport.stop();
        Tone.Transport.position = 0;

        // Dispose synths
        if (audioContextRef.current?.synths) {
          Object.values(audioContextRef.current.synths).forEach(synth => {
            try { synth.dispose(); } catch (e) {}
          });
        }
        audioContextRef.current = null;
      }
    } catch (e) {
      console.warn('Stop playback error:', e);
    }
    setPlayingVersion(null);
  };

  const handleRevert = async (projectId, versionId, versionNumber) => {
    if (!confirm(`Move HEAD to Version ${versionNumber}?\n\nThis doesn't delete any versions - it just changes which version is current.`)) return;

    try {
      await apiClient.revertToVersion(projectId, versionId);
      alert(`HEAD moved to Version ${versionNumber}!`);
      loadProjectData(projectId);
      loadProjects();
    } catch (error) {
      alert(error.message || 'Failed to move HEAD');
    }
  };

  const handleAcceptProposal = async (projectId, proposalId) => {
    if (!confirm('Accept this proposal? HEAD will move to this version.')) return;

    try {
      await apiClient.acceptProposal(proposalId);
      alert('Proposal accepted! HEAD moved.');
      loadProjectData(projectId);
      loadProjects();
    } catch (error) {
      alert(error.message || 'Failed to accept proposal');
    }
  };

  const handleRejectProposal = async (projectId, proposalId) => {
    if (!confirm('Reject this proposal?')) return;

    try {
      await apiClient.rejectProposal(proposalId);
      alert('Proposal rejected');
      loadProjectData(projectId);
    } catch (error) {
      alert(error.message || 'Failed to reject proposal');
    }
  };

  const isOwner = (project) => project?.owner_id === user?.id;
  const getPendingCount = (projectId) => {
    const proposals = projectProposals[projectId] || [];
    return proposals.filter(p => p.status === 'pending').length;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (username) => {
    return username ? username.substring(0, 2).toUpperCase() : '??';
  };

  const getUserColor = (username) => {
    const colors = [
      'from-cyan-500 to-blue-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-yellow-500 to-orange-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-purple-500',
    ];
    let hash = 0;
    for (let i = 0; i < (username?.length || 0); i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getTrackCount = (version) => {
    const musicData = version.music_data;
    if (!musicData || !musicData.tracks) return 0;
    return musicData.tracks.length;
  };

  const getEventCount = (version) => {
    const musicData = version.music_data;
    if (!musicData || !musicData.tracks) return 0;
    return musicData.tracks.reduce((sum, track) => sum + (track.events?.length || 0), 0);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                📜 Version History
              </h1>
              <p className="text-gray-400 text-sm mt-1">Listen to and manage your music versions</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              ← Back to Projects
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl">No projects yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map(project => {
              const isExpanded = expandedProjects[project.id];
              const versions = projectVersions[project.id] || [];
              const proposals = projectProposals[project.id] || [];
              const pendingCount = getPendingCount(project.id);
              const projectIsOwner = isOwner(project);

              return (
                <div key={project.id} className="bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden">
                  {/* Project Header */}
                  <div
                    onClick={() => toggleProject(project.id)}
                    className="p-5 cursor-pointer hover:bg-white/5 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 flex items-center justify-center text-xl transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </div>
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-3">
                          {project.name}
                          {projectIsOwner && (
                            <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full">Owner</span>
                          )}
                          {pendingCount > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full animate-pulse">
                              {pendingCount} pending
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-400">{versions.length || '?'} versions saved</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/compose/${project.id}`);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold hover:scale-105 transition-transform text-sm"
                    >
                      Open Composer
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-6">
                      {/* Pending Proposals */}
                      {pendingCount > 0 && (
                        <div className="mb-8">
                          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
                            Pending Proposals
                          </h4>
                          <div className="space-y-3">
                            {proposals.filter(p => p.status === 'pending').map(proposal => (
                              <div key={proposal.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getUserColor(proposal.proposed_by_username)} flex items-center justify-center text-sm font-bold`}>
                                      {getInitials(proposal.proposed_by_username)}
                                    </div>
                                    <div>
                                      <h5 className="font-semibold">{proposal.title}</h5>
                                      <p className="text-sm text-gray-400">
                                        by {proposal.proposed_by_username} • {formatDate(proposal.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  {projectIsOwner && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleAcceptProposal(project.id, proposal.id)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition"
                                      >
                                        ✓ Accept
                                      </button>
                                      <button
                                        onClick={() => handleRejectProposal(project.id, proposal.id)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition"
                                      >
                                        ✗ Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Version Graph */}
                      <h4 className="text-lg font-semibold mb-4">Version Graph</h4>
                      
                      {versions.length === 0 ? (
                        <p className="text-gray-400">No versions yet. Save your first version in the composer.</p>
                      ) : (
                        <div className="relative">
                          {/* Graph Container */}
                          <div className="flex flex-col gap-0">
                            {versions.map((version, index) => {
                              const isCurrentVersion = project.current_version_id === version.id;
                              const isLast = index === versions.length - 1;
                              const isPlaying = playingVersion === version.id;
                              const isLoadingThis = loadingPreview === version.id;
                              const trackCount = getTrackCount(version);
                              const eventCount = getEventCount(version);
                              
                              return (
                                <div key={version.id} className="flex items-stretch">
                                  {/* Graph Line & Node */}
                                  <div className="flex flex-col items-center w-16 flex-shrink-0">
                                    {index > 0 && (
                                      <div className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-purple-500"></div>
                                    )}
                                    {index === 0 && <div className="h-4"></div>}
                                    
                                    {/* Node */}
                                    <div className="relative">
                                      <div className={`w-6 h-6 rounded-full border-4 transition-all ${
                                        isCurrentVersion 
                                          ? 'bg-cyan-400 border-cyan-300 shadow-lg shadow-cyan-500/50 scale-125' 
                                          : 'bg-gray-700 border-gray-500 hover:border-gray-400'
                                      }`}>
                                      </div>
                                      {isCurrentVersion && (
                                        <div className="absolute -right-14 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-cyan-500 text-black text-xs font-bold rounded whitespace-nowrap">
                                          HEAD
                                        </div>
                                      )}
                                    </div>
                                    
                                    {!isLast && (
                                      <div className="w-1 flex-1 min-h-4 bg-gradient-to-b from-purple-500 to-cyan-500"></div>
                                    )}
                                    {isLast && <div className="flex-1"></div>}
                                  </div>

                                  {/* Version Card */}
                                  <div className={`flex-1 mb-4 ml-4 p-4 rounded-xl transition-all ${
                                    isCurrentVersion 
                                      ? 'bg-cyan-500/20 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20' 
                                      : isPlaying
                                        ? 'bg-green-500/20 border-2 border-green-500/50'
                                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      {/* Left: Version Info */}
                                      <div className="flex items-center gap-4">
                                        {/* User Avatar */}
                                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getUserColor(version.created_by_username)} flex items-center justify-center text-lg font-bold shadow-lg`}>
                                          {getInitials(version.created_by_username)}
                                        </div>
                                        
                                        {/* Info */}
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold">v{version.version_number}</span>
                                            {isCurrentVersion && (
                                              <span className="text-xs px-2 py-0.5 bg-cyan-500 text-black rounded-full font-bold">
                                                CURRENT
                                              </span>
                                            )}
                                            {isPlaying && (
                                              <span className="text-xs px-2 py-0.5 bg-green-500 text-black rounded-full font-bold animate-pulse">
                                                ▶ PLAYING
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-300">{version.message}</p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <p className="text-xs text-gray-500">
                                              <span className="text-purple-400 font-medium">{version.created_by_username}</span>
                                              <span className="mx-2">•</span>
                                              {formatDate(version.created_at)}
                                            </p>
                                            {trackCount > 0 && (
                                              <span className="text-xs text-gray-500">
                                                🎵 {trackCount} tracks • {eventCount} events
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right: Actions */}
                                      <div className="flex items-center gap-2">
                                        {/* Play/Stop Button */}
                                        <button
                                          onClick={() => handlePlayVersion(version)}
                                          disabled={isLoadingThis}
                                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2 ${
                                            isPlaying
                                              ? 'bg-red-600 hover:bg-red-700'
                                              : isLoadingThis
                                                ? 'bg-gray-600 cursor-wait'
                                                : 'bg-green-600 hover:bg-green-700'
                                          }`}
                                        >
                                          {isLoadingThis ? (
                                            <>⏳ Loading...</>
                                          ) : isPlaying ? (
                                            <>⏹ Stop</>
                                          ) : (
                                            <>▶ Play</>
                                          )}
                                        </button>
                                        
                                        {!isCurrentVersion && (
                                          <button
                                            onClick={() => handleRevert(project.id, version.id, version.version_number)}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2"
                                          >
                                            <span>↩</span>
                                            Move HEAD
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Legend */}
                          <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-6 text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-cyan-300"></div>
                              <span>HEAD (current)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-green-400">▶</span>
                              <span>Click Play to preview</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400">↩</span>
                              <span>Move HEAD (no data deleted)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
