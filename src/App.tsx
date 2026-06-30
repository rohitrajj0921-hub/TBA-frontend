/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Loader2, 
  Menu, 
  X, 
  Briefcase,
  Video,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole } from './types.js';
import LoginView from './components/LoginView.tsx';
import Sidebar from './components/Sidebar.tsx';
import DashboardView from './components/DashboardView.tsx';
import CandidatesView from './components/CandidatesView.tsx';
import InterviewsView from './components/InterviewsView.tsx';
import PipelineView from './components/PipelineView.tsx';
import ReportsView from './components/ReportsView.tsx';
import UsersView from './components/UsersView.tsx';
import ChatView from './components/ChatView.tsx';
import LogsView from './components/LogsView.tsx';
import MeetingsView from './components/MeetingsView.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import ShiftMonitorView from './components/ShiftMonitorView.tsx';
import DailyTrackerView from './components/DailyTrackerView.tsx';
import TasksView from './components/TasksView.tsx';
import AccessDeniedView from './components/AccessDeniedView.tsx';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ats_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Hash-based routing to support easy device-to-device deep link sharing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveTab(hash);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (activeTab && window.location.hash !== `#${activeTab}`) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);
  
  // Mobile navigation overlay toggling
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme configuration (light/dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Real-time active meeting invitation notification alert state
  const [activeInvite, setActiveInvite] = useState<{
    id: string;
    title: string;
    description?: string;
    meetingUrl: string;
    creatorName: string;
    scheduledAt: string;
  } | null>(null);

  // Real-time online users presence and statistics state
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  // Local productivity and activity tracking state
  const [localActivity, setLocalActivity] = useState({
    clicks: 0,
    distance: 0,
    isIdle: false,
    activeSeconds: 0,
    sessionStart: Date.now()
  });

  const localActivityRef = useRef(localActivity);
  useEffect(() => {
    localActivityRef.current = localActivity;
  }, [localActivity]);

  // Monitor mouse usage and user activity
  useEffect(() => {
    let lastPosition = { x: 0, y: 0 };
    let totalDistance = 0;
    let totalClicks = 0;
    let lastActiveTime = Date.now();
    let isIdle = false;
    let activeSeconds = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      if (lastPosition.x !== 0 || lastPosition.y !== 0) {
        const dx = clientX - lastPosition.x;
        const dy = clientY - lastPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1 && dist < 1000) {
          totalDistance += dist;
        }
      }
      lastPosition = { x: clientX, y: clientY };
      lastActiveTime = Date.now();
      if (isIdle) {
        isIdle = false;
        setLocalActivity(prev => ({ ...prev, isIdle: false }));
      }
    };

    const handleMouseDown = () => {
      totalClicks += 1;
      lastActiveTime = Date.now();
      if (isIdle) {
        isIdle = false;
        setLocalActivity(prev => ({ ...prev, isIdle: false }));
      }
    };

    const handleKeyDown = () => {
      lastActiveTime = Date.now();
      if (isIdle) {
        isIdle = false;
        setLocalActivity(prev => ({ ...prev, isIdle: false }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActive = now - lastActiveTime;

      // Idle threshold: 60 seconds
      if (timeSinceLastActive > 60000) {
        isIdle = true;
      } else {
        isIdle = false;
        activeSeconds += 1;
      }

      setLocalActivity(prev => ({
        ...prev,
        clicks: totalClicks,
        distance: Math.round(totalDistance),
        isIdle: isIdle,
        activeSeconds: activeSeconds
      }));
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  // Real-time global meeting invitations listener
  useEffect(() => {
    if (!token || !currentUser) {
      setActiveInvite(null);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let activityInterval: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;

    const connect = () => {
      if (ws) {
        ws.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          reconnectAttempts = 0;
          // Authenticate
          ws?.send(JSON.stringify({
            type: 'auth',
            token: token
          }));

          // Start activity ping interval
          if (activityInterval) {
            clearInterval(activityInterval);
          }
          activityInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'activity_ping',
                clicks: localActivityRef.current.clicks,
                distance: localActivityRef.current.distance,
                isIdle: localActivityRef.current.isIdle
              }));
            }
          }, 5000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'meeting_invite' && data.meeting) {
              // Trigger the live notification alert on screen!
              setActiveInvite(data.meeting);
            } else if (data.type === 'presence_update' && data.users) {
              // Track real-time presence
              setOnlineUsers(data.users);
            }
          } catch (err) {
            console.warn("Global WS parse error:", err);
          }
        };

        ws.onclose = () => {
          if (activityInterval) {
            clearInterval(activityInterval);
            activityInterval = null;
          }
          if (reconnectAttempts < 3) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };

        ws.onerror = () => {
          // Silent fallback
        };
      } catch (err) {
        console.warn("Global WS initialization failed:", err);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (activityInterval) {
        clearInterval(activityInterval);
      }
    };
  }, [token, currentUser]);

  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error("Stale session");
        }

        const data = await response.json();
        setCurrentUser(data.user);
      } catch (err) {
        console.warn("Session expired or invalid token:", err);
        localStorage.removeItem('ats_token');
        setToken(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [token]);

  const handleLoginSuccess = (user: User, userToken: string) => {
    localStorage.setItem('ats_token', userToken);
    setToken(userToken);
    setCurrentUser(user);
    
    // Check if there is an existing deep link in the hash route
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'login') {
      setActiveTab(hash);
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ats_token');
    setToken(null);
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <Loader2 className="w-9 h-9 animate-spin text-indigo-600 mb-2.5" />
        <h3 className="text-slate-800 font-bold text-sm">RecruitCore Securing Sessions</h3>
        <p className="text-xs mt-1 text-slate-400">Connecting securely to authentication modules...</p>
      </div>
    );
  }

  // Render Login screen if not authenticated
  if (!token || !currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Main layout routing
  const renderTabContent = () => {
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isTeamLeader = currentUser.role === UserRole.TEAM_LEADER;
    const isRecruiter = currentUser.role === UserRole.HR_RECRUITER;

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView token={token} currentUser={currentUser} onlineUsers={onlineUsers} localActivity={localActivity} />;
      case 'system-admin-dashboard':
        if (isAdmin) {
          return <AdminDashboard token={token} currentUser={currentUser} onlineUsers={onlineUsers} localActivity={localActivity} setActiveTab={setActiveTab} />;
        }
        return (
          <AccessDeniedView 
            currentUser={currentUser} 
            requestedTab={activeTab} 
            requiredRoles={[UserRole.ADMIN]} 
            onBackToDashboard={() => setActiveTab('dashboard')} 
            onLogout={handleLogout}
          />
        );
      case 'candidates':
        return <CandidatesView token={token} currentUser={currentUser} />;
      case 'interviews':
        return <InterviewsView token={token} currentUser={currentUser} />;
      case 'pipeline':
        return <PipelineView token={token} currentUser={currentUser} />;
      case 'meetings':
        if (isRecruiter) {
          return (
            <AccessDeniedView 
              currentUser={currentUser} 
              requestedTab={activeTab} 
              requiredRoles={[UserRole.ADMIN, UserRole.TEAM_LEADER]} 
              onBackToDashboard={() => setActiveTab('dashboard')} 
              onLogout={handleLogout}
            />
          );
        }
        return <MeetingsView token={token} currentUser={currentUser} />;
      case 'reports':
        return <ReportsView token={token} />;
      case 'chat':
        return <ChatView token={token} currentUser={currentUser} />;
      case 'tasks':
        return <TasksView token={token} currentUser={currentUser} />;
      case 'team':
        if (isAdmin || isTeamLeader) {
          return <UsersView token={token} currentUser={currentUser} onlineUsers={onlineUsers} localActivity={localActivity} />;
        }
        return (
          <AccessDeniedView 
            currentUser={currentUser} 
            requestedTab={activeTab} 
            requiredRoles={[UserRole.ADMIN, UserRole.TEAM_LEADER]} 
            onBackToDashboard={() => setActiveTab('dashboard')} 
            onLogout={handleLogout}
          />
        );
      case 'shift-monitor':
        if (isAdmin) {
          return <ShiftMonitorView token={token} onlineUsers={onlineUsers} />;
        }
        return (
          <AccessDeniedView 
            currentUser={currentUser} 
            requestedTab={activeTab} 
            requiredRoles={[UserRole.ADMIN]} 
            onBackToDashboard={() => setActiveTab('dashboard')} 
            onLogout={handleLogout}
          />
        );
      case 'daily-tracker':
        if (isAdmin) {
          return <DailyTrackerView token={token || ''} currentUser={currentUser} />;
        }
        return (
          <AccessDeniedView 
            currentUser={currentUser} 
            requestedTab={activeTab} 
            requiredRoles={[UserRole.ADMIN]} 
            onBackToDashboard={() => setActiveTab('dashboard')} 
            onLogout={handleLogout}
          />
        );
      case 'logs':
        if (isAdmin) {
          return <LogsView token={token} currentUser={currentUser} />;
        }
        return (
          <AccessDeniedView 
            currentUser={currentUser} 
            requestedTab={activeTab} 
            requiredRoles={[UserRole.ADMIN]} 
            onBackToDashboard={() => setActiveTab('dashboard')} 
            onLogout={handleLogout}
          />
        );
      default:
        return <DashboardView token={token} currentUser={currentUser} onlineUsers={onlineUsers} localActivity={localActivity} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Universal Fixed Theme Toggle button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          id="theme-toggle-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center h-9 w-9"
          title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          currentUser={currentUser} 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }} 
          onLogout={handleLogout} 
          token={token || ''}
        />
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm">
          <div className="w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">RecruitCore</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <Sidebar 
              currentUser={currentUser} 
              activeTab={activeTab} 
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }} 
              onLogout={handleLogout} 
              token={token || ''}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-md z-40 pr-16">
          <div className="flex items-center space-x-2.5">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wider uppercase">RecruitCore</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-700 cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        </header>

        {/* View render */}
        <main className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* Real-time Meeting Invitation Popup Alerts */}
      <AnimatePresence>
        {activeInvite && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="relative shrink-0">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                    <Video className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Incoming Meeting</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{activeInvite.title}</h4>
                </div>
              </div>
              <button 
                onClick={() => setActiveInvite(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <p className="leading-relaxed text-slate-300">
                <strong className="text-indigo-300">{activeInvite.creatorName}</strong> is inviting you to join a live team meeting.
              </p>
              {activeInvite.description && (
                <p className="text-[11px] text-slate-400 italic line-clamp-2 mt-1">
                  &ldquo;{activeInvite.description}&rdquo;
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2.5 pt-0.5">
              <button
                onClick={() => {
                  setActiveInvite(null);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
              >
                Dismiss
              </button>
              <a
                href={activeInvite.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setActiveInvite(null);
                }}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold text-center transition shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Join Now</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
