'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/lib/api';
import { toast } from 'react-toastify';
import useProjectStore from '@/store/projectStore';
import Workspace from '@/components/Workspace';
import TabNavigation from '@/components/TabNavigation';

export default function ComposePage() {
  const params = useParams();
  const projectId = params.projectId;
  const [isLoading, setIsLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const { loadProject } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const data = await apiClient.getProject(projectId);
      setProjectData(data.project);
      loadProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          {/* Animated Logo */}
<div className="text-6xl animate-pulse">🎵</div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold gradient-text">Loading Project</h2>
            <p className="text-gray-400">Preparing your workspace...</p>
          </div>
          
          {/* Loading Bar */}
          <div className="w-64 h-2 glass rounded-full overflow-hidden">
            <div className="h-full shimmer w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col page-transition">
      <TabNavigation projectId={projectId} projectName={projectData?.name} />
      <div className="flex-1">
        <Workspace projectId={projectId} />
      </div>
    </div>
  );
}
