'use client';

import { useEffect, useRef } from 'react';
import InstrumentManager from '@/lib/instruments/manager';
import Timeline from '@/lib/timeline/Timeline';
import EventRecorder from '@/lib/timeline/EventRecorder';
import EventScheduler from '@/lib/timeline/EventScheduler';
import useProjectStore from '@/store/projectStore';

export default function useAudioEngine() {
  const instrumentManagerRef = useRef(null);
  const timelineRef = useRef(null);
  const eventRecorderRef = useRef(null);
  const eventSchedulerRef = useRef(null);

  const { tracks, selectedInstrument } = useProjectStore();

  useEffect(() => {
    // Initialize audio engine
    if (!instrumentManagerRef.current) {
      instrumentManagerRef.current = new InstrumentManager();
      timelineRef.current = new Timeline();
      timelineRef.current.init();
      eventRecorderRef.current = new EventRecorder(timelineRef.current);
      eventSchedulerRef.current = new EventScheduler(instrumentManagerRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (instrumentManagerRef.current) {
        instrumentManagerRef.current.disposeAll();
      }
      if (timelineRef.current) {
        timelineRef.current.dispose();
      }
      if (eventSchedulerRef.current) {
        eventSchedulerRef.current.dispose();
      }
    };
  }, []);

  // Update selected instrument
  useEffect(() => {
    if (instrumentManagerRef.current && selectedInstrument) {
      instrumentManagerRef.current.setCurrentInstrument(selectedInstrument);
    }
  }, [selectedInstrument]);

  // Update scheduled tracks when tracks change
  useEffect(() => {
    if (eventSchedulerRef.current && tracks.length > 0) {
      eventSchedulerRef.current.updateSchedule(tracks);
    }
  }, [tracks]);

  return {
    instrumentManager: instrumentManagerRef.current,
    timeline: timelineRef.current,
    eventRecorder: eventRecorderRef.current,
    eventScheduler: eventSchedulerRef.current
  };
}
