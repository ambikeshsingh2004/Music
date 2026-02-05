'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import useProjectStore from '@/store/projectStore';

export default function VersionHistory({ projectId }) {
  const [versions, setVersions] = useState([]);
  const { currentVersion } = useProjectStore();

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    try {
      const data = await apiClient.getVersions(projectId);
      setVersions(data.versions);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const handleRevert = async (versionId) => {
    if (!confirm('Revert to this version?')) return;
    
    try {
      await apiClient.revertToVersion(projectId, versionId);
      window.location.reload();
    } catch (error) {
      console.error('Failed to revert:', error);
      toast.error('Failed to revert to version');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Version History</h3>
      
      {versions.length === 0 ? (
        <p className="text-sm text-gray-400">No versions yet</p>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`p-3 rounded-lg ${
                currentVersion?.id === version.id
                  ? 'bg-cyan-600/30 border border-cyan-500'
                  : 'bg-white/5'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="font-semibold text-sm">
                    Version {version.version_number}
                  </div>
                  <div className="text-xs text-gray-400">
                    {version.created_by_username}
                  </div>
                </div>
                {currentVersion?.id !== version.id && (
                  <button
                    onClick={() => handleRevert(version.id)}
                    className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded"
                  >
                    Revert
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-300">{version.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(version.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
