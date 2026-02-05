'use client';

import { useState, useEffect, useRef } from 'react';
import useProjectStore from '@/store/projectStore';

export default function TimelineView({ tracks, timeline }) {
  const { isPlaying, setIsPlaying } = useProjectStore();
  const [currentTime, setCurrentTime] = useState(0);
  const animationFrameRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Calculate the dynamic duration: last event time + 5 seconds buffer
  const calculateDuration = () => {
    if (tracks.length === 0) return 10; // Default 10 seconds for empty timeline
    
    let lastEventEnd = 0;
    tracks.forEach(track => {
      if (track.events && track.events.length > 0) {
        track.events.forEach(event => {
          const eventEnd = (event.time || 0) + (event.duration || 0.5);
          lastEventEnd = Math.max(lastEventEnd, eventEnd);
        });
      }
    });
    
    // Add 5-second buffer, minimum 10 seconds
    return Math.max(lastEventEnd + 5, 10);
  };

  const duration = calculateDuration();

  // Measure container width on mount and resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      const width = containerRef.current?.offsetWidth || 800;
      // Subtract track label width (128px) and some padding
      setContainerWidth(width - 160);
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Update playhead position during playback
  useEffect(() => {
    if (!timeline || !isPlaying) {
      if (!isPlaying) {
        setCurrentTime(0);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const updatePlayhead = () => {
      if (timeline && isPlaying) {
        const time = timeline.getCurrentTime();
        
        // Auto-stop when music ends
        if (time >= duration) {
          console.log('[Timeline] Music ended at', time, 'duration:', duration);
          timeline.stop();
          setCurrentTime(0);
          setIsPlaying(false); // Update state immediately
          return;
        }
        
        setCurrentTime(time);
        animationFrameRef.current = requestAnimationFrame(updatePlayhead);
      }
    };

    updatePlayhead();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, timeline, duration]);

  // Handle clicking on timeline to seek
  const handleTimelineClick = (e) => {
    if (!timeline) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedTime = clickX / pixelsPerSecond;
    
    // Seek to clicked position
    timeline.seek(clickedTime);
    setCurrentTime(clickedTime);
    
    console.log(`[Timeline] Seeking to ${clickedTime.toFixed(2)}s`);
  };
  
  // Dynamic scaling: fit entire timeline in viewport width
  const timelineWidth = containerWidth > 0 ? containerWidth : 800;
  const pixelsPerSecond = timelineWidth / duration; // Scale to fit screen
  
  // Generate time markers (every 5 seconds or every 1/10th of duration, whichever is larger)
  const markerInterval = Math.max(1, Math.ceil(duration / 10));
  const timeMarkers = [];
  for (let i = 0; i <= Math.ceil(duration); i += markerInterval) {
    timeMarkers.push(i);
  }

  return (
    <div ref={containerRef} className="flex-1 bg-black/20 p-4 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4">Timeline</h3>
      
      {tracks.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <p className="text-xl mb-2">No tracks yet</p>
            <p className="text-sm">Press Record to create your first track</p>
          </div>
        </div>
      ) : (
        <div>
          {/* Time Ruler */}
          <div className="mb-4 ml-32">
            <div 
              className="relative h-8 bg-black/30 rounded border border-white/10 cursor-pointer hover:bg-black/40 transition-colors"
              onClick={handleTimelineClick}
              title="Click to seek"
              style={{ width: `${timelineWidth}px` }}
            >
              {timeMarkers.map(second => (
                <div
                  key={second}
                  className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
                  style={{ left: `${second * pixelsPerSecond}px` }}
                >
                  <div className="w-px h-2 bg-cyan-400"></div>
                  <span className="text-xs text-gray-400 mt-1">{second}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks */}
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <div key={track.id} className="flex items-center gap-2">
                {/* Track Label */}
                <div className="w-32 flex-shrink-0">
                  <div className="bg-white/5 rounded-lg p-2 border-l-4" style={{ borderColor: track.color }}>
                    <div className="font-semibold text-sm">Track {index + 1}</div>
                    <div className="text-xs text-gray-400">({track.instrumentType})</div>
                    <div className="text-xs text-gray-500">{track.events.length} events</div>
                  </div>
                </div>

                {/* Track Timeline */}
                <div className="flex-1">
                  <div 
                    className="h-12 bg-black/30 rounded relative overflow-hidden border border-white/10 cursor-pointer hover:bg-black/40 transition-colors"
                    style={{ width: `${timelineWidth}px` }}
                    onClick={handleTimelineClick}
                    title="Click to seek"
                  >
                    {/* Playhead Line */}
                    {isPlaying && currentTime > 0 && currentTime <= duration && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-red-500 z-10 pointer-events-none"
                        style={{ left: `${currentTime * pixelsPerSecond}px` }}
                      >
                        <div className="absolute -top-1 -left-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-red-500"></div>
                      </div>
                    )}
                    
                    {/* Events */}
                    {track.events.map((event, i) => (
                      <div
                        key={i}
                        className="absolute h-full bg-cyan-500/50 border-l-2 border-cyan-400 hover:bg-cyan-500/70 transition-colors"
                        style={{
                          left: `${event.time * pixelsPerSecond}px`,
                          width: `${Math.max((event.duration || 0.1) * pixelsPerSecond, 3)}px`
                        }}
                        title={`Time: ${event.time.toFixed(2)}s, Duration: ${(event.duration || 0).toFixed(2)}s`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Duration Info */}
          <div className="mt-4 ml-32 text-xs text-gray-500">
            Total duration: {duration.toFixed(1)}s (music + 5s buffer)
          </div>
        </div>
      )}
    </div>
  );
}
