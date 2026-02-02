class Track {
  constructor(id, instrumentType) {
    this.id = id;
    this.instrumentType = instrumentType;
    this.events = [];
    this.volume = 0; // dB
    this.muted = false;
    this.solo = false;
    this.color = this.getRandomColor();
  }

  // Add event to track
  addEvent(event) {
    this.events.push(event);
    // Keep events sorted by time
    this.events.sort((a, b) => a.time - b.time);
  }

  // Remove event from track
  removeEvent(eventId) {
    this.events = this.events.filter(e => e.id !== eventId);
  }

  // Get events in time range
  getEventsInRange(startTime, endTime) {
    return this.events.filter(e => e.time >= startTime && e.time <= endTime);
  }

  // Clear all events
  clearEvents() {
    this.events = [];
  }

  // Set volume
  setVolume(volume) {
    this.volume = volume;
  }

  // Toggle mute
  toggleMute() {
    this.muted = !this.muted;
  }

  // Toggle solo
  toggleSolo() {
    this.solo = !this.solo;
  }

  // Get random color for track visualization
  getRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Serialize track data
  toJSON() {
    return {
      id: this.id,
      instrumentType: this.instrumentType,
      events: this.events,
      volume: this.volume,
      muted: this.muted,
      solo: this.solo,
      color: this.color
    };
  }

  // Deserialize track data
  static fromJSON(data) {
    const track = new Track(data.id, data.instrumentType);
    track.events = data.events || [];
    track.volume = data.volume || 0;
    track.muted = data.muted || false;
    track.solo = data.solo || false;
    track.color = data.color || track.getRandomColor();
    return track;
  }
}

module.exports = Track;
