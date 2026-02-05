'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useProjectStore from '@/store/projectStore';
import useAudioEngine from '@/hooks/useAudioEngine';
import useKeyboard from '@/hooks/useKeyboard';
import InstrumentSelector from './InstrumentSelector';
import TransportControls from './TransportControls';
import TimelineView from './TimelineView';
import TrackControls from './TrackControls';
import apiClient from '@/lib/api';

export default function Workspace({ projectId }) {
  const { currentProject, tracks, selectedInstrument } = useProjectStore();
  const { instrumentManager, timeline, eventRecorder, eventScheduler } = useAudioEngine();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Initialize keyboard handling
  useKeyboard(instrumentManager, eventRecorder);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare music data from tracks
      const musicData = {
        tracks: tracks.map(track => ({
          id: track.id,
          instrumentType: track.instrumentType,
          events: track.events,
          volume: track.volume,
          muted: track.muted,
          solo: track.solo,
          color: track.color
        }))
      };

      // Prepare metadata
      const metadata = {
        tempo: timeline?.tempo || 120,
        timeSignature: '4/4',
        savedAt: new Date().toISOString()
      };

      // Create new version (or proposal if not owner)
      const result = await apiClient.createVersion(
        projectId,
        musicData,
        metadata,
        `Saved at ${new Date().toLocaleTimeString()}`,
        null // No parent version for now
      );

      // Show appropriate message based on result type
      if (result.type === 'proposal') {
        alert('📝 Your changes have been submitted as a proposal!\n\nThe project owner will review and approve your changes.');
      } else {
        alert('✅ Project saved successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('❌ Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{currentProject?.name || 'Untitled Project'}</h1>
            <p className="text-sm text-gray-400">{currentProject?.description}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition"
            >
              ← Back
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '⏳ Saving...' : '💾 Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Instruments & Controls */}
        <div className="w-80 bg-black/30 backdrop-blur-lg border-r border-white/10 p-4 overflow-y-scroll">
          <InstrumentSelector />
          <div className="mt-6">
            <TransportControls 
              timeline={timeline}
              eventRecorder={eventRecorder}
              eventScheduler={eventScheduler}
            />
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Tracks</h3>
            {tracks.length === 0 ? (
              <p className="text-gray-500 text-sm">No tracks yet. Start recording!</p>
            ) : (
              tracks.map(track => (
                <TrackControls key={track.id} track={track} />
              ))
            )}
          </div>
        </div>

        {/* Center - Timeline (Full Width) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TimelineView tracks={tracks} />
        </div>
      </div>

      {/* Footer - Keyboard Guide */}
      <div className="bg-black/50 backdrop-blur-lg border-t border-white/10 p-3">
        <div className="text-xs text-gray-400 text-center">
          <span className="font-semibold text-white">{selectedInstrument.toUpperCase()}</span> selected | 
          Use keyboard to play | 
          Press SPACE to play/pause | 
          Press R to record
        </div>
      </div>
    </div>
  );
}
