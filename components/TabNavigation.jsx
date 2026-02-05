'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import useProjectStore from '@/store/projectStore';
import { toast } from 'react-toastify';
import UserControls from '@/components/UserControls';

export default function TabNavigation({ projectId, projectName }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentProject, updateProjectName } = useProjectStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(projectName || 'Project');
  const [isSaving, setIsSaving] = useState(false);

  // Sync with projectName prop changes
  useEffect(() => {
    setEditedName(projectName || 'Project');
  }, [projectName]);

  const tabs = [
    { name: 'Compose', path: `/compose/${projectId}`, icon: '🎵' },
    { name: 'Messages', path: `/messages?projectId=${projectId}`, icon: '💬' },
    { name: 'History', path: `/history?projectId=${projectId}`, icon: '📜' },
  ];

  const isActive = (tabPath) => {
    if (tabPath.startsWith('/compose')) {
      return pathname.startsWith('/compose');
    }
    return pathname === tabPath;
  };

  const handleRename = async () => {
    if (!editedName.trim() || editedName === projectName) {
      setIsEditing(false);
      setEditedName(projectName || 'Project');
      return;
    }

    setIsSaving(true);
    try {
      // Update in store immediately for instant UI feedback
      updateProjectName(editedName.trim());
      
      // Then save to backend
      await apiClient.updateProject(projectId, { name: editedName.trim() });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to rename project:', error);
      toast.error('Failed to rename project');
      // Revert on error
      updateProjectName(projectName);
      setEditedName(projectName || 'Project');
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedName(projectName || 'Project');
    }
  };

  return (
    <div className="bg-black border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Project Name & Back Button */}
          <div className="flex items-center gap-4 py-3">
            <button
              onClick={() => router.push('/')}
              className="text-white bg-white/10 hover:bg-white/20 transition-colors px-3 sm:px-4 py-2 rounded-lg"
              title="Back"
            >
              <span className="sm:hidden">🏠</span>
              <span className="hidden sm:inline">← Back</span>
            </button>
            <div className="h-6 w-px bg-white/20"></div>
            
            {/* Editable Project Name */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  disabled={isSaving}
                  className="bg-white/10 px-3 py-1 rounded-lg text-white border border-cyan-500/50 focus:outline-none focus:border-cyan-500 min-w-[200px]"
                  placeholder="Project name..."
                />
                {isSaving && (
                  <span className="text-xs text-gray-400">Saving...</span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="group flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-white/5 transition-all"
                title="Click to rename"
              >
                <h2 className="text-base sm:text-lg font-semibold gradient-text truncate max-w-[120px] sm:max-w-none">
                  {currentProject?.name || projectName || 'Project'}
                </h2>
                <span className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                  ✏️
                </span>
              </button>
            )}
          </div>


          {/* Tabs */}
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => router.push(tab.path)}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-4 font-medium transition-all relative ${
                  isActive(tab.path)
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                title={tab.name}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl sm:text-base">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.name}</span>
                </span>
                {isActive(tab.path) && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                )}
              </button>
            ))}
          </div>

          {/* User Controls */}
          <UserControls />
        </div>
      </div>
    </div>
  );
}
