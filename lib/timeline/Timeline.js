const Tone = require('tone');

class Timeline {
  constructor() {
    this.currentTime = 0;
    this.isPlaying = false;
    this.isRecording = false;
    this.tempo = 120;
    this.timeSignature = '4/4';
    this.duration = 32; // bars
    this.listeners = new Set();
  }

  // Initialize Tone.js Transport
  init() {
    Tone.Transport.bpm.value = this.tempo;
    Tone.Transport.timeSignature = this.timeSignature;
  }

  // Start playback
  play() {
    if (this.isPlaying) return;

    Tone.start(); // Start audio context
    Tone.Transport.start();
    this.isPlaying = true;
    this.notifyListeners('play');
  }

  // Pause playback
  pause() {
    if (!this.isPlaying) return;

    Tone.Transport.pause();
    this.isPlaying = false;
    this.notifyListeners('pause');
  }

  // Stop playback and reset to beginning
  stop() {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.currentTime = 0;
    this.isPlaying = false;
    this.isRecording = false;
    this.notifyListeners('stop');
  }

  // Start recording
  startRecording() {
    if (!this.isPlaying) {
      this.play();
    }
    this.isRecording = true;
    this.notifyListeners('recordStart');
  }

  // Stop recording
  stopRecording() {
    this.isRecording = false;
    this.notifyListeners('recordStop');
  }

  // Seek to specific time
  seek(time) {
    Tone.Transport.position = time;
    this.currentTime = time;
    this.notifyListeners('seek', { time });
  }

  // Set tempo
  setTempo(bpm) {
    this.tempo = bpm;
    Tone.Transport.bpm.value = bpm;
    this.notifyListeners('tempoChange', { tempo: bpm });
  }

  // Set time signature
  setTimeSignature(signature) {
    this.timeSignature = signature;
    Tone.Transport.timeSignature = signature;
    this.notifyListeners('timeSignatureChange', { timeSignature: signature });
  }

  // Get current time in seconds
  getCurrentTime() {
    return Tone.Transport.seconds;
  }

  // Get current position in bars:beats:sixteenths
  getCurrentPosition() {
    return Tone.Transport.position;
  }

  // Add event listener
  addEventListener(listener) {
    this.listeners.add(listener);
  }

  // Remove event listener
  removeEventListener(listener) {
    this.listeners.delete(listener);
  }

  // Notify all listeners
  notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener(event, data);
      }
    });
  }

  // Dispose
  dispose() {
    this.stop();
    this.listeners.clear();
  }
}

module.exports = Timeline;
