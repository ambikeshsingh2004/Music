'use client';

import { useEffect, useCallback } from 'react';
import useProjectStore from '@/store/projectStore';

export default function useKeyboard(instrumentManager, eventRecorder) {
  const { selectedInstrument, isRecording } = useProjectStore();

  const handleKeyDown = useCallback((event) => {
    // Prevent default for music keys
    if (event.repeat) return;

    const key = event.key.toLowerCase();
    const instrument = instrumentManager?.getCurrentInstrument();

    if (!instrument) return;

    // Get keyboard mapping
    const mapping = instrumentManager.getCurrentKeyboardMapping();
    const note = mapping[key];

    if (!note) return;

    event.preventDefault();

    // Play note
    if (instrument.name === 'Drums') {
      instrument.playNote(note, 0.8);
      if (isRecording && eventRecorder) {
        eventRecorder.recordDrumHit(note, 0.8);
      }
    } else {
      instrument.playNote(note, 0.8);
      if (isRecording && eventRecorder) {
        eventRecorder.recordNoteOn(note, 0.8);
      }
    }
  }, [instrumentManager, eventRecorder, isRecording, selectedInstrument]);

  const handleKeyUp = useCallback((event) => {
    const key = event.key.toLowerCase();
    const instrument = instrumentManager?.getCurrentInstrument();

    if (!instrument || instrument.name === 'Drums') return;

    const mapping = instrumentManager.getCurrentKeyboardMapping();
    const note = mapping[key];

    if (!note) return;

    event.preventDefault();

    // Stop note
    instrument.stopNote(note);
    if (isRecording && eventRecorder) {
      eventRecorder.recordNoteOff(note);
    }
  }, [instrumentManager, eventRecorder, isRecording, selectedInstrument]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return null;
}
