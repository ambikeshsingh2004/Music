'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';

export default function UserControls() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { user } = await apiClient.getCurrentUser();
        setUser(user);
      } catch (error) {
        // Not logged in or error
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    apiClient.clearToken();
    router.replace('/auth');
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-400 hidden md:block">
        {user.username}
      </span>
      
      <button
        onClick={() => router.push('/messages')}
        className="text-gray-400 hover:text-white transition-colors relative"
        title="Messages"
      >
        <span className="text-xl">💬</span>
      </button>

      <button
        onClick={() => router.push('/discover')}
        className="text-gray-400 hover:text-white transition-colors text-sm hover:underline"
        title="Dashboard"
      >
        Dashboard
      </button>

      <div className="h-4 w-px bg-white/10"></div>

      <button
        onClick={handleLogout}
        className="text-red-400 hover:text-red-300 transition-colors text-sm"
        title="Logout"
      >
        Logout
      </button>
    </div>
  );
}
