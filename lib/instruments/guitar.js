const Tone = require('tone');
const BaseInstrument = require('./base');

class GuitarInstrument extends BaseInstrument {
  constructor() {
    super('Guitar');
  }

  init() {
    // PluckSynth is monophonic, so we create multiple instances for polyphony
    this.voices = [];
    for (let i = 0; i < 6; i++) {
      const voice = new Tone.PluckSynth({
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.9
      }).toDestination();
      this.voices.push(voice);
    }
    this.currentVoice = 0;

    // Create a wrapper to match the synth interface
    this.synth = {
      triggerAttack: (note, time, velocity) => {
        const voice = this.voices[this.currentVoice];
        voice.triggerAttack(note, time, velocity);
        this.currentVoice = (this.currentVoice + 1) % this.voices.length;
      },
      triggerRelease: (note, time) => {
        // PluckSynth doesn't need explicit release
      },
      triggerAttackRelease: (note, duration, time, velocity) => {
        const voice = this.voices[this.currentVoice];
        voice.triggerAttackRelease(note, duration, time, velocity);
        this.currentVoice = (this.currentVoice + 1) % this.voices.length;
      },
      dispose: () => {
        this.voices.forEach(v => v.dispose());
      }
    };
  }

  // Keyboard mapping for guitar (simulating strings)
  static getKeyboardMapping() {
    return {
      '1': 'E2',  // Low E string
      '2': 'A2',  // A string
      '3': 'D3',  // D string
      '4': 'G3',  // G string
      '5': 'B3',  // B string
      '6': 'E4',  // High E string
      '7': 'F4',
      '8': 'G4',
      '9': 'A4',
      '0': 'B4'
    };
  }
}

module.exports = GuitarInstrument;
