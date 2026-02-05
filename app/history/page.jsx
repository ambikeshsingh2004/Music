'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api';
import { toast } from 'react-toastify';
import UserControls from '@/components/UserControls';

function HistoryContent() {
  const [project, setProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [playingVersion, setPlayingVersion] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(null);
  const audioContextRef = useRef(null);
  const scheduledEventsRef = useRef([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  useEffect(() => {
    checkAuth();
    return () => {
      // Cleanup audio on unmount
      stopPlayback();
    };
  }, []);

  useEffect(() => {
    if (user && projectId) {
      loadProjectHistory();
    }
  }, [user, projectId]);

  const checkAuth = async () => {
    try {
      const data = await apiClient.getCurrentUser();
      setUser(data.user);
    } catch (error) {
      router.push('/auth');
    }
  };

  const loadProjectHistory = async () => {
    try {
      const [projectData, versionsData, proposalsData] = await Promise.all([
        apiClient.getProject(projectId),
        apiClient.getVersions(projectId),
        apiClient.getProposals(projectId)
      ]);
      
      setProject(projectData.project);
      setVersions(versionsData.versions || []);
      setProposals(proposalsData.proposals || []);
    } catch (error) {
      console.error('Failed to load project history:', error);
    } finally {
      setLoading(false);
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
      toast.error('Failed to play: ' + error.message);
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

  const handleRevert = async (versionId) => {
    if (!confirm('Move HEAD to this version?\n\nThis doesn\'t delete any versions - it just changes which version is current.')) return;

    try {
      await apiClient.revertToVersion(projectId, versionId);
      alert('HEAD moved!');
      loadProjectHistory();
    } catch (error) {
      alert(error.message || 'Failed to move HEAD');
    }
  };

  const handleAcceptProposal = async (proposalId) => {
    if (!confirm('Accept this proposal? HEAD will move to this version.')) return;

    try {
      await apiClient.acceptProposal(proposalId);
      alert('Proposal accepted! HEAD moved.');
      loadProjectHistory();
    } catch (error) {
      alert(error.message || 'Failed to accept proposal');
    }
  };

  const handleRejectProposal = async (proposalId) => {
    if (!confirm('Reject this proposal?')) return;

    try {
      await apiClient.rejectProposal(proposalId);
      alert('Proposal rejected');
      loadProjectHistory();
    } catch (error) {
      alert(error.message || 'Failed to reject proposal');
    }
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

  if (!projectId || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📜</div>
          <p className="text-xl text-white">Project not found or selected</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg hover:scale-105 transition-transform"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // Access check: User must be the owner of the project
  // This fulfills "only see history of songs created by me"
  if (project.owner_id !== user.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⛔</div>
          <p className="text-xl text-white mb-2">Access Restricted</p>
          <p className="text-gray-400">You can only view history for projects created by you.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const pendingProposals = proposals.filter(p => p.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
      {/* Header */}
      <div className="bg-black border-b border-white/10 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent truncate">
                📜 {project.name}
              </h1>
              <p className="text-gray-400 text-[10px] sm:text-sm mt-0.5 sm:mt-1">Version History</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push(`/compose/${projectId}`)}
                className="px-3 sm:px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.3)] text-xs sm:text-sm"
              >
                <span>🎵</span> <span className="hidden sm:inline">Back to Composer</span>
              </button>
              <UserControls />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Pending Proposals */}
        {pendingProposals.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
              {pendingProposals.length} Pending Proposal{pendingProposals.length > 1 ? 's' : ''}
            </h2>
            <div className="space-y-3">
              {pendingProposals.map(proposal => (
                <div key={proposal.id} className="bg-white/5 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">{proposal.title}</h3>
                    <p className="text-sm text-gray-400">{proposal.description || 'No description'}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Proposed by <span className="text-cyan-400">{proposal.proposer_username}</span> • {new Date(proposal.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAcceptProposal(proposal.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition flex items-center gap-1"
                    >
                      <span>✓</span> Accept
                    </button>
                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition flex items-center gap-1"
                    >
                      <span>✗</span> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Versions Timeline */}
        {versions.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/5">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-xl font-semibold text-white">No versions saved yet</p>
            <p className="text-sm mt-2 max-w-md mx-auto">
              Go to the composer and click "Save Version" to create a checkpoint of your work.
            </p>
            <button
              onClick={() => router.push(`/compose/${projectId}`)}
              className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              Start Composing
            </button>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-8 before:top-8 before:bottom-8 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:to-purple-500 before:opacity-30">
            {versions.map((version, index) => {
              const isPlaying = playingVersion === version.id;
              const trackCount = getTrackCount(version);
              const eventCount = getEventCount(version);
              
              return (
                <div 
                  key={version.id} 
                  className={`relative pl-12 sm:pl-20 transition-all duration-300 ${
                    isPlaying ? 'scale-[1.01] sm:scale-[1.02]' : 'hover:pl-14 sm:hover:pl-24'
                  }`}
                >
                  {/* Timeline Dot */}
                  <div className={`absolute left-[15px] sm:left-[29px] top-6 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transform -translate-x-1/2 transition-colors ${
                    index === 0 ? 'bg-cyan-500 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-black border-gray-500'
                  }`}></div>
                  
                  {/* Version Card */}
                  <div className={`bg-white/5 backdrop-blur-md rounded-xl p-3 sm:p-5 border transition-all ${
                    isPlaying 
                      ? 'border-green-500/50 bg-green-900/10 shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
                      : index === 0 
                        ? 'border-cyan-500/30 bg-cyan-900/10' 
                        : 'border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[10px] sm:text-sm font-mono px-2 py-0.5 rounded ${
                            index === 0 ? 'bg-cyan-500 text-black font-bold' : 'bg-white/10 text-gray-400'
                          }`}>
                            v{versions.length - index}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-500">
                            {new Date(version.created_at).toLocaleString()}
                          </span>
                          {index === 0 && (
                            <span className="text-xs text-cyan-400 font-semibold tracking-wider">LATEST</span>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-bold text-white mb-1">
                          {version.message || <span className="text-gray-500 italic">No description</span>}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                          <div className="flex items-center gap-1">
                            <span>👤</span> {version.creator_username}
                          </div>
                          <div className="flex items-center gap-1">
                            <span>🎹</span> {trackCount} tracks
                          </div>
                          <div className="flex items-center gap-1">
                            <span>🎵</span> {eventCount} notes
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handlePlayVersion(version)}
                          disabled={loadingPreview && loadingPreview !== version.id}
                          className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 w-32 ${
                            isPlaying
                              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          {loadingPreview === version.id ? (
                            <span className="animate-spin">⌛</span>
                          ) : isPlaying ? (
                            <>⏹ Stop</>
                          ) : (
                            <>▶ Preview</>
                          )}
                        </button>

                        {index !== 0 && (
                          <button
                            onClick={() => handleRevert(version.id)}
                            className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-sm font-semibold transition w-32"
                          >
                            ⟲ Revert
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center text-white">Loading history...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
