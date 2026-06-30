import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Copy, 
  Check, 
  ArrowLeft, 
  Users, 
  Lock,
  ArrowRight,
  MonitorSmartphone,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { User, UserRole } from '../types.js';

interface AccessDeniedViewProps {
  currentUser: User;
  requestedTab: string;
  requiredRoles: UserRole[];
  onBackToDashboard: () => void;
  onLogout?: () => void;
}

export default function AccessDeniedView({ 
  currentUser, 
  requestedTab, 
  requiredRoles, 
  onBackToDashboard,
  onLogout
}: AccessDeniedViewProps) {
  const [copied, setCopied] = useState(false);

  // Human-readable tab names
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'system-admin-dashboard': return 'System Admin Dashboard';
      case 'team': return 'Recruiters Team Directory';
      case 'shift-monitor': return 'Shift Activity Monitor';
      case 'daily-tracker': return 'Daily Sourcing Tracker';
      case 'logs': return 'System Activity Logs';
      case 'meetings': return 'Team Meetings Panel';
      default: return tab.toUpperCase();
    }
  };

  const shareableUrl = `${window.location.origin}${window.location.pathname}#${requestedTab}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950/40 font-sans min-h-[80vh]">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl text-center relative overflow-hidden">
        
        {/* Top visual glow decorative border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />
        
        {/* Animated Icon Container */}
        <div className="mx-auto w-16 h-16 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6 relative group">
          <div className="absolute inset-0 bg-rose-500/10 rounded-2xl blur-lg group-hover:blur-xl transition pointer-events-none" />
          <Lock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Access Denied Messaging */}
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          You don't have access to this page
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
          The requested section <span className="font-mono bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-rose-600 dark:text-rose-450 font-bold text-xs">{getTabLabel(requestedTab)}</span> is restricted for your current profile level.
        </p>

        {/* Identity & Role Information */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-150 dark:border-slate-850 text-left space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Signed in as:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Your Current Role:</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {currentUser.role}
            </span>
          </div>

          <div className="flex justify-between items-start text-xs pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0 mt-0.5">Required Role(s):</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-xs">
              {requiredRoles.map((role) => (
                <span 
                  key={role} 
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Shared Link Section */}
        <div className="mt-8 p-5 border border-dashed border-indigo-150 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl text-left space-y-3.5">
          <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-450">
            <MonitorSmartphone className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Test Access on Other Devices</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed">
            Copy the direct hash URL below and open it in another browser (e.g. Incognito) or scan/send it to your phone. It will dynamically present this Access Denied gate or authorize you based on the login session of that device.
          </p>
          
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-white dark:bg-slate-950 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 truncate select-all">
              {shareableUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer shrink-0 shadow-sm"
              title="Copy share link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>
          
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-6 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-450 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer border border-rose-100 dark:border-rose-900/30"
              title="Sign out of the current user profile on this device"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out / Switch Profile</span>
            </button>
          )}

          <a
            href={shareableUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
