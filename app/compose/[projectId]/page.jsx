'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/lib/api';
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
      alert('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <TabNavigation projectId={projectId} projectName={projectData?.name} />
      <div className="flex-1">
        <Workspace projectId={projectId} />
      </div>
    </div>
  );
}
