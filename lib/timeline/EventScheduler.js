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

    console.log('[EventScheduler] Scheduling tracks:', tracks.length);

    tracks.forEach(track => {
      // Skip muted tracks
      if (track.muted) return;

      // Schedule each event
      track.events.forEach(event => {
        const scheduleTime = startTime + event.time;

        // Determine the actual instrument type for this specific event
        // If event is drum type but track isn't drums, fix the instrument type
        const actualInstrumentType = (event.type === 'drum' && track.instrumentType !== 'drums')
          ? 'drums'
          : track.instrumentType;

        // Get or initialize instrument for the actual type
        let instrument = this.instrumentManager.getInstrument(actualInstrumentType);
        if (!instrument) {
          console.log(`[EventScheduler] Initializing ${actualInstrumentType} instrument`);
          instrument = this.instrumentManager.initInstrument(actualInstrumentType);
        }

        if (!instrument) {
          console.warn(`Instrument ${actualInstrumentType} failed to initialize`);
          return; // Skip scheduling this event if instrument fails
        }

        if (event.type === 'note') {
          // Schedule note with duration
          const eventId = Tone.Transport.schedule((time) => {
            console.log(`[EventScheduler] Playing note ${event.note} on ${actualInstrumentType}`);
            if (!track.muted) {
              instrument.playNote(event.note, event.velocity, event.duration);
            }
          }, scheduleTime);

          this.scheduledEvents.push(eventId);

        } else if (event.type === 'drum') {
          // Schedule drum hit - ensure we're using drum instrument
          const eventId = Tone.Transport.schedule((time) => {
            console.log(`[EventScheduler] Playing drum ${event.drumType} at time ${time}`);
            if (!track.muted) {
              // Drums use drumType, not note
              instrument.playNote(event.drumType, event.velocity);
            }
          }, scheduleTime);

          this.scheduledEvents.push(eventId);
        }
      });
    });

    this.isScheduled = true;
    console.log('[EventScheduler] Total scheduled events:', this.scheduledEvents.length);
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
