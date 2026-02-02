'use client';

import useProjectStore from '@/store/projectStore';

const instruments = [
  { id: 'drums', name: 'Drums', icon: '🥁', color: 'from-red-500 to-orange-500', keys: 'Z X C V B N M' },
  { id: 'bass', name: 'Bass', icon: '🎸', color: 'from-blue-500 to-cyan-500', keys: 'Q W E R T Y U I O P' },
  { id: 'piano', name: 'Piano', icon: '🎹', color: 'from-purple-500 to-pink-500', keys: 'A S D F G H J K L' },
  { id: 'guitar', name: 'Guitar', icon: '🎸', color: 'from-green-500 to-emerald-500', keys: '1 2 3 4 5 6' },
  { id: 'lead', name: 'Lead Synth', icon: '🎛️', color: 'from-yellow-500 to-orange-500', keys: 'A S D F G H J K L' },
  { id: 'pad', name: 'Pad', icon: '🌊', color: 'from-indigo-500 to-purple-500', keys: '7 8 9 0' }
];

export default function InstrumentSelector() {
  const { selectedInstrument, setSelectedInstrument } = useProjectStore();

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Select Instrument</h3>
      <div className="grid grid-cols-2 gap-3">
        {instruments.map(instrument => (
          <button
            key={instrument.id}
            onClick={() => setSelectedInstrument(instrument.id)}
            className={`p-4 rounded-xl transition-all ${
              selectedInstrument === instrument.id
                ? `bg-gradient-to-br ${instrument.color} scale-105 shadow-lg`
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="text-3xl mb-1">{instrument.icon}</div>
            <div className="text-sm font-medium mb-1">{instrument.name}</div>
            <div className="text-xs text-gray-400 font-mono">{instrument.keys}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
