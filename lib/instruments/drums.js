const Tone = require('tone');
const BaseInstrument = require('./base');

class DrumsInstrument extends BaseInstrument {
  constructor() {
    super('Drums');
    this.drums = {};
  }

  init() {
    // Create different drum sounds
    this.drums = {
      kick: new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
      }).toDestination(),

      snare: new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
      }).toDestination(),

      hihat: new Tone.MetalSynth({
        frequency: 200,
        envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5
      }).toDestination(),

      tom1: new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.5, sustain: 0 }
      }).toDestination(),

      tom2: new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.5, sustain: 0 }
      }).toDestination(),

      crash: new Tone.MetalSynth({
        frequency: 250,
        envelope: { attack: 0.001, decay: 1, release: 2 },
        harmonicity: 3.1,
        modulationIndex: 16,
        resonance: 3000,
        octaves: 1.5
      }).toDestination(),

      ride: new Tone.MetalSynth({
        frequency: 800,
        envelope: { attack: 0.001, decay: 0.5, release: 0.5 },
        harmonicity: 2.5,
        modulationIndex: 8,
        resonance: 2000,
        octaves: 1
      }).toDestination()
    };

    this.synth = this.drums; // For compatibility with base class
  }

  // Override playNote for drums (no pitch, just trigger)
  playNote(drumType, velocity = 0.8) {
    if (!this.drums[drumType]) return;

    if (drumType === 'kick' || drumType === 'tom1' || drumType === 'tom2') {
      // Membrane synths need a note
      const notes = { kick: 'C1', tom1: 'G2', tom2: 'D2' };
      this.drums[drumType].triggerAttackRelease(notes[drumType], '8n', undefined, velocity);
    } else {
      // Metal and noise synths
      this.drums[drumType].triggerAttackRelease('8n', undefined, velocity);
    }
  }

  // Drums don't need stopNote
  stopNote() {
    // Drums are one-shot sounds
  }

  dispose() {
    Object.values(this.drums).forEach(drum => drum.dispose());
    this.drums = {};
  }

  // Keyboard mapping for drums
  static getKeyboardMapping() {
    return {
      'z': 'kick',
      'x': 'snare',
      'c': 'hihat',
      'v': 'tom1',
      'b': 'tom2',
      'n': 'crash',
      'm': 'ride'
    };
  }
}

module.exports = DrumsInstrument;
