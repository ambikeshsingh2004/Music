'use client';

import useProjectStore from '@/store/projectStore';

const instruments = [
  { id: 'drums', name: 'Drums', icon: '🥁', color: 'from-red-500 via-orange-500 to-yellow-500', keys: 'Z X C V B N M' },
  { id: 'piano', name: 'Piano', icon: '🎹', color: 'from-purple-500 via-pink-500 to-rose-500', keys: 'A S D F G H J K L' },
  { id: 'guitar', name: 'Guitar', icon: '🎸', color: 'from-green-500 via-emerald-500 to-teal-500', keys: '1 2 3 4 5 6' },
  { id: 'lead', name: 'Lead Synth', icon: '🎛️', color: 'from-cyan-500 via-blue-500 to-indigo-500', keys: 'A S D F G H J K L' },
  { id: 'pad', name: 'Pad', icon: '🌊', color: 'from-indigo-500 via-purple-500 to-pink-500', keys: '7 8 9 0' }
];

export default function InstrumentSelector() {
  const { selectedInstrument, setSelectedInstrument } = useProjectStore();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span className="text-2xl">🎼</span>
        Select Instrument
      </h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
        {instruments.map((instrument) => {
          const isSelected = selectedInstrument === instrument.id;
          
          return (
            <button
              key={instrument.id}
              onClick={() => setSelectedInstrument(instrument.id)}
              className={`group relative p-3 sm:p-5 rounded-xl transition-all duration-300 ${
                isSelected
                  ? 'scale-105 shadow-2xl'
                  : 'glass-strong hover:scale-102 hover:shadow-xl'
              }`}
              style={{
                background: isSelected 
                  ? `linear-gradient(135deg, ${instrument.color.replace('from-', '').replace('via-', '').replace('to-', '')})`
                  : undefined
              }}
            >
              {/* Content */}
              <div className={`relative z-10 flex flex-col items-center gap-1 sm:gap-2 transition-transform ${
                isSelected ? '' : 'group-hover:-translate-y-1'
              }`}>
                {/* Icon */}
                <div className={`text-2xl sm:text-4xl transition-transform duration-300 ${
                  isSelected ? 'scale-110' : 'group-hover:scale-110'
                }`}>
                  {instrument.icon}
                </div>
                
                {/* Name */}
                <div className={`font-semibold text-xs sm:text-base ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                  {instrument.name}
                </div>
                
                {/* Keys (Hidden on small mobile) */}
                <div className={`hidden sm:block text-[10px] sm:text-xs font-mono px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${
                  isSelected 
                    ? 'bg-black/20 text-white' 
                    : 'bg-white/5 text-gray-400'
                }`}>
                  {instrument.keys}
                </div>
              </div>
              
              {/* Glow Effect on Hover */}
              {!isSelected && (
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                     style={{ 
                       background: `radial-gradient(circle at center, ${instrument.color.replace('from-', '').split(' ')[0]}/10, transparent 70%)`
                     }}></div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Selected Instrument Info Removed */}
    </div>
  );
}
