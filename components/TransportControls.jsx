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

  const handlePlay = async () => {
    if (isPlaying) {
      timeline?.pause();
      setIsPlaying(false);
    } else {
      // Schedule all tracks
      if (eventScheduler && tracks.length > 0) {
        eventScheduler.scheduleTracks(tracks);
      }
      
      // CRITICAL: Start Tone.js audio context
      // Timeline.play() already calls Tone.start(), but we do it here to catch errors
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
    <div className="glass-strong rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <span className="text-xl sm:text-2xl">🎚️</span>
          Transport
        </h3>
        {isRecording && (
          <div className="flex items-center gap-2 text-red-400 animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">REC</span>
          </div>
        )}
      </div>
      
      {/* Playback Controls */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={handlePlay}
          className={`flex-1 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg btn-hover transition-all duration-300 ${
            isPlaying
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            {isPlaying ? '⏸' : '▶'} {isPlaying ? 'Pause' : 'Play'}
          </span>
        </button>
        <button
          onClick={handleStop}
          className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl font-semibold text-base sm:text-lg btn-hover shadow-lg shadow-red-500/30 transition-all duration-300"
        >
          <span className="flex items-center justify-center gap-2">
            ⏹ Stop
          </span>
        </button>
      </div>

      {/* Record Button */}
      <button
        onClick={handleRecord}
        className={`w-full py-4 sm:py-5 rounded-xl font-bold text-base sm:text-lg btn-hover transition-all duration-300 ${
          isRecording
            ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-2xl shadow-red-500/50 scale-105'
            : 'glass-strong hover:bg-white/10'
        }`}
      >
        <span className="flex items-center justify-center gap-2 sm:gap-3">
          <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-red-500'}`}></div>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </span>
      </button>

      {/* Tempo Control */}
      <div className="glass p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-2">
            <span>⏱️</span>
            Tempo
          </label>
          <span className="text-xl sm:text-2xl font-bold gradient-text-cyan">
            {tempo}
            <span className="text-[10px] sm:text-sm text-gray-400 ml-1">BPM</span>
          </span>
        </div>
        
        {/* Custom Styled Slider */}
        <div className="relative">
          <input
            type="range"
            min="60"
            max="200"
            value={tempo}
            onChange={handleTempoChange}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${((tempo - 60) / 140) * 100}%, rgba(255,255,255,0.1) ${((tempo - 60) / 140) * 100}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
        </div>
        
        {/* Tempo Markers */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>60</span>
          <span>120</span>
          <span>200</span>
        </div>
      </div>

      {/* Recording Hint Removed */}
    </div>
  );
}
