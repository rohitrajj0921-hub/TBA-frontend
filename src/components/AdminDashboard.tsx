/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  Users, 
  Activity, 
  MousePointerClick, 
  Clock, 
  TrendingUp, 
  Search, 
  ChevronRight, 
  Shield, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Filter,
  UserCheck,
  Briefcase,
  Percent,
  Layers,
  ArrowRight,
  Calendar,
  ChevronDown,
  ShieldAlert,
  LayoutDashboard,
  Trash2,
  Database,
  Share2,
  Check
} from 'lucide-react';
import { User, UserRole, Candidate } from '../types.js';
import ProductionReadinessChecklist from './ProductionReadinessChecklist.tsx';

interface AdminDashboardProps {
  token: string;
  currentUser: User;
  onlineUsers: Array<{
    id: string;
    name: string;
    role: string;
    mouseClicks?: number;
    mouseDistance?: number;
    isIdle?: boolean;
  }>;
  localActivity: {
    clicks: number;
    distance: number;
    isIdle: boolean;
    activeSeconds: number;
    sessionStart: number;
  };
  setActiveTab?: (tab: string) => void;
}

export default function AdminDashboard({ token, currentUser, onlineUsers, localActivity, setActiveTab }: AdminDashboardProps) {
  // Tabs: 'operations', 'recruitment', 'readiness'
  const [activeSubTab, setActiveSubTab] = useState<'operations' | 'recruitment' | 'readiness'>('operations');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = () => {
    const shareableUrl = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'funnel' | 'recruiters' | 'roles'>('funnel');
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selections, setSelections] = useState<any[]>([]);
  const [joinings, setJoinings] = useState<any[]>([]);
  const [rawStats, setRawStats] = useState<any>(null);
  const [rawRecruiters, setRawRecruiters] = useState<any[]>([]);
  const [rawFunnel, setRawFunnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminFilterMode, setAdminFilterMode] = useState<'today_leads_recruiters' | 'all'>('today_leads_recruiters');
  
  // Interactive modal state for Real-time Presence drill-down
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'available' | 'idle' | null>(null);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [seedingSuccess, setSeedingSuccess] = useState<string | null>(null);

  const triggerEnterpriseSeeding = async () => {
    if (!window.confirm("Are you sure you want to run the migration script? This will clear all current workspace data and populate structured, professional recruiter profiles and sample candidate pipelines for demonstration.")) {
      return;
    }
    setSeeding(true);
    setSeedingSuccess(null);
    try {
      const res = await fetch('/api/system/initialize-production', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSeedingSuccess("Workspace successfully seeded with demo candidate pipelines and profiles!");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const err = await res.json();
        alert(`Migration failed: ${err.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Migration error: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const triggerWipeData = async () => {
    if (!window.confirm("Are you sure you want to wipe all workspace data? This will clear all recruiters, candidates, interviews, chats, and scheduled meetings, leaving the workspace completely blank (only default admin users will remain).")) {
      return;
    }
    setWiping(true);
    setSeedingSuccess(null);
    try {
      const res = await fetch('/api/system/wipe-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSeedingSuccess("Workspace successfully wiped blank. Ready for custom/production entries!");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const err = await res.json();
        alert(`Wipe failed: ${err.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Wipe error: ${e.message}`);
    } finally {
      setWiping(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch users
        const usersRes = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }

        // Fetch candidates
        const candidatesRes = await fetch('/api/candidates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (candidatesRes.ok) {
          const candidatesData = await candidatesRes.json();
          setCandidates(candidatesData);
        }

        // Fetch interviews
        const interviewsRes = await fetch('/api/interviews', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (interviewsRes.ok) {
          const interviewsData = await interviewsRes.json();
          setInterviews(interviewsData);
        }

        // Fetch selections
        const selectionsRes = await fetch('/api/selections', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (selectionsRes.ok) {
          const selectionsData = await selectionsRes.json();
          setSelections(selectionsData);
        }

        // Fetch joinings
        const joiningsRes = await fetch('/api/joinings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (joiningsRes.ok) {
          const joiningsData = await joiningsRes.json();
          setJoinings(joiningsData);
        }

        // Fetch main aggregate counters
        const statsRes = await fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setRawStats(statsData);
        }

        // Fetch reports
        const reportsRes = await fetch('/api/dashboard/reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          setRawRecruiters(reportsData.recruiterPerformance || []);
          setRawFunnel(reportsData.conversionFunnel || []);
        }
      } catch (err) {
        console.error('Error fetching admin dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Aggregate metrics
  const aggregates = useMemo(() => {
    const totalTeam = users.length;
    const onlineList = onlineUsers;
    const onlineCount = onlineList.length;
    const availableCount = onlineList.filter(u => !u.isIdle).length;
    const idleCount = onlineList.filter(u => u.isIdle).length;

    let totalClicks = 0;
    let totalDistance = 0;
    let totalProductivitySum = 0;

    onlineList.forEach(u => {
      const clicks = u.mouseClicks || 0;
      const dist = u.mouseDistance || 0;
      totalClicks += clicks;
      totalDistance += dist;

      // Compute simple dynamic productivity score for aggregates
      const clicksBonus = Math.min(25, clicks * 0.5);
      const distBonus = Math.min(25, dist / 1000);
      const score = Math.round(50 + clicksBonus + distBonus);
      totalProductivitySum += Math.min(100, Math.max(30, score));
    });

    // Fallback if nobody online
    const avgProductivity = onlineCount > 0 ? Math.round(totalProductivitySum / onlineCount) : 0;

    return {
      totalTeam,
      onlineCount,
      availableCount,
      idleCount,
      totalClicks,
      totalDistance,
      avgProductivity
    };
  }, [users, onlineUsers]);

  // Dynamic local date calculation for YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Set of team leads and recruiter IDs
  const teamLeadAndRecruiterIds = useMemo(() => {
    return new Set(
      users
        .filter(u => u.role === 'Team Leader' || u.role === 'HR Recruiter')
        .map(u => u.id)
    );
  }, [users]);

  // Display raw candidates, filtered dynamically if mode is 'today_leads_recruiters'
  const displayCandidates = useMemo(() => {
    if (adminFilterMode === 'all') return candidates;
    return candidates.filter(c => {
      const isToday = c.callDate === todayStr || (c.createdAt && c.createdAt.startsWith(todayStr));
      const isTeamRole = teamLeadAndRecruiterIds.has(c.recruiterId);
      return isToday && isTeamRole;
    });
  }, [candidates, adminFilterMode, todayStr, teamLeadAndRecruiterIds]);

  const displayInterviews = useMemo(() => {
    if (adminFilterMode === 'all') return interviews;
    return interviews.filter(i => {
      const isToday = i.date === todayStr || (i.createdAt && i.createdAt.startsWith(todayStr));
      const isTeamRole = teamLeadAndRecruiterIds.has(i.scheduledBy);
      return isToday && isTeamRole;
    });
  }, [interviews, adminFilterMode, todayStr, teamLeadAndRecruiterIds]);

  const displaySelections = useMemo(() => {
    if (adminFilterMode === 'all') return selections;
    return selections.filter(s => {
      const isToday = s.date === todayStr || (s.createdAt && s.createdAt.startsWith(todayStr));
      const isTeamRole = teamLeadAndRecruiterIds.has(s.updatedBy);
      return isToday && isTeamRole;
    });
  }, [selections, adminFilterMode, todayStr, teamLeadAndRecruiterIds]);

  const displayJoinings = useMemo(() => {
    if (adminFilterMode === 'all') return joinings;
    return joinings.filter(j => {
      const isToday = j.joiningDate === todayStr || (j.createdAt && j.createdAt.startsWith(todayStr));
      const isTeamRole = teamLeadAndRecruiterIds.has(j.updatedBy);
      return isToday && isTeamRole;
    });
  }, [joinings, adminFilterMode, todayStr, teamLeadAndRecruiterIds]);

  // Derived stats, recruiters and funnel shadowing the state API variables
  const stats = useMemo(() => {
    if (adminFilterMode === 'all') {
      return rawStats;
    }
    const totalCalls = displayCandidates.length;
    const interested = displayCandidates.filter(c => c.status === 'Interested').length;
    const notInterested = displayCandidates.filter(c => c.status === 'Not Interested').length;
    const followUp = displayCandidates.filter(c => c.status === 'Follow-Up').length;
    const interviewsScheduled = displayInterviews.filter(i => i.status === 'Scheduled').length;
    const interviewsCompleted = displayInterviews.filter(i => ['Attended', 'No Show'].includes(i.status)).length;
    const selected = displaySelections.filter(s => s.status === 'Selected').length;
    const joined = displayJoinings.filter(j => j.status === 'Joined').length;

    return {
      totalCalls,
      interested,
      notInterested,
      followUp,
      interviewsScheduled,
      interviewsCompleted,
      selected,
      joined
    };
  }, [rawStats, adminFilterMode, displayCandidates, displayInterviews, displaySelections, displayJoinings]);

  const recruiters = useMemo(() => {
    if (adminFilterMode === 'all') {
      return rawRecruiters;
    }
    const teamUsers = users.filter(u => u.role === 'Team Leader' || u.role === 'HR Recruiter');
    return teamUsers.map(user => {
      const recCandidates = displayCandidates.filter(c => c.recruiterId === user.id);
      const recInterviews = displayInterviews.filter(i => i.scheduledBy === user.id);
      const recSelections = displaySelections.filter(s => {
        const cand = candidates.find(c => c.id === s.candidateId);
        return (cand && cand.recruiterId === user.id) || s.updatedBy === user.id;
      }).filter(s => s.status === 'Selected');
      const recJoinings = displayJoinings.filter(j => {
        const cand = candidates.find(c => c.id === j.candidateId);
        return (cand && cand.recruiterId === user.id) || j.updatedBy === user.id;
      }).filter(j => j.status === 'Joined');

      const totalCalls = recCandidates.length;
      const interestedCount = recCandidates.filter(c => c.status === 'Interested').length;
      const conversionRate = totalCalls > 0 
        ? Math.round((recJoinings.length / totalCalls) * 100) 
        : 0;

      return {
        recruiterId: user.id,
        recruiterName: user.name,
        role: user.role,
        totalCalls,
        interestedCount,
        interviewsScheduled: recInterviews.length,
        selections: recSelections.length,
        joined: recJoinings.length,
        conversionRate,
        candidatesAdded: recCandidates.length
      };
    });
  }, [rawRecruiters, adminFilterMode, users, displayCandidates, displayInterviews, displaySelections, displayJoinings, candidates]);

  const funnel = useMemo(() => {
    if (adminFilterMode === 'all') {
      return rawFunnel;
    }
    const totalCalls = displayCandidates.length;
    const interested = displayCandidates.filter(c => ['Interested', 'Follow-Up'].includes(c.status)).length;
    const interviewAttended = displayInterviews.filter(i => i.status === 'Attended').length;
    const selected = displaySelections.filter(s => s.status === 'Selected').length;
    const joined = displayJoinings.filter(j => j.status === 'Joined').length;

    return [
      { stage: "Total Call Screening", count: totalCalls, percentage: totalCalls > 0 ? 100 : 0 },
      { stage: "Interested / Follow-up", count: interested, percentage: totalCalls > 0 ? Math.round((interested / totalCalls) * 100) : 0 },
      { stage: "Interviews Attended", count: interviewAttended, percentage: totalCalls > 0 ? Math.round((interviewAttended / totalCalls) * 100) : 0 },
      { stage: "Selected Candidates", count: selected, percentage: totalCalls > 0 ? Math.round((selected / totalCalls) * 100) : 0 },
      { stage: "Joined Hires", count: joined, percentage: totalCalls > 0 ? Math.round((joined / totalCalls) * 150) : 0 } // Normalized to full bar
    ];
  }, [rawFunnel, adminFilterMode, displayCandidates, displayInterviews, displaySelections, displayJoinings]);

  // Sourcing & Talent computed properties (from candidate raw lists)
  const recruitmentMetrics = useMemo(() => {
    const totalCandidates = displayCandidates.length;
    
    // Group candidates by role
    const rolesMap: { [key: string]: number } = {};
    displayCandidates.forEach(c => {
      if (c.targetRole) {
        rolesMap[c.targetRole] = (rolesMap[c.targetRole] || 0) + 1;
      }
    });

    const rolesList = Object.entries(rolesMap).map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    const maxRoleCount = rolesList.length > 0 ? Math.max(...rolesList.map(r => r.count)) : 1;

    return {
      totalCandidates,
      rolesList,
      maxRoleCount
    };
  }, [displayCandidates]);

  // Drilldown users based on interactive card clicks
  const drilledUsers = useMemo(() => {
    if (!presenceFilter) return [];
    if (presenceFilter === 'all') return onlineUsers;
    if (presenceFilter === 'available') return onlineUsers.filter(u => !u.isIdle);
    if (presenceFilter === 'idle') return onlineUsers.filter(u => u.isIdle);
    return [];
  }, [presenceFilter, onlineUsers]);

  return (
    <div className="space-y-6">
      
      {seedingSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{seedingSuccess}</span>
        </div>
      )}
      
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl border border-slate-850 shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-indigo-500 rounded text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3 text-white" /> SYSTEM ADMINISTRATOR
            </span>
            <span className="text-xs text-indigo-300 font-bold bg-indigo-950/50 border border-indigo-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-indigo-400 animate-pulse" /> Live Sourcing Control
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white mt-1">
            Executive Sourcing Operations Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time aggregate team tracking, mouse/key activity counters, system availability logs and sourcing analytics.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center relative">
          <button
            onClick={() => setActiveSubTab('operations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'operations' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Team Operations</span>
          </button>
          <button
            onClick={() => setActiveSubTab('recruitment')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'recruitment' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ATS Analytics & Reports</span>
          </button>
          <button
            onClick={() => setActiveSubTab('readiness')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'readiness' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Go-Live Checklist</span>
          </button>

          <button
            onClick={handleCopyShareLink}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/35 border border-indigo-500/40`}
            title="Generate and copy a secure production workspace access link for teammates & recruiters"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                <span className="text-emerald-100">Access Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Share Link</span>
              </>
            )}
          </button>

          <button
            onClick={triggerEnterpriseSeeding}
            disabled={seeding || wiping}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
              seeding 
                ? 'bg-amber-600/50 text-slate-200 cursor-not-allowed' 
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20'
            }`}
            title="Populate the workspace with professional mock recruiter profiles, candidate pipelines, and chat messages for demonstration purposes."
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{seeding ? "Seeding Demo..." : "Seed Demo Data"}</span>
          </button>

          <button
            onClick={triggerWipeData}
            disabled={seeding || wiping}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
              wiping 
                ? 'bg-rose-600/50 text-slate-200 cursor-not-allowed' 
                : 'bg-slate-800 text-rose-400 hover:bg-slate-700 hover:text-rose-300 border border-slate-700'
            }`}
            title="Wipe all candidates, recruiters, schedules, and active workflows, restoring the system to a clean, blank slate."
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{wiping ? "Wiping Workspace..." : "Clear Workspace (Blank)"}</span>
          </button>

          {/* System Admin Tools Dropdown Button */}
          {setActiveTab && (
            <div className="relative">
              <button
                id="btn-admin-tools-dropdown"
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer bg-slate-800 text-amber-400 hover:bg-slate-700 hover:text-amber-300 border border-slate-700/60 shadow-sm"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>System Admin Tools</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${adminDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {adminDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setAdminDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-20 text-slate-200 animate-in fade-in slide-in-from-top-1 duration-100 font-sans">
                    <div className="px-3 py-1.5 border-b border-slate-700 mb-1">
                      <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 block">Admin Quick Switch</span>
                    </div>
                    <button
                      id="dropdown-admin-team"
                      onClick={() => {
                        setAdminDropdownOpen(false);
                        setActiveTab('team');
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold hover:bg-slate-700 hover:text-white transition text-left cursor-pointer text-slate-300"
                    >
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      <span>Recruiters Team Management</span>
                    </button>
                    <button
                      id="dropdown-admin-dashboard"
                      onClick={() => {
                        setAdminDropdownOpen(false);
                        if (setActiveTab) setActiveTab('dashboard');
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold hover:bg-slate-700 hover:text-white transition text-left cursor-pointer text-slate-300"
                    >
                      <LayoutDashboard className="w-4 h-4 text-sky-400" />
                      <span>Go to Sourcing Dashboard</span>
                    </button>
                    <button
                      id="dropdown-admin-shift"
                      onClick={() => {
                        setAdminDropdownOpen(false);
                        setActiveTab('shift-monitor');
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold hover:bg-slate-700 hover:text-white transition text-left cursor-pointer text-slate-300"
                    >
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Shift Live Monitor</span>
                    </button>
                    <button
                      id="dropdown-admin-logs"
                      onClick={() => {
                        setAdminDropdownOpen(false);
                        setActiveTab('logs');
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold hover:bg-slate-700 hover:text-white transition text-left cursor-pointer text-slate-300"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>System Activity Logs</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Sourcing Filter Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              {adminFilterMode === 'today_leads_recruiters' ? `Today's Active Sourcing Dashboard [${todayStr}]` : 'All-Time Sourcing Performance'}
            </h4>
            <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-0.5">
              {adminFilterMode === 'today_leads_recruiters' 
                ? 'Showing strictly current date activity logged by Recruitment Specialists & Team Leaders.' 
                : 'Showing full historical overview across all roles and system timelines.'}
            </p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setAdminFilterMode('today_leads_recruiters')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              adminFilterMode === 'today_leads_recruiters'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Today's Team Activity
          </button>
          <button
            onClick={() => setAdminFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              adminFilterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All-Time Logs
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compiling Analytics Data...</p>
        </div>
      ) : activeSubTab === 'operations' ? (
        <div className="space-y-6">

          {/* 1. AGGREGATE PRODUCTIVITY METRICS CARD GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Average Team Productivity</span>
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg"><Activity className="w-4 h-4" /></span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">{aggregates.avgProductivity}%</h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider">Based on live keyboard & mouse activity ratio</p>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${aggregates.avgProductivity}%` }} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Team Inputs</span>
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg"><MousePointerClick className="w-4 h-4" /></span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">{aggregates.totalClicks}</h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider">Clicks recorded across all active sessions</p>
              </div>
              <div className="flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded w-max">
                Live Stream Tracking
              </div>
            </div>

            {/* Clickable Real-time Team Presence Card */}
            <div className="bg-gradient-to-br from-indigo-50/40 to-white dark:from-slate-950/30 dark:to-slate-900 border border-indigo-100 dark:border-slate-850 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase text-indigo-750 dark:text-indigo-400 tracking-wider">Real-time Team Presence</span>
                  <span className="p-1 bg-emerald-500 rounded-full animate-ping w-2 h-2" />
                </div>
                <p className="text-[11px] text-slate-450 dark:text-slate-500 font-medium mb-2">Click status sections to view details</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPresenceFilter('available')}
                  className="flex flex-col items-center p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/10 transition-all text-left w-full cursor-pointer"
                >
                  <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Available</p>
                  <p className="text-lg font-black text-slate-950 dark:text-white mt-0.5">{aggregates.availableCount}</p>
                </button>
                <button
                  onClick={() => setPresenceFilter('idle')}
                  className="flex flex-col items-center p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/10 transition-all text-left w-full cursor-pointer"
                >
                  <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Idle</p>
                  <p className="text-lg font-black text-slate-950 dark:text-white mt-0.5">{aggregates.idleCount}</p>
                </button>
              </div>

              <button
                onClick={() => setPresenceFilter('all')}
                className="w-full text-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-2.5 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>View All Connected ({aggregates.onlineCount})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>

          {/* Interactive Presence Modal/Dropdown overlay */}
          {presenceFilter && (
            <div className="bg-indigo-50/50 dark:bg-slate-950/40 border border-indigo-100 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-md animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${presenceFilter === 'available' ? 'bg-emerald-500' : presenceFilter === 'idle' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {presenceFilter === 'available' ? 'Available Team Members' : presenceFilter === 'idle' ? 'Idle Team Members' : 'All Online Members'}
                  </h4>
                </div>
                <button 
                  onClick={() => setPresenceFilter(null)} 
                  className="text-xs text-slate-400 hover:text-slate-650 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md hover:shadow-xs font-bold cursor-pointer"
                >
                  Close Panel
                </button>
              </div>

              {drilledUsers.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No team members match this presence state currently.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {drilledUsers.map(u => (
                    <div key={u.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{u.name}</p>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold uppercase">{u.role}</p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${u.isIdle ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {u.isIdle ? 'Idle' : 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. ATS ANALYTICS & REPORTS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  ATS Analytics & Reports
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">
                  Sourcing conversion metrics, recruiter throughput logs, and active pipelines.
                </p>
              </div>

              {/* Toggle Sub-tab for Analytics */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700 max-w-max">
                <button
                  onClick={() => setActiveAnalyticsTab('funnel')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeAnalyticsTab === 'funnel'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Conversion Funnel
                </button>
                <button
                  onClick={() => setActiveAnalyticsTab('recruiters')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeAnalyticsTab === 'recruiters'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Recruiter Performance
                </button>
                <button
                  onClick={() => setActiveAnalyticsTab('roles')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeAnalyticsTab === 'roles'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Roles Breakdown
                </button>
              </div>
            </div>

            {/* Render selected analytical view */}
            {activeAnalyticsTab === 'funnel' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Yield Conversion Steps</h4>
                    {funnel.map((step, index) => (
                      <div key={step.stage} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-350">{step.stage}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono font-bold">
                            {step.count} <span className="text-indigo-600 dark:text-indigo-400">({step.percentage}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-700/40">
                          <div 
                            className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500" 
                            style={{ width: `${step.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Pipeline Yield Insights</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Yield calculation is relative to the number of initial candidate screen calls. Tracks conversion ratios and stage attrition through screening loops and selection releases to onboarding status.
                    </p>
                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-850 flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-500">Current active pool:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{stats?.interested + stats?.followUp + stats?.interviewsScheduled + stats?.interviewsCompleted || 0} Candidates</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeAnalyticsTab === 'recruiters' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Throughput Performance Leaderboard</h4>
                
                {/* Recharts BarChart */}
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recruiters} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="recruiterName" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1E293B', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px'
                        }} 
                      />
                      <Bar dataKey="totalCalls" name="Total Calls" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="joined" name="Joined Hires" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold bg-slate-50/50 dark:bg-slate-950/10">
                        <th className="py-2 px-3">Recruiter</th>
                        <th className="py-2 px-3 text-center">Calls</th>
                        <th className="py-2 px-3 text-center">Interviews</th>
                        <th className="py-2 px-3 text-center">Selections</th>
                        <th className="py-2 px-3 text-center">Joined</th>
                        <th className="py-2 px-3 text-right">Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {recruiters.map((rec) => (
                        <tr key={rec.recruiterId} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/5 text-slate-600 dark:text-slate-400">
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{rec.recruiterName}</td>
                          <td className="py-2 px-3 text-center font-mono font-semibold">{rec.totalCalls}</td>
                          <td className="py-2 px-3 text-center font-mono font-semibold text-amber-600 dark:text-amber-400">{rec.interviewsScheduled}</td>
                          <td className="py-2 px-3 text-center font-mono font-semibold text-cyan-600 dark:text-cyan-400">{rec.selections}</td>
                          <td className="py-2 px-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">{rec.joined}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{rec.conversionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeAnalyticsTab === 'roles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Candidates by Target Role</h4>
                  {recruitmentMetrics.rolesList.map((roleObj, idx) => {
                    const widthPercent = Math.round((roleObj.count / recruitmentMetrics.maxRoleCount) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="truncate max-w-[200px] text-slate-700 dark:text-slate-350">{roleObj.role}</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{roleObj.count} Candidates</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Sourcing Talent Mix</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Provides active mix insights across logged candidates to optimize talent pool ratios.
                  </p>
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-850 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Distinct Profile Roles:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold">{recruitmentMetrics.rolesList.length}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Primary Demand Focus:</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-bold">{recruitmentMetrics.rolesList[0]?.role || 'None'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : activeSubTab === 'recruitment' ? (
        /* 3. RECRUITMENT REPORT & TALENT PIPELINE CHARTS */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Candidates by Role */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-750 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Candidates By Target Role</span>
                <span className="p-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-100 dark:border-amber-900/40"><Briefcase className="w-3.5 h-3.5" /></span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {recruitmentMetrics.rolesList.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">Distinct Profiles Logged</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {recruitmentMetrics.rolesList.length > 0 ? (
                recruitmentMetrics.rolesList.slice(0, 5).map((roleObj, idx) => {
                  const widthPercent = Math.round((roleObj.count / recruitmentMetrics.maxRoleCount) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        <span className="truncate max-w-[150px] font-bold">{roleObj.role}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{roleObj.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[11px] text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-lg">
                  No roles data currently logged.
                </div>
              )}
            </div>
          </div>

          {/* Sourcing Funnel Stage Metrics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-750 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Conversion Sourcing Funnel</span>
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900/40"><Layers className="w-3.5 h-3.5" /></span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  {recruitmentMetrics.totalCandidates}
                </span>
                <span className="text-xs text-slate-500 font-medium">Candidates active in pool</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {funnel.length > 0 ? (
                funnel.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      <span className="truncate max-w-[150px] font-bold">{item.stage}</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{item.count} <span className="text-slate-400">({item.percentage}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-lg">
                  Funnel logs compiling...
                </div>
              )}
            </div>
          </div>

          {/* Sourcing Conversion KPI */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-750 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Average Recruiter KPI</span>
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900/40"><Percent className="w-3.5 h-3.5" /></span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {recruiters.length > 0 ? Math.round(recruiters.reduce((acc, r) => acc + (r.conversionRate || 0), 0) / recruiters.length) : 0}%
                </span>
                <span className="text-xs text-slate-500 font-medium">Aggregate conversion score</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {recruiters.length > 0 ? (
                recruiters.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      <span className="truncate max-w-[130px] font-bold">{item.recruiterName}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{item.conversionRate}% <span className="text-slate-400">({item.candidatesAdded} candidates)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${item.conversionRate}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-lg">
                  No recruiter performance scores.
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <ProductionReadinessChecklist token={token} />
      )}

    </div>
  );
}
