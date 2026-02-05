'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import apiClient from '@/lib/api';

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [users, setUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      initSocket();
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation && socket) {
      socket.emit('join-conversation', { conversationId: selectedConversation.id });
      loadMessages(selectedConversation.id);

      return () => {
        socket.emit('leave-conversation', { conversationId: selectedConversation.id });
      };
    }
  }, [selectedConversation, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    try {
      const data = await apiClient.getCurrentUser();
      setUser(data.user);
    } catch (error) {
      router.push('/auth');
    }
  };

  const initSocket = () => {
    const apiHost = process.env.NEXT_PUBLIC_API_HOST;
    const socketUrl = (() => {
      if (apiHost) {
        if (apiHost.includes('.')) {
          return `https://${apiHost}`;
        }
        return `https://${apiHost}.onrender.com`;
      }
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    })();
    const newSocket = io(socketUrl);

    newSocket.on('connect', () => {
      newSocket.emit('register-user', { userId: user.id, username: user.username });
    });

    newSocket.on('new-message', ({ message }) => {
      setMessages(prev => [...prev, message]);
      // Update conversation list
      setConversations(prev => prev.map(conv => 
        conv.id === message.conversation_id
          ? { ...conv, last_message: message, updated_at: message.created_at }
          : conv
      ));
    });

    newSocket.on('user-typing', ({ user: typingUser, isTyping }) => {
      if (isTyping) {
        setTypingUsers(prev => [...prev.filter(u => u.id !== typingUser.id), typingUser]);
      } else {
        setTypingUsers(prev => prev.filter(u => u.id !== typingUser.id));
      }
    });

    setSocket(newSocket);
  };

  const loadConversations = async () => {
    try {
      const data = await apiClient.getConversations();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    setMessagesLoading(true);
    try {
      const data = await apiClient.getMessages(conversationId);
      setMessages(data.messages);
      
      // Update unread count locally to 0 since we've now read the messages
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unread_count: 0 }
          : conv
      ));
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiClient.getAllUsers();
      setUsers(data.users.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const data = await apiClient.sendMessage(selectedConversation.id, newMessage);
      setMessages(prev => [...prev, data.message]);
      setNewMessage('');

      // Emit to socket for real-time delivery
      socket?.emit('send-message', {
        conversationId: selectedConversation.id,
        message: data.message
      });

      // Stop typing indicator
      socket?.emit('typing-stop', {
        conversationId: selectedConversation.id,
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !socket) return;

    socket.emit('typing-start', {
      conversationId: selectedConversation.id,
      user: { id: user.id, username: user.username }
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', {
        conversationId: selectedConversation.id,
        user: { id: user.id, username: user.username }
      });
    }, 2000);
  };

  const startNewChat = async (selectedUser) => {
    try {
      const data = await apiClient.createDirectConversation(selectedUser.id);
      setShowNewChatModal(false);
      
      if (!data.existing) {
        setConversations(prev => [data.conversation, ...prev]);
      }
      
      setSelectedConversation(data.conversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.name) return conversation.name;
    if (conversation.other_participants && conversation.other_participants.length > 0) {
      return conversation.other_participants.map(p => p.username).join(', ');
    }
    return 'Unknown';
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.type === 'project') return '🎵';
    if (conversation.other_participants && conversation.other_participants.length > 0) {
      return conversation.other_participants[0].username[0].toUpperCase();
    }
    return '?';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
      <div className="flex h-screen">
        {/* Sidebar - Conversations List */}
        <div className={`
          ${selectedConversation ? 'hidden md:flex' : 'flex'} 
          w-full md:w-80 bg-black border-r border-white/10 flex-col h-full
        `}>
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Messages
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Back to Home"
                >
                  <span className="text-xl">🏠</span>
                </button>
                <button
                  onClick={() => {
                    apiClient.clearToken();
                    router.replace('/auth');
                  }}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Logout"
                >
                   <span className="text-xl">🚪</span>
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                loadUsers();
                setShowNewChatModal(true);
              }}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              + New Chat
            </button>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No conversations yet. Start a new chat!
              </div>
            ) : (
              conversations.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 cursor-pointer hover:bg-white/10 transition border-b border-white/5 ${
                    selectedConversation?.id === conversation.id ? 'bg-white/15' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-xl font-bold">
                      {getConversationAvatar(conversation)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold truncate">
                          {getConversationName(conversation)}
                        </h3>
                        {conversation.last_message && (
                          <span className="text-xs text-gray-400">
                            {formatTime(conversation.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {conversation.last_message ? conversation.last_message.content : 'No messages yet'}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-xs font-bold">
                        {conversation.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`
          ${selectedConversation ? 'flex' : 'hidden md:flex'} 
          flex-1 flex flex-col h-full
        `}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 bg-black/20 border-b border-white/10 flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-white/10 rounded-lg transition"
                >
                  ←
                </button>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-base sm:text-lg font-bold">
                  {getConversationAvatar(selectedConversation)}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-base sm:text-lg truncate">
                    {getConversationName(selectedConversation)}
                  </h2>
                  {selectedConversation.project_name && (
                    <p className="text-[10px] sm:text-sm text-gray-400 truncate">
                      Project: {selectedConversation.project_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="text-center text-gray-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-20">
                    No messages yet. Say hello! 👋
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-2xl ${
                          message.sender_id === user.id
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 rounded-br-sm'
                            : 'bg-white/10 rounded-bl-sm'
                        }`}
                      >
                        {message.sender_id !== user.id && (
                          <p className="text-xs text-cyan-400 mb-1 font-semibold">
                            {message.sender_username}
                          </p>
                        )}
                        <p className="break-words">{message.content}</p>
                        <p className="text-xs opacity-60 mt-1 text-right">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {typingUsers.length > 0 && (
                  <div className="text-sm text-gray-400 italic">
                    {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-black/20 border-t border-white/10">
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Message..."
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-xl">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Start New Chat</h2>
            <input
              type="text"
              placeholder="Search users..."
              className="w-full px-4 py-2 bg-white/10 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex-1 overflow-y-auto space-y-2">
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => startNewChat(u)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center font-bold">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{u.username}</p>
                    <p className="text-sm text-gray-400">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowNewChatModal(false)}
              className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
