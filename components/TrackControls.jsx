'use client';

import useProjectStore from '@/store/projectStore';

export default function TrackControls({ track }) {
  const { updateTrack, removeTrack } = useProjectStore();

  const handleVolumeChange = (e) => {
    updateTrack(track.id, { volume: parseInt(e.target.value) });
  };

  const toggleMute = () => {
    updateTrack(track.id, { muted: !track.muted });
  };

  const toggleSolo = () => {
    updateTrack(track.id, { solo: !track.solo });
  };

  const handleDelete = () => {
    if (confirm('Delete this track?')) {
      removeTrack(track.id);
    }
  };

  return (
    <div className="bg-white/5 rounded-lg p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: track.color }}
          />
          <span className="text-sm font-medium">{track.instrumentType}</span>
        </div>
        <button
          onClick={handleDelete}
          className="text-red-400 hover:text-red-300 text-xs"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={toggleMute}
          className={`flex-1 px-2 py-1 text-xs rounded ${
            track.muted ? 'bg-red-600' : 'bg-white/10'
          }`}
        >
          M
        </button>
        <button
          onClick={toggleSolo}
          className={`flex-1 px-2 py-1 text-xs rounded ${
            track.solo ? 'bg-yellow-600' : 'bg-white/10'
          }`}
        >
          S
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-400">Volume</label>
        <input
          type="range"
          min="-40"
          max="0"
          value={track.volume}
          onChange={handleVolumeChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
