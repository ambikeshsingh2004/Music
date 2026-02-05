'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useCollaborationStore from '@/store/collaborationStore';

export default function useSocket(projectId, user) {
  const socketRef = useRef(null);
  const { setSocket, setActiveUsers, addActiveUser, removeActiveUser, addProposal, updateProposal } = useCollaborationStore();

  useEffect(() => {
    if (!projectId || !user) return;

    const socketHost = process.env.NEXT_PUBLIC_SOCKET_HOST;
    const SOCKET_URL = socketHost ? `https://${socketHost}` : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');

    // Create socket connection
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setSocket(socketRef.current);

      // Join project room
      socketRef.current.emit('join-project', { projectId, user });
    });

    // Listen for active users
    socketRef.current.on('active-users', ({ users }) => {
      setActiveUsers(users);
    });

    // Listen for user joined
    socketRef.current.on('user-joined', ({ user }) => {
      addActiveUser(user);
    });

    // Listen for user left
    socketRef.current.on('user-left', ({ user }) => {
      removeActiveUser(user.userId);
    });

    // Listen for new proposals
    socketRef.current.on('new-proposal', ({ proposal }) => {
      addProposal(proposal);
    });

    // Listen for proposal status changes
    socketRef.current.on('proposal-status-changed', ({ proposalId, status }) => {
      updateProposal(proposalId, { status });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-project', { projectId, user });
        socketRef.current.disconnect();
        setSocket(null);
      }
    };
  }, [projectId, user]);

  return socketRef.current;
}
