'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import UserControls from '@/components/UserControls';
import { toast } from 'react-toastify';

export default function LandingPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { user } = await apiClient.getCurrentUser();
      setUser(user);
    } catch (error) {
      console.log('Not logged in');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiClient.clearToken();
    setUser(null);
    router.refresh();
  };

  const handleStartCreating = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    setIsCreating(true);
    try {
      // Create a new project
      const projectName = `Untitled Project ${new Date().toLocaleTimeString()}`;
      const response = await apiClient.createProject(projectName);
      
      if (response.project?.id) {
        router.push(`/compose/${response.project.id}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold gradient-text">🎵 Musically</div>
          
          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <UserControls />
                ) : (
                  <>
                    <button
                      onClick={() => router.push('/auth')}
                      className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/5 transition"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => router.push('/auth')}
                      className="px-6 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 transition border border-white/10"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </>
            )}
            
            <button
              onClick={handleStartCreating}
              disabled={isCreating}
              className="md:hidden bg-gradient-to-r from-cyan-500 to-purple-500 p-2 rounded-lg font-medium transition-transform disabled:opacity-50"
              title="New Project"
            >
              ➕
            </button>
            <button
              onClick={handleStartCreating}
              disabled={isCreating}
              className="hidden md:block bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-2 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              {isCreating ? 'Creating...' : user ? 'New Project →' : 'Get Started →'}
            </button>
          </div>
       </div>
      </nav>

      {/* Hero Section */}
      <section className={`relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-gray-300">Real-time music collaboration</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-tight px-4">
            Create Music
            <br />
            <span className="gradient-text">Together, Anywhere</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-6">
            A revolutionary platform for musicians to compose, collaborate, and share music in real-time with Git-like version control.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 px-6">
            <button
              onClick={handleStartCreating}
              disabled={isCreating}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-lg btn-hover disabled:opacity-50"
              style={{ background: 'var(--gradient-cyan)' }}
            >
              {isCreating ? 'Creating...' : 'Start Creating Now'}
            </button>
            <button
              onClick={() => router.push('/discover')}
              className="w-full sm:w-auto glass px-8 py-4 rounded-xl font-semibold text-lg btn-hover"
            >
              Explore Projects
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-12 pt-12 text-sm">
            <div>
              <div className="text-3xl font-bold gradient-text-cyan">5</div>
              <div className="text-gray-400">Instruments</div>
            </div>
            <div>
              <div className="text-3xl font-bold gradient-text-cyan">∞</div>
              <div className="text-gray-400">Collaborators</div>
            </div>
            <div>
              <div className="text-3xl font-bold gradient-text-cyan">100%</div>
              <div className="text-gray-400">Real-time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`relative z-10 max-w-7xl mx-auto px-6 py-20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-gray-400 text-lg">Everything you need to create amazing music together</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="glass-strong rounded-2xl p-8 card-hover">
            <div className="text-5xl mb-4">🎹</div>
            <h3 className="text-2xl font-bold mb-3">Multi-Track Recording</h3>
            <p className="text-gray-400">
              Record multiple instruments simultaneously with our intuitive timeline interface and visual event blocks.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-strong rounded-2xl p-8 card-hover">
            <div className="text-5xl mb-4">🌿</div>
            <h3 className="text-2xl font-bold mb-3">Version Control</h3>
            <p className="text-gray-400">
              Git-like branching and merging for music. Never lose a version, experiment freely, and collaborate safely.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-strong rounded-2xl p-8 card-hover">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-2xl font-bold mb-3">Real-Time Collaboration</h3>
            <p className="text-gray-400">
              Chat with collaborators, share ideas, and create music together with WebSocket-powered real-time sync.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="glass-strong rounded-2xl p-8 card-hover">
            <div className="text-5xl mb-4">🎛️</div>
            <h3 className="text-2xl font-bold mb-3">Professional Instruments</h3>
            <p className="text-gray-400">
              Drums, piano, guitar, synthesizers, and pads powered by Tone.js for studio-quality sound.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="glass-strong rounded-2xl p-8 card-hover">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold mb-3">Lightning Fast</h3>
            <p className="text-gray-400">
              Built with Next.js and optimized for performance. Create and play back music with zero latency.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="glass-strong rounded-2xl p-8 card-hover">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold mb-3">Easy to Use</h3>
            <p className="text-gray-400">
              Intuitive interface for modern creators. Start creating music in seconds, no learning curve.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`relative z-10 max-w-4xl mx-auto px-6 py-32 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="glass-strong rounded-3xl p-12 text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Make Music?
          </h2>
          <p className="text-xl text-gray-400">
            Join musicians worldwide creating amazing compositions together.
          </p>
          <button
            onClick={handleStartCreating}
            disabled={isCreating}
            className="px-10 py-5 rounded-xl font-bold text-xl btn-hover glow disabled:opacity-50"
            style={{ background: 'var(--gradient-rainbow)' }}
          >
            {isCreating ? 'Creating...' : 'Start Creating Now →'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500">
          <p>© 2024 Musically. Built with passion for musicians.</p>
        </div>
      </footer>
    </div>
  );
}
