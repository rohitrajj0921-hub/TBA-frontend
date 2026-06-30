/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Shield, 
  Mail, 
  Key, 
  User as UserIcon, 
  Loader2, 
  CheckSquare, 
  Plus, 
  AlertCircle,
  Edit,
  Trash2,
  Lock,
  MessageSquare,
  Video,
  VideoOff,
  Grid,
  Layers,
  Filter,
  RefreshCw,
  UserCheck,
  MousePointer,
  MousePointerClick
} from 'lucide-react';
import { User, UserRole } from '../types.js';
import ShiftTimer from './ShiftTimer.tsx';

interface UsersViewProps {
  token: string;
  currentUser: User;
  onlineUsers?: Array<{
    id: string;
    name: string;
    role: string;
    mouseClicks?: number;
    mouseDistance?: number;
    isIdle?: boolean;
  }>;
  localActivity?: {
    clicks: number;
    distance: number;
    isIdle: boolean;
    activeSeconds: number;
    sessionStart: number;
  };
}

export default function UsersView({ 
  token, 
  currentUser,
  onlineUsers = [],
  localActivity = { clicks: 0, distance: 0, isIdle: false, activeSeconds: 0, sessionStart: Date.now() }
}: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginDemoInfo, setShowLoginDemoInfo] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Filter and Layout states
  const [selectedLeadFilter, setSelectedLeadFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'board'>('cards');

  // Form states (unified for Add & Edit)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.HR_RECRUITER);
  const [password, setPassword] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['candidates', 'interviews', 'pipeline', 'reports', 'chat']);
  const [restrictedUserIds, setRestrictedUserIds] = useState<string[]>([]);
  const [meetingsDisabledForm, setMeetingsDisabledForm] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.showLoginDemoInfo === 'boolean') {
            setShowLoginDemoInfo(data.showLoginDemoInfo);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    if (currentUser.role === UserRole.ADMIN) {
      fetchSettings();
    }
  }, [currentUser]);

  const handleToggleDemoInfo = async (newValue: boolean) => {
    setUpdatingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ showLoginDemoInfo: newValue })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }
      setShowLoginDemoInfo(data.showLoginDemoInfo);
    } catch (err: any) {
      alert("Error updating login settings: " + err.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load team directory");
      }
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve recruiters team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole(UserRole.HR_RECRUITER);
    setPassword('');
    setTeamLeadId('');
    setPermissions(['candidates', 'interviews', 'pipeline', 'reports', 'chat']);
    setRestrictedUserIds([]);
    setMeetingsDisabledForm(false);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword(''); // leave blank if unchanged
    setTeamLeadId(user.teamLeadId || '');
    setPermissions(user.permissions || ['candidates', 'interviews', 'pipeline', 'reports', 'chat']);
    setRestrictedUserIds(user.restrictedUserIds || []);
    setMeetingsDisabledForm(user.meetingsDisabled || false);
    setFormError('');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name || !email || !role) {
      setFormError("All required fields are needed (name, email, role).");
      return;
    }

    if (!editingUser && !password) {
      setFormError("A login password is required for onboarding a new user.");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const payload = {
        name,
        email,
        role,
        password: password || undefined,
        teamLeadId: role === UserRole.HR_RECRUITER ? (teamLeadId || undefined) : undefined,
        permissions: role === UserRole.TEAM_LEADER ? permissions : undefined,
        restrictedUserIds,
        meetingsDisabled: meetingsDisabledForm
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save recruiter profile.");
      }

      alert(editingUser ? `Successfully updated profile for ${name}!` : `Successfully onboarded ${name} as ${role}!`);
      setShowAddModal(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Failed to save user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMeetingsPrivilege = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          meetingsDisabled: !user.meetingsDisabled
        })
      });
      if (res.ok) {
        alert(`Successfully updated meeting privilege for ${user.name}!`);
        fetchUsers();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update privilege");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleQuickAssignTeamLead = async (recruiterId: string, leadId: string) => {
    try {
      const res = await fetch(`/api/users/${recruiterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teamLeadId: leadId || null
        })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to assign team lead");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!window.confirm(`Are you absolutely sure you want to remove ${userName} from the directory? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user.");
      }
      alert(`Removed ${userName} successfully.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to remove user.");
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case UserRole.TEAM_LEADER:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case UserRole.HR_RECRUITER:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  };

  // Find Team Leads for tagging
  const teamLeads = users.filter(u => u.role === UserRole.TEAM_LEADER);
  // Find other users for connection restriction listing
  const otherUsers = users.filter(u => u.id !== (editingUser?.id || ''));

  // Filter list of users based on current user's role and selection filters
  const filteredUsers = React.useMemo(() => {
    if (currentUser.role === UserRole.TEAM_LEADER) {
      return users.filter(u => u.role === UserRole.HR_RECRUITER && u.teamLeadId === currentUser.id);
    }
    
    if (selectedLeadFilter === 'all') {
      return users;
    } else if (selectedLeadFilter === 'unassigned') {
      return users.filter(u => u.role === UserRole.HR_RECRUITER && !u.teamLeadId);
    } else {
      return users.filter(u => 
        u.id === selectedLeadFilter || 
        (u.role === UserRole.HR_RECRUITER && u.teamLeadId === selectedLeadFilter)
      );
    }
  }, [users, currentUser, selectedLeadFilter]);

  return (
    <div className="p-8 space-y-8 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans transition-colors duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {currentUser.role === UserRole.ADMIN ? "Recruitment Team Directory" : "My Sourcing Team Hub"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentUser.role === UserRole.ADMIN 
              ? "Manage corporate HR recruiters, assign system roles, and configure secure authentication profiles."
              : "Supervise your assigned recruiters, inspect communication privileges, and monitor operational settings."}
          </p>
        </div>

        {currentUser.role === UserRole.ADMIN && (
          <button
            id="btn-add-recruiter"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-indigo-600/15 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Recruiter</span>
          </button>
        )}
      </div>

      {/* Real-time Working Hours & Productivity Monitor */}
      <ShiftTimer onlineUsers={onlineUsers} localActivity={localActivity} />

      {/* Admin Settings Panel */}
      {currentUser.role === UserRole.ADMIN && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Login Page Security & Customization</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              When disabled, standard corporate users must enter their registered email and password manually. Quick demo credential cards will be hidden from the login page.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-350">
              {showLoginDemoInfo ? 'Demo Cards: Visible' : 'Demo Cards: Hidden'}
            </span>
            <button
              id="btn-toggle-demo-info"
              onClick={() => handleToggleDemoInfo(!showLoginDemoInfo)}
              disabled={updatingSettings}
              className={`w-12 h-6 rounded-full p-1 transition-all duration-300 focus:outline-none flex items-center relative cursor-pointer ${
                showLoginDemoInfo ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white dark:bg-slate-800 shadow-md block" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Control Panel & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Directory Controls:
            </span>
            
            {/* Filter by Team Lead (Admins only) */}
            {currentUser.role === UserRole.ADMIN ? (
              <div className="flex items-center space-x-2">
                <select
                  id="lead-filter-select"
                  value={selectedLeadFilter}
                  onChange={(e) => {
                    setSelectedLeadFilter(e.target.value);
                    if (e.target.value !== 'all' && viewMode === 'board') {
                      setViewMode('cards');
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="all">⚡ All Team Members ({users.length})</option>
                  <option value="unassigned">⚠️ Unassigned HR Recruiters ({users.filter(u => u.role === UserRole.HR_RECRUITER && !u.teamLeadId).length})</option>
                  <optgroup label="Filter by Assigned Team Lead">
                    {teamLeads.map(lead => {
                      const count = users.filter(u => u.role === UserRole.HR_RECRUITER && u.teamLeadId === lead.id).length;
                      return (
                        <option key={lead.id} value={lead.id}>👤 {lead.name} ({count} Recruiters)</option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Supervising {filteredUsers.length} HR Recruiter{filteredUsers.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle Buttons (Admins only) */}
            {currentUser.role === UserRole.ADMIN && (
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-1 bg-slate-50 dark:bg-slate-800">
                <button
                  id="btn-view-cards"
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Show regular directory cards"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Card Grid</span>
                </button>
                <button
                  id="btn-view-board"
                  type="button"
                  onClick={() => {
                    setViewMode('board');
                    setSelectedLeadFilter('all');
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition cursor-pointer ${
                    viewMode === 'board'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Check HRs in which Team Lead visually"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Interactive Team Board</span>
                </button>
              </div>
            )}

            <button
              id="btn-refresh-users"
              type="button"
              onClick={fetchUsers}
              className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Refresh Directory Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visual Prompt for Admins in Board Mode */}
        {currentUser.role === UserRole.ADMIN && viewMode === 'board' && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 flex items-start space-x-2.5">
            <UserCheck className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div>
              <p className="font-bold">Interactive Organization Board Active</p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                This visual map group-clusters all registered recruiters by their assigned Team Leads. Use the quick assignment features to assign, transfer, or manage recruiter permissions on the fly.
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs">Fetching registered security roles...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs text-center max-w-md mx-auto">
          {error}
        </div>
      ) : viewMode === 'board' && currentUser.role === UserRole.ADMIN ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Column for each Team Lead */}
            {teamLeads.map(lead => {
              const teamRecruiters = users.filter(u => u.role === UserRole.HR_RECRUITER && u.teamLeadId === lead.id);
              return (
                <div key={lead.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs">
                        {lead.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{lead.name}</h4>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500">Team Lead</span>
                      </div>
                    </div>
                    <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {teamRecruiters.length} assigned
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 min-h-[120px]">
                    {teamRecruiters.length === 0 ? (
                      <div className="h-full flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
                        <p className="text-[10px] text-slate-400 italic">No assigned HR recruiters</p>
                      </div>
                    ) : (
                      teamRecruiters.map(recruiter => (
                        <div key={recruiter.id} className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{recruiter.name}</span>
                            <span className="text-[9px] text-slate-400">{recruiter.email.split('@')[0]}</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-150 dark:border-slate-800">
                            <span className="text-[9px] text-slate-400 uppercase font-semibold">Reassign:</span>
                            <select
                              value={recruiter.teamLeadId || ''}
                              onChange={(e) => handleQuickAssignTeamLead(recruiter.id, e.target.value)}
                              className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 font-medium focus:outline-none"
                            >
                              <option value="">Unassign</option>
                              {teamLeads.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {/* Column for Unassigned Recruiters */}
            <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center text-xs">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Unassigned Recruiters</h4>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-500">Awaiting Team Lead</span>
                  </div>
                </div>
                <span className="bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {users.filter(u => u.role === UserRole.HR_RECRUITER && !u.teamLeadId).length} pending
                </span>
              </div>

              <div className="flex-1 space-y-3 min-h-[120px]">
                {users.filter(u => u.role === UserRole.HR_RECRUITER && !u.teamLeadId).length === 0 ? (
                  <div className="h-full flex items-center justify-center p-6 text-center">
                    <p className="text-[10px] text-slate-400 italic">All recruiters have team leaders assigned!</p>
                  </div>
                ) : (
                  users.filter(u => u.role === UserRole.HR_RECRUITER && !u.teamLeadId).map(recruiter => (
                    <div key={recruiter.id} className="p-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{recruiter.name}</span>
                        <span className="text-[9px] text-rose-500 font-semibold uppercase tracking-widest bg-rose-50 dark:bg-rose-950 px-1 rounded">No Lead</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">Assign Lead:</span>
                        <select
                          value=""
                          onChange={(e) => handleQuickAssignTeamLead(recruiter.id, e.target.value)}
                          className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 font-medium focus:outline-none"
                        >
                          <option value="" disabled>-- Choose --</option>
                          {teamLeads.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 italic">
              No recruiters found matching the selected controls.
            </div>
          ) : (
            filteredUsers.map((u) => {
              // Find tagged team lead if HR Recruiter
              const assignedLead = u.role === UserRole.HR_RECRUITER && u.teamLeadId
                ? users.find(lead => lead.id === u.teamLeadId)
                : null;

              const onlineInfo = onlineUsers.find(item => item.id === u.id);
              const isOnline = !!onlineInfo;
              const isIdle = onlineInfo?.isIdle;

              return (
                <div id={`user-card-${u.id}`} key={u.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative">
                  
                  {/* Top Actions for Admin */}
                  {currentUser.role === UserRole.ADMIN && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      <button
                        id={`btn-edit-user-${u.id}`}
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                        title="Edit Recruiter Profile"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-delete-user-${u.id}`}
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer"
                        title="Remove Recruiter Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                          {u.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {/* Glowing Status Dot */}
                        <div 
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            isOnline 
                              ? isIdle 
                                ? 'bg-amber-500 animate-pulse' 
                                : 'bg-emerald-500 animate-pulse' 
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`} 
                          title={isOnline ? (isIdle ? 'Idle' : 'Available') : 'Offline'} 
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-md pr-16 truncate max-w-[150px]">{u.name}</h4>
                        
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${getRoleBadgeStyle(u.role)}`}>
                            {u.role}
                          </span>
                          
                          <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isOnline 
                              ? isIdle 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                              : 'bg-slate-50 text-slate-500 border border-slate-200/50 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800/60'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                              isOnline ? (isIdle ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500') : 'bg-slate-400'
                            }`} />
                            {isOnline ? (isIdle ? 'Idle' : 'Available') : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-450">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="truncate">{u.email}</span>
                      </div>

                      {/* Show Tagged Team Lead for HR Recruiter */}
                      {u.role === UserRole.HR_RECRUITER && (
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>Team Lead: <strong className="text-slate-800 dark:text-slate-200">{assignedLead ? assignedLead.name : 'Unassigned'}</strong></span>
                        </div>
                      )}

                      {/* Show Live Session Stats if Online */}
                      {isOnline && (
                        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-150 dark:border-slate-800/60 bg-indigo-50/10 dark:bg-slate-900/20 p-2 rounded-xl border border-indigo-500/5 space-y-1.5">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Session Activity</span>
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                              Live
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="flex items-center space-x-1">
                              <MousePointerClick className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              <span className="text-slate-500">Clicks:</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-mono">{onlineInfo.mouseClicks || 0}</strong>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MousePointer className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              <span className="text-slate-500">Travel:</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-mono" title={`${onlineInfo.mouseDistance || 0}px`}>
                                {(onlineInfo.mouseDistance || 0) > 1000 ? `${((onlineInfo.mouseDistance || 0) / 1000).toFixed(1)}k px` : `${onlineInfo.mouseDistance || 0}px`}
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show Permissions for Team Leader */}
                      {u.role === UserRole.TEAM_LEADER && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 block">Assigned Scope Scopes:</span>
                          <div className="flex flex-wrap gap-1">
                            {(u.permissions && u.permissions.length > 0) ? (
                              u.permissions.map(p => (
                                <span key={p} className="text-[9px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-550 italic">No access scopes assigned</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show Restricted Connections if any */}
                      {u.restrictedUserIds && u.restrictedUserIds.length > 0 && (
                        <div className="pt-1.5 flex items-start space-x-2 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/50">
                          <Lock className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                          <span>Muted chat connections with {u.restrictedUserIds.length} team members.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Meeting privilege toggle for Admin */}
                    {currentUser.role === UserRole.ADMIN && (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wider">Meetings Privilege:</span>
                        <button
                          type="button"
                          onClick={() => handleToggleMeetingsPrivilege(u)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer flex items-center space-x-1 ${
                            u.meetingsDisabled
                              ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/30'
                              : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          }`}
                          title={u.meetingsDisabled ? "Click to Enable Meetings" : "Click to Disable Meetings"}
                        >
                          {u.meetingsDisabled ? (
                            <>
                              <VideoOff className="w-3 h-3 shrink-0 text-rose-500" />
                              <span>Muted</span>
                            </>
                          ) : (
                            <>
                              <Video className="w-3 h-3 shrink-0 text-emerald-500" />
                              <span>Allowed</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 flex justify-between items-center">
                      <span>Registered: {u.createdAt ? u.createdAt.split('T')[0] : 'Historical'}</span>
                      {u.meetingsDisabled && <span className="text-[9px] text-rose-500 font-bold uppercase tracking-widest bg-rose-50 dark:bg-rose-950/50 px-1 py-0.5 rounded border border-rose-100 dark:border-rose-900/50">No Meet</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ADD / EDIT RECRUITER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 my-8 text-slate-800">
            <h3 className="text-md font-bold text-slate-900">
              {editingUser ? `Configure Profile: ${editingUser.name}` : 'Onboard Sourcing Recruiter'}
            </h3>
            <p className="text-xs text-slate-500">Configure role clearances, team relationships, permissions, and network communication blocklists.</p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recruiter Full Name *</label>
                <input 
                  id="user-form-name"
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white mt-1 transition-all"
                  placeholder="e.g. Shalini Roy"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
                <input 
                  id="user-form-email"
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white mt-1 transition-all"
                  placeholder="e.g. shalini@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Clearance Role *</label>
                <select 
                  id="user-form-role"
                  value={role} 
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white mt-1 font-semibold transition-all"
                >
                  <option value={UserRole.HR_RECRUITER}>HR Recruiter (Add pool & schedule)</option>
                  <option value={UserRole.TEAM_LEADER}>Team Leader (Oversee team & log selections)</option>
                  <option value={UserRole.ADMIN}>Admin (Manage rosters & system config)</option>
                </select>
              </div>

              {/* Tag Team Lead Option (for HR Recruiter) */}
              {role === UserRole.HR_RECRUITER && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tag / Assign to Team Lead</label>
                  <select
                    id="user-form-teamlead"
                    value={teamLeadId}
                    onChange={(e) => setTeamLeadId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white mt-1 font-semibold transition-all"
                  >
                    <option value="">-- No Team Lead Assigned --</option>
                    {teamLeads.map(lead => (
                      <option key={lead.id} value={lead.id}>{lead.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-450 mt-1 text-slate-400">This recruiter's candidates, interviews, and metrics will only be visible to this team leader.</p>
                </div>
              )}

              {/* Permissions scope checkboxes (for Team Leader) */}
              {role === UserRole.TEAM_LEADER && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Team Leader Permissions / Access Scopes *</label>
                  <p className="text-[9px] text-slate-400">Specify the structural tabs and system features this Team Leader is allowed to inspect.</p>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5">
                    {[
                      { id: 'candidates', label: 'Candidate Pool' },
                      { id: 'interviews', label: 'Interviews' },
                      { id: 'pipeline', label: 'Offers & Joining' },
                      { id: 'reports', label: 'Analytics Reports' },
                      { id: 'chat', label: 'Team Chat' }
                    ].map(p => {
                      const hasScope = permissions.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900 select-none">
                          <input 
                            type="checkbox"
                            checked={hasScope}
                            onChange={() => {
                              if (hasScope) {
                                setPermissions(permissions.filter(id => id !== p.id));
                              } else {
                                setPermissions([...permissions, p.id]);
                              }
                            }}
                            className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chat Communication Restrictions (for all users, to mute specific connections) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Restricted Communication Connections</label>
                <p className="text-[9px] text-slate-400">Select team members that this profile is strictly restricted from chatting with.</p>
                <div className="max-h-24 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 mt-1.5">
                  {otherUsers.length === 0 ? (
                    <span className="text-[10px] text-slate-400 block italic">No other team members in directory</span>
                  ) : (
                    otherUsers.map(ou => {
                      const isRestricted = restrictedUserIds.includes(ou.id);
                      return (
                        <label key={ou.id} className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900 select-none">
                          <input 
                            type="checkbox"
                            checked={isRestricted}
                            onChange={() => {
                              if (isRestricted) {
                                setRestrictedUserIds(restrictedUserIds.filter(id => id !== ou.id));
                              } else {
                                setRestrictedUserIds([...restrictedUserIds, ou.id]);
                              }
                            }}
                            className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <span>{ou.name} ({ou.role})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Meeting Privilege Checkbox */}
              <div className="flex items-center space-x-2 py-1">
                <input
                  id="user-form-meetings-enabled"
                  type="checkbox"
                  checked={!meetingsDisabledForm}
                  onChange={(e) => setMeetingsDisabledForm(!e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer bg-slate-50"
                />
                <label htmlFor="user-form-meetings-enabled" className="text-xs text-slate-700 font-bold uppercase text-[10px] tracking-wider cursor-pointer select-none">
                  Enable Meeting Scheduling & Hosting Privilege
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {editingUser ? 'New Login Password (Leave blank to keep existing)' : 'Login Password *'}
                </label>
                <input 
                  id="user-form-pass"
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white mt-1 transition-all"
                  placeholder={editingUser ? '••••••••' : 'Enter login password'}
                  required={!editingUser}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-150">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button 
                  id="user-form-submit"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition"
                >
                  {submitting ? 'Saving...' : editingUser ? 'Update Profile' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}