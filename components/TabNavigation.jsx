'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function TabNavigation({ projectId, projectName }) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'Compose', path: `/compose/${projectId}`, icon: '🎵' },
    { name: 'Messages', path: '/messages', icon: '💬' },
    { name: 'History', path: '/history', icon: '📜' },
  ];

  const isActive = (tabPath) => {
    if (tabPath.startsWith('/compose')) {
      return pathname.startsWith('/compose');
    }
    return pathname === tabPath;
  };

  return (
    <div className="bg-black/40 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Project Name & Back Button */}
          <div className="flex items-center gap-4 py-3">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition"
            >
              ← Back
            </button>
            <div className="h-6 w-px bg-white/20"></div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {projectName || 'Project'}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => router.push(tab.path)}
                className={`px-6 py-4 font-medium transition-all relative ${
                  isActive(tab.path)
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </span>
                {isActive(tab.path) && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
