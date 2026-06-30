/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  PhoneCall, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  UserCheck, 
  Loader2, 
  User as UserIcon, 
  TrendingUp,
  Award,
  Briefcase,
  Clock,
  Target,
  Percent,
  Shield,
  Sparkles,
  Layers,
  ArrowUpRight,
  Activity,
  UserPlus,
  LogIn,
  MessageSquare
} from 'lucide-react';
import { 
  DashboardStats, 
  RecruiterPerformance, 
  User as UserType, 
  UserRole, 
  Candidate, 
  CandidateStatus,
  ActivityLog
} from '../types.js';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, ensureFirebaseAuth, handleFirestoreError, OperationType } from '../firebase-client.js';

interface DashboardViewProps {
  token: string;
  currentUser?: UserType | null;
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

export default function DashboardView({ 
  token, 
  currentUser,
  onlineUsers = [],
  localActivity = { clicks: 0, distance: 0, isIdle: false, activeSeconds: 0, sessionStart: Date.now() }
}: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recruiters, setRecruiters] = useState<RecruiterPerformance[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number; percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Candidates list for admin analytics
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  // Real-time recruitment activities from Firestore
  const [liveLogs, setLiveLogs] = useState<ActivityLog[]>([]);
  const [liveLogsLoading, setLiveLogsLoading] = useState(true);
  const [liveLogsError, setLiveLogsError] = useState('');

  // Relative time formatter helper
  const formatRelativeTime = (isoString: string): string => {
    try {
      const now = new Date();
      const date = new Date(isoString);
      const diffMs = now.getTime() - date.getTime();
      
      if (isNaN(diffMs)) return 'Just now';
      
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  useEffect(() => {
    let unsubscribe: () => void;
    let isMounted = true;

    const initLogsListener = async () => {
      try {
        await ensureFirebaseAuth();
        if (!isMounted) return;

        const logsRef = collection(db, 'logs');
        const q = query(logsRef, orderBy('timestamp', 'desc'), limit(15));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedLogs: ActivityLog[] = [];
          snapshot.forEach((doc) => {
            fetchedLogs.push({ id: doc.id, ...doc.data() } as ActivityLog);
          });
          if (isMounted) {
            setLiveLogs(fetchedLogs);
            setLiveLogsLoading(false);
            setLiveLogsError('');
          }
        }, async (err) => {
          console.warn("Firestore subscription failed, falling back to REST API:", err);
          try {
            handleFirestoreError(err, OperationType.GET, 'logs');
          } catch (specErr) {
            console.warn("Firestore error logged (handled with fallback):", specErr);
          }

          if (!isMounted) return;

          // Fallback to fetching via REST API
          try {
            const res = await fetch('/api/logs', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (isMounted) {
                setLiveLogs(data.slice(0, 15));
                setLiveLogsError('');
              }
            } else {
              if (isMounted) {
                setLiveLogs([]);
                setLiveLogsError(currentUser?.role === UserRole.ADMIN ? 'Unable to load real-time feed' : '');
              }
            }
          } catch (fetchErr) {
            if (isMounted) {
              setLiveLogs([]);
              setLiveLogsError(currentUser?.role === UserRole.ADMIN ? 'Unable to load real-time feed' : '');
            }
          }
          if (isMounted) {
            setLiveLogsLoading(false);
          }
        });
      } catch (err: any) {
        console.warn("Firestore initialize failed, falling back to REST API:", err);
        try {
          handleFirestoreError(err, OperationType.GET, 'logs');
        } catch (specErr) {
          console.warn("Firestore error logged (handled with fallback):", specErr);
        }

        if (!isMounted) return;

        // Fallback to fetching via REST API
        try {
          const res = await fetch('/api/logs', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setLiveLogs(data.slice(0, 15));
              setLiveLogsError('');
            }
          } else {
            if (isMounted) {
              setLiveLogs([]);
              setLiveLogsError(currentUser?.role === UserRole.ADMIN ? 'Unable to load real-time feed' : '');
            }
          }
        } catch (fetchErr) {
          if (isMounted) {
            setLiveLogs([]);
            setLiveLogsError(currentUser?.role === UserRole.ADMIN ? 'Unable to load real-time feed' : '');
          }
        }
        if (isMounted) {
          setLiveLogsLoading(false);
        }
      }
    };

    initLogsListener();
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch main aggregate counters
      const statsRes = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();

      // 2. Fetch report data for recruiter performances & funnel
      const reportsRes = await fetch('/api/dashboard/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reportsData = await reportsRes.json();

      if (!statsRes.ok || !reportsRes.ok) {
        throw new Error("Failed to load dashboard metrics");
      }

      setStats(statsData);
      setRecruiters(reportsData.recruiterPerformance || []);
      setFunnel(reportsData.conversionFunnel || []);

      // 3. Fetch full raw candidates list if admin
      if (currentUser?.role === UserRole.ADMIN) {
        setCandidatesLoading(true);
        const candidatesRes = await fetch('/api/candidates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (candidatesRes.ok) {
          const candidatesData = await candidatesRes.json();
          setCandidates(candidatesData);
        }
        setCandidatesLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, currentUser]);

  // Metric Calculation 1: Candidates by Role
  const candidatesByRole = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    candidates.forEach(c => {
      const roleName = (c.role || "Unspecified").trim();
      roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
    });
    
    return Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 roles
  }, [candidates]);

  // Metric Calculation 2: Interview Conversion Rate
  const conversionStats = useMemo(() => {
    const interviewed = candidates.filter(c => c.doneInterview === 'Yes' || c.doneInterview === 'Completed');
    const selected = interviewed.filter(c => 
      !!c.selectionDate || 
      (c.offerReceivedSalary && c.offerReceivedSalary > 0) || 
      !!c.joiningDate || 
      c.joiningStatusText === 'Joined'
    );
    
    const overallRate = interviewed.length > 0 
      ? Math.round((selected.length / interviewed.length) * 100) 
      : 0;

    // Grouping by recruiter name for conversion bar breakdown
    const recruiterRates = Array.from(new Set(interviewed.map(c => c.recruiterName || 'Unknown'))).map(recName => {
      const recInterviewed = interviewed.filter(c => (c.recruiterName || 'Unknown') === recName);
      const recSelected = recInterviewed.filter(c => 
        !!c.selectionDate || 
        (c.offerReceivedSalary && c.offerReceivedSalary > 0) || 
        !!c.joiningDate
      );
      const recRate = recInterviewed.length > 0 ? Math.round((recSelected.length / recInterviewed.length) * 100) : 0;
      return { recruiter: recName, rate: recRate, interviewed: recInterviewed.length };
    }).sort((a, b) => b.rate - a.rate).slice(0, 4);

    return {
      totalInterviewed: interviewed.length,
      totalSelected: selected.length,
      overallRate,
      recruiterRates
    };
  }, [candidates]);

  // Metric Calculation 3: Time-to-Hire (average days from callDate/createdAt to joiningDate/selectionDate)
  const timeToHireStats = useMemo(() => {
    const hiredCandidates = candidates.filter(c => {
      const startDate = c.callDate || (c.createdAt ? c.createdAt.split('T')[0] : null);
      const endDate = c.joiningDate || c.selectionDate;
      return startDate && endDate;
    });

    const durations = hiredCandidates.map(c => {
      const start = new Date(c.callDate || c.createdAt);
      const end = new Date(c.joiningDate || c.selectionDate!);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        name: c.name,
        role: c.role || "Developer",
        days: diffDays > 0 ? diffDays : 1
      };
    }).sort((a, b) => a.days - b.days); // Quick order

    const averageDays = durations.length > 0
      ? Math.round(durations.reduce((acc, curr) => acc + curr.days, 0) / durations.length)
      : 0;

    return {
      hiredCount: hiredCandidates.length,
      averageDays,
      durations: durations.slice(0, 5) // Recent hires speed
    };
  }, [candidates]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-slate-500 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm font-medium">Recalculating recruitment pipelines...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-slate-50 text-slate-800 flex-1 min-h-screen">
        <div className="max-w-xl mx-auto p-5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-center shadow-sm">
          <p className="font-bold">Dashboard Loading Blocked</p>
          <p className="text-xs mt-1 text-rose-600">{error || 'Unknown error occurred.'}</p>
          <button 
            onClick={fetchDashboardData} 
            className="mt-3 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-semibold cursor-pointer border border-rose-200 transition-all"
          >
            Retry Fetching Data
          </button>
        </div>
      </div>
    );
  }

  const topRecruiter = recruiters.length > 0 
    ? [...recruiters].sort((a, b) => b.joined - a.joined || b.totalCalls - a.totalCalls)[0]
    : null;

  // Max value calculation for bar rendering
  const maxRoleCount = candidatesByRole.length > 0 ? Math.max(...candidatesByRole.map(r => r.count)) : 1;

  return (
    <div className="p-8 space-y-8 text-slate-700 bg-slate-50 min-h-screen font-sans">
      
      {/* Header and Sync */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recruitment Core Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">Real-time candidate pipelines and performance reports.</p>
        </div>
        <button
          id="btn-refresh-dashboard"
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 text-slate-700 shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Synchronize Live</span>
        </button>
      </div>

      {/* ADMIN-ONLY ANALYTICS HERO & MINICHARTS SECTION */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-yellow-400 text-yellow-950 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3" /> Admin
              </span>
              <h3 className="text-md font-bold text-slate-950">Executive Sourcing & Operations Summary</h3>
            </div>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Live Computed Intelligence
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CARD 1: Candidates by Role */}
            <div className="bg-white border border-slate-200/80 shadow-md rounded-2xl p-5 hover:border-slate-300 hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Candidates By Role</span>
                  <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100"><Briefcase className="w-3.5 h-3.5" /></span>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-slate-950 tracking-tight">
                    {candidatesByRole.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Distinct Job Profiles</span>
                </div>
              </div>

              {/* Mini Chart: Horizontal bars */}
              <div className="mt-4 space-y-2">
                {candidatesByRole.length > 0 ? (
                  candidatesByRole.map((roleObj, idx) => {
                    const widthPercent = Math.round((roleObj.count / maxRoleCount) * 100);
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                          <span className="truncate max-w-[150px]" title={roleObj.role}>{roleObj.role}</span>
                          <span className="font-mono text-indigo-600">{roleObj.count}</span>
                        </div>
                        <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden border border-slate-100">
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
                    No roles data logged in spreadsheet yet.
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: Interview Conversion Rate */}
            <div className="bg-white border border-slate-200/80 shadow-md rounded-2xl p-5 hover:border-slate-300 hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Interview Conversion Rate</span>
                  <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100"><Percent className="w-3.5 h-3.5" /></span>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-emerald-600 tracking-tight">
                    {conversionStats.overallRate}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Of {conversionStats.totalInterviewed} completed</span>
                </div>
              </div>

              {/* Mini Chart: Recruiter Performance Rates */}
              <div className="mt-4 space-y-2">
                {conversionStats.recruiterRates.length > 0 ? (
                  conversionStats.recruiterRates.map((recObj, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                        <span className="truncate max-w-[130px]">{recObj.recruiter}</span>
                        <span className="font-mono text-emerald-600 font-bold">{recObj.rate}% <span className="text-[9px] text-slate-400 font-normal">({recObj.interviewed} int)</span></span>
                      </div>
                      <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden border border-slate-100">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${recObj.rate}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-lg">
                    No completed interviews recorded.
                  </div>
                )}
              </div>
            </div>

            {/* CARD 3: Time-to-Hire */}
            <div className="bg-white border border-slate-200/80 shadow-md rounded-2xl p-5 hover:border-slate-300 hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Average Time-to-Hire</span>
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100"><Clock className="w-3.5 h-3.5" /></span>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-slate-950 tracking-tight">
                    {timeToHireStats.averageDays > 0 ? `${timeToHireStats.averageDays} Days` : 'N/A'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Sourcing to onboarding</span>
                </div>
              </div>

              {/* Mini Chart: Spark-bar list representation for individual placements */}
              <div className="mt-4 space-y-2">
                {timeToHireStats.durations.length > 0 ? (
                  timeToHireStats.durations.map((candDuration, idx) => {
                    const maxDays = Math.max(...timeToHireStats.durations.map(d => d.days));
                    const widthPercent = Math.round((candDuration.days / maxDays) * 100);
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                          <span className="truncate max-w-[140px] font-sans">{candDuration.name} <span className="text-[9px] text-slate-400 font-normal">({candDuration.role})</span></span>
                          <span className="font-mono text-indigo-600">{candDuration.days}d</span>
                        </div>
                        <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden border border-slate-100">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[11px] text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-lg">
                    No hired candidate date cycles logged yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Calls */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Screening Calls</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100"><PhoneCall className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{stats.totalCalls}</span>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Sourced & Screened Candidates</p>
          </div>
        </div>

        {/* Card 2: Interested */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Interested / Follow-up</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><ThumbsUp className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{stats.interested + stats.followUp}</span>
            <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1.5 font-medium">
              <span>Interested: {stats.interested}</span>
              <span>•</span>
              <span>Follow-up: {stats.followUp}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Interviews */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Interviews Scheduled</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><Calendar className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{stats.interviewsScheduled}</span>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Completed Sessions: {stats.interviewsCompleted}</p>
          </div>
        </div>

        {/* Card 4: Placements */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Hires Joined</span>
            <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100"><UserCheck className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{stats.joined}</span>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Selected Offers: {stats.selected}</p>
          </div>
        </div>
      </div>

      {/* Main Analytical Section (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Conversion Funnel Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Recruitment Conversion Funnel</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 border border-slate-150 text-slate-500 font-semibold uppercase tracking-wider">Yield Analysis</span>
          </div>

          <div className="space-y-4">
            {funnel.map((item, index) => {
              const barWidth = `${Math.max(item.percentage, 5)}%`;
              return (
                <div id={`funnel-stage-${index}`} key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.stage}</span>
                    <span className="text-slate-500 font-mono">
                      {item.count} <span className="text-[10px] text-indigo-600">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                    <div 
                      className={`h-full rounded-lg transition-all duration-500 bg-gradient-to-r ${
                        index === 0 ? 'from-indigo-600 to-indigo-500' :
                        index === 1 ? 'from-indigo-500 to-cyan-500' :
                        index === 2 ? 'from-cyan-500 to-emerald-500' :
                        index === 3 ? 'from-emerald-500 to-teal-500' :
                        'from-teal-500 to-emerald-600'
                      }`}
                      style={{ width: barWidth }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-medium">
            Percentages calculated relative to original initial Calls Screened. Tracks attrition and conversion steps across recruiter call screens, completed reviews, team logs, and hire releases.
          </p>
        </div>

        {/* Right: Lead Recruiter & System Summary */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {topRecruiter && (
            <div className="bg-gradient-to-br from-indigo-50/50 via-white to-white border border-indigo-100 shadow-sm rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 border border-indigo-100 rounded-md font-bold uppercase tracking-wider">Star Performer</span>
                  <h4 className="text-lg font-bold text-slate-900 mt-2">{topRecruiter.recruiterName}</h4>
                  <p className="text-xs text-slate-500 font-semibold">{topRecruiter.role}</p>
                </div>
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Offers Placed</span>
                  <span className="text-xl font-bold text-emerald-600">{topRecruiter.joined} Candidates</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Conversion Yield</span>
                  <span className="text-xl font-bold text-slate-900">{topRecruiter.conversionRate}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick breakdown circular charts or static meters */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <h4 className="font-bold text-slate-900 text-sm mb-4">Pipeline Distribution</h4>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="flex items-center space-x-2 text-slate-500">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                  <span>Not Interested</span>
                </span>
                <span className="text-slate-800">{stats.notInterested}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="flex items-center space-x-2 text-slate-500">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                  <span>Follow-up Pools</span>
                </span>
                <span className="text-slate-800">{stats.followUp}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="flex items-center space-x-2 text-slate-500">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                  <span>Interview Roundings</span>
                </span>
                <span className="text-slate-800">{stats.interviewsScheduled + stats.interviewsCompleted}</span>
              </div>
            </div>
          </div>

          {/* Real-time Recruitment Activity Feed */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <h4 className="font-bold text-slate-900 text-sm">Real-time Sourcing Feed</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md">
                Firestore Sync
              </span>
            </div>

            {/* Scrollable feed content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
              {liveLogsLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                  <span>Streaming activity stream...</span>
                </div>
              ) : liveLogsError ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10 text-center px-4">
                  <Activity className="w-6 h-6 text-slate-300 mb-2" />
                  <span className="font-semibold text-slate-500">Live Connection Paused</span>
                  <p className="text-[10px] text-slate-400 mt-1">{liveLogsError}</p>
                </div>
              ) : liveLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10 text-center">
                  <Activity className="w-6 h-6 text-slate-300 mb-2" />
                  <span className="font-semibold">No recent activities logged</span>
                  <p className="text-[10px] text-slate-400 mt-1">Activities will stream here as recruiters make pipeline updates.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {liveLogs.map((log) => {
                    // Determine styling based on action type
                    let iconBg = 'bg-slate-50 text-slate-500 border-slate-100';
                    let IconComponent = Activity;
                    const act = log.action || '';

                    if (act.includes('LOGIN')) {
                      iconBg = 'bg-slate-50 text-slate-600 border-slate-100';
                      IconComponent = LogIn;
                    } else if (act.includes('ADD_CANDIDATE') || act.includes('CREATE_CANDIDATE')) {
                      iconBg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                      IconComponent = UserPlus;
                    } else if (act.includes('STATUS') || act.includes('UPDATE_CANDIDATE')) {
                      iconBg = 'bg-amber-50 text-amber-600 border-amber-100';
                      IconComponent = Layers;
                    } else if (act.includes('INTERVIEW') || act.includes('SCHEDULE')) {
                      iconBg = 'bg-blue-50 text-blue-600 border-blue-100';
                      IconComponent = Calendar;
                    } else if (act.includes('CHAT') || act.includes('MESSAGE')) {
                      iconBg = 'bg-sky-50 text-sky-600 border-sky-100';
                      IconComponent = MessageSquare;
                    }

                    return (
                      <div key={log.id} className="flex items-start space-x-3 text-xs border-b border-slate-50 pb-3 last:border-b-0 last:pb-0 hover:bg-slate-50/50 p-1.5 rounded-xl transition-all">
                        <div className={`p-2 rounded-xl border ${iconBg} shrink-0`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="font-bold text-slate-900 truncate max-w-[130px]" title={log.userName}>
                              {log.userName}
                            </span>
                            <span className="text-[9px] text-slate-400 shrink-0 font-medium">
                              {formatRelativeTime(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed break-words text-[11px]">
                            {log.details}
                          </p>
                          {log.userRole && (
                            <span className="inline-block mt-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {log.userRole}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recruiter Throughput Rankings */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center space-x-2">
          <span>Recruiter Leaderboard & Throughput</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Recruiter Name</th>
                <th className="py-3 px-4 text-center">Screening Calls</th>
                <th className="py-3 px-4 text-center">Interested</th>
                <th className="py-3 px-4 text-center">Interviews Booked</th>
                <th className="py-3 px-4 text-center">Selections</th>
                <th className="py-3 px-4 text-center">Joined hires</th>
                <th className="py-3 px-4 text-right">Yield Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recruiters.map((rec) => (
                <tr key={rec.recruiterId} className="hover:bg-slate-50 text-slate-600 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center space-x-2">
                    <div className="w-7 h-7 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {rec.recruiterName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span>{rec.recruiterName}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold">{rec.totalCalls}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-indigo-600">{rec.interestedCount}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-amber-600">{rec.interviewsScheduled}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-cyan-600">{rec.selections}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-600">{rec.joined}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    <span className="inline-block px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg">
                      {rec.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
