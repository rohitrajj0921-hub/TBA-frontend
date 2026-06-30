/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  RefreshCw, 
  Shield, 
  User as UserIcon, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  FilterX, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { ActivityLog, User, UserRole } from '../types.js';

interface LogsViewProps {
  token: string;
  currentUser: User;
}

export default function LogsView({ token, currentUser }: LogsViewProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }
      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load activity logs.");
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh logs every 15 seconds to monitor in real-time
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [token]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchLogs();
  };

  // Extract unique action types from logs for filtering
  const actionTypes: string[] = ['ALL', ...Array.from(new Set(logs.map(log => log.action))) as string[]];

  // Filter logs based on search query and action dropdown
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE')) {
      return 'bg-rose-50 text-rose-700 border border-rose-100';
    }
    if (act.includes('CREATE')) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    }
    if (act.includes('UPDATE')) {
      return 'bg-amber-50 text-amber-700 border border-amber-100';
    }
    if (act === 'LOGIN') {
      return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
    }
    if (act.includes('LOCK') || act.includes('CLEAR')) {
      return 'bg-purple-50 text-purple-700 border border-purple-100';
    }
    return 'bg-slate-50 text-slate-700 border border-slate-150';
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === UserRole.ADMIN) {
      return 'bg-red-50 text-red-600 border border-red-100';
    }
    if (role === UserRole.TEAM_LEADER) {
      return 'bg-amber-50 text-amber-600 border border-amber-100';
    }
    return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('ALL');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-slate-150 shadow-sm gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center">
              <span>Security Activity Logs</span>
              <span className="ml-2.5 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <Shield className="w-3 h-3 mr-1 text-slate-500" />
                Admin Only
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Chronological security-auditable event logs tracking login sessions, records modification, user provisioning, and team collaboration channel moderations.
            </p>
          </div>
        </div>

        <button
          id="refresh-logs-btn"
          onClick={handleManualRefresh}
          disabled={loading || isRefreshing}
          className="flex items-center justify-center space-x-2 px-4.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
          <span>{isRefreshing || loading ? "Synchronizing..." : "Refresh Audit Trail"}</span>
        </button>
      </div>

      {/* Filter and Query Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              id="search-logs-input"
              type="text"
              placeholder="Search activity by user name, email address, action details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-sm transition outline-none"
            />
          </div>

          {/* Action Filter Selector */}
          <div className="w-full md:w-64">
            <select
              id="action-filter-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-sm transition outline-none cursor-pointer font-medium text-slate-700"
            >
              <option value="ALL">All Actions Types</option>
              {actionTypes.filter(type => type !== 'ALL').map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Controls */}
          {(searchQuery !== '' || actionFilter !== 'ALL') && (
            <button
              id="clear-logs-filter-btn"
              onClick={clearFilters}
              className="flex items-center justify-center space-x-2 px-4.5 py-2.5 border border-dashed border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table / Feed */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-slate-500">Querying security logs database...</p>
          </div>
        ) : error ? (
          <div className="p-16 flex flex-col items-center justify-center text-rose-500 space-y-3">
            <AlertTriangle className="w-9 h-9 text-rose-600" />
            <p className="text-sm font-bold">Failed to load logs</p>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={() => fetchLogs()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm hover:bg-indigo-700"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400 text-center max-w-sm mx-auto space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-full text-slate-400">
              <ScrollText className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Logs Matching Selection</h3>
              <p className="text-xs text-slate-500 mt-1">
                We couldn't find any auditable actions recorded in the database matching your search parameters or query filters.
              </p>
            </div>
            {(searchQuery !== '' || actionFilter !== 'ALL') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 w-60">Recruiter User</th>
                  <th className="px-6 py-4 w-48">Action Type</th>
                  <th className="px-6 py-4">Event Description / Log Details</th>
                  <th className="px-6 py-4 w-48 text-right">Event Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition">
                      
                      {/* Column 1: User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                            {log.userName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{log.userName}</h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{log.userEmail}</p>
                            <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 ${getRoleBadgeColor(log.userRole)}`}>
                              {log.userRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Action Badge */}
                      <td className="px-6 py-4 vertical-align-middle">
                        <span className={`inline-block text-[10px] font-bold tracking-wider px-2 py-1 rounded-lg ${getActionBadgeColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Column 3: Event Description / Details */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 max-w-md break-words leading-relaxed">
                        {log.details}
                      </td>

                      {/* Column 4: Timestamp */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end space-y-1">
                          <div className="flex items-center text-[11px] text-slate-700 font-bold font-mono">
                            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                            {new Date(log.timestamp).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString(undefined, { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            })}
                          </div>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {!loading && !error && filteredLogs.length > 0 && (
          <div className="bg-slate-50/50 px-6 py-3.5 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-medium">
            <span className="flex items-center">
              <Info className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              Showing {filteredLogs.length} audit event log{filteredLogs.length !== 1 ? 's' : ''} in descending order
            </span>
            <span className="font-mono text-[10px]">Real-time monitoring active</span>
          </div>
        )}
      </div>

    </div>
  );
}
