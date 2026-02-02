const Tone = require('tone');

class EventScheduler {
  constructor(instrumentManager) {
    this.instrumentManager = instrumentManager;
    this.scheduledEvents = [];
    this.isScheduled = false;
  }

  // Schedule all tracks for playback
  scheduleTracks(tracks, startTime = 0) {
    // Clear previous schedule
    this.clearSchedule();

    tracks.forEach(track => {
      // Skip muted tracks
      if (track.muted) return;

      // Get instrument
      const instrument = this.instrumentManager.getInstrument(track.instrumentType);
      if (!instrument) {
        console.warn(`Instrument ${track.instrumentType} not initialized`);
        return;
      }

      // Schedule each event
      track.events.forEach(event => {
        const scheduleTime = startTime + event.time;

        if (event.type === 'note') {
          // Schedule note with duration
          const eventId = Tone.Transport.schedule((time) => {
            if (!track.muted) {
              instrument.playNote(event.note, event.velocity, event.duration);
            }
          }, scheduleTime);

          this.scheduledEvents.push(eventId);

        } else if (event.type === 'drum') {
          // Schedule drum hit
          const eventId = Tone.Transport.schedule((time) => {
            if (!track.muted) {
              instrument.playNote(event.drumType, event.velocity);
            }
          }, scheduleTime);

          this.scheduledEvents.push(eventId);
        }
      });
    });

    this.isScheduled = true;
  }

  // Clear all scheduled events
  clearSchedule() {
    this.scheduledEvents.forEach(eventId => {
      Tone.Transport.clear(eventId);
    });
    this.scheduledEvents = [];
    this.isScheduled = false;
  }

  // Update schedule (reschedule all tracks)
  updateSchedule(tracks) {
    this.scheduleTracks(tracks);
  }

  // Handle solo tracks
  handleSolo(tracks) {
    const hasSolo = tracks.some(track => track.solo);

    if (hasSolo) {
      // Mute all non-solo tracks temporarily
      tracks.forEach(track => {
        if (!track.solo) {
          track.muted = true;
        }
      });
    }
  }

  // Dispose
  dispose() {
    this.clearSchedule();
  }
}

module.exports = EventScheduler;
