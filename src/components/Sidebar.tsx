/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardCheck, 
  TrendingUp, 
  UserPlus, 
  LogOut, 
  Briefcase,
  MessageSquare,
  ScrollText,
  Video,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  X,
  Loader2,
  AlertCircle,
  Save,
  Plus,
  Share2,
  Check
} from 'lucide-react';
import { User, UserRole } from '../types.js';
import CandidateForm from './CandidateForm.tsx';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  token: string;
}

export default function Sidebar({ currentUser, activeTab, setActiveTab, onLogout, token }: SidebarProps) {
  const [adminMenuExpanded, setAdminMenuExpanded] = React.useState(true);
  const [copiedShareLink, setCopiedShareLink] = React.useState(false);

  const handleCopyShareLink = () => {
    const shareableUrl = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  // Quick Action Modals States
  const [showQuickTaskModal, setShowQuickTaskModal] = React.useState(false);
  const [showQuickCandidateModal, setShowQuickCandidateModal] = React.useState(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);

  // New Task States
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [newTaskDescription, setNewTaskDescription] = React.useState('');
  const [selectedAssignees, setSelectedAssignees] = React.useState<string[]>([]);
  const [newTaskComment, setNewTaskComment] = React.useState('');
  const [submittingTask, setSubmittingTask] = React.useState(false);
  const [taskError, setTaskError] = React.useState('');

  React.useEffect(() => {
    if (showQuickTaskModal && token) {
      const fetchUsers = async () => {
        setUsersLoading(true);
        try {
          const res = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUsers(data);
          }
        } catch (err) {
          console.error("Error fetching users for task assignment:", err);
        } finally {
          setUsersLoading(false);
        }
      };
      fetchUsers();
    }
  }, [showQuickTaskModal, token]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDescription.trim()) {
      setTaskError('Task title and description are required.');
      return;
    }

    setSubmittingTask(true);
    setTaskError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          assignees: currentUser.role === UserRole.HR_RECRUITER ? [] : selectedAssignees,
          initialComment: newTaskComment.trim() || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create task');
      }

      // Reset form states
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskComment('');
      setSelectedAssignees([]);
      setTaskError('');
      setShowQuickTaskModal(false);

      // Dispatch custom event to notify other components (e.g., TasksView)
      window.dispatchEvent(new CustomEvent('task-created'));
    } catch (err: any) {
      setTaskError(err.message || 'An error occurred while creating the task.');
    } finally {
      setSubmittingTask(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-50 text-red-700 border border-red-100';
      case UserRole.TEAM_LEADER:
        return 'bg-amber-50 text-amber-700 border border-amber-100';
      case UserRole.HR_RECRUITER:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-100';
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(currentUser.role === UserRole.ADMIN ? [{ id: 'daily-tracker', label: 'Daily Tracker', icon: Clock }] : []),
    { id: 'candidates', label: 'Candidate Pool', icon: Users },
    { id: 'interviews', label: 'Interviews', icon: Calendar },
    { id: 'pipeline', label: 'Offers & Joining', icon: ClipboardCheck },
    { id: 'meetings', label: 'Team Meetings', icon: Video },
    { id: 'reports', label: 'Analytics Reports', icon: TrendingUp },
    { id: 'chat', label: 'Team Chat', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks & Workflow', icon: CheckSquare },
  ];

  const allowedNavItems = navItems.filter((item) => {
    if (item.id === 'dashboard') return true;
    if (currentUser.role === UserRole.HR_RECRUITER && item.id === 'meetings') {
      return false;
    }
    if (currentUser.role === UserRole.TEAM_LEADER) {
      return currentUser.permissions?.includes(item.id) ?? true;
    }
    return true;
  });

  // Display team management directory for both Admin and Team Leaders
  const showTeamDirectory = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.TEAM_LEADER;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col h-screen sticky top-0 text-slate-700 dark:text-slate-300 select-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/20 dark:bg-slate-900/40">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
          <Briefcase className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-wider uppercase">RecruitCore</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Applicant Tracking System</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 mb-2">
          Management
        </div>
        {allowedNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              id={`nav-tab-${item.id}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {showTeamDirectory && (
          <>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 pt-6 mb-2">
              {currentUser.role === UserRole.ADMIN ? 'System Administration' : 'Team Lead Tools'}
            </div>
            {currentUser.role === UserRole.ADMIN ? (
              <div className="space-y-1">
                <button
                  id="system-admin-toggle-btn"
                  onClick={() => setAdminMenuExpanded(!adminMenuExpanded)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>System Admin</span>
                  </div>
                  {adminMenuExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {adminMenuExpanded && (
                  <div className="pl-4 border-l border-slate-100 dark:border-slate-800 ml-5.5 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                    <button
                      id="nav-tab-system-admin-dashboard"
                      onClick={() => setActiveTab('system-admin-dashboard')}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        activeTab === 'system-admin-dashboard'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white text-slate-550 dark:text-slate-400'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>System Admin Dashboard</span>
                    </button>
                    <button
                      id="nav-tab-team"
                      onClick={() => setActiveTab('team')}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        activeTab === 'team'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white text-slate-550 dark:text-slate-400'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                      <span>Recruiters Team</span>
                    </button>
                    <button
                      id="nav-tab-shift-monitor"
                      onClick={() => setActiveTab('shift-monitor')}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        activeTab === 'shift-monitor'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white text-slate-550 dark:text-slate-400'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Shift Monitor</span>
                    </button>
                    <button
                      id="nav-tab-logs"
                      onClick={() => setActiveTab('logs')}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        activeTab === 'logs'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white text-slate-550 dark:text-slate-400'
                      }`}
                    >
                      <ScrollText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Activity Logs</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="nav-tab-team"
                onClick={() => setActiveTab('team')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'team'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400'
                }`}
              >
                <UserPlus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>My Assigned Team</span>
              </button>
            )}
          </>
        )}

        {/* Quick Actions Section */}
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 pt-6 mb-2">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 gap-2 px-1 pb-4">
          <button
            id="quick-candidate-btn"
            onClick={() => setShowQuickCandidateModal(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/40 dark:hover:bg-indigo-950/20 text-slate-600 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-450 border border-slate-100 hover:border-indigo-150 dark:border-slate-800 dark:hover:border-indigo-900/50 transition cursor-pointer text-center group"
            title="Create candidate from anywhere"
          >
            <UserPlus className="w-5 h-5 mb-1 text-slate-400 group-hover:text-indigo-550 dark:group-hover:text-indigo-400 transition" />
            <span className="text-[10px] font-bold tracking-tight">Add Candidate</span>
          </button>
          
          <button
            id="quick-task-btn"
            onClick={() => setShowQuickTaskModal(true)}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/40 dark:hover:bg-indigo-950/20 text-slate-600 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-450 border border-slate-100 hover:border-indigo-150 dark:border-slate-800 dark:hover:border-indigo-900/50 transition cursor-pointer text-center group"
            title="Create task from anywhere"
          >
            <CheckSquare className="w-5 h-5 mb-1 text-slate-400 group-hover:text-indigo-550 dark:group-hover:text-indigo-400 transition" />
            <span className="text-[10px] font-bold tracking-tight">Create Task</span>
          </button>
        </div>
      </nav>

      {/* User Footer Profile & Action */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
        <div className="flex items-center space-x-3 p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800 mb-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</h4>
            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-bold mt-1 uppercase tracking-wider ${getRoleColor(currentUser.role)}`}>
              {currentUser.role}
            </span>
          </div>
        </div>

        <button
          id="copy-share-link-btn"
          onClick={handleCopyShareLink}
          className="w-full mb-2 flex items-center justify-center space-x-2 px-3 py-2 text-xs font-bold text-indigo-650 hover:text-white bg-indigo-50 hover:bg-indigo-600 dark:text-indigo-400 dark:hover:text-white dark:bg-indigo-950/20 dark:hover:bg-indigo-600 rounded-xl border border-indigo-150 dark:border-indigo-900/50 transition-all cursor-pointer shadow-sm"
          title="Copy direct production/accessible URL of the system for other employees"
        >
          {copiedShareLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-450">Copied Access Link!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Copy Share Link</span>
            </>
          )}
        </button>

        <button
          id="logout-btn"
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl border border-transparent hover:border-rose-150 dark:hover:border-rose-900/50 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out Session</span>
        </button>
      </div>

      {/* Quick Create Task Modal */}
      {showQuickTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Quick Create Task</h3>
              <button 
                onClick={() => setShowQuickTaskModal(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {taskError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-xl flex items-start space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{taskError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider mb-1">Task Title *</label>
                <input
                  type="text"
                  placeholder="Enter task summary..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider mb-1">Description *</label>
                <textarea
                  placeholder="Provide detailed description of the workflow..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition resize-none"
                  required
                />
              </div>

              {currentUser.role !== UserRole.HR_RECRUITER && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider mb-1.5">Assign To (Recruiters)</label>
                  {usersLoading ? (
                    <div className="flex items-center space-x-2 py-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading eligible team members...</span>
                    </div>
                  ) : (
                    <div className="max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 space-y-1.5 bg-slate-50 dark:bg-slate-950">
                      {users.length === 0 ? (
                        <p className="text-[11px] text-slate-400">No recruiters found.</p>
                      ) : (
                        users.map((u) => (
                          <label key={u.id} className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedAssignees.includes(u.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssignees([...selectedAssignees, u.id]);
                                } else {
                                  setSelectedAssignees(selectedAssignees.filter(id => id !== u.id));
                                }
                              }}
                              className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{u.name} <span className="text-[9px] text-slate-400 uppercase font-bold">({u.role})</span></span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider mb-1">Initial Status / Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="Add first update comment..."
                  value={newTaskComment}
                  onChange={(e) => setNewTaskComment(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickTaskModal(false)}
                  className="flex-1 px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="flex-1 flex items-center justify-center space-x-1 px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {submittingTask ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Create Task</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Create Candidate Modal */}
      {showQuickCandidateModal && (
        <CandidateForm
          token={token}
          candidate={null}
          onClose={() => setShowQuickCandidateModal(false)}
          onSaveSuccess={() => {
            setShowQuickCandidateModal(false);
            window.dispatchEvent(new CustomEvent('candidate-created'));
          }}
        />
      )}
    </aside>
  );
}
