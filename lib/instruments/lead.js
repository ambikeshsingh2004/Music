const Tone = require('tone');
const BaseInstrument = require('./base');

class LeadSynthInstrument extends BaseInstrument {
  constructor() {
    super('Lead Synth');
  }

  init() {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'square'
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.9,
        release: 0.5
      }
    }).toDestination();

    // Add distortion for lead sound
    const distortion = new Tone.Distortion(0.4).toDestination();
    this.synth.connect(distortion);
  }

  // Keyboard mapping for lead synth (higher octave than piano)
  static getKeyboardMapping() {
    return {
      'a': 'C5',
      's': 'D5',
      'd': 'E5',
      'f': 'F5',
      'g': 'G5',
      'h': 'A5',
      'j': 'B5',
      'k': 'C6',
      'l': 'D6',
      ';': 'E6',
      "'": 'F6'
    };
  }
}

module.exports = LeadSynthInstrument;
