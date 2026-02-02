const Tone = require('tone');
const BaseInstrument = require('./base');

class PadInstrument extends BaseInstrument {
  constructor() {
    super('Pad');
  }

  init() {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 1.5,
        decay: 1,
        sustain: 0.8,
        release: 3
      }
    }).toDestination();

    // Add heavy reverb and chorus for atmospheric pad sound
    const reverb = new Tone.Reverb({
      decay: 8,
      wet: 0.7
    }).toDestination();

    const chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: 0.5
    }).toDestination();

    this.synth.connect(chorus);
    chorus.connect(reverb);
  }

  // Keyboard mapping for pad (ambient chords)
  static getKeyboardMapping() {
    return {
      '7': 'C3',
      '8': 'E3',
      '9': 'G3',
      '0': 'C4',
      '-': 'E4',
      '=': 'G4'
    };
  }
}

module.exports = PadInstrument;
