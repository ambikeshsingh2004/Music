'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

export default function DiscoverPage() {
  const [publicProjects, setPublicProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [playingProject, setPlayingProject] = useState(null);
  const audioContextRef = useRef(null);
  const scheduledEventsRef = useRef([]);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    return () => {
      stopPlayback();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadPublicProjects();
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

  const loadPublicProjects = async () => {
    try {
      const data = await apiClient.getPublicProjects();
      setPublicProjects(data.projects);
    } catch (error) {
      console.error('Failed to load public projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = publicProjects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.owner_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Play a project's current version
  const handlePlayProject = async (project) => {
    if (playingProject === project.id) {
      stopPlayback();
      return;
    }

    stopPlayback();

    try {
      // Fetch the full project with current version
      const data = await apiClient.getProject(project.id);
      const currentVersion = data.currentVersion;

      if (!currentVersion?.music_data?.tracks?.length) {
        alert('No music in this project yet');
        return;
      }

      const Tone = await initAudio();
      if (!Tone) return;

      const musicData = currentVersion.music_data;

      // Create synths
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
                  instrument.triggerAttackRelease(event.note, event.duration || '8n', time, event.velocity || 0.8);
                }
              } catch (e) {}
            }, scheduleTime);
            scheduledEventsRef.current.push(eventId);
          } else if (event.type === 'drum') {
            const eventId = Tone.Transport.schedule((time) => {
              try {
                synths.drums.triggerAttackRelease('C2', '8n', time);
              } catch (e) {}
            }, scheduleTime);
            scheduledEventsRef.current.push(eventId);
          }
        });
      });

      audioContextRef.current = { synths, Tone };
      Tone.Transport.start();
      setPlayingProject(project.id);

      setTimeout(() => {
        if (playingProject === project.id) {
          stopPlayback();
        }
      }, (maxTime + 1) * 1000);

    } catch (error) {
      console.error('Failed to play project:', error);
    }
  };

  const stopPlayback = async () => {
    try {
      if (typeof window !== 'undefined') {
        const ToneModule = await import('tone');
        const Tone = ToneModule.default || ToneModule;
        
        scheduledEventsRef.current.forEach(eventId => {
          Tone.Transport.clear(eventId);
        });
        scheduledEventsRef.current = [];
        Tone.Transport.stop();
        Tone.Transport.position = 0;

        if (audioContextRef.current?.synths) {
          Object.values(audioContextRef.current.synths).forEach(synth => {
            try { synth.dispose(); } catch (e) {}
          });
        }
        audioContextRef.current = null;
      }
    } catch (e) {}
    setPlayingProject(null);
  };

  const getInitials = (username) => username ? username.substring(0, 2).toUpperCase() : '??';

  const getUserColor = (username) => {
    const colors = [
      'from-cyan-500 to-blue-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-yellow-500 to-orange-500',
      'from-pink-500 to-rose-500',
    ];
    let hash = 0;
    for (let i = 0; i < (username?.length || 0); i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
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
                🎵 Discover Music
              </h1>
              <p className="text-gray-400 text-sm mt-1">Explore, listen, and contribute to music projects</p>
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

      {/* Search */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by project name, creator, or description..."
          className="w-full px-6 py-4 bg-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Projects Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-xl">No projects found</p>
            {publicProjects.length === 0 && (
              <p className="text-sm mt-2">Be the first to create a music project!</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const isPlaying = playingProject === project.id;
              const isOwnProject = project.owner_id === user?.id;

              return (
                <div
                  key={project.id}
                  className={`bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden hover:bg-white/10 transition ${
                    isPlaying ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  {/* Project Header */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Creator Avatar */}
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getUserColor(project.owner_username)} flex items-center justify-center text-lg font-bold flex-shrink-0`}>
                        {getInitials(project.owner_username)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate flex items-center gap-2">
                          {project.name}
                          {isOwnProject && (
                            <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full">
                              Yours
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-400">
                          by <span className="text-purple-400">{project.owner_username}</span>
                        </p>
                        {project.description && (
                          <p className="text-sm text-gray-500 mt-1 truncate">{project.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                      <span>📜 {project.version_count || 0} versions</span>
                      <span>👥 {project.collaborator_count || 1} contributors</span>
                      <span>📅 {formatDate(project.updated_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 pb-5 flex gap-2">
                    {/* Play Button */}
                    <button
                      onClick={() => handlePlayProject(project)}
                      className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                        isPlaying
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isPlaying ? (
                        <>⏹ Stop</>
                      ) : (
                        <>▶ Play</>
                      )}
                    </button>

                    {/* Open/Edit Button */}
                    <button
                      onClick={() => router.push(`/compose/${project.id}`)}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold hover:scale-105 transition-transform flex items-center justify-center gap-2"
                    >
                      {isOwnProject ? '✏️ Edit' : '🎨 Remix'}
                    </button>
                  </div>

                  {/* Info Banner for non-owners */}
                  {!isOwnProject && (
                    <div className="px-5 pb-4">
                      <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-2 text-center">
                        💡 Make changes and save to send a proposal to the creator
                      </div>
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
