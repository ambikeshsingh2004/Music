const Tone = require('tone');
const BaseInstrument = require('./base');

class PianoInstrument extends BaseInstrument {
  constructor() {
    super('Piano');
  }

  init() {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.005,
        decay: 0.3,
        sustain: 0.4,
        release: 1
      }
    }).toDestination();

    // Add some reverb for piano sound
    const reverb = new Tone.Reverb({
      decay: 2,
      wet: 0.3
    }).toDestination();

    this.synth.connect(reverb);
  }

  // Keyboard mapping for piano (C major scale)
  static getKeyboardMapping() {
    return {
      'a': 'C4',
      's': 'D4',
      'd': 'E4',
      'f': 'F4',
      'g': 'G4',
      'h': 'A4',
      'j': 'B4',
      'k': 'C5',
      'l': 'D5',
      ';': 'E5',
      "'": 'F5'
    };
  }
}

module.exports = PianoInstrument;
