'use client';

import { useState } from 'react';
import useProjectStore from '@/store/projectStore';
import Track from '@/lib/timeline/Track';

export default function TransportControls({ timeline, eventRecorder, eventScheduler }) {
  const { 
    isPlaying, 
    isRecording, 
    tempo, 
    tracks,
    setIsPlaying, 
    setIsRecording, 
    setTempo,
    addTrack,
    selectedInstrument
  } = useProjectStore();

  const handlePlay = () => {
    if (isPlaying) {
      timeline?.pause();
      setIsPlaying(false);
    } else {
      // Schedule all tracks
      if (eventScheduler && tracks.length > 0) {
        eventScheduler.scheduleTracks(tracks);
      }
      timeline?.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    timeline?.stop();
    eventScheduler?.clearSchedule();
    setIsPlaying(false);
    setIsRecording(false);
  };

  const handleRecord = () => {
    if (isRecording) {
      // Stop recording
      eventRecorder?.stopRecording();
      setIsRecording(false);
    } else {
      // Start recording - create new track
      const newTrack = new Track(`track_${Date.now()}`, selectedInstrument);
      addTrack(newTrack);
      eventRecorder?.startRecording(newTrack);
      timeline?.startRecording();
      setIsRecording(true);
    }
  };

  const handleTempoChange = (e) => {
    const newTempo = parseInt(e.target.value);
    setTempo(newTempo);
    timeline?.setTempo(newTempo);
  };

  return (
    <div className="bg-white/5 rounded-xl p-4">
      <h3 className="text-lg font-semibold mb-4">Transport</h3>
      
      {/* Playback Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handlePlay}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            isPlaying
              ? 'bg-yellow-600 hover:bg-yellow-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={handleStop}
          className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
        >
          ⏹ Stop
        </button>
      </div>

      {/* Record Button */}
      <button
        onClick={handleRecord}
        className={`w-full py-3 rounded-lg font-semibold transition mb-4 ${
          isRecording
            ? 'bg-red-600 hover:bg-red-700 animate-pulse'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {isRecording ? '⏺ Recording...' : '⏺ Record'}
      </button>

      {/* Tempo Control */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Tempo: {tempo} BPM
        </label>
        <input
          type="range"
          min="60"
          max="200"
          value={tempo}
          onChange={handleTempoChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
