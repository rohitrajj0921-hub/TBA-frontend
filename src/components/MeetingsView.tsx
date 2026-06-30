/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Plus, 
  Trash2, 
  Link2, 
  Copy, 
  ExternalLink, 
  Calendar, 
  Clock, 
  User as UserIcon, 
  CheckCircle, 
  AlertCircle, 
  LogOut, 
  RefreshCw, 
  Search, 
  Sparkles,
  Info,
  CalendarCheck,
  Check
} from 'lucide-react';
import { TeamMeeting, User, UserRole, PastMeeting } from '../types.js';
import { googleSignIn, logoutGoogle, registerAuthListener } from '../firebase-client.js';
import { User as GoogleUser } from 'firebase/auth';

interface MeetingsViewProps {
  token: string;
  currentUser: User;
}

export default function MeetingsView({ token, currentUser }: MeetingsViewProps) {
  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Google Auth integration states
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form states
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [customMeetUrl, setCustomMeetUrl] = useState('');
  const [creationMode, setCreationMode] = useState<'instant' | 'schedule'>('instant');
  const [newlyCreatedUrl, setNewlyCreatedUrl] = useState<string | null>(null);

  // Invite states
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [selectedInvitedUserIds, setSelectedInvitedUserIds] = useState<string[]>([]);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Past meetings and tab toggling states
  const [pastMeetings, setPastMeetings] = useState<PastMeeting[]>([]);
  const [pastLoading, setPastLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  // Modal / Form state for logging a completed session
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [loggingMeeting, setLoggingMeeting] = useState<TeamMeeting | null>(null);
  const [logTitle, setLogTitle] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [logDuration, setLogDuration] = useState('30');
  const [logParticipants, setLogParticipants] = useState<string[]>([]);
  const [customParticipant, setCustomParticipant] = useState('');

  // Fetch past meetings from DB
  const fetchPastMeetings = async () => {
    try {
      setPastLoading(true);
      const res = await fetch('/api/past-meetings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve past meetings logs.');
      const data = await res.json();
      setPastMeetings(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setPastLoading(false);
    }
  };

  // Load meetings and team users list
  const fetchMeetingsAndUsers = async () => {
    try {
      const res = await fetch('/api/meetings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve meetings list.');
      const data = await res.json();
      setMeetings(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not fetch team meetings.');
    } finally {
      setLoading(false);
    }

    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const team = await res.json();
        // Exclude the current user so they don't invite themselves
        setTeamUsers(team.filter((u: User) => u.id !== currentUser.id));
      }
    } catch (err) {
      console.error("Could not fetch team directory:", err);
    }

    // Also load past meetings
    fetchPastMeetings();
  };

  const fetchMeetings = () => {
    fetchMeetingsAndUsers();
  };

  // Listen to Google Auth State Changes
  useEffect(() => {
    const unsubscribe = registerAuthListener((user, gToken) => {
      setGoogleUser(user);
      setGoogleToken(gToken);
    });
    fetchMeetingsAndUsers();
    return () => unsubscribe();
  }, [token]);

  // Handle Sign-In with Google for Google Meet Permissions
  const handleGoogleConnect = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setNotification({
          type: 'success',
          message: `Connected successfully as ${result.user.email} with Google Meet permissions.`
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (err: any) {
      console.error(err);
      setError('Google Account connection failed. Please ensure permissions are accepted.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (window.confirm("Disconnect your Google Account from RecruitCore?")) {
      await logoutGoogle();
      setNotification({
        type: 'success',
        message: 'Google account disconnected.'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Create real Google Meet link via API
  const generateMeetLinkAPI = async (): Promise<string | null> => {
    if (!googleToken) {
      setError('Please connect your Google Account first to auto-generate a Meet link.');
      return null;
    }

    try {
      // Call Google Meet API to create a new virtual meeting space
      const res = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Google Meet API error: ${res.statusText}`);
      }

      const data = await res.json();
      // The API returns meetingUri with the full URL (e.g. "https://meet.google.com/abc-defg-hij")
      return data.meetingUri || `https://meet.google.com/${data.meetingCode || 'unknown'}`;
    } catch (err: any) {
      console.error("Meet Link generation error:", err);
      throw new Error(`Google Meet API failed: ${err.message}. Please connect your account or provide a manual link.`);
    }
  };

  // Handle Meeting Creation
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) {
      setError('A title is required for the meeting.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setNewlyCreatedUrl(null);

    try {
      let finalUrl = '';

      if (creationMode === 'instant') {
        if (!googleToken) {
          throw new Error('Google Account connection is required to auto-generate an instant Google Meet space.');
        }
        // Generate via Google Meet API
        const generatedLink = await generateMeetLinkAPI();
        if (!generatedLink) return;
        finalUrl = generatedLink;
      } else {
        // Scheduled mode
        if (customMeetUrl.trim()) {
          finalUrl = customMeetUrl.trim();
          if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
          }
        } else {
          // If no custom URL, try to auto-generate if Google Token exists
          if (googleToken) {
            const generatedLink = await generateMeetLinkAPI();
            if (generatedLink) {
              finalUrl = generatedLink;
            } else {
              throw new Error('Could not auto-generate Meet URL.');
            }
          } else {
            throw new Error('Please connect your Google Account or enter a custom Google Meet URL.');
          }
        }
      }

      // Prepare date and timestamp
      let scheduledAtISO = new Date().toISOString();
      if (creationMode === 'schedule' && scheduledDate) {
        const timePart = scheduledTime || "12:00";
        scheduledAtISO = new Date(`${scheduledDate}T${timePart}`).toISOString();
      }

      // Save to our backend
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: meetingTitle,
          description: meetingDescription,
          meetingUrl: finalUrl,
          scheduledAt: scheduledAtISO,
          isActive: true,
          invitedUserIds: selectedInvitedUserIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save the meeting to RecruitCore database.');
      }

      const newMeeting = await response.json();
      setNewlyCreatedUrl(finalUrl);
      
      // Clear forms
      setMeetingTitle('');
      setMeetingDescription('');
      setScheduledDate('');
      setScheduledTime('');
      setCustomMeetUrl('');
      setSelectedInvitedUserIds([]);

      setNotification({
        type: 'success',
        message: `Meeting "${newMeeting.title}" successfully created and saved!`
      });
      setTimeout(() => setNotification(null), 5000);

      fetchMeetings();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create team meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancel / Delete Meeting with User Confirmation dialog (MANDATORY)
  const handleDeleteMeeting = async (meetingId: string, title: string) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to cancel the meeting: "${title}"?\nThis will remove it from the team list permanently.`
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to cancel the meeting.');

      setNotification({
        type: 'success',
        message: `Meeting "${title}" has been cancelled.`
      });
      setTimeout(() => setNotification(null), 3500);
      
      fetchMeetings();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not cancel the meeting.');
    }
  };

  // Submit Log for Completed Meeting
  const handleLogPastMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim()) {
      alert("A title is required for logging a past meeting.");
      return;
    }

    try {
      const response = await fetch('/api/past-meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: logTitle,
          description: logDescription,
          durationMinutes: Number(logDuration) || 30,
          participants: logParticipants,
          meetingId: loggingMeeting?.id || ""
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save completed meeting log.');
      }

      setNotification({
        type: 'success',
        message: `Session log for "${logTitle}" successfully saved to Firestore!`
      });
      setTimeout(() => setNotification(null), 4000);

      // Reset
      setLogModalOpen(false);
      setLoggingMeeting(null);
      setLogTitle('');
      setLogDescription('');
      setLogDuration('30');
      setLogParticipants([]);
      setCustomParticipant('');

      // Refresh
      fetchMeetingsAndUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save session log.');
    }
  };

  // Open Log Modal pre-populated with an existing Active meeting
  const openLogModalForMeeting = (meet: TeamMeeting) => {
    setLoggingMeeting(meet);
    setLogTitle(meet.title);
    setLogDescription(meet.description || '');
    setLogDuration('30');
    
    // Auto-populate participants with invited people's names
    const initialParticipants: string[] = [meet.creatorName];
    if (meet.invitedUserIds) {
      meet.invitedUserIds.forEach(id => {
        const u = teamUsers.find(tu => tu.id === id) || (id === currentUser.id ? currentUser : null);
        if (u && !initialParticipants.includes(u.name)) {
          initialParticipants.push(u.name);
        }
      });
    }
    setLogParticipants(initialParticipants);
    setLogModalOpen(true);
  };

  // Open Log Modal blank for an independent past meeting
  const openBlankLogModal = () => {
    setLoggingMeeting(null);
    setLogTitle('');
    setLogDescription('');
    setLogDuration('30');
    setLogParticipants([currentUser.name]);
    setLogModalOpen(true);
  };

  // Filter list
  const filteredMeetings = meetings.filter(meet => {
    const query = searchQuery.toLowerCase();
    return (
      meet.title.toLowerCase().includes(query) ||
      meet.description.toLowerCase().includes(query) ||
      meet.creatorName.toLowerCase().includes(query)
    );
  });

  const filteredPastMeetings = pastMeetings.filter(meet => {
    const query = searchQuery.toLowerCase();
    return (
      meet.title.toLowerCase().includes(query) ||
      (meet.description && meet.description.toLowerCase().includes(query)) ||
      meet.participants.some(p => p.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header and Sync Indicator */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-slate-150 shadow-sm gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Video className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center">
              <span>Team Meetings & Google Meet</span>
              <span className="ml-2.5 inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Google Workspace Live
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Connect your authorized recruiters account, provision dynamic Google Meet space links, and coordinate team discussions instantly.
            </p>
          </div>
        </div>

        <button
          onClick={fetchMeetings}
          className="flex items-center justify-center space-x-2 px-4.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Connection and Toast Notification Center */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold shadow-sm border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="flex-1">{notification.message}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-medium flex items-start space-x-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <p className="font-bold">Execution Warning</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold px-1 text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Setup Google & Create Space Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Google Workspace Connection Card */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <span>Google Account Authorization</span>
            </h2>
            
            {!googleUser ? (
              <div className="space-y-3.5">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Review the card below to authenticate. To create and schedule real Google Meet conferences directly from RecruitCore, you must authorize your Google account.
                </p>
                
                {/* Official Material Design "Sign in with Google" button style */}
                <button 
                  onClick={handleGoogleConnect}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center space-x-3 px-4.5 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>{isLoggingIn ? 'Connecting Accounts...' : 'Connect Google Workspace'}</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    {googleUser.photoURL ? (
                      <img src={googleUser.photoURL} alt="Avatar" className="w-6 h-6 rounded-full border border-indigo-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        G
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{googleUser.displayName || 'Authorized User'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{googleUser.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150">
                    Active
                  </span>
                </div>

                <button
                  onClick={handleGoogleDisconnect}
                  className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 border border-indigo-100 bg-white text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Disconnect Account</span>
                </button>
              </div>
            )}
          </div>

          {/* Create Meeting Form */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">New Conference</h2>
              
              <div className="flex space-x-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setCreationMode('instant'); setError(null); }}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${
                    creationMode === 'instant' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Instant Meet
                </button>
                <button
                  type="button"
                  onClick={() => { setCreationMode('schedule'); setError(null); }}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition ${
                    creationMode === 'schedule' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Schedule
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              {/* Meeting Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Meeting Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Weekly Sync, Technical Panel, Client Call"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-sm transition outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Agenda / Discussion Objective</label>
                <textarea
                  placeholder="Briefly describe what this meeting is about..."
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-sm transition outline-none resize-none"
                />
              </div>

              {/* Directly Invite Team Members Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Directly Invite Team Members</label>
                {teamUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No other team members found.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    {teamUsers.map(user => {
                      const isSelected = selectedInvitedUserIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedInvitedUserIds(prev => prev.filter(id => id !== user.id));
                            } else {
                              setSelectedInvitedUserIds(prev => [...prev, user.id]);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition ${
                            isSelected 
                              ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold' 
                              : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[9px] font-bold uppercase shrink-0">
                              {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <span className="truncate">{user.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[8px] uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {user.role}
                            </span>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 border border-slate-300 rounded shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedInvitedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedInvitedUserIds.map(id => {
                      const user = teamUsers.find(u => u.id === id);
                      if (!user) return null;
                      return (
                        <span 
                          key={id}
                          className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold"
                        >
                          <span>{user.name.split(' ')[0]}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedInvitedUserIds(prev => prev.filter(uid => uid !== id))}
                            className="text-indigo-400 hover:text-indigo-700 focus:outline-none font-bold"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scheduling details if Schedule selected */}
              {creationMode === 'schedule' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 font-sans">Date</label>
                    <input
                      type="date"
                      required={creationMode === 'schedule'}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 font-sans">Time</label>
                    <input
                      type="time"
                      required={creationMode === 'schedule'}
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Custom link option if scheduling */}
              {creationMode === 'schedule' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500">Custom Google Meet URL</label>
                    <span className="text-[10px] text-indigo-600 font-semibold">Optional</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. meet.google.com/abc-defg-hij"
                    value={customMeetUrl}
                    onChange={(e) => setCustomMeetUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-sm transition outline-none"
                  />
                  {!googleToken && !customMeetUrl && (
                    <p className="text-[9px] text-amber-600 font-medium mt-1 leading-relaxed">
                      💡 Connect your Google account above to auto-generate a Google Meet space, or type a custom link here.
                    </p>
                  )}
                </div>
              )}

              {/* Status / Newly Created Space Link Showcase */}
              {newlyCreatedUrl && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                    Meet Space Generated!
                  </span>
                  <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-emerald-100">
                    <span className="text-xs font-mono text-slate-700 truncate">{newlyCreatedUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newlyCreatedUrl, 'newly_created')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 ml-2"
                    >
                      {copiedId === 'newly_created' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Trigger Button */}
              <button
                type="submit"
                disabled={submitting || (creationMode === 'instant' && !googleToken)}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deploying Meet Space...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>
                      {creationMode === 'instant' 
                        ? 'Generate & Launch Instant Meet' 
                        : 'Schedule & Register Meeting'}
                    </span>
                  </>
                )}
              </button>
              
              {creationMode === 'instant' && !googleToken && (
                <p className="text-center text-[10px] text-amber-600 font-medium leading-relaxed">
                  ⚠️ Google Account connection required to auto-generate instant Meet spaces.
                </p>
              )}
            </form>
          </div>

        </div>

        {/* Right Side: Shared Active Team Meetings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
            
            {/* Tabs for Current vs Past Meetings */}
            <div className="flex border-b border-slate-150 bg-slate-50">
              <button
                type="button"
                onClick={() => setActiveTab('current')}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'current'
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Active & Scheduled ({meetings.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('past')}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'past'
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Past Sessions Logs ({pastMeetings.length})</span>
              </button>
            </div>

            {activeTab === 'current' ? (
              <>
                {/* Inner Header with Search */}
                <div className="p-5 border-b border-slate-150 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-sm font-bold text-slate-800">Shared Active & Scheduled Meetings</h2>
                    <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      {filteredMeetings.length} Meeting{filteredMeetings.length !== 1 ? 's' : ''} listed
                    </span>
                  </div>

                  {/* Search input bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search meeting topics, agendas, or creators..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-xs transition outline-none"
                    />
                  </div>
                </div>

                {/* List / Feed */}
                {loading ? (
                  <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
                    <p className="text-xs font-semibold text-slate-500">Retrieving scheduled meeting rosters...</p>
                  </div>
                ) : filteredMeetings.length === 0 ? (
                  <div className="p-16 text-center max-w-sm mx-auto space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-full text-slate-400 inline-block">
                      <CalendarCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">No Meetings Scheduled</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        There are no current active discussions scheduled. Use the form on the left to create an instant space or plan a session.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredMeetings.map((meet) => {
                      const isCreator = meet.createdBy === currentUser.id;
                      const isAdmin = currentUser.role === UserRole.ADMIN;
                      const isScheduledInFuture = new Date(meet.scheduledAt).getTime() > Date.now();

                      return (
                        <div key={meet.id} className="p-5 hover:bg-slate-50/30 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          
                          {/* Left: Meeting Metadata */}
                          <div className="space-y-2 max-w-md">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="text-xs font-bold text-slate-800">{meet.title}</span>
                              
                              {/* Future / Live Label */}
                              {isScheduledInFuture ? (
                                <span className="inline-flex items-center text-[8px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-100">
                                  Scheduled
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-150 animate-pulse">
                                  Active / Instant
                                </span>
                              )}
                            </div>

                            {meet.description && (
                              <p className="text-xs text-slate-500 leading-relaxed break-words">{meet.description}</p>
                            )}

                            {/* Timing coordinates */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium">
                              <span className="flex items-center">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
                                {new Date(meet.scheduledAt).toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="flex items-center">
                                <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
                                {new Date(meet.scheduledAt).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="flex items-center">
                                <UserIcon className="w-3.5 h-3.5 text-slate-400 mr-1" />
                                By {meet.creatorName}
                              </span>
                            </div>

                            {/* Invited users listing */}
                            {meet.invitedUserIds && meet.invitedUserIds.length > 0 && (
                              <div className="flex items-center space-x-1.5 pt-1.5 flex-wrap gap-y-1">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Invited:</span>
                                <div className="flex flex-wrap items-center gap-1">
                                  {meet.invitedUserIds.map((userId) => {
                                    const invitedUser = teamUsers.find((u) => u.id === userId) || (userId === currentUser.id ? currentUser : null);
                                    if (!invitedUser) return null;
                                    return (
                                      <div 
                                        key={userId} 
                                        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[9px] font-semibold text-indigo-700 shadow-sm"
                                        title={`${invitedUser.name} (${invitedUser.role})`}
                                      >
                                        <div className="w-3.5 h-3.5 bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center text-[7px] font-extrabold uppercase shrink-0">
                                          {invitedUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <span className="truncate max-w-[80px]">{invitedUser.name.split(' ')[0]}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Joining and deletion controls */}
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                            {/* Complete & Log option if creator or admin */}
                            {(isCreator || isAdmin) && (
                              <button
                                onClick={() => openLogModalForMeeting(meet)}
                                className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200 transition cursor-pointer shadow-xs"
                                title="Mark completed and save log entry to Firestore"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                <span>Complete & Log</span>
                              </button>
                            )}

                            {/* Join Button */}
                            <a
                              href={meet.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-lg text-[11px] font-bold border border-indigo-150 transition cursor-pointer"
                            >
                              <span>Join Meet</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            {/* Copy URL trigger */}
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => copyToClipboard(meet.meetingUrl, meet.id)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
                                title="Copy Meet Link"
                              >
                                {copiedId === meet.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Link2 className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Delete option if creator or admin */}
                              {(isCreator || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteMeeting(meet.id, meet.title)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition cursor-pointer"
                                  title="Cancel Meeting"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

                {/* List Footer metadata */}
                {!loading && filteredMeetings.length > 0 && (
                  <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center">
                      <Info className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                      Ensure you permit redirects and popups if joining on mobile browsers
                    </span>
                    <span className="font-mono">Real-time sync</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Past Meetings Tab Content */}
                <div className="p-5 border-b border-slate-150 space-y-4 bg-slate-50/40">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Completed Session Logs</h2>
                      <p className="text-[10px] text-slate-500 mt-0.5">Audit trail of finished team meetings fetched from Firestore</p>
                    </div>
                    <button
                      type="button"
                      onClick={openBlankLogModal}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Offline Session</span>
                    </button>
                  </div>

                  {/* Search past meetings */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search past logs, topics, attendees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-xs transition outline-none"
                    />
                  </div>
                </div>

                {/* List / Feed for Past Meetings */}
                {pastLoading ? (
                  <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
                    <p className="text-xs font-semibold text-slate-500">Querying completed meeting transcripts...</p>
                  </div>
                ) : filteredPastMeetings.length === 0 ? (
                  <div className="p-16 text-center max-w-sm mx-auto space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-full text-slate-400 inline-block">
                      <CalendarCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">No Past Sessions Logged</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        No meeting sessions have been logged as completed yet. Use the "Complete & Log" button on active meetings or click "Log Offline Session" above.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {filteredPastMeetings.map((pMeet) => (
                      <div key={pMeet.id} className="p-5 hover:bg-slate-50/20 transition flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2.5 flex-1 min-w-0">
                          
                          {/* Title & Metadata row */}
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-xs font-bold text-slate-800 truncate">{pMeet.title}</span>
                            <span className="inline-flex items-center text-[8px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-100">
                              Completed
                            </span>
                            <span className="inline-flex items-center text-[8px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              ⏱️ {pMeet.durationMinutes} Mins
                            </span>
                          </div>

                          {/* Description / Notes */}
                          {pMeet.description && (
                            <p className="text-xs text-slate-500 leading-relaxed break-words bg-slate-50 p-2 rounded-lg border border-slate-100">{pMeet.description}</p>
                          )}

                          {/* Completed Date / Time */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
                              Logged on {new Date(pMeet.completedAt).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
                              {new Date(pMeet.completedAt).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {/* Attendees list rendering */}
                          {pMeet.participants && pMeet.participants.length > 0 && (
                            <div className="flex items-center space-x-1.5 pt-1 flex-wrap gap-y-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Attendees ({pMeet.participants.length}):</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {pMeet.participants.map((participantName, idx) => (
                                  <div 
                                    key={idx} 
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-150 text-[9px] font-semibold text-slate-600 shadow-3xs"
                                    title={participantName}
                                  >
                                    <div className="w-3.5 h-3.5 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-[7px] font-extrabold uppercase shrink-0">
                                      {participantName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                                    </div>
                                    <span className="truncate max-w-[100px]">{participantName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Past Sessions List Footer */}
                {!pastLoading && filteredPastMeetings.length > 0 && (
                  <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                      Session histories are encrypted and persisted inside Google Firestore.
                    </span>
                    <span className="font-mono">Archived</span>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </div>

      {/* Log Completed Session Modal */}
      <AnimatePresence>
        {logModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {loggingMeeting ? 'Complete & Archive Meeting' : 'Log Past Session Record'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {loggingMeeting ? 'Fill out actual duration and participant list to archive this session' : 'Manually record a session completed offline'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleLogPastMeetingSubmit} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    value={logTitle}
                    onChange={(e) => setLogTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-xs outline-none transition"
                    placeholder="e.g. Monthly Performance Review"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Brief description / Notes</label>
                  <textarea
                    value={logDescription}
                    onChange={(e) => setLogDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-xs outline-none resize-none transition"
                    placeholder="Key topics discussed, decisions made, or feedback..."
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Actual Duration (Minutes) *</label>
                  <select
                    value={logDuration}
                    onChange={(e) => setLogDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 rounded-xl text-xs outline-none transition"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">1 Hour (60 mins)</option>
                    <option value="90">1.5 Hours (90 mins)</option>
                    <option value="120">2 Hours (120 mins)</option>
                  </select>
                </div>

                {/* Participants list */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 font-sans">
                    Attended Participants ({logParticipants.length})
                  </label>
                  
                  {/* Participant Chips */}
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto">
                    {logParticipants.map((name, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-700"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => setLogParticipants(prev => prev.filter(p => p !== name))}
                          className="text-indigo-400 hover:text-indigo-700 focus:outline-none font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {logParticipants.length === 0 && (
                      <span className="text-[10px] text-slate-400 italic">No participants added yet.</span>
                    )}
                  </div>

                  {/* Add participant input */}
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="text"
                      placeholder="Type participant name and click Add..."
                      value={customParticipant}
                      onChange={(e) => setCustomParticipant(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customParticipant.trim();
                          if (val && !logParticipants.includes(val)) {
                            setLogParticipants(prev => [...prev, val]);
                            setCustomParticipant('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:bg-white rounded-lg text-xs outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customParticipant.trim();
                        if (val && !logParticipants.includes(val)) {
                          setLogParticipants(prev => [...prev, val]);
                          setCustomParticipant('');
                        }
                      }}
                      className="px-3.5 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  {/* Quick Select checklist from Team directory */}
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Quick Select Team Directory</p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 border border-slate-150 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          if (logParticipants.includes(currentUser.name)) {
                            setLogParticipants(prev => prev.filter(p => p !== currentUser.name));
                          } else {
                            setLogParticipants(prev => [...prev, currentUser.name]);
                          }
                        }}
                        className={`text-left p-1.5 px-2 rounded-lg text-[10px] border truncate transition cursor-pointer ${
                          logParticipants.includes(currentUser.name)
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {currentUser.name} (You)
                      </button>
                      {teamUsers.map(u => {
                        const isJoined = logParticipants.includes(u.name);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              if (isJoined) {
                                setLogParticipants(prev => prev.filter(p => p !== u.name));
                              } else {
                                setLogParticipants(prev => [...prev, u.name]);
                              }
                            }}
                            className={`text-left p-1.5 px-2 rounded-lg text-[10px] border truncate transition cursor-pointer ${
                              isJoined
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {u.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Trigger Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setLogModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition border border-slate-200 bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-600/10 cursor-pointer"
                  >
                    Save completed log
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
