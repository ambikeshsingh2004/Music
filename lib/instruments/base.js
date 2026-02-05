// Base instrument class with common functionality

class BaseInstrument {
  constructor(name) {
    this.name = name;
    this.synth = null;
    this.activeNotes = new Set();
  }

  // Initialize the instrument (override in subclasses)
  init() {
    throw new Error('init() must be implemented by subclass');
  }

  // Play a note
  playNote(note, velocity = 0.8, duration) {
    if (!this.synth) return;

    this.activeNotes.add(note);

    if (duration) {
      this.synth.triggerAttackRelease(note, duration, undefined, velocity);
    } else {
      this.synth.triggerAttack(note, undefined, velocity);
    }
  }

  // Stop a note
  stopNote(note) {
    if (!this.synth) return;

    // Only stop if the note is actually active
    if (!this.activeNotes.has(note)) return;

    this.activeNotes.delete(note);
    this.synth.triggerRelease(note);
  }

  // Stop all notes
  stopAll() {
    if (!this.synth) return;

    this.activeNotes.forEach(note => {
      try {
        this.synth.triggerRelease(note);
      } catch (e) {
        // Some synths don't support note-specific release
      }
    });
    this.activeNotes.clear();

    // Also try releaseAll for PolySynth
    try {
      if (this.synth.releaseAll) {
        this.synth.releaseAll();
      }
    } catch (e) {
      // Ignore
    }
  }

  // Dispose of the instrument
  dispose() {
    try {
      if (this.synth) {
        this.stopAll();
        this.synth.dispose();
        this.synth = null;
      }
    } catch (e) {
      console.warn(`Error disposing ${this.name}:`, e);
      this.synth = null;
    }
  }

  // Get active notes
  getActiveNotes() {
    return Array.from(this.activeNotes);
  }
}

module.exports = BaseInstrument;
