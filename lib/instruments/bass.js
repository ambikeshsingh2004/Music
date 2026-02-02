const Tone = require('tone');
const BaseInstrument = require('./base');

class BassInstrument extends BaseInstrument {
  constructor() {
    super('Bass');
  }

  init() {
    this.synth = new Tone.MonoSynth({
      oscillator: {
        type: 'sawtooth'
      },
      filter: {
        Q: 2,
        type: 'lowpass',
        rolloff: -24
      },
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.4,
        release: 0.8
      },
      filterEnvelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.2,
        release: 0.5,
        baseFrequency: 50,
        octaves: 2.5
      }
    }).toDestination();
  }

  // Keyboard mapping for bass (chromatic scale)
  static getKeyboardMapping() {
    return {
      'q': 'E1',
      'w': 'F1',
      'e': 'F#1',
      'r': 'G1',
      't': 'G#1',
      'y': 'A1',
      'u': 'A#1',
      'i': 'B1',
      'o': 'C2',
      'p': 'C#2',
      '[': 'D2',
      ']': 'D#2'
    };
  }
}

module.exports = BassInstrument;
