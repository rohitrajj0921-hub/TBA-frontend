/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, 
  Plus, 
  Users, 
  MessageSquare, 
  Search, 
  CheckCircle, 
  Clock, 
  User as UserIcon, 
  X, 
  Check, 
  Send, 
  Trash2, 
  ChevronRight, 
  Calendar, 
  Filter, 
  AlertCircle,
  FileText,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { Task, TaskComment, TaskStatus, User, UserRole } from '../types.js';

interface TasksViewProps {
  token: string;
  currentUser: User;
}

export default function TasksView({ token, currentUser }: TasksViewProps) {
  // Tasks list and loaded users
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active selected task for comments / details
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Create task state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskComment, setNewTaskComment] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [submittingTask, setSubmittingTask] = useState(false);

  // Filter/search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial tasks and user list
  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleCreated = () => {
      fetchTasks();
    };
    window.addEventListener('task-created', handleCreated);
    return () => {
      window.removeEventListener('task-created', handleCreated);
    };
  }, []);

  // Poll for comments when a task is open to make it interactive and responsive
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedTask) {
      fetchComments(selectedTask.id, false);
      interval = setInterval(() => {
        fetchComments(selectedTask.id, false);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTask]);

  // Scroll comments to bottom
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchComments = async (taskId: string, showLoading = true) => {
    if (showLoading) setCommentsLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(data);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
    } finally {
      if (showLoading) setCommentsLoading(false);
    }
  };

  // Filter users based on currentUser role for assignment options
  const getAssignableUsers = () => {
    if (currentUser.role === UserRole.ADMIN) {
      return users; // Admin can see all users
    }
    if (currentUser.role === UserRole.TEAM_LEADER) {
      // TL can only see and assign to users of their own team (plus themselves)
      return users.filter(u => u.teamLeadId === currentUser.id || u.id === currentUser.id);
    }
    return []; // Requesters cannot see assignable users
  };

  // Group assignable users by their team leads (to allow team-based selections for Admin)
  const getTeams = () => {
    const assignable = getAssignableUsers();
    const teamLeads = assignable.filter(u => u.role === UserRole.TEAM_LEADER);
    return teamLeads.map(lead => {
      const members = assignable.filter(u => u.teamLeadId === lead.id);
      return {
        lead,
        members,
        name: `${lead.name}'s Team (${members.length + 1} members)`
      };
    });
  };

  // Checkbox/Selection Handlers
  const handleSelectAll = () => {
    const assignable = getAssignableUsers();
    setSelectedAssignees(assignable.map(u => u.id));
  };

  const handleDeselectAll = () => {
    setSelectedAssignees([]);
  };

  const handleSelectTeam = (leadId: string) => {
    const assignable = getAssignableUsers();
    // Select the lead themselves plus all members where teamLeadId equals leadId
    const teamUserIds = assignable
      .filter(u => u.id === leadId || u.teamLeadId === leadId)
      .map(u => u.id);
    
    setSelectedAssignees(prev => {
      const combined = new Set([...prev, ...teamUserIds]);
      return Array.from(combined);
    });
  };

  const handleToggleUser = (userId: string) => {
    setSelectedAssignees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Form submission handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDescription.trim()) {
      alert('Task title and description are required.');
      return;
    }

    setSubmittingTask(true);
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

      await fetchTasks();
      
      // Reset form states
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskComment('');
      setSelectedAssignees([]);
      setIsAddingTask(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingTask(false);
    }
  };

  // Comment submission handler
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;

    const textToSubmit = newCommentText;
    setNewCommentText('');

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textToSubmit })
      });

      if (!res.ok) throw new Error('Failed to post comment');
      const newComment = await res.json();
      setComments(prev => [...prev, newComment]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Status transition handler
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update task status');
      const updated = await res.json();
      
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updated);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete task handler
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action is permanent.')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete task');
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter tasks based on search, status, and assignees
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    
    let matchesAssignee = true;
    if (assigneeFilter === 'assigned_to_me') {
      matchesAssignee = task.assignees.includes(currentUser.id);
    } else if (assigneeFilter === 'created_by_me') {
      matchesAssignee = task.createdBy === currentUser.id;
    } else if (assigneeFilter === 'unassigned') {
      matchesAssignee = task.assignees.length === 0;
    }

    return matchesSearch && matchesStatus && matchesAssignee;
  });

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-150 dark:border-blue-900/50';
      default:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-150 dark:border-amber-900/50';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4" />;
      case TaskStatus.IN_PROGRESS:
        return <Clock className="w-4 h-4 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const assignableUsers = getAssignableUsers();
  const teams = getTeams();

  return (
    <div id="task-management-dashboard" className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 h-screen">
      {/* View Header */}
      <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Task Management</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Role-based assignment system to track team workflows, comment, and resolve action items.
            </p>
          </div>

          {currentUser.role !== UserRole.HR_RECRUITER && (
            <button
              id="add-task-btn"
              onClick={() => setIsAddingTask(true)}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 transition duration-150 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 md:mt-8">
          <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-450 dark:text-slate-500">Total System Tasks</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{tasks.length}</div>
          </div>
          <div className="p-4 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-950/40 rounded-2xl">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-600 dark:text-amber-500">Pending</span>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1.5">
              {tasks.filter(t => t.status === TaskStatus.PENDING).length}
            </div>
          </div>
          <div className="p-4 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950/40 rounded-2xl">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-blue-600 dark:text-blue-500">In Progress</span>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1.5">
              {tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}
            </div>
          </div>
          <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/40 rounded-2xl">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-600 dark:text-emerald-500">Completed</span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1.5">
              {tasks.filter(t => t.status === TaskStatus.COMPLETED).length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="p-6 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-270px)] overflow-hidden">
        {/* Left Side: Search, Filters, Task List (8 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full overflow-hidden space-y-4">
          
          {/* Controls Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                id="task-search-input"
                type="text"
                placeholder="Search task title, desc..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="task-status-filter"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs text-slate-600 dark:text-slate-300 focus:outline-none font-semibold cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value={TaskStatus.PENDING}>Pending</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                </select>
              </div>

              <div className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="task-assignee-filter"
                  value={assigneeFilter}
                  onChange={e => setAssigneeFilter(e.target.value)}
                  className="bg-transparent border-none text-xs text-slate-600 dark:text-slate-300 focus:outline-none font-semibold cursor-pointer"
                >
                  <option value="all">All Tasks</option>
                  <option value="assigned_to_me">Assigned to Me</option>
                  <option value="created_by_me">Created by Me</option>
                  <option value="unassigned">Unassigned Requests</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task List Container */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-3" />
                <span className="text-xs font-semibold">Synchronizing task logs...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <ClipboardCheck className="w-10 h-10 text-slate-350 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">No tasks registered</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  Try adjusting your search criteria or create a new task request above.
                </p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isSelected = selectedTask?.id === task.id;
                const totalCommentsCount = tasks.find(t => t.id === task.id) ? comments.filter(c => c.taskId === task.id).length : 0; // fallback or we fetch count
                return (
                  <motion.div
                    key={task.id}
                    layoutId={`task-card-${task.id}`}
                    onClick={() => {
                      setSelectedTask(task);
                      fetchComments(task.id);
                    }}
                    className={`p-5 rounded-2xl border transition-all duration-150 cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 hover:border-slate-205 dark:hover:border-slate-750 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-none'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <h3 className="text-sm font-extrabold text-slate-800 dark:text-white line-clamp-1">
                        {task.title}
                      </h3>
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        <span>{task.status}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-450 line-clamp-2 mb-4 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-850 pt-3.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>By {task.createdByName} ({task.createdByRole})</span>
                      </div>

                      <div className="flex items-center space-x-3.5">
                        <div className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.assignees.length} assigned</span>
                        </div>
                        {task.assignees.length === 0 && (
                          <span className="text-rose-500 dark:text-rose-400 font-extrabold animate-pulse">Unassigned</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Task Details, State Updates & Comments (5 cols) */}
        <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {selectedTask ? (
              <motion.div
                key={selectedTask.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl shadow-md h-full flex flex-col overflow-hidden"
              >
                {/* Detail Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/45">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-black text-indigo-600 dark:text-indigo-400 tracking-widest block mb-1">
                      Task Reference
                    </span>
                    <h2 className="text-sm font-extrabold text-slate-850 dark:text-white truncate">
                      {selectedTask.title}
                    </h2>
                  </div>
                  <button
                    id="close-task-detail"
                    onClick={() => setSelectedTask(null)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-450 dark:text-slate-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Details Scroll Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* description */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">Description</h4>
                    <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed bg-slate-50/60 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850/50">
                      {selectedTask.description}
                    </p>
                  </div>

                  {/* Status update selector & controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">Status Control</h4>
                      {currentUser.role === UserRole.HR_RECRUITER ? (
                        <div className="w-full text-xs px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 rounded-xl font-bold flex items-center space-x-1.5 cursor-not-allowed">
                          {getStatusIcon(selectedTask.status)}
                          <span className="capitalize">{selectedTask.status.toLowerCase().replace('_', ' ')}</span>
                        </div>
                      ) : (
                        <select
                          id="update-task-status-btn"
                          value={selectedTask.status}
                          onChange={e => handleUpdateStatus(selectedTask.id, e.target.value as TaskStatus)}
                          className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold cursor-pointer"
                        >
                          <option value={TaskStatus.PENDING}>Pending</option>
                          <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                          <option value={TaskStatus.COMPLETED}>Completed</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">Origin</h4>
                      <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 font-medium px-3 py-2 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-850/30">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{selectedTask.createdByName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assignees visual list */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">
                      Assignees ({selectedTask.assignees.length})
                    </h4>
                    {selectedTask.assignees.length === 0 ? (
                      <div className="text-xs text-rose-500 dark:text-rose-400 font-semibold bg-rose-50/30 dark:bg-rose-950/10 px-3 py-2 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center space-x-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Unassigned request. Admin or TL must assign team members.</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.assignees.map(uid => {
                          const userMatch = users.find(u => u.id === uid);
                          return (
                            <span 
                              key={uid} 
                              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-950 text-slate-650 dark:text-slate-300 rounded-xl border border-slate-150 dark:border-slate-800 text-xs font-semibold"
                            >
                              <div className="w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                                {userMatch ? userMatch.name.split(' ').map(n => n[0]).join('') : 'U'}
                              </div>
                              <span className="truncate">{userMatch ? userMatch.name : 'Unknown User'}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Discussion comment feed */}
                  <div className="border-t border-slate-50 dark:border-slate-850 pt-5 flex-1 flex flex-col min-h-[180px]">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3">
                      Discussion & Updates
                    </h4>

                    {commentsLoading ? (
                      <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        <span>Syncing comments...</span>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-semibold bg-slate-50/30 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-650 mx-auto mb-2" />
                        <span>No comments added yet</span>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {comments.map(comment => (
                          <div key={comment.id} className="text-left bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-450 dark:text-slate-500 mb-1.5">
                              <span className="text-slate-700 dark:text-slate-300 font-extrabold">{comment.userName} ({comment.userRole})</span>
                              <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                              {comment.text}
                            </p>
                          </div>
                        ))}
                        <div ref={commentsEndRef} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment box submission footer */}
                <form id="comment-form" onSubmit={handleAddComment} className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-900/30 flex items-center space-x-2">
                  <input
                    id="comment-input"
                    type="text"
                    placeholder="Type comments, feedback..."
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                  <button
                    id="submit-comment-btn"
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl active:scale-95 transition-all duration-100 cursor-pointer flex items-center justify-center h-8 w-8 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Optional Admin/Creator task deleting control */}
                {currentUser.role !== UserRole.HR_RECRUITER && (currentUser.role === UserRole.ADMIN || selectedTask.createdBy === currentUser.id) && (
                  <div className="p-3.5 bg-rose-50/20 dark:bg-rose-950/10 border-t border-rose-50 dark:border-rose-950/40 text-right">
                    <button
                      id="delete-task-btn"
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-450 rounded-lg text-[11px] font-bold transition duration-150 cursor-pointer border border-rose-100 dark:border-rose-900/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Task Permanently</span>
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center h-full text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-8">
                <ClipboardCheck className="w-12 h-12 text-slate-350 dark:text-slate-650 mb-4" />
                <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">No task selected</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs text-center leading-relaxed">
                  Select any task from the left-hand panel to view assignees, modify completion status, and participate in workflow discussions.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Slide-over Form Overlay / Dialog Drawer for Creating Task */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div className="absolute inset-0 overflow-hidden">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingTask(false)}
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
              />

              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 md:pl-16">
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="pointer-events-auto w-screen max-w-md md:max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-100 flex flex-col shadow-2xl h-full overflow-hidden"
                >
                  {/* Drawer Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/20 dark:bg-slate-900/40">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h2 id="slide-over-title" className="text-base font-extrabold text-slate-900 dark:text-white">Create Task Request</h2>
                    </div>
                    <button
                      id="close-add-task-drawer"
                      onClick={() => setIsAddingTask(false)}
                      className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-450 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drawer Scroll Container */}
                  <form id="create-task-form" onSubmit={handleCreateTask} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
                      
                      {/* Note for current role */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-850 text-xs">
                        <span className="font-extrabold text-slate-700 dark:text-slate-350 block mb-1">
                          Role Context: {currentUser.role}
                        </span>
                        {currentUser.role === UserRole.ADMIN && (
                          <p className="text-slate-500 dark:text-slate-400 leading-normal">
                            As an <strong>Administrator</strong>, you have global visibility. You can assign tasks to all system users or specific lead teams in one click.
                          </p>
                        )}
                        {currentUser.role === UserRole.TEAM_LEADER && (
                          <p className="text-slate-500 dark:text-slate-400 leading-normal">
                            As a <strong>Team Lead</strong>, assignments are constrained to your designated recruitment team. Select the entire team with one click.
                          </p>
                        )}
                        {currentUser.role === UserRole.HR_RECRUITER && (
                          <p className="text-slate-500 dark:text-slate-400 leading-normal">
                            As an <strong>HR Recruiter (Requester)</strong>, you operate in comment-only modes. Submit details explaining workflow operations so Admins or leads can triage assignments.
                          </p>
                        )}
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider mb-1.5">
                          Task Title *
                        </label>
                        <input
                          id="new-task-title-input"
                          type="text"
                          required
                          placeholder="E.g. Candidate sourcing drive, audit, meeting..."
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider mb-1.5">
                          Workflow Instructions & Requirements *
                        </label>
                        <textarea
                          id="new-task-desc-input"
                          required
                          rows={4}
                          placeholder="Describe workflow steps, priorities, candidates, or technical prerequisites..."
                          value={newTaskDescription}
                          onChange={e => setNewTaskDescription(e.target.value)}
                          className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-semibold"
                        />
                      </div>

                      {/* Comments / Notes */}
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider mb-1.5">
                          Initial Note / Explanatory Comment (Optional)
                        </label>
                        <textarea
                          id="new-task-comment-input"
                          rows={2}
                          placeholder="Add any immediate notes or remarks..."
                          value={newTaskComment}
                          onChange={e => setNewTaskComment(e.target.value)}
                          className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-normal font-semibold"
                        />
                      </div>

                      {/* Assignment Logic section based on Role */}
                      {currentUser.role !== UserRole.HR_RECRUITER ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-850 pt-4 mb-2">
                            <label className="text-xs font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider">
                              Assignees & Role Assignments
                            </label>
                            
                            <div className="flex gap-2">
                              {currentUser.role === UserRole.ADMIN ? (
                                <>
                                  <button
                                    id="select-all-btn"
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-400 border border-slate-150 dark:border-slate-800 rounded-lg text-[10px] font-bold"
                                  >
                                    Select All
                                  </button>
                                  <button
                                    id="deselect-all-btn"
                                    type="button"
                                    onClick={handleDeselectAll}
                                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-rose-600 dark:text-rose-450 border border-slate-150 dark:border-slate-800 rounded-lg text-[10px] font-bold"
                                  >
                                    Deselect All
                                  </button>
                                </>
                              ) : (
                                <button
                                  id="select-team-btn"
                                  type="button"
                                  onClick={() => handleSelectTeam(currentUser.id)}
                                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-400 border border-slate-150 dark:border-slate-800 rounded-lg text-[10px] font-bold"
                                >
                                  Assign Entire Team
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Render designated teams (Admins can select entire team leads) */}
                          {currentUser.role === UserRole.ADMIN && teams.length > 0 && (
                            <div className="space-y-2 mb-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Assign entire recruiter teams</span>
                              <div className="flex flex-wrap gap-2">
                                {teams.map(t => (
                                  <button
                                    key={t.lead.id}
                                    type="button"
                                    onClick={() => handleSelectTeam(t.lead.id)}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50/55 hover:text-indigo-600 dark:bg-slate-950 dark:hover:bg-indigo-950/20 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition duration-150 flex items-center space-x-1"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-slate-450" />
                                    <span>{t.lead.name}'s Team</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Users Checkbox Grid */}
                          <div className="border border-slate-150 dark:border-slate-800 rounded-2xl max-h-[220px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20 p-3 space-y-2">
                            {assignableUsers.map(user => {
                              const isChecked = selectedAssignees.includes(user.id);
                              return (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => handleToggleUser(user.id)}
                                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition duration-100 ${
                                    isChecked 
                                      ? 'bg-indigo-50/30 border-indigo-200 dark:bg-indigo-950/15 dark:border-indigo-900/40 text-slate-800 dark:text-indigo-300' 
                                      : 'bg-white border-slate-150 dark:bg-slate-900 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800 text-slate-650 dark:text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700">
                                      {user.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                      <span className="text-xs font-bold block">{user.name}</span>
                                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{user.role}</span>
                                    </div>
                                  </div>
                                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                    isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                                  }`}>
                                    {isChecked && <Check className="w-3 h-3" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                            {selectedAssignees.length} users selected for assignment
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-2xl text-xs text-slate-500 dark:text-slate-450 leading-relaxed text-center">
                          <AlertCircle className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                          <strong>Comment-only creation mode:</strong> Requesters cannot assign tasks or recruiter teams. Submissions are saved to the repository so Admins and Team Leads can triage assignments.
                        </div>
                      )}

                    </div>

                    {/* Drawer Footer */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end bg-slate-50/20 dark:bg-slate-900/40 gap-3">
                      <button
                        id="cancel-create-task-btn"
                        type="button"
                        onClick={() => setIsAddingTask(false)}
                        className="px-4.5 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id="submit-create-task-btn"
                        type="submit"
                        disabled={submittingTask}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/65 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        {submittingTask ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                            <span>Creating task...</span>
                          </>
                        ) : (
                          <span>Submit Task Request</span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
