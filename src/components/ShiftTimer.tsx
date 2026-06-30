/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Activity, 
  MousePointer, 
  MousePointerClick, 
  CheckCircle,
  Users,
  Timer,
  AlertCircle
} from 'lucide-react';

interface ShiftTimerProps {
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
}

export default function ShiftTimer({ onlineUsers, localActivity }: ShiftTimerProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute 9:30 AM to 7:00 PM boundaries
  const shiftMetrics = useMemo(() => {
    const startHour = 9;
    const startMin = 30;
    const endHour = 19; // 7:00 PM
    const endMin = 0;

    const todayStart = new Date(now);
    todayStart.setHours(startHour, startMin, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(endHour, endMin, 0, 0);

    const totalShiftMs = todayEnd.getTime() - todayStart.getTime(); // 9.5 hours
    const currentMs = now.getTime();

    let status: 'BEFORE' | 'DURING' | 'LUNCH' | 'AFTER' = 'BEFORE';
    let label = 'Offline Hours';
    let progress = 0;
    let timeRemainingLabel = '';
    let hoursWorkedLabel = '0h 0m';

    // Check for lunch hour (e.g., 1:00 PM to 2:00 PM)
    const currentHour = now.getHours();

    if (currentMs < todayStart.getTime()) {
      status = 'BEFORE';
      label = 'Shift Not Started';
      const diffMs = todayStart.getTime() - currentMs;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      timeRemainingLabel = `Starts in ${hours}h ${mins}m ${secs}s`;
      progress = 0;
    } else if (currentMs > todayEnd.getTime()) {
      status = 'AFTER';
      label = 'Shift Completed';
      timeRemainingLabel = 'Work Hours Finished';
      progress = 100;
      hoursWorkedLabel = '9h 30m';
    } else {
      // During working hours
      progress = Math.min(100, Math.round(((currentMs - todayStart.getTime()) / totalShiftMs) * 100));
      const elapsedMs = currentMs - todayStart.getTime();
      const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const elapsedMins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
      hoursWorkedLabel = `${elapsedHours}h ${elapsedMins}m`;

      if (currentHour === 13) {
        status = 'LUNCH';
        label = 'Lunch Break';
        const diffMs = new Date(now).setHours(14, 0, 0, 0) - currentMs;
        const mins = Math.floor(diffMs / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        timeRemainingLabel = `Lunch ends in ${mins}m ${secs}s`;
      } else {
        status = 'DURING';
        label = 'Active Working Hours';
        const diffMs = todayEnd.getTime() - currentMs;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        timeRemainingLabel = `${hours}h ${mins}m ${secs}s left`;
      }
    }

    return {
      status,
      label,
      progress,
      timeRemainingLabel,
      hoursWorkedLabel,
      totalHoursLabel: '9h 30m'
    };
  }, [now]);

  // Compute Personal Productivity Score (real-time metric)
  const productivityScore = useMemo(() => {
    const sessionLengthSeconds = Math.max(1, Math.round((Date.now() - localActivity.sessionStart) / 1000));
    // Score based on active interaction ratio and mouse volume
    const activeRatio = Math.min(1, localActivity.activeSeconds / sessionLengthSeconds);
    const clickBonus = Math.min(25, localActivity.clicks * 0.5);
    const distanceBonus = Math.min(25, localActivity.distance / 1000);
    const score = Math.round((activeRatio * 50) + clickBonus + distanceBonus + 25);
    return Math.min(100, Math.max(30, score));
  }, [localActivity]);

  // Compute overall team metrics
  const teamMetrics = useMemo(() => {
    const totalConnected = onlineUsers.length;
    const available = onlineUsers.filter(u => !u.isIdle).length;
    const idle = onlineUsers.filter(u => u.isIdle).length;
    return {
      totalConnected,
      available,
      idle
    };
  }, [onlineUsers]);

  return (
    <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50 border border-indigo-100 dark:from-slate-900/40 dark:to-slate-950/20 dark:border-slate-800 rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
      
      {/* 1. Working Hours (9:30 AM - 7:00 PM) Counter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${shiftMetrics.status === 'DURING' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Work Shift Monitor</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
            09:30 AM - 07:00 PM
          </span>
        </div>

        <div className="bg-slate-200/60 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 rounded-full ${
              shiftMetrics.status === 'LUNCH' 
                ? 'bg-amber-400' 
                : shiftMetrics.status === 'AFTER' 
                  ? 'bg-slate-400 dark:bg-slate-600' 
                  : 'bg-indigo-600 dark:bg-indigo-500'
            }`}
            style={{ width: `${shiftMetrics.progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            {shiftMetrics.label} ({shiftMetrics.hoursWorkedLabel} / {shiftMetrics.totalHoursLabel})
          </span>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {shiftMetrics.timeRemainingLabel}
          </span>
        </div>
      </div>

      {/* 2. Personal Live Productivity Tracking */}
      <div className="border-t md:border-t-0 md:border-x border-slate-200 dark:border-slate-800/80 md:px-6 py-4 md:py-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Your Session Performance</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
            localActivity.isIdle 
              ? 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
          }`}>
            {localActivity.isIdle ? 'Idle (No Inputs)' : 'Active (Inputting)'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/60 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center space-x-0.5">
              <MousePointerClick className="w-3 h-3 text-slate-400" />
              <span>Clicks</span>
            </div>
            <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{localActivity.clicks}</p>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center space-x-0.5">
              <MousePointer className="w-3 h-3 text-slate-400" />
              <span>Travel</span>
            </div>
            <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5" title={`${localActivity.distance} pixels`}>
              {localActivity.distance > 1000 ? `${(localActivity.distance / 1000).toFixed(1)}k px` : `${localActivity.distance}px`}
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Productivity</div>
            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{productivityScore}%</p>
          </div>
        </div>
      </div>

      {/* 3. Real-time Team Availability Counter */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Real-time Team Presence</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Available</p>
              <p className="text-xs font-black text-slate-800 dark:text-white">{teamMetrics.available}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-xl p-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Idle</p>
              <p className="text-xs font-black text-slate-800 dark:text-white">{teamMetrics.idle}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
