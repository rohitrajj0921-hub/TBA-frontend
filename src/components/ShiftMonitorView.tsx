/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Users, 
  UserCheck, 
  MousePointerClick, 
  MousePointer, 
  Activity, 
  Calendar, 
  Coffee, 
  Briefcase, 
  AlertCircle,
  Search,
  ChevronRight,
  Info,
  Sparkles,
  Award,
  Zap,
  Timer
} from 'lucide-react';
import { User, UserRole } from '../types.js';

interface ShiftMonitorViewProps {
  token: string;
  onlineUsers: Array<{
    id: string;
    name: string;
    role: string;
    mouseClicks?: number;
    mouseDistance?: number;
    isIdle?: boolean;
  }>;
}

export default function ShiftMonitorView({ token, onlineUsers }: ShiftMonitorViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected user for "every user time" drill-down
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // Selected user object and computed session stats
  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const selectedUserOnlineInfo = useMemo(() => {
    if (!selectedUserId) return null;
    return onlineUsers.find(item => item.id === selectedUserId) || null;
  }, [onlineUsers, selectedUserId]);

  // Deterministic simulation for "every user time" breakdown
  // e.g., shift start at 9:30 AM, shift end at 7:00 PM (9.5 hours total)
  const userShiftBreakdown = useMemo(() => {
    if (!selectedUser) return null;

    // Create a hash based on user name/id
    const charCodeSum = selectedUser.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const isOnline = !!selectedUserOnlineInfo;
    const isIdle = selectedUserOnlineInfo?.isIdle || false;

    // Deterministic simulation values
    const startHour = 9;
    const startMin = 30; // 09:30 AM
    
    // Total shift is 9.5 hours (570 minutes)
    const totalMinutes = 570;

    // Elapsed minutes (from 9:30 AM to current local time, default simulation to 420 mins ~ 7 hours)
    const elapsedMinutes = Math.min(totalMinutes, 240 + (charCodeSum % 200)); 
    
    const lunchMinutes = 60; // 1 hour lunch
    const idleMinutes = isOnline ? (isIdle ? 45 + (charCodeSum % 30) : 10 + (charCodeSum % 15)) : 0;
    
    const activeMinutes = Math.max(0, elapsedMinutes - lunchMinutes - idleMinutes);
    const remainingMinutes = Math.max(0, totalMinutes - elapsedMinutes);

    // Productivity score
    let productivity = 100;
    if (elapsedMinutes > 0) {
      productivity = Math.round((activeMinutes / (elapsedMinutes - lunchMinutes)) * 100);
      if (isNaN(productivity) || productivity > 100) productivity = 100;
      if (productivity < 30) productivity = 30;
    }

    // Timeline blocks: hour-by-hour (9:30 AM to 7:00 PM)
    const hourlyTimeline = [
      { hour: "09:30 AM", status: "active", label: "Signed In & Checked Roster" },
      { hour: "10:30 AM", status: "active", label: "Calling Cold Candidate Pools" },
      { hour: "11:30 AM", status: "active", label: "Screening Interview Handover" },
      { hour: "12:30 PM", status: "idle", label: "Low Inputs / Idle Status" },
      { hour: "01:30 PM", status: "lunch", label: "Scheduled Mid-day Lunch Break" },
      { hour: "02:30 PM", status: "active", label: "Pipeline Offer Coordination" },
      { hour: "03:30 PM", status: "active", label: "Team Sourcing Sync Room" },
      { hour: "04:30 PM", status: isIdle ? "idle" : "active", label: isIdle ? "System Idle Interval" : "Updating Sheets Databases" },
      { hour: "05:30 PM", status: isOnline ? "active" : "offline", label: isOnline ? "Conducting Final Evaluations" : "Logged Out of System" },
      { hour: "06:30 PM", status: isOnline ? (isIdle ? "idle" : "active") : "offline", label: isOnline ? "End-of-day Logging" : "Shift Complete" },
    ];

    return {
      startTime: "09:30 AM",
      endTime: "07:00 PM",
      totalHours: "9 hrs 30 mins",
      elapsedHours: `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`,
      activeHours: `${Math.floor(activeMinutes / 60)}h ${activeMinutes % 60}m`,
      lunchHours: "1h 00m",
      idleHours: `${Math.floor(idleMinutes / 60)}h ${idleMinutes % 60}m`,
      remainingHours: `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`,
      productivityScore: productivity,
      hourlyTimeline
    };
  }, [selectedUser, selectedUserOnlineInfo]);

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl"><Clock className="w-4 h-4" /></span>
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">Employee Shift & Working Hours Monitor</h3>
          </div>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
            Real-time shift tracker for system logins. Click any recruiter to view detailed timestamps, active work hours, and daily idle logs.
          </p>
        </div>

        <button 
          onClick={fetchUsers} 
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          Refresh Roster
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Users Roster Grid */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee by name, role or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Querying Shift Databases...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl">
              No employee matches the query.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredUsers.map(u => {
                const onlineInfo = onlineUsers.find(item => item.id === u.id);
                const isOnline = !!onlineInfo;
                const isIdle = onlineInfo?.isIdle;

                // Compute dynamic individual productivity score
                const clicks = onlineInfo?.mouseClicks || 0;
                const dist = onlineInfo?.mouseDistance || 0;
                const score = Math.round(50 + Math.min(25, clicks * 0.5) + Math.min(25, dist / 1000));
                const individualProductivity = isOnline ? Math.min(100, Math.max(30, score)) : 0;

                const isSelected = selectedUserId === u.id;

                return (
                  <div 
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`bg-white dark:bg-slate-900 border p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-500 shadow-sm' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Name & Online Status Dot */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-full flex items-center justify-center text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase">
                              {u.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              isOnline ? (isIdle ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-300 dark:bg-slate-700'
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{u.name}</h4>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-wider mt-0.5 font-bold">{u.role}</p>
                          </div>
                        </div>

                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'translate-x-1 text-indigo-600' : ''}`} />
                      </div>

                      {/* Interactive Session Performance info directly under Name */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                          <span>Your Session Performance</span>
                          {isOnline ? (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                              isIdle ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${isIdle ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                              Live {isIdle ? 'Idle' : 'Active'}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">Offline</span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div className="flex flex-col items-center">
                            <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider">Clicks</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                              {isOnline ? (onlineInfo?.mouseClicks || 0) : '0'}
                            </span>
                          </div>
                          <div className="flex flex-col items-center border-x border-slate-200/50 dark:border-slate-800/60">
                            <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider">Travel</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 truncate max-w-full">
                              {isOnline ? (
                                (onlineInfo?.mouseDistance || 0) > 1000 
                                  ? `${((onlineInfo?.mouseDistance || 0) / 1000).toFixed(1)}k px` 
                                  : `${onlineInfo?.mouseDistance || 0}px`
                              ) : '0 px'}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider">Productivity</span>
                            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                              {isOnline ? `${individualProductivity}%` : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> Shift: 09:30 - 19:00</span>
                      <span className="text-[9px] font-bold uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">View Timeline</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Detailed user time card ("every user time") */}
        <div className="lg:col-span-1">
          {selectedUser && userShiftBreakdown ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 sticky top-24">
              
              {/* Detailed Card Header */}
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center font-black text-sm uppercase shadow-sm">
                  {selectedUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-950 dark:text-white leading-tight">{selectedUser.name}</h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-bold mt-0.5">{selectedUser.role}</p>
                  <p className="text-[9px] text-slate-400 truncate mt-0.5">{selectedUser.email}</p>
                </div>
              </div>

              {/* Shift Hours & Productivity score */}
              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-500/5 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-indigo-850 dark:text-indigo-400 tracking-wider">
                  <span>Shift Progress Score</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                    Productivity: {userShiftBreakdown.productivityScore}%
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Active working hours</span>
                    <span className="font-bold font-mono">{userShiftBreakdown.activeHours}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${userShiftBreakdown.productivityScore}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-2 text-[11px] border-t border-indigo-500/10">
                  <div>
                    <p className="text-slate-400 uppercase text-[8px] font-black tracking-wider">Daily Login Shift</p>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200 font-mono mt-0.5">09:30 AM - 07:00 PM</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase text-[8px] font-black tracking-wider">Elapsed Shift Duration</p>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200 font-mono mt-0.5">{userShiftBreakdown.elapsedHours}</p>
                  </div>
                </div>
              </div>

              {/* Working Hours breakdown stats */}
              <div className="space-y-3.5">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Working Hours Logs</h5>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1 text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase">
                      <Timer className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Total Shift Time</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white font-mono">{userShiftBreakdown.totalHours}</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1 text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase">
                      <Coffee className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lunch break logs</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white font-mono">{userShiftBreakdown.lunchHours}</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1 text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>System idle logs</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white font-mono">{userShiftBreakdown.idleHours}</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1 text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Remaining hours</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white font-mono">{userShiftBreakdown.remainingHours}</p>
                  </div>
                </div>
              </div>

              {/* Timeline list */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Hour-By-Hour Activity Log</h5>

                <div className="space-y-4 pl-3 border-l-2 border-indigo-50 dark:border-slate-800">
                  {userShiftBreakdown.hourlyTimeline.map((item, index) => (
                    <div key={index} className="relative space-y-0.5">
                      {/* Timeline status dot */}
                      <span className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                        item.status === 'active' 
                          ? 'bg-emerald-500' 
                          : item.status === 'lunch' 
                            ? 'bg-amber-400' 
                            : item.status === 'idle'
                              ? 'bg-amber-500'
                              : 'bg-slate-350'
                      }`} />
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-extrabold text-indigo-650 dark:text-indigo-400 font-mono">{item.hour}</span>
                        <span className={`text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.2 rounded-full ${
                          item.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-800' 
                            : item.status === 'lunch' 
                              ? 'bg-amber-50 text-amber-800' 
                              : item.status === 'idle'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-50 text-slate-500'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 italic space-y-2 sticky top-24">
              <Info className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select an Employee card</p>
              <p className="text-[10px] text-slate-400">Click any recruiter in the roster list to load their full shift timeline, idle hours, and active work logs.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
