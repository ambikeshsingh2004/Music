const DrumsInstrument = require('./drums');
const PianoInstrument = require('./piano');
const GuitarInstrument = require('./guitar');
const LeadSynthInstrument = require('./lead');
const PadInstrument = require('./pad');

class InstrumentManager {
  constructor() {
    this.instruments = {
      drums: null,
      piano: null,
      guitar: null,
      lead: null,
      pad: null
    };
    this.currentInstrument = null;
  }

  // Initialize a specific instrument
  initInstrument(instrumentName) {
    if (this.instruments[instrumentName]) {
      return this.instruments[instrumentName];
    }

    let instrument;
    switch (instrumentName) {
      case 'drums':
        instrument = new DrumsInstrument();
        break;
      case 'piano':
        instrument = new PianoInstrument();
        break;
      case 'guitar':
        instrument = new GuitarInstrument();
        break;
      case 'lead':
        instrument = new LeadSynthInstrument();
        break;
      case 'pad':
        instrument = new PadInstrument();
        break;
      default:
        console.warn(`Unknown instrument: ${instrumentName}, falling back to piano`);
        // Fallback to piano for unknown instruments (like 'bass' which was removed)
        instrument = new PianoInstrument();
        break;
    }

    instrument.init();
    this.instruments[instrumentName] = instrument;
    return instrument;
  }

  // Set current active instrument
  setCurrentInstrument(instrumentName) {
    if (!this.instruments[instrumentName]) {
      this.initInstrument(instrumentName);
    }
    this.currentInstrument = this.instruments[instrumentName];
    return this.currentInstrument;
  }

  // Get current instrument
  getCurrentInstrument() {
    return this.currentInstrument;
  }

  // Get specific instrument
  getInstrument(instrumentName) {
    return this.instruments[instrumentName];
  }

  // Get keyboard mapping for current instrument
  getCurrentKeyboardMapping() {
    if (!this.currentInstrument) return {};

    const instrumentClass = this.currentInstrument.constructor;
    return instrumentClass.getKeyboardMapping ? instrumentClass.getKeyboardMapping() : {};
  }

  // Get all available instruments
  getAvailableInstruments() {
    return Object.keys(this.instruments);
  }

  // Dispose of all instruments
  disposeAll() {
    Object.values(this.instruments).forEach(instrument => {
      if (instrument) {
        instrument.dispose();
      }
    });
    this.instruments = {
      drums: null,
      piano: null,
      guitar: null,
      lead: null,
      pad: null
    };
    this.currentInstrument = null;
  }

  // Dispose of specific instrument
  disposeInstrument(instrumentName) {
    if (this.instruments[instrumentName]) {
      this.instruments[instrumentName].dispose();
      this.instruments[instrumentName] = null;

      if (this.currentInstrument?.name === instrumentName) {
        this.currentInstrument = null;
      }
    }
  }
}

module.exports = InstrumentManager;
