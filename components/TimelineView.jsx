'use client';

export default function TimelineView({ tracks }) {
  return (
    <div className="flex-1 bg-black/20 p-4 overflow-scroll">
      <h3 className="text-lg font-semibold mb-4">Timeline</h3>
      
      {tracks.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <p className="text-xl mb-2">No tracks yet</p>
            <p className="text-sm">Press Record to create your first track</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              className="bg-white/5 rounded-lg p-4 border-l-4"
              style={{ borderColor: track.color }}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-semibold">Track {index + 1}</span>
                  <span className="text-sm text-gray-400 ml-2">
                    ({track.instrumentType})
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {track.events.length} events
                </div>
              </div>
              
              {/* Simple event visualization */}
              <div className="h-12 bg-black/30 rounded relative overflow-hidden">
                {track.events.map((event, i) => (
                  <div
                    key={i}
                    className="absolute h-full bg-cyan-500/50 border-l border-cyan-400"
                    style={{
                      left: `${(event.time / 32) * 100}%`,
                      width: `${Math.max((event.duration || 0.1) / 32 * 100, 2)}%`
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
