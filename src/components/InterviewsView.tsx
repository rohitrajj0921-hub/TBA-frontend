/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Loader2,
  Trash2,
  Briefcase,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { Interview, InterviewStatus, InterviewMode, User, UserRole } from '../types.js';

interface InterviewsViewProps {
  token: string;
  currentUser: User;
}

export default function InterviewsView({ token, currentUser }: InterviewsViewProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Reschedule/Status management
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [newStatus, setNewStatus] = useState<InterviewStatus>(InterviewStatus.SCHEDULED);
  const [newRemarks, setNewRemarks] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchInterviews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/interviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load scheduled interviews");
      }
      setInterviews(data);
    } catch (err: any) {
      setError(err.message || "Failed to load interviews list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [token]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInterview) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/interviews/${editingInterview.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          remarks: newRemarks,
          date: newDate || editingInterview.date,
          time: newTime || editingInterview.time
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to update interview session status");
      }

      alert("Successfully updated technical session records!");
      setEditingInterview(null);
      fetchInterviews();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteInterview = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this scheduled interview session?")) {
      return;
    }

    try {
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Failed to delete interview schedule");
      }

      fetchInterviews();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusIcon = (status: InterviewStatus) => {
    switch (status) {
      case InterviewStatus.SCHEDULED:
        return <Clock className="w-4 h-4 text-amber-400" />;
      case InterviewStatus.ATTENDED:
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case InterviewStatus.NO_SHOW:
        return <XCircle className="w-4 h-4 text-red-400" />;
      case InterviewStatus.RESCHEDULED:
        return <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin-slow" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: InterviewStatus) => {
    switch (status) {
      case InterviewStatus.SCHEDULED:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case InterviewStatus.ATTENDED:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case InterviewStatus.NO_SHOW:
        return 'bg-red-50 text-red-700 border border-red-200';
      case InterviewStatus.RESCHEDULED:
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const getModeBadge = (mode: InterviewMode) => {
    switch (mode) {
      case InterviewMode.ONLINE:
        return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case InterviewMode.OFFLINE:
        return 'bg-cyan-50 text-cyan-700 border border-cyan-100';
      case InterviewMode.TELEPHONIC:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    }
  };

  const hasAuthWorkflowAccess = [UserRole.ADMIN, UserRole.TEAM_LEADER].includes(currentUser.role);

  return (
    <div className="p-8 space-y-8 text-slate-700 bg-slate-50 min-h-screen font-sans">
      {/* Header and Sync */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Interview Schedules</h2>
          <p className="text-xs text-slate-500 mt-1">Schedules, client reviews, meeting statuses, and panel evaluations.</p>
        </div>
        <button
          id="btn-sync-interviews"
          onClick={fetchInterviews}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 text-slate-700 shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Sync Listings</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs font-medium">Fetching client evaluation lists...</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm animate-fade-in">
          <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">No scheduled sessions</p>
          <p className="text-xs text-slate-500 mt-1">To schedule technical rounds, navigate to Candidate Pool and click the Calendar button.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {interviews.map((intv) => (
            <div id={`interview-card-${intv.id}`} key={intv.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-sm hover:shadow-md">
              
              {/* Card top details */}
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-md">{intv.candidateName}</h4>
                    <span className="text-[10px] text-slate-400">Scheduled by: {intv.scheduledByName}</span>
                  </div>
                  <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(intv.status)}`}>
                    {getStatusIcon(intv.status)}
                    <span>{intv.status}</span>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <div className="flex items-center text-xs space-x-2 text-slate-600">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>Role: <strong className="text-slate-800 font-semibold">{intv.position}</strong></span>
                  </div>
                  <div className="flex items-center text-xs space-x-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Client: <strong className="text-slate-800 font-semibold">{intv.client}</strong></span>
                  </div>
                </div>

                {/* Logistics */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{intv.date}</span>
                    <Clock className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
                    <span>{intv.time}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getModeBadge(intv.interviewMode)}`}>
                    {intv.interviewMode}
                  </span>
                </div>

                {/* Remarks Block */}
                {intv.remarks && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Evaluation Notes</span>
                    <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed italic">
                      "{intv.remarks}"
                    </p>
                  </div>
                )}
              </div>

              {/* Action bars */}
              <div className="flex justify-end items-center space-x-2 pt-4 border-t border-slate-100 mt-2">
                <button
                  id={`btn-manage-intv-${intv.id}`}
                  onClick={() => {
                    setEditingInterview(intv);
                    setNewStatus(intv.status);
                    setNewRemarks(intv.remarks || '');
                    setNewDate(intv.date);
                    setNewTime(intv.time);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                >
                  Manage Session
                </button>

                {hasAuthWorkflowAccess && (
                  <button
                    id={`btn-delete-intv-${intv.id}`}
                    onClick={() => handleDeleteInterview(intv.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {editingInterview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-md font-bold text-slate-950">Manage Technical Round</h3>
            <p className="text-xs text-slate-500">Update scheduled structures or panel evaluations of <span className="text-slate-900 font-semibold">{editingInterview.candidateName}</span>.</p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase">Reschedule Date</label>
                  <input 
                    id="update-intv-date"
                    type="date" 
                    value={newDate} 
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase">Reschedule Time</label>
                  <input 
                    id="update-intv-time"
                    type="time" 
                    value={newTime} 
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Technical Session Status</label>
                <select 
                  id="update-intv-status"
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value as InterviewStatus)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 mt-1 font-semibold"
                >
                  <option value={InterviewStatus.SCHEDULED}>Scheduled</option>
                  <option value={InterviewStatus.ATTENDED}>Attended / Completed</option>
                  <option value={InterviewStatus.NO_SHOW}>No Show / Missed</option>
                  <option value={InterviewStatus.RESCHEDULED}>Rescheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Panel Feedbacks & Instructions</label>
                <textarea 
                  id="update-intv-remarks"
                  value={newRemarks} 
                  onChange={(e) => setNewRemarks(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 mt-1"
                  placeholder="Detail interview evaluations, programming challenges performance, or communication logs..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200/30">
                <button 
                  type="button" 
                  onClick={() => setEditingInterview(null)}
                  className="px-3.5 py-2 bg-transparent hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  id="update-intv-submit"
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
