const Tone = require('tone');

class EventRecorder {
  constructor(timeline) {
    this.timeline = timeline;
    this.recordingStartTime = 0;
    this.currentTrack = null;
    this.activeNotes = new Map(); // key -> { note, startTime }
  }

  // Start recording on a specific track
  startRecording(track) {
    this.currentTrack = track;
    this.recordingStartTime = this.timeline.getCurrentTime();
    this.activeNotes.clear();
  }

  // Stop recording
  stopRecording() {
    // Release any active notes
    this.activeNotes.forEach((noteData, key) => {
      this.recordNoteOff(noteData.note, this.timeline.getCurrentTime());
    });

    this.currentTrack = null;
    this.activeNotes.clear();
  }

  // Record note on event
  recordNoteOn(note, velocity = 0.8) {
    if (!this.currentTrack || !this.timeline.isRecording) return;

    const currentTime = this.timeline.getCurrentTime();
    const relativeTime = currentTime - this.recordingStartTime;

    // Store active note
    this.activeNotes.set(note, {
      note,
      startTime: relativeTime,
      velocity
    });
  }

  // Record note off event
  recordNoteOff(note) {
    if (!this.currentTrack || !this.activeNotes.has(note)) return;

    const currentTime = this.timeline.getCurrentTime();
    const relativeTime = currentTime - this.recordingStartTime;
    const noteData = this.activeNotes.get(note);

    // Create event with duration
    const event = {
      id: this.generateEventId(),
      type: 'note',
      note: noteData.note,
      time: noteData.startTime,
      duration: relativeTime - noteData.startTime,
      velocity: noteData.velocity
    };

    this.currentTrack.addEvent(event);
    this.activeNotes.delete(note);

    return event;
  }

  // Record drum hit (one-shot event)
  recordDrumHit(drumType, velocity = 0.8) {
    if (!this.currentTrack || !this.timeline.isRecording) return;

    const currentTime = this.timeline.getCurrentTime();
    const relativeTime = currentTime - this.recordingStartTime;

    const event = {
      id: this.generateEventId(),
      type: 'drum',
      drumType,
      time: relativeTime,
      velocity
    };

    this.currentTrack.addEvent(event);
    return event;
  }

  // Generate unique event ID
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current track
  getCurrentTrack() {
    return this.currentTrack;
  }

  // Check if recording
  isRecording() {
    return this.currentTrack !== null && this.timeline.isRecording;
  }
}

module.exports = EventRecorder;
