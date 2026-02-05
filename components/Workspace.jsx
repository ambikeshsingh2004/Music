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
import { toast } from 'react-toastify';

export default function Workspace({ projectId }) {
  const { currentProject, tracks, selectedInstrument } = useProjectStore();
  const { instrumentManager, timeline, eventRecorder, eventScheduler } = useAudioEngine();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        toast.info('📝 Changes submitted as a proposal! Review pending from project owner.');
      } else {
        toast.success('✅ Project saved successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('❌ Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? '✖️' : '☰'}
            </button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold truncate max-w-[150px] sm:max-w-none">
                {currentProject?.name || 'Untitled Project'}
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">{currentProject?.description}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition-colors p-2"
              title="Return Home"
            >
              🏠
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-3 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {saving ? '⏳...' : '💾 Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Instruments & Controls */}
        <div className={`
          fixed lg:relative z-40 inset-y-0 left-0 w-80 bg-black/95 lg:bg-black/30 backdrop-blur-xl lg:backdrop-blur-lg border-r border-white/10 p-4 overflow-y-auto transition-transform duration-300
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
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

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Center - Timeline (Full Width) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TimelineView tracks={tracks} timeline={timeline} />
        </div>
      </div>

      {/* Footer - Empty or metadata */}
      <div className="bg-black/50 backdrop-blur-lg border-t border-white/10 p-2">
        <div className="text-[10px] text-gray-500 text-center">
          Musically v1.0 | Collaborative Studio
        </div>
      </div>
    </div>
  );
}
